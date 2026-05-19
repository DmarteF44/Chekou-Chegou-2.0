// catalogService — establishments + products CRUD via AsyncStorage.
import { storage } from "@/src/utils/storage";
import { ESTABLISHMENTS as INITIAL_STORES, Establishment } from "@/src/data/mock";

export type StoreType = "mais_pedido" | "parceiro_oficial" | "teste";

export type Store = Establishment & {
  type: StoreType;
  address: string;
  phone?: string;
  baseFee: number;
  active: boolean;
  notes?: string;
};

export type ProductCategory =
  | "Mercado" | "Farmácia" | "Eletrônicos" | "Bebidas" | "Higiene" | "Limpeza" | "Padaria" | "Outros";

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  "Mercado", "Farmácia", "Eletrônicos", "Bebidas", "Higiene", "Limpeza", "Padaria", "Outros",
];

export type Product = {
  id: string;
  name: string;
  category: ProductCategory;
  storeId: string;
  price: number;
  promoPrice?: number;
  active: boolean;
  confirmInStore: boolean;
  imageUrl?: string;
  notes?: string;
};

const STORES_KEY = "chekou_stores_v1";
const PRODUCTS_KEY = "chekou_products_v1";
const SEED_KEY = "chekou_catalog_seed_v1";
const SEED_VERSION = "4";
const DEPRECATED_STORE_IDS = ["mercad" + "ao"];

const SEED_PRODUCTS: Product[] = [
  { id: "p1", name: "Arroz tipo 1 5kg", category: "Mercado", storeId: "tosta-2", price: 28.9, active: true, confirmInStore: true },
  { id: "p2", name: "Feijão carioca 1kg", category: "Mercado", storeId: "tosta-2", price: 7.5, active: true, confirmInStore: true },
  { id: "p3", name: "Leite integral 1L", category: "Mercado", storeId: "tosta-2", price: 5.2, promoPrice: 4.5, active: true, confirmInStore: true },
  { id: "p4", name: "Coca-Cola 2L", category: "Bebidas", storeId: "tosta-2", price: 9.9, active: true, confirmInStore: true },
  { id: "p5", name: "Detergente", category: "Limpeza", storeId: "tosta-2", price: 2.9, active: true, confirmInStore: true },
  { id: "p6", name: "Pão francês kg", category: "Padaria", storeId: "tosta-2", price: 14.9, active: true, confirmInStore: true },
  { id: "p7", name: "Dipirona 500mg", category: "Farmácia", storeId: "farmacia-parceira", price: 12.0, active: true, confirmInStore: true, notes: "Apenas itens sem retenção de receita." },
  { id: "p8", name: "Álcool 70% 500ml", category: "Higiene", storeId: "farmacia-parceira", price: 8.5, active: true, confirmInStore: true },
  { id: "p9", name: "Cabo USB-C 1m", category: "Eletrônicos", storeId: "eletronicos-jatai", price: 19.9, active: true, confirmInStore: true },
  { id: "p10", name: "Carregador Turbo USB-C", category: "Eletrônicos", storeId: "eletronicos-jatai", price: 49.9, active: true, confirmInStore: true },
  { id: "p11", name: "Fone de ouvido P2", category: "Eletrônicos", storeId: "eletronicos-jatai", price: 29.9, active: true, confirmInStore: true },
  { id: "p12", name: "Película de vidro", category: "Eletrônicos", storeId: "eletronicos-jatai", price: 15.0, active: true, confirmInStore: true },
  { id: "p13", name: "Mouse sem fio", category: "Eletrônicos", storeId: "eletronicos-jatai", price: 39.9, active: true, confirmInStore: true },
];

