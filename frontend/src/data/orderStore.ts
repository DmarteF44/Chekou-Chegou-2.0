import { storage } from "@/src/utils/storage";
import { Order, OrderStatus, ChatMessage } from "./mock";
import { USE_SUPABASE, friendlySupabaseError } from "@/src/config/runtime";
import { supabase } from "@/src/lib/supabase";

const ORDERS_KEY = "chekou_orders_v1";

type Listener = () => void;
const listeners = new Set<Listener>();

let cache: Order[] | null = null;

function mapOrder(row: any): Order {
  const orderItems = (row.order_items ?? []).map((item: any) => ({
    productId: item.product_id ?? undefined,
    name: item.name,
    quantity: Number(item.quantity ?? 1),
    unitPrice: Number(item.unit_price ?? 0),
    total: Number(item.total ?? 0),
    custom: item.custom ?? false,
    notes: item.notes ?? undefined,
  }));
  return {
    id: row.id,
    clientId: row.client_id,
    driverId: row.driver_id ?? undefined,
    storeId: row.establishment_id,
    storeName: row.establishments?.name ?? "Estabelecimento",
    items: orderItems.map((item: any) => `${item.quantity}x ${item.name} - R$ ${Number(item.total).toFixed(2)}`).join("\n"),
    orderItems,
    notes: row.notes ?? "",
    subtotal: Number(row.subtotal ?? 0),
    customSubtotal: Number(row.custom_subtotal ?? 0),
    estimatedValue: Number(row.subtotal ?? 0) + Number(row.custom_subtotal ?? 0),
    safetyMargin: Number(row.safety_margin ?? 0),
    authorizedPurchaseLimit: Number(row.authorized_purchase_limit ?? 0),
    deliveryFee: Number(row.delivery_fee ?? 0),
    platformFee: Number(row.platform_fee ?? 0),
    discount: Number(row.discount ?? 0),
    total: Number(row.total ?? 0),
    couponCode: row.coupon_code ?? undefined,
    status: row.status ?? "Aguardando entregador",
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    confirmationCode: row.confirmation_code ?? "",
    actualValue: row.actual_value === null || row.actual_value === undefined ? undefined : Number(row.actual_value),
    invoicePhotoSent: row.invoice_photo_sent ?? false,
    goodsPhotoSent: row.goods_photo_sent ?? false,
    chat: [],
    paid: row.paid ?? false,
    complementAmount: row.complement_amount === null || row.complement_amount === undefined ? undefined : Number(row.complement_amount),
    complementApprovedAt: row.complement_approved_at ? new Date(row.complement_approved_at).getTime() : undefined,
  };
}

function orderPayload(order: Order) {
  return {
    client_id: order.clientId,
    driver_id: order.driverId ?? null,
    establishment_id: order.storeId,
    status: order.status,
    subtotal: order.subtotal,
    custom_subtotal: order.customSubtotal,
    safety_margin: order.safetyMargin,
    authorized_purchase_limit: order.authorizedPurchaseLimit,
    delivery_fee: order.deliveryFee,
    platform_fee: order.platformFee,
    discount: order.discount,
    total: order.total,
    actual_value: order.actualValue ?? null,
    confirmation_code: order.confirmationCode,
    coupon_code: order.couponCode ?? null,
    notes: order.notes,
    paid: order.paid,
    invoice_photo_sent: order.invoicePhotoSent,
    goods_photo_sent: order.goodsPhotoSent,
    complement_amount: order.complementAmount ?? null,
    complement_approved_at: order.complementApprovedAt ? new Date(order.complementApprovedAt).toISOString() : null,
  };
}

function patchPayload(patch: Partial<Order>) {
  const next: Record<string, unknown> = {};
  if (patch.driverId !== undefined) next.driver_id = patch.driverId;
  if (patch.status !== undefined) next.status = patch.status;
  if (patch.actualValue !== undefined) next.actual_value = patch.actualValue;
  if (patch.authorizedPurchaseLimit !== undefined) next.authorized_purchase_limit = patch.authorizedPurchaseLimit;
  if (patch.complementAmount !== undefined) next.complement_amount = patch.complementAmount;
  if (patch.complementApprovedAt !== undefined) next.complement_approved_at = new Date(patch.complementApprovedAt).toISOString();
  if (patch.total !== undefined) next.total = patch.total;
  if (patch.invoicePhotoSent !== undefined) next.invoice_photo_sent = patch.invoicePhotoSent;
  if (patch.goodsPhotoSent !== undefined) next.goods_photo_sent = patch.goodsPhotoSent;
  if (patch.notes !== undefined) next.notes = patch.notes;
  return next;
}

