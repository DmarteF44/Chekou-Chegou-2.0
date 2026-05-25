// catalogService — establishments + products CRUD via AsyncStorage.
import { storage } from "@/src/utils/storage";
import { ESTABLISHMENTS as INITIAL_STORES, Establishment } from "@/src/data/mock";
import { USE_SUPABASE, friendlySupabaseError, isSupabaseUnavailable } from "@/src/config/runtime";
import { supabase } from "@/src/lib/supabase";

export type StoreBranch = "Mercado" | "Farmácia" | "Eletrônicos" | "Outros";
export type StoreType = "principal" | "parceiro" | "teste" | "em_breve";

export type Store = Establishment & {
  branch: StoreBranch;
  type: StoreType;
  address: string;
  phone?: string;
  baseFee: number;
  active: boolean;
  notes?: string;
};

export type ProductCategory =
  | "Mercearia" | "Bebidas" | "Limpeza" | "Higiene" | "Padaria" | "Hortifruti" | "Açougue"
  | "Medicamentos sem receita" | "Perfumaria" | "Curativos" | "Infantil"
  | "Cabos" | "Carregadores" | "Fones" | "Acessórios" | "Informática" | "Celulares"
  | "Outros";

export const STORE_BRANCHES: StoreBranch[] = ["Mercado", "Farmácia", "Eletrônicos", "Outros"];

export const STORE_TYPES: { id: StoreType; label: string }[] = [
  { id: "principal", label: "Principal" },
  { id: "parceiro", label: "Parceiro" },
  { id: "teste", label: "Teste" },
  { id: "em_breve", label: "Em breve" },
];

export const CATEGORIES_BY_BRANCH: Record<StoreBranch, ProductCategory[]> = {
  Mercado: ["Mercearia", "Bebidas", "Limpeza", "Higiene", "Padaria", "Hortifruti", "Açougue", "Outros"],
  Farmácia: ["Medicamentos sem receita", "Higiene", "Perfumaria", "Curativos", "Infantil", "Outros"],
  Eletrônicos: ["Cabos", "Carregadores", "Fones", "Acessórios", "Informática", "Celulares", "Outros"],
  Outros: ["Outros"],
};

export const PRODUCT_CATEGORIES: ProductCategory[] = Array.from(
  new Set(Object.values(CATEGORIES_BY_BRANCH).flat()),
);

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
const SEED_VERSION = "5";
const DEPRECATED_STORE_IDS = ["mercad" + "ao"];

const SEED_PRODUCTS: Product[] = [
  { id: "p1", name: "Arroz tipo 1 5kg", category: "Mercearia", storeId: "tosta-2", price: 28.9, active: true, confirmInStore: true },
  { id: "p2", name: "Feijão carioca 1kg", category: "Mercearia", storeId: "tosta-2", price: 7.5, active: true, confirmInStore: true },
  { id: "p3", name: "Leite integral 1L", category: "Mercearia", storeId: "tosta-2", price: 5.2, promoPrice: 4.5, active: true, confirmInStore: true },
  { id: "p4", name: "Coca-Cola 2L", category: "Bebidas", storeId: "tosta-2", price: 9.9, active: true, confirmInStore: true },
  { id: "p5", name: "Detergente", category: "Limpeza", storeId: "tosta-2", price: 2.9, active: true, confirmInStore: true },
  { id: "p6", name: "Pão francês kg", category: "Padaria", storeId: "tosta-2", price: 14.9, active: true, confirmInStore: true },
  { id: "p7", name: "Dipirona 500mg", category: "Medicamentos sem receita", storeId: "farmacia-parceira", price: 12.0, active: true, confirmInStore: true, notes: "Apenas itens sem retenção de receita." },
  { id: "p8", name: "Álcool 70% 500ml", category: "Higiene", storeId: "farmacia-parceira", price: 8.5, active: true, confirmInStore: true },
  { id: "p9", name: "Cabo USB-C 1m", category: "Cabos", storeId: "eletronicos-jatai", price: 19.9, active: true, confirmInStore: true },
  { id: "p10", name: "Carregador Turbo USB-C", category: "Carregadores", storeId: "eletronicos-jatai", price: 49.9, active: true, confirmInStore: true },
  { id: "p11", name: "Fone de ouvido P2", category: "Fones", storeId: "eletronicos-jatai", price: 29.9, active: true, confirmInStore: true },
  { id: "p12", name: "Película de vidro", category: "Acessórios", storeId: "eletronicos-jatai", price: 15.0, active: true, confirmInStore: true },
  { id: "p13", name: "Mouse sem fio", category: "Informática", storeId: "eletronicos-jatai", price: 39.9, active: true, confirmInStore: true },
];