async function ensureSeed() {
  const seeded = await storage.getItem<string>(SEED_KEY, "");
  if (seeded === SEED_VERSION) return;
  const storeDetails: Record<string, Pick<Store, "type" | "address" | "phone" | "baseFee" | "active">> = {
    "tosta-2": {
      type: "mais_pedido",
      address: "Av. Rio Claro, Jataí-GO",
      phone: "(64) 3636-0000",
      baseFee: 8,
      active: true,
    },
    "farmacia-parceira": {
      type: "parceiro_oficial",
      address: "R. das Flores, Jataí-GO",
      phone: "(64) 3636-0000",
      baseFee: 8,
      active: true,
    },
    "eletronicos-jatai": {
      type: "teste",
      address: "Av. Goiás, Centro, Jataí-GO",
      phone: "(64) 3636-0000",
      baseFee: 8,
      active: true,
    },
  };
  const seedStores: Store[] = INITIAL_STORES.map((e) => ({
    ...e,
    ...(storeDetails[e.id] ?? {
      type: "teste" as StoreType,
      address: "Jataí-GO",
      phone: "(64) 3636-0000",
      baseFee: 8,
      active: true,
    }),
  }));
  const rawStores = (await storage.getItem<string>(STORES_KEY, "")) || "";
  const rawProducts = (await storage.getItem<string>(PRODUCTS_KEY, "")) || "";
  const stores = rawStores ? (JSON.parse(rawStores) as Store[]) : [];
  const products = rawProducts ? (JSON.parse(rawProducts) as Product[]) : [];
  const storesById = new Map(stores.map((s) => [s.id, s]));
  const productsById = new Map(products.map((p) => [p.id, p]));
  DEPRECATED_STORE_IDS.forEach((id) => storesById.delete(id));
  products.forEach((p) => {
    if (DEPRECATED_STORE_IDS.includes(p.storeId)) productsById.delete(p.id);
  });
  seedStores.forEach((s) => storesById.set(s.id, storesById.has(s.id) ? { ...storesById.get(s.id)!, ...s } : s));
  SEED_PRODUCTS.forEach((p) => productsById.set(p.id, productsById.has(p.id) ? { ...productsById.get(p.id)!, ...p } : p));
  await storage.setItem(STORES_KEY, JSON.stringify(Array.from(storesById.values())));
  await storage.setItem(PRODUCTS_KEY, JSON.stringify(Array.from(productsById.values())));
  await storage.setItem(SEED_KEY, SEED_VERSION);
}

const listeners = new Set<() => void>();
function notify() { listeners.forEach((l) => l()); }

async function readStores(): Promise<Store[]> {
  await ensureSeed();
  const raw = (await storage.getItem<string>(STORES_KEY, "")) || "";
  return raw ? (JSON.parse(raw) as Store[]) : [];
}
async function writeStores(list: Store[]) {
  await storage.setItem(STORES_KEY, JSON.stringify(list));
  notify();
}
async function readProducts(): Promise<Product[]> {
  await ensureSeed();
  const raw = (await storage.getItem<string>(PRODUCTS_KEY, "")) || "";
  return raw ? (JSON.parse(raw) as Product[]) : [];
}
async function writeProducts(list: Product[]) {
  await storage.setItem(PRODUCTS_KEY, JSON.stringify(list));
  notify();
}

export const catalogService = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  },

  // Stores
  async listStores(opts?: { activeOnly?: boolean }): Promise<Store[]> {
    const all = await readStores();
    return opts?.activeOnly ? all.filter((s) => s.active) : all;
  },
  async getStore(id: string): Promise<Store | undefined> {
    const all = await readStores();
    return all.find((s) => s.id === id);
  },
  async upsertStore(store: Store): Promise<void> {
    const all = await readStores();
    const idx = all.findIndex((s) => s.id === store.id);
    if (idx >= 0) all[idx] = store; else all.push(store);
    await writeStores(all);
  },
  async deleteStore(id: string): Promise<void> {
    const all = (await readStores()).filter((s) => s.id !== id);
    await writeStores(all);
  },

  // Products
  async listProducts(opts?: { storeId?: string; activeOnly?: boolean }): Promise<Product[]> {
    let all = await readProducts();
    if (opts?.storeId) all = all.filter((p) => p.storeId === opts.storeId);
    if (opts?.activeOnly) all = all.filter((p) => p.active);
    return all;
  },
  async upsertProduct(p: Product): Promise<void> {
    const all = await readProducts();
    const idx = all.findIndex((x) => x.id === p.id);
    if (idx >= 0) all[idx] = p; else all.push(p);
    await writeProducts(all);
  },
  async deleteProduct(id: string): Promise<void> {
    const all = (await readProducts()).filter((p) => p.id !== id);
    await writeProducts(all);
  },
};
