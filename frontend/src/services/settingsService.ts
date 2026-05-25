import { storage } from "@/src/utils/storage";
import { USE_SUPABASE, friendlySupabaseError, isSupabaseUnavailable } from "@/src/config/runtime";
import { supabase } from "@/src/lib/supabase";

export type AppSettings = {
  platformFeePercent: number;
  platformMinimumFee: number;
  defaultDeliveryFee: number;
  safetyMarginPercent: number;
  minimumSafetyMargin: number;
  actualValueMinTolerancePercent: number;
  actualValueMaxTolerancePercent: number;
  minimumOrderValue: number;
  driverInitialLimitsByLevel: Record<string, number>;
};

export const DEFAULT_SETTINGS: AppSettings = {
  platformFeePercent: 7,
  platformMinimumFee: 0,
  defaultDeliveryFee: 8,
  safetyMarginPercent: 15,
  minimumSafetyMargin: 10,
  actualValueMinTolerancePercent: -40,
  actualValueMaxTolerancePercent: 40,
  minimumOrderValue: 15,
  driverInitialLimitsByLevel: { "1": 50, "2": 150, "3": 300, "4": 500 },
};

const SETTINGS_KEY = "chekou_checkout_settings_v1";
const SETTINGS_ID = "checkout_settings";
const listeners = new Set<() => void>();

function numeric(value: unknown, fallback: number, minimum = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(minimum, parsed) : fallback;
}

export function sanitizeSettings(input?: Partial<AppSettings> | null): AppSettings {
  const minTolerance = Number(input?.actualValueMinTolerancePercent);
  const maxTolerance = numeric(input?.actualValueMaxTolerancePercent, DEFAULT_SETTINGS.actualValueMaxTolerancePercent);
  const limits = input?.driverInitialLimitsByLevel ?? {};
  return {
    platformFeePercent: numeric(input?.platformFeePercent, DEFAULT_SETTINGS.platformFeePercent),
    platformMinimumFee: numeric(input?.platformMinimumFee, DEFAULT_SETTINGS.platformMinimumFee),
    defaultDeliveryFee: numeric(input?.defaultDeliveryFee, DEFAULT_SETTINGS.defaultDeliveryFee),
    safetyMarginPercent: numeric(input?.safetyMarginPercent, DEFAULT_SETTINGS.safetyMarginPercent),
    minimumSafetyMargin: numeric(input?.minimumSafetyMargin, DEFAULT_SETTINGS.minimumSafetyMargin),
    actualValueMinTolerancePercent: Number.isFinite(minTolerance)
      ? Math.min(-1, Math.max(-99, minTolerance))
      : DEFAULT_SETTINGS.actualValueMinTolerancePercent,
    actualValueMaxTolerancePercent: Math.max(1, maxTolerance),
    minimumOrderValue: numeric(input?.minimumOrderValue, DEFAULT_SETTINGS.minimumOrderValue),
    driverInitialLimitsByLevel: {
      "1": numeric(limits["1"], DEFAULT_SETTINGS.driverInitialLimitsByLevel["1"]),
      "2": numeric(limits["2"], DEFAULT_SETTINGS.driverInitialLimitsByLevel["2"]),
      "3": numeric(limits["3"], DEFAULT_SETTINGS.driverInitialLimitsByLevel["3"]),
      "4": numeric(limits["4"], DEFAULT_SETTINGS.driverInitialLimitsByLevel["4"]),
    },
  };
}

async function readLocal(): Promise<AppSettings> {
  const raw = (await storage.getItem<string>(SETTINGS_KEY, "")) || "";
  if (!raw) return DEFAULT_SETTINGS;
  try {
    return sanitizeSettings(JSON.parse(raw) as Partial<AppSettings>);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

async function writeLocal(settings: AppSettings) {
  await storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function notify() {
  listeners.forEach((listener) => listener());
}

export const settingsService = {
  subscribe(callback: () => void) {
    listeners.add(callback);
    return () => { listeners.delete(callback); };
  },

  async get(): Promise<AppSettings> {
    if (USE_SUPABASE && supabase) {
      try {
        const { data, error } = await supabase
          .from("app_settings")
          .select("value")
          .eq("id", SETTINGS_ID)
          .maybeSingle();
        if (error) throw error;
        return sanitizeSettings(data?.value as Partial<AppSettings> | undefined);
      } catch (error) {
        console.warn("Settings remotos indisponíveis; usando configuração local.", error);
      }
    }
    return readLocal();
  },

  async save(input: AppSettings): Promise<AppSettings> {
    const settings = sanitizeSettings(input);
    if (USE_SUPABASE && supabase) {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ id: SETTINGS_ID, value: settings, updated_at: new Date().toISOString() });
      if (!error) {
        notify();
        return settings;
      }
      if (!isSupabaseUnavailable(error)) throw new Error(friendlySupabaseError(error, "Não foi possível salvar configurações."));
      console.warn("Supabase indisponível ao salvar configurações; salvando localmente.", error);
    }
    await writeLocal(settings);
    notify();
    return settings;
  },
};
