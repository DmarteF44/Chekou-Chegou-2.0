// driverService — handles local partner applications, levels, and status changes.
import { authService, User } from "./authService";
import { storage } from "@/src/utils/storage";
import { USE_SUPABASE, friendlySupabaseError } from "@/src/config/runtime";
import { supabase } from "@/src/lib/supabase";

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
    if (USE_SUPABASE && supabase) {
      const { error } = await supabase.from("driver_applications").insert({
        user_id: app.userId,
        full_name: app.fullName,
        cpf: app.cpf,
        phone: app.phone,
        email: app.email,
        vehicle_type: app.vehicleType,
        plate: app.plate ?? null,
        cnh: app.cnh ?? null,
        region: app.region,
        pix_key: app.pixKey,
        accepted_terms: app.acceptedTerms,
        submitted_at: new Date(app.submittedAt).toISOString(),
      });
      if (error) throw new Error(friendlySupabaseError(error, "Não foi possível enviar cadastro de entregador."));
      await authService.update(app.userId, { driverStatus: "pending" });
      return;
    }
    const list = await loadApps();
    const idx = list.findIndex((a) => a.userId === app.userId);
    if (idx >= 0) list[idx] = app; else list.push(app);
    await saveApps(list);
    await authService.update(app.userId, { driverStatus: "pending" });
  },

  async getApplication(userId: string): Promise<DriverApplication | undefined> {
    if (USE_SUPABASE && supabase) {
      const { data, error } = await supabase
        .from("driver_applications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(friendlySupabaseError(error, "Não foi possível carregar cadastro de entregador."));
      return data ? {
        userId: data.user_id,
        fullName: data.full_name,
        cpf: data.cpf ?? "",
        phone: data.phone ?? "",
        email: data.email ?? "",
        vehicleType: data.vehicle_type ?? "moto",
        plate: data.plate ?? undefined,
        cnh: data.cnh ?? undefined,
        region: data.region ?? "",
        pixKey: data.pix_key ?? "",
        acceptedTerms: data.accepted_terms ?? false,
        submittedAt: data.submitted_at ? new Date(data.submitted_at).getTime() : Date.now(),
      } : undefined;
    }
    const list = await loadApps();
    return list.find((a) => a.userId === userId);
  },

  async getAllApplications(): Promise<DriverApplication[]> {
    if (USE_SUPABASE && supabase) {
      const { data, error } = await supabase.from("driver_applications").select("*").order("created_at", { ascending: false });
      if (error) throw new Error(friendlySupabaseError(error, "Não foi possível listar cadastros de entregador."));
      return (data ?? []).map((item: any) => ({
        userId: item.user_id,
        fullName: item.full_name,
        cpf: item.cpf ?? "",
        phone: item.phone ?? "",
        email: item.email ?? "",
        vehicleType: item.vehicle_type ?? "moto",
        plate: item.plate ?? undefined,
        cnh: item.cnh ?? undefined,
        region: item.region ?? "",
        pixKey: item.pix_key ?? "",
        acceptedTerms: item.accepted_terms ?? false,
        submittedAt: item.submitted_at ? new Date(item.submitted_at).getTime() : Date.now(),
      }));
    }
    return loadApps();
  },

  async approve(userId: string): Promise<void> {
    await authService.update(userId, { driverStatus: "approved", role: "driver", driverLevel: 1, operationalLimit: DRIVER_LEVELS[1].limit });
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
    await authService.update(userId, { driverLevel: level, operationalLimit: DRIVER_LEVELS[level].limit });
  },

  async setOperationalLimit(userId: string, limit: number): Promise<void> {
    await authService.update(userId, { operationalLimit: Math.max(0, limit) });
  },

  getLevelInfo(level: DriverLevel) {
    return DRIVER_LEVELS[level];
  },

  // Driver-level guard: can this driver pick up an order with this estimated value?
  canAcceptOrder(user: User, estimatedValue: number): { ok: boolean; reason?: string } {
    if (user.role !== "driver") return { ok: false, reason: "Você não é um Motorista Parceiro." };
    if (user.driverStatus !== "approved") return { ok: false, reason: "Sua conta de entregador não está ativa." };
    const level = (user.driverLevel ?? 1) as DriverLevel;
    const limit = user.operationalLimit ?? DRIVER_LEVELS[level].limit;
    if (estimatedValue > limit) {
      return { ok: false, reason: `Limite operacional do seu nível (${DRIVER_LEVELS[level].name}): R$ ${limit}.` };
    }
    return { ok: true };
  },
};