async function fetchOrders() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("orders")
    .select("*, establishments(name), order_items(*)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(friendlySupabaseError(error, "Não foi possível listar pedidos."));
  return (data ?? []).map(mapOrder);
}

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
    if (USE_SUPABASE && supabase) return fetchOrders();
    const list = await load();
    return [...list].sort((a, b) => b.createdAt - a.createdAt);
  },

  async getById(id: string): Promise<Order | undefined> {
    if (USE_SUPABASE && supabase) {
      const { data, error } = await supabase
        .from("orders")
        .select("*, establishments(name), order_items(*)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(friendlySupabaseError(error, "Não foi possível carregar pedido."));
      return data ? mapOrder(data) : undefined;
    }
    const list = await load();
    return list.find((o) => o.id === id);
  },

  async getByClient(clientId?: string): Promise<Order[]> {
    const all = await this.getAll();
    return clientId ? all.filter((o) => o.clientId === clientId) : all;
  },

  async getAvailable(): Promise<Order[]> {
    if (USE_SUPABASE && supabase) {
      return (await fetchOrders()).filter((o) => o.status === "Aguardando entregador" && !o.driverId);
    }
    const list = await load();
    return list
      .filter((o) => o.status === "Aguardando entregador" && !o.driverId)
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  async getDriverActive(driverId: string): Promise<Order[]> {
    if (USE_SUPABASE && supabase) {
      return (await fetchOrders()).filter((o) => o.driverId === driverId && o.status !== "Entregue" && o.status !== "Cancelado");
    }
    const list = await load();
    return list
      .filter((o) => o.driverId === driverId && o.status !== "Entregue" && o.status !== "Cancelado")
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  async getDriverHistory(driverId: string): Promise<Order[]> {
    if (USE_SUPABASE && supabase) {
      return (await fetchOrders()).filter((o) => o.driverId === driverId && o.status === "Entregue");
    }
    const list = await load();
    return list
      .filter((o) => o.driverId === driverId && o.status === "Entregue")
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  async create(order: Order): Promise<void> {
    if (USE_SUPABASE && supabase) {
      const { data, error } = await supabase
        .from("orders")
        .insert(orderPayload(order))
        .select("id")
        .single();
      if (error) throw new Error(friendlySupabaseError(error, "Não foi possível criar pedido."));
      order.id = data.id;
      const items = (order.orderItems ?? []).map((item) => ({
        order_id: data.id,
        product_id: item.productId && item.productId.startsWith("p_") ? null : item.productId ?? null,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total: item.total,
        custom: item.custom ?? false,
        notes: null,
      }));
      if (items.length > 0) {
        const { error: itemError } = await supabase.from("order_items").insert(items);
        if (itemError) throw new Error(friendlySupabaseError(itemError, "Pedido criado, mas os itens não foram salvos."));
      }
      listeners.forEach((l) => l());
      return;
    }
    const list = await load();
    list.push(order);
    cache = list;
    await persist();
  },

  async update(id: string, patch: Partial<Order>): Promise<Order | undefined> {
    if (USE_SUPABASE && supabase) {
      const { data, error } = await supabase
        .from("orders")
        .update(patchPayload(patch))
        .eq("id", id)
        .select("*, establishments(name), order_items(*)")
        .maybeSingle();
      if (error) throw new Error(friendlySupabaseError(error, "Não foi possível atualizar pedido."));
      listeners.forEach((l) => l());
      return data ? mapOrder(data) : undefined;
    }
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
    if (USE_SUPABASE && supabase) {
      listeners.forEach((l) => l());
      return;
    }
    const list = await load();
    const idx = list.findIndex((o) => o.id === id);
    if (idx < 0) return;
    list[idx] = { ...list[idx], chat: [...list[idx].chat, msg] };
    cache = list;
    await persist();
  },

  async clearAll(): Promise<void> {
    if (USE_SUPABASE) return;
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
