import { storage } from "@/src/utils/storage";
import { Order, OrderStatus, ChatMessage } from "./mock";

const ORDERS_KEY = "chekou_orders_v1";

type Listener = () => void;
const listeners = new Set<Listener>();

let cache: Order[] | null = null;

async function load(): Promise<Order[]> {
  if (cache) return cache;
  const raw = (await storage.getItem<string>(ORDERS_KEY, "")) || "";
  if (!raw) {
    cache = [];
    return cache;
  }
  try {
    cache = JSON.parse(raw) as Order[];
  } catch {
    cache = [];
  }
  return cache!;
}

async function persist() {
  await storage.setItem(ORDERS_KEY, JSON.stringify(cache ?? []));
  listeners.forEach((l) => l());
}

export const orderStore = {
  subscribe(cb: Listener) {
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  },

  async getAll(): Promise<Order[]> {
    const list = await load();
    return [...list].sort((a, b) => b.createdAt - a.createdAt);
  },

  async getById(id: string): Promise<Order | undefined> {
    const list = await load();
    return list.find((o) => o.id === id);
  },

  async getByClient(clientId?: string): Promise<Order[]> {
    const all = await this.getAll();
    return clientId ? all.filter((o) => o.clientId === clientId) : all;
  },

  async getAvailable(): Promise<Order[]> {
    const list = await load();
    return list
      .filter((o) => o.status === "Aguardando entregador" && !o.driverId)
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  async getDriverActive(driverId: string): Promise<Order[]> {
    const list = await load();
    return list
      .filter((o) => o.driverId === driverId && o.status !== "Entregue" && o.status !== "Cancelado")
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  async getDriverHistory(driverId: string): Promise<Order[]> {
    const list = await load();
    return list
      .filter((o) => o.driverId === driverId && o.status === "Entregue")
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  async create(order: Order): Promise<void> {
    const list = await load();
    list.push(order);
    cache = list;
    await persist();
  },

  async update(id: string, patch: Partial<Order>): Promise<Order | undefined> {
    const list = await load();
    const idx = list.findIndex((o) => o.id === id);
    if (idx < 0) return undefined;
    list[idx] = { ...list[idx], ...patch };
    cache = list;
    await persist();
    return list[idx];
  },

  async setStatus(id: string, status: OrderStatus): Promise<void> {
    await this.update(id, { status });
  },

  async addMessage(id: string, msg: ChatMessage): Promise<void> {
    const list = await load();
    const idx = list.findIndex((o) => o.id === id);
    if (idx < 0) return;
    list[idx] = { ...list[idx], chat: [...list[idx].chat, msg] };
    cache = list;
    await persist();
  },

  async clearAll(): Promise<void> {
    cache = [];
    await persist();
  },
};

export function generateCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export function generateId(): string {
  return `ord_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}
