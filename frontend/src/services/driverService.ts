// driverService — handles partner application, levels, status changes.
// FUTURE: move to Supabase tables (drivers, driver_applications, driver_levels).
import { authService, User } from "./authService";
import { storage } from "@/src/utils/storage";

export type DriverLevel = 1 | 2 | 3 | 4;

export type DriverApplication = {
  userId: string;
  fullName: string;
  cpf: string;
  phone: string;
  email: string;
  vehicleType: "moto" | "carro" | "bicicleta";
  plate?: string;
  cnh?: string;
  region: string;
  pixKey: string;
  acceptedTerms: boolean;
  submittedAt: number;
};

const APPS_KEY = "chekou_driver_apps_v1";

export const DRIVER_LEVELS: Record<DriverLevel, {
  name: string;
  limit: number;
  minDeliveries: number;
  description: string;
  color: string;
}> = {
  1: { name: "Novo parceiro", limit: 50, minDeliveries: 0, description: "Começo da jornada", color: "#9CA3AF" },
  2: { name: "Parceiro confiável", limit: 150, minDeliveries: 20, description: "Volume estável", color: "#3B82F6" },
  3: { name: "Parceiro premium", limit: 300, minDeliveries: 80, description: "Alta confiança", color: "#10B981" },
  4: { name: "Parceiro elite", limit: 500, minDeliveries: 200, description: "Top performance", color: "#F59E0B" },
};

async function loadApps(): Promise<DriverApplication[]> {
  const raw = (await storage.getItem<string>(APPS_KEY, "")) || "";
  return raw ? (JSON.parse(raw) as DriverApplication[]) : [];
}

async function saveApps(list: DriverApplication[]) {
  await storage.setItem(APPS_KEY, JSON.stringify(list));
}

export const driverService = {
  async submitApplication(app: DriverApplication): Promise<void> {
    const list = await loadApps();
    const idx = list.findIndex((a) => a.userId === app.userId);
    if (idx >= 0) list[idx] = app; else list.push(app);
    await saveApps(list);
    await authService.update(app.userId, { driverStatus: "pending" });
  },

  async getApplication(userId: string): Promise<DriverApplication | undefined> {
    const list = await loadApps();
    return list.find((a) => a.userId === userId);
  },

  async getAllApplications(): Promise<DriverApplication[]> {
    return loadApps();
  },

  async approve(userId: string): Promise<void> {
    await authService.update(userId, { driverStatus: "approved", role: "driver", driverLevel: 1 });
  },

  async reject(userId: string): Promise<void> {
    await authService.update(userId, { driverStatus: "rejected" });
  },

  async block(userId: string): Promise<void> {
    await authService.update(userId, { driverStatus: "blocked" });
  },

  async unblock(userId: string): Promise<void> {
    await authService.update(userId, { driverStatus: "approved" });
  },

  async setLevel(userId: string, level: DriverLevel): Promise<void> {
    await authService.update(userId, { driverLevel: level });
  },

  getLevelInfo(level: DriverLevel) {
    return DRIVER_LEVELS[level];
  },

  // Driver-level guard: can this driver pick up an order with this estimated value?
  canAcceptOrder(user: User, estimatedValue: number): { ok: boolean; reason?: string } {
    if (user.role !== "driver") return { ok: false, reason: "Você não é um Motorista Parceiro." };
    if (user.driverStatus !== "approved") return { ok: false, reason: "Sua conta de entregador não está ativa." };
    const level = (user.driverLevel ?? 1) as DriverLevel;
    const limit = DRIVER_LEVELS[level].limit;
    if (estimatedValue > limit) {
      return { ok: false, reason: `Limite operacional do seu nível (${DRIVER_LEVELS[level].name}): R$ ${limit}.` };
    }
    return { ok: true };
  },
};