export function normalizeStoreBranch(value?: string): StoreBranch {
  if (value === "Farmácia") return "Farmácia";
  if (value === "Eletrônicos") return "Eletrônicos";
  if (value === "Mercado") return "Mercado";
  return "Outros";
}

export function normalizeStoreType(value?: string): StoreType {
  if (value === "principal" || value === `mais_${"pedido"}`) return "principal";
  if (value === "parceiro" || value === `parceiro_${"oficial"}`) return "parceiro";
  if (value === "em_breve") return "em_breve";
  return "teste";
}

export function getStoreBranch(store?: Partial<Pick<Store, "branch" | "category">> | null): StoreBranch {
  return normalizeStoreBranch(store?.branch ?? store?.category);
}

export function categoriesForBranch(branch?: StoreBranch): ProductCategory[] {
  return CATEGORIES_BY_BRANCH[branch ?? "Outros"] ?? CATEGORIES_BY_BRANCH.Outros;
}

function normalizeProductCategory(category: string | undefined, branch: StoreBranch): ProductCategory {
  const compatible = categoriesForBranch(branch);
  return compatible.includes(category as ProductCategory) ? category as ProductCategory : compatible[0];
}

function sanitizeStore(store: Store): Store {
  const branch = normalizeStoreBranch(store.branch ?? store.category);
  return {
    ...store,
    name: store.name.trim(),
    branch,
    category: branch,
    image: store.image?.trim() ?? "",
    deliveryTime: store.deliveryTime?.trim() || "30–45 min",
    description: store.description?.trim() || "Estabelecimento local.",
    type: normalizeStoreType(store.type),
    address: store.address?.trim() || "Jataí-GO",
    phone: store.phone?.trim(),
    baseFee: Math.max(0, Number(store.baseFee) || 0),
    notes: store.notes?.trim(),
    active: Boolean(store.active),
  };
}

function sanitizeProduct(product: Product, store: Store): Product {
  const branch = getStoreBranch(store);
  const price = Math.max(0, Number(product.price) || 0);
  const promoPrice = typeof product.promoPrice === "number" && product.promoPrice >= 0 && product.promoPrice <= price
    ? product.promoPrice
    : undefined;
  return {
    ...product,
    name: product.name.trim(),
    storeId: store.id,
    category: normalizeProductCategory(product.category, branch),
    price,
    promoPrice,
    imageUrl: product.imageUrl?.trim() || undefined,
    notes: product.notes?.trim(),
    active: Boolean(product.active),
    confirmInStore: Boolean(product.confirmInStore),
  };
}

