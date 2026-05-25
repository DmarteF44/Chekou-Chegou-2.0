// orderService — thin facade over orderStore + future Supabase backend.
// Today the source of truth is local AsyncStorage via orderStore.
import { orderStore, generateCode, generateId } from "@/src/data/orderStore";
import { Order, OrderStatus, ChatMessage } from "@/src/data/mock";

export const orderService = {
  subscribe: orderStore.subscribe.bind(orderStore),
  list: orderStore.getAll.bind(orderStore),
  getById: orderStore.getById.bind(orderStore),
  available: orderStore.getAvailable.bind(orderStore),
  driverActive: orderStore.getDriverActive.bind(orderStore),
  driverHistory: orderStore.getDriverHistory.bind(orderStore),
  create: orderStore.create.bind(orderStore),
  update: orderStore.update.bind(orderStore),
  setStatus: orderStore.setStatus.bind(orderStore),
  declineComplement: orderStore.declineComplement.bind(orderStore),
  addMessage: orderStore.addMessage.bind(orderStore),
  clearAll: orderStore.clearAll.bind(orderStore),
  newId: generateId,
  newCode: generateCode,
};

export type { Order, OrderStatus, ChatMessage };
