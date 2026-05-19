// authService — local/offline authentication backed by AsyncStorage.
import { storage } from "@/src/utils/storage";

export type Role = "client" | "driver" | "admin";
export type DriverStatus = "none" | "pending" | "approved" | "rejected" | "blocked";

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  password: string; // mock only — never store plaintext in real backend
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
    id: "u_admin_local", name: "Dragon Fire Admin", email: "admin@chekou.local",
    phone: "(64) 90000-0000", password: "admin123",
    role: "admin", driverStatus: "none", createdAt: Date.now(),
  },
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
  {
    id: "u_admin_1", name: "Admin Chekou", email: "admin@chekou.com",
    phone: "(64) 90000-0000", password: "admin123",
    role: "admin", driverStatus: "none", createdAt: Date.now(),
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

export const authService = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  },

  async getAllUsers(): Promise<User[]> {
    return [...(await load())];
  },

  async getById(id: string): Promise<User | undefined> {
    const users = await load();
    return users.find((u) => u.id === id);
  },

  async login(email: string, password: string): Promise<User | null> {
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
    const id = await storage.getItem<string>(SESSION_KEY, "");
    if (!id) return null;
    const u = await this.getById(id);
    return u ?? null;
  },

  async logout(): Promise<void> {
    await storage.removeItem(SESSION_KEY);
    listeners.forEach((l) => l());
  },

  async update(id: string, patch: Partial<User>): Promise<User | undefined> {
    const users = await load();
    const idx = users.findIndex((u) => u.id === id);
    if (idx < 0) return undefined;
    users[idx] = { ...users[idx], ...patch };
    cache = users;
    await persist();
    return users[idx];
  },

  async remove(id: string): Promise<void> {
    const users = await load();
    cache = users.filter((u) => u.id !== id);
    const sessionId = await storage.getItem<string>(SESSION_KEY, "");
    if (sessionId === id) await storage.removeItem(SESSION_KEY);
    await persist();
  },
};