async function ensureSeed() {
  const seeded = await storage.getItem<string>(SEED_KEY, "");
  if (seeded === SEED_VERSION) return;
  const storeDetails: Record<string, Pick<Store, "branch" | "type" | "address" | "phone" | "baseFee" | "active" | "notes">> = {
    "tosta-2": {
      branch: "Mercado",
      type: "principal",
      address: "Av. Rio Claro, Jataí-GO",
      phone: "(64) 3636-0000",
      baseFee: 8,
      active: true,
      notes: "Mercado principal para demonstração local.",
    },
    "farmacia-parceira": {
      branch: "Farmácia",
      type: "parceiro",
      address: "R. das Flores, Jataí-GO",
      phone: "(64) 3636-0000",
      baseFee: 8,
      active: true,
      notes: "Itens sem retenção de receita no MVP local.",
    },
    "eletronicos-jatai": {
      branch: "Eletrônicos",
      type: "teste",
      address: "Av. Goiás, Centro, Jataí-GO",
      phone: "(64) 3636-0000",
      baseFee: 8,
      active: true,
      notes: "Loja de eletrônicos usada na apresentação.",
    },
  };
  const seedStores: Store[] = INITIAL_STORES.map((e) => sanitizeStore({
    ...e,
    ...(storeDetails[e.id] ?? {
      branch: normalizeStoreBranch(e.category),
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
  const storesById = new Map(stores.map((s) => [s.id, sanitizeStore(s)]));
  const productsById = new Map(products.map((p) => [p.id, p]));
  DEPRECATED_STORE_IDS.forEach((id) => storesById.delete(id));
  products.forEach((p) => {
    if (DEPRECATED_STORE_IDS.includes(p.storeId)) productsById.delete(p.id);
  });
  seedStores.forEach((s) => storesById.set(s.id, storesById.has(s.id) ? { ...storesById.get(s.id)!, ...s } : s));
  SEED_PRODUCTS.forEach((p) => productsById.set(p.id, productsById.has(p.id) ? { ...productsById.get(p.id)!, ...p } : p));
  Array.from(productsById.entries()).forEach(([id, product]) => {
    const store = storesById.get(product.storeId);
    if (!store) productsById.delete(id);
    else productsById.set(id, sanitizeProduct(product, store));
  });
  await storage.setItem(STORES_KEY, JSON.stringify(Array.from(storesById.values())));
  await storage.setItem(PRODUCTS_KEY, JSON.stringify(Array.from(productsById.values())));
  await storage.setItem(SEED_KEY, SEED_VERSION);
}

const listeners = new Set<() => void>();
function notify() { listeners.forEach((l) => l()); }

function isUuid(id?: string) {
  return Boolean(id?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i));
}

function mapStore(row: any): Store {
  const branch = normalizeStoreBranch(row.branch);
  return {
    id: row.id,
    name: row.name ?? "",
    branch,
    category: branch,
    image: row.image_url ?? "",
    deliveryTime: row.delivery_time ?? "30–45 min",
    rating: Number(row.rating ?? 4.7),
    description: row.description ?? row.notes ?? "",
    type: normalizeStoreType(row.type),
    address: row.address ?? "Jataí-GO",
    phone: row.phone ?? "",
    baseFee: Number(row.base_fee ?? 8),
    active: row.active ?? true,
    notes: row.notes ?? "",
  };
}

function mapProduct(row: any): Product {
  return {
    id: row.id,
    name: row.name ?? "",
    category: row.category as ProductCategory,
    storeId: row.establishment_id,
    price: Number(row.price ?? 0),
    promoPrice: row.promo_price === null || row.promo_price === undefined ? undefined : Number(row.promo_price),
    active: row.active ?? true,
    confirmInStore: row.confirm_in_store ?? true,
    imageUrl: row.image_url ?? undefined,
    notes: row.notes ?? undefined,
  };
}

function storePayload(store: Store) {
  const clean = sanitizeStore(store);
  return {
    name: clean.name,
    branch: clean.branch,
    type: clean.type,
    address: clean.address,
    phone: clean.phone,
    base_fee: clean.baseFee,
    active: clean.active,
    image_url: clean.image || null,
    notes: clean.notes,
    delivery_time: clean.deliveryTime,
    rating: clean.rating,
    description: clean.description,
  };
}

function productPayload(product: Product, store: Store) {
  const clean = sanitizeProduct(product, store);
  return {
    establishment_id: clean.storeId,
    name: clean.name,
    branch: getStoreBranch(store),
    category: clean.category,
    price: clean.price,
    promo_price: clean.promoPrice ?? null,
    active: clean.active,
    confirm_in_store: clean.confirmInStore,
    image_url: clean.imageUrl ?? null,
    notes: clean.notes,
  };
}

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
    if (USE_SUPABASE && supabase) {
      let query = supabase.from("establishments").select("*").order("name", { ascending: true });
      if (opts?.activeOnly) query = query.eq("active", true);
      const { data, error } = await query;
      if (!error) return (data ?? []).map(mapStore);
      if (!isSupabaseUnavailable(error)) throw new Error(friendlySupabaseError(error, "Não foi possível listar estabelecimentos."));
      console.warn("Supabase indisponível ao listar estabelecimentos; usando catálogo local.", error);
    }
    const all = await readStores();
    return opts?.activeOnly ? all.filter((s) => s.active) : all;
  },
  async getStore(id: string): Promise<Store | undefined> {
    if (USE_SUPABASE && supabase) {
      const base = supabase.from("establishments").select("*");
      const { data, error } = isUuid(id)
        ? await base.eq("id", id).maybeSingle()
        : await base.eq("slug", id).maybeSingle();
      if (!error) return data ? mapStore(data) : undefined;
      if (!isSupabaseUnavailable(error)) throw new Error(friendlySupabaseError(error, "Não foi possível carregar estabelecimento."));
      console.warn("Supabase indisponível ao carregar estabelecimento; usando catálogo local.", error);
    }
    const all = await readStores();
    return all.find((s) => s.id === id);
  },
  async upsertStore(store: Store): Promise<void> {
    if (!store.name?.trim()) throw new Error("Estabelecimento sem nome.");
    if (!normalizeStoreBranch(store.branch ?? store.category)) throw new Error("Estabelecimento sem ramo.");
    if (USE_SUPABASE && supabase) {
      const payload = storePayload(store);
      const query = isUuid(store.id)
        ? supabase.from("establishments").update(payload).eq("id", store.id)
        : supabase.from("establishments").insert(payload);
      const { error } = await query;
      if (!error) {
        notify();
        return;
      }
      if (!isSupabaseUnavailable(error)) throw new Error(friendlySupabaseError(error, "Não foi possível salvar estabelecimento."));
      console.warn("Supabase indisponível ao salvar estabelecimento; salvando localmente.", error);
    }
    const all = await readStores();
    const idx = all.findIndex((s) => s.id === store.id);
    const sanitized = sanitizeStore(store);
    if (idx >= 0) all[idx] = sanitized; else all.push(sanitized);
    await writeStores(all);
  },
  async deleteStore(id: string): Promise<void> {
    if (USE_SUPABASE && supabase) {
      const { error } = await supabase.from("establishments").delete().eq("id", id);
      if (!error) {
        notify();
        return;
      }
      if (!isSupabaseUnavailable(error)) throw new Error(friendlySupabaseError(error, "Não foi possível remover estabelecimento."));
      console.warn("Supabase indisponível ao remover estabelecimento; removendo localmente.", error);
    }
    const all = (await readStores()).filter((s) => s.id !== id);
    await writeStores(all);
  },

  // Products
  async listProducts(opts?: { storeId?: string; activeOnly?: boolean; category?: ProductCategory; branch?: StoreBranch }): Promise<Product[]> {
    if (USE_SUPABASE && supabase) {
      let query = supabase.from("products").select("*").order("name", { ascending: true });
      if (opts?.storeId) query = query.eq("establishment_id", opts.storeId);
      if (opts?.activeOnly) query = query.eq("active", true);
      if (opts?.category) query = query.eq("category", opts.category);
      if (opts?.branch) query = query.eq("branch", opts.branch);
      const { data, error } = await query;
      if (!error) return (data ?? []).map(mapProduct);
      if (!isSupabaseUnavailable(error)) throw new Error(friendlySupabaseError(error, "Não foi possível listar produtos."));
      console.warn("Supabase indisponível ao listar produtos; usando catálogo local.", error);
    }
    let all = await readProducts();
    if (opts?.storeId) all = all.filter((p) => p.storeId === opts.storeId);
    if (opts?.activeOnly) all = all.filter((p) => p.active);
    if (opts?.category) all = all.filter((p) => p.category === opts.category);
    if (opts?.branch) {
      const stores = await readStores();
      const byId = new Map(stores.map((s) => [s.id, s]));
      all = all.filter((p) => getStoreBranch(byId.get(p.storeId)) === opts.branch);
    }
    return all;
  },
  async upsertProduct(p: Product): Promise<void> {
    if (!p.name?.trim()) throw new Error("Produto sem nome.");
    if (!p.storeId) throw new Error("Produto sem estabelecimento.");
    if (Number(p.price) < 0 || Number(p.promoPrice ?? 0) < 0) throw new Error("Preço inválido.");
    if (p.promoPrice !== undefined && Number(p.promoPrice) > Number(p.price)) {
      throw new Error("O preço promocional não pode superar o preço estimado.");
    }
    if (USE_SUPABASE && supabase) {
      const store = await this.getStore(p.storeId);
      if (!store) throw new Error("Estabelecimento do produto não encontrado.");
      const payload = productPayload(p, store);
      const query = isUuid(p.id)
        ? supabase.from("products").update(payload).eq("id", p.id)
        : supabase.from("products").insert(payload);
      const { error } = await query;
      if (!error) {
        notify();
        return;
      }
      if (!isSupabaseUnavailable(error)) throw new Error(friendlySupabaseError(error, "Não foi possível salvar produto."));
      console.warn("Supabase indisponível ao salvar produto; salvando localmente.", error);
    }
    const stores = await readStores();
    const store = stores.find((s) => s.id === p.storeId);
    if (!store) throw new Error("Estabelecimento do produto não encontrado.");
    const all = await readProducts();
    const idx = all.findIndex((x) => x.id === p.id);
    const sanitized = sanitizeProduct(p, store);
    if (idx >= 0) all[idx] = sanitized; else all.push(sanitized);
    await writeProducts(all);
  },
  async deleteProduct(id: string): Promise<void> {
    if (USE_SUPABASE && supabase) {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (!error) {
        notify();
        return;
      }
      if (!isSupabaseUnavailable(error)) throw new Error(friendlySupabaseError(error, "Não foi possível remover produto."));
      console.warn("Supabase indisponível ao remover produto; removendo localmente.", error);
    }
    const all = (await readProducts()).filter((p) => p.id !== id);
    await writeProducts(all);
  },
};
