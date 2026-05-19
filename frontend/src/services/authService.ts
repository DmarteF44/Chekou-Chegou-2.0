// authService — local/offline authentication backed by AsyncStorage.
import { storage } from "@/src/utils/storage";
import { USE_SUPABASE, friendlySupabaseError } from "@/src/config/runtime";
import { supabase } from "@/src/lib/supabase";

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
  return {
    id: row.id,
    name: row.name ?? "Cliente",
    email: row.email ?? "",
    phone: row.phone ?? "",
    role: row.role ?? "client",
    driverStatus: row.is_blocked ? "blocked" : driverStatus,
    driverLevel: row.driver_level ?? 1,
    operationalLimit: row.operational_limit ?? undefined,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

async function getSupabaseProfile(userId: string): Promise<User | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(friendlySupabaseError(error, "Não foi possível carregar seu perfil."));
  return data ? mapProfile(data) : null;
}

export const authService = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  },

  async getAllUsers(): Promise<User[]> {
    if (USE_SUPABASE && supabase) {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw new Error(friendlySupabaseError(error, "Não foi possível listar usuários."));
      return (data ?? []).map(mapProfile);
    }
    return [...(await load())];
  },

  async getById(id: string): Promise<User | undefined> {
    if (USE_SUPABASE && supabase) {
      const profile = await getSupabaseProfile(id);
      return profile ?? undefined;
    }
    const users = await load();
    return users.find((u) => u.id === id);
  },

  async login(email: string, password: string): Promise<User | null> {
    if (USE_SUPABASE && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) return null;
      const profile = data.user ? await getSupabaseProfile(data.user.id) : null;
      listeners.forEach((l) => l());
      return profile;
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
      const { data, error } = await supabase.auth.signUp({
        email: input.email.trim(),
        password: input.password,
        options: {
          data: {
            name: input.name.trim(),
            phone: input.phone.trim(),
          },
        },
      });
      if (error || !data.user) return null;
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
    if (USE_SUPABASE && supabase) {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.user) return null;
      try {
        return await getSupabaseProfile(data.session.user.id);
      } catch {
        return null;
      }
    }
    const id = await storage.getItem<string>(SESSION_KEY, "");
    if (!id) return null;
    const u = await this.getById(id);
    return u ?? null;
  },

  async logout(): Promise<void> {
    if (USE_SUPABASE && supabase) {
      await supabase.auth.signOut();
      listeners.forEach((l) => l());
      return;
    }
    await storage.removeItem(SESSION_KEY);
    listeners.forEach((l) => l());
  },

  async update(id: string, patch: Partial<User>): Promise<User | undefined> {
    if (USE_SUPABASE && supabase) {
      const next: Record<string, unknown> = {};
      if (patch.name !== undefined) next.name = patch.name;
      if (patch.email !== undefined) next.email = patch.email;
      if (patch.phone !== undefined) next.phone = patch.phone;
      if (patch.role !== undefined) next.role = patch.role;
      if (patch.driverStatus !== undefined) next.driver_status = patch.driverStatus;
      if (patch.driverLevel !== undefined) next.driver_level = patch.driverLevel;
      if (patch.driverStatus === "blocked") next.is_blocked = true;
      if (patch.driverStatus === "approved" || patch.driverStatus === "none") next.is_blocked = false;
      const { data, error } = await supabase.from("profiles").update(next).eq("id", id).select("*").maybeSingle();
      if (error) throw new Error(friendlySupabaseError(error, "Não foi possível atualizar usuário."));
      listeners.forEach((l) => l());
      return data ? mapProfile(data) : undefined;
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
    if (USE_SUPABASE) {
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
