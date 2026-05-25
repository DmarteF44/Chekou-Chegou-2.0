// authService — local/offline authentication backed by AsyncStorage.
import { storage } from "@/src/utils/storage";
import { USE_SUPABASE, friendlySupabaseError, isSupabaseUnavailable } from "@/src/config/runtime";
import { supabase } from "@/src/lib/supabase";
import { withTimeout } from "@/src/utils/withTimeout";

export type Role = "client" | "driver" | "admin" | "super_admin";
export type DriverStatus = "none" | "pending" | "approved" | "rejected" | "blocked";

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  password?: string; // local fallback only
  role: Role;
  driverStatus: DriverStatus;
  driverLevel?: 1 | 2 | 3 | 4;
  operationalLimit?: number;
  createdAt: number;
};

const USERS_KEY = "chekou_users_v1";
const SESSION_KEY = "chekou_session_v1";
const SEED_KEY = "chekou_seed_v1";
const SEED_VERSION = "2";
export const AUTH_BOOT_TIMEOUT_MS = 6000;
const AUTH_ACTION_TIMEOUT_MS = 8000;
const AUTH_CLEANUP_TIMEOUT_MS = 1500;

const SEED_USERS: User[] = [
  {
    id: "u_client_local", name: "Maria Cliente", email: "cliente@chekou.local",
    phone: "(64) 90000-0001", password: "123456",
    role: "client", driverStatus: "none", createdAt: Date.now(),
  },
  {
    id: "u_driver_local", name: "João Entregador", email: "entregador@chekou.local",
    phone: "(64) 90000-0002", password: "123456",
    role: "driver", driverStatus: "approved", driverLevel: 2, operationalLimit: 150, createdAt: Date.now(),
  },
  {
    id: "u_client_1", name: "Maria Cliente", email: "cliente@chekou.com",
    phone: "(64) 90000-0001", password: "123456",
    role: "client", driverStatus: "none", createdAt: Date.now(),
  },
  {
    id: "u_driver_1", name: "João Entregador", email: "entregador@chekou.com",
    phone: "(64) 90000-0002", password: "123456",
    role: "driver", driverStatus: "approved", driverLevel: 2, operationalLimit: 150, createdAt: Date.now(),
  },
  {
    id: "u_driver_2", name: "Carlos Pendente", email: "pendente@chekou.com",
    phone: "(64) 90000-0003", password: "123456",
    role: "driver", driverStatus: "pending", driverLevel: 1, operationalLimit: 50, createdAt: Date.now(),
  },
];

let cache: User[] | null = null;
const listeners = new Set<() => void>();

function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

async function load(): Promise<User[]> {
  if (cache) return cache;
  await ensureSeed();
  const raw = (await storage.getItem<string>(USERS_KEY, "")) || "";
  cache = raw ? (JSON.parse(raw) as User[]) : [];
  return cache!;
}

async function persist() {
  await storage.setItem(USERS_KEY, JSON.stringify(cache ?? []));
  listeners.forEach((l) => l());
}

async function ensureSeed() {
  const seeded = await storage.getItem<string>(SEED_KEY, "");
  if (seeded === SEED_VERSION) return;
  const raw = (await storage.getItem<string>(USERS_KEY, "")) || "";
  const existing = raw ? (JSON.parse(raw) as User[]) : [];
  const byEmail = new Map(existing.map((u) => [u.email.toLowerCase(), u]));
  for (const seed of SEED_USERS) {
    const key = seed.email.toLowerCase();
    byEmail.set(key, byEmail.has(key) ? { ...byEmail.get(key)!, ...seed } : seed);
  }
  const merged = Array.from(byEmail.values());
  await storage.setItem(USERS_KEY, JSON.stringify(merged));
  await storage.setItem(SEED_KEY, SEED_VERSION);
  cache = merged;
}

function mapProfile(row: any): User {
  const driverStatus = row.driver_status ?? (row.is_blocked ? "blocked" : "none");
  const wallet = Array.isArray(row.driver_wallets) ? row.driver_wallets[0] : row.driver_wallets;
  return {
    id: row.id,
    name: row.name ?? "Cliente",
    email: row.email ?? "",
    phone: row.phone ?? "",
    role: row.role ?? "client",
    driverStatus: row.is_blocked ? "blocked" : driverStatus,
    driverLevel: row.driver_level ?? 1,
    operationalLimit: wallet?.operational_limit === undefined ? undefined : Number(wallet.operational_limit),
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

async function getSupabaseProfile(userId: string): Promise<User | null> {
  if (!supabase) return null;
  const { data, error } = await withTimeout(
    Promise.resolve(
      supabase
        .from("profiles")
        .select("*, driver_wallets(operational_limit)")
        .eq("id", userId)
        .maybeSingle(),
    ),
    AUTH_BOOT_TIMEOUT_MS,
    "Tempo limite ao carregar perfil remoto.",
  );
  if (error) throw new Error(friendlySupabaseError(error, "Não foi possível carregar seu perfil."));
  return data ? mapProfile(data) : null;
}

async function getLocalSession(): Promise<User | null> {
  const id = await storage.getItem<string>(SESSION_KEY, "");
  if (!id) return null;
  const users = await load();
  return users.find((user) => user.id === id) ?? null;
}

function warnLocalFallback(context: string) {
  console.warn(`[auth] ${context}; usando sessão local quando disponível.`);
}

async function clearInvalidSupabaseSession() {
  if (!supabase) return;
  try {
    await withTimeout(
      supabase.auth.signOut({ scope: "local" }),
      AUTH_CLEANUP_TIMEOUT_MS,
      "Tempo limite ao limpar sessão remota.",
    );
  } catch {
    console.warn("[auth] Sessão remota inválida; limpeza local não concluiu no prazo.");
  }
}

export const authService = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  },

  async getAllUsers(): Promise<User[]> {
    if (USE_SUPABASE && supabase) {
      const { data, error } = await supabase.from("profiles").select("*, driver_wallets(operational_limit)").order("created_at", { ascending: false });
      if (!error) return (data ?? []).map(mapProfile);
      if (!isSupabaseUnavailable(error)) throw new Error(friendlySupabaseError(error, "Não foi possível listar usuários."));
      console.warn("Supabase indisponível ao listar usuários; usando dados locais.", error);
    }
    return [...(await load())];
  },

  async getById(id: string): Promise<User | undefined> {
    if (USE_SUPABASE && supabase && isUuid(id)) {
      try {
        const profile = await getSupabaseProfile(id);
        return profile ?? undefined;
      } catch (error) {
        if (!isSupabaseUnavailable(error)) throw error;
        console.warn("Supabase indisponível ao carregar usuário; usando dados locais.", error);
      }
    }
    const users = await load();
    return users.find((u) => u.id === id);
  },

  async login(email: string, password: string): Promise<User | null> {
    if (USE_SUPABASE && supabase) {
      try {
        const { data, error } = await withTimeout(
          supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          }),
          AUTH_ACTION_TIMEOUT_MS,
          "Tempo limite ao autenticar no Supabase.",
        );
        if (!error) {
          const profile = data.user ? await getSupabaseProfile(data.user.id) : null;
          if (!profile) {
            await clearInvalidSupabaseSession();
            throw new Error("Perfil não encontrado. Aplique a migration do Supabase antes de entrar.");
          }
          listeners.forEach((l) => l());
          return profile;
        }
        if (!isSupabaseUnavailable(error)) return null;
        warnLocalFallback("Supabase indisponível no login");
      } catch (error) {
        if (!isSupabaseUnavailable(error)) throw error;
        warnLocalFallback("Login remoto excedeu o tempo esperado");
      }
    }
    const users = await load();
    const u = users.find(
      (x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.password === password
    );
    if (!u) return null;
    await storage.setItem(SESSION_KEY, u.id);
    listeners.forEach((l) => l());
    return u;
  },

  async signup(input: { name: string; email: string; phone: string; password: string }): Promise<User | null> {
    if (USE_SUPABASE && supabase) {
      try {
        const { data, error } = await withTimeout(
          supabase.auth.signUp({
            email: input.email.trim(),
            password: input.password,
            options: {
              data: {
                name: input.name.trim(),
                phone: input.phone.trim(),
              },
            },
          }),
          AUTH_ACTION_TIMEOUT_MS,
          "Tempo limite ao criar conta no Supabase.",
        );
        if (!error && data.user) {
          if (!data.session) {
            return {
              id: data.user.id,
              name: input.name.trim(),
              email: input.email.trim(),
              phone: input.phone.trim(),
              role: "client",
              driverStatus: "none",
              createdAt: Date.now(),
            };
          }
          const profile = await getSupabaseProfile(data.user.id);
          listeners.forEach((l) => l());
          return profile ?? {
            id: data.user.id,
            name: input.name.trim(),
            email: input.email.trim(),
            phone: input.phone.trim(),
            role: "client",
            driverStatus: "none",
            createdAt: Date.now(),
          };
        }
        if (!isSupabaseUnavailable(error)) return null;
        warnLocalFallback("Supabase indisponível no cadastro");
      } catch (error) {
        if (!isSupabaseUnavailable(error)) throw error;
        warnLocalFallback("Cadastro remoto excedeu o tempo esperado");
      }
    }
    const users = await load();
    if (users.find((u) => u.email.toLowerCase() === input.email.trim().toLowerCase())) return null;
    const newUser: User = {
      id: `u_${Date.now()}`,
      name: input.name.trim(),
      email: input.email.trim(),
      phone: input.phone.trim(),
      password: input.password,
      role: "client",
      driverStatus: "none",
      createdAt: Date.now(),
    };
    users.push(newUser);
    cache = users;
    await persist();
    await storage.setItem(SESSION_KEY, newUser.id);
    return newUser;
  },

  async getSession(): Promise<User | null> {
    if (!(USE_SUPABASE && supabase)) return getLocalSession();

    try {
      const { data, error } = await withTimeout(
        supabase.auth.getSession(),
        AUTH_BOOT_TIMEOUT_MS,
        "Tempo limite ao restaurar sessão remota.",
      );
      if (error) {
        if (isSupabaseUnavailable(error)) {
          warnLocalFallback("Supabase indisponível ao restaurar sessão");
          return getLocalSession();
        }
        await clearInvalidSupabaseSession();
        return null;
      }
      if (!data.session?.user) return null;

      try {
        const profile = await getSupabaseProfile(data.session.user.id);
        if (profile) return profile;
        await clearInvalidSupabaseSession();
        return null;
      } catch (profileError) {
        if (isSupabaseUnavailable(profileError)) {
          warnLocalFallback("Perfil remoto indisponível na restauração");
          return getLocalSession();
        }
        await clearInvalidSupabaseSession();
        return null;
      }
    } catch (error) {
      if (isSupabaseUnavailable(error)) {
        warnLocalFallback("Restauração remota excedeu o tempo esperado");
        return getLocalSession();
      }
      await clearInvalidSupabaseSession();
      return null;
    }
  },

  async logout(): Promise<void> {
    if (USE_SUPABASE && supabase) {
      try {
        await withTimeout(supabase.auth.signOut(), AUTH_ACTION_TIMEOUT_MS, "Tempo limite ao sair da conta.");
      } catch {
        console.warn("[auth] Logout remoto não concluiu no prazo; removendo sessão local.");
      }
    }
    await storage.removeItem(SESSION_KEY);
    listeners.forEach((l) => l());
  },

  async resetPassword(email: string): Promise<void> {
    if (USE_SUPABASE && supabase) {
      const { error } = await withTimeout(
        supabase.auth.resetPasswordForEmail(email.trim()),
        AUTH_ACTION_TIMEOUT_MS,
        "Tempo limite ao solicitar recuperação de senha.",
      );
      if (error) throw new Error(friendlySupabaseError(error, "Não foi possível enviar o e-mail de recuperação."));
      return;
    }
    throw new Error("Recuperação de senha disponível apenas quando o Supabase estiver configurado.");
  },

  async update(id: string, patch: Partial<User>): Promise<User | undefined> {
    if (USE_SUPABASE && supabase && isUuid(id)) {
      const next: Record<string, unknown> = {};
      if (patch.name !== undefined) next.name = patch.name;
      if (patch.email !== undefined) next.email = patch.email;
      if (patch.phone !== undefined) next.phone = patch.phone;
      if (patch.role !== undefined) next.role = patch.role;
      if (patch.driverStatus !== undefined) next.driver_status = patch.driverStatus;
      if (patch.driverLevel !== undefined) next.driver_level = patch.driverLevel;
      if (patch.driverStatus === "blocked") next.is_blocked = true;
      if (patch.driverStatus === "approved" || patch.driverStatus === "none") next.is_blocked = false;
      let updated: any = null;
      if (Object.keys(next).length > 0) {
        const { data, error } = await supabase.from("profiles").update(next).eq("id", id).select("*, driver_wallets(operational_limit)").maybeSingle();
        if (error) throw new Error(friendlySupabaseError(error, "Não foi possível atualizar usuário."));
        updated = data;
      }
      if (patch.operationalLimit !== undefined) {
        const { error: walletError } = await supabase.from("driver_wallets").upsert({
          driver_id: id,
          operational_limit: Math.max(0, patch.operationalLimit),
        }, { onConflict: "driver_id" });
        if (walletError) throw new Error(friendlySupabaseError(walletError, "Não foi possível alterar o limite operacional."));
        if (updated) updated.driver_wallets = [{ operational_limit: Math.max(0, patch.operationalLimit) }];
      }
      listeners.forEach((l) => l());
      if (updated) return mapProfile(updated);
      return (await getSupabaseProfile(id)) ?? undefined;
    }
    const users = await load();
    const idx = users.findIndex((u) => u.id === id);
    if (idx < 0) return undefined;
    users[idx] = { ...users[idx], ...patch };
    cache = users;
    await persist();
    return users[idx];
  },

  async remove(id: string): Promise<void> {
    if (USE_SUPABASE && isUuid(id)) {
      await this.update(id, { driverStatus: "blocked" });
      return;
    }
    const users = await load();
    cache = users.filter((u) => u.id !== id);
    const sessionId = await storage.getItem<string>(SESSION_KEY, "");
    if (sessionId === id) await storage.removeItem(SESSION_KEY);
    await persist();
  },
};
