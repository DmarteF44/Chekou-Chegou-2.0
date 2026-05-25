const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? "";
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";

export const FORCE_LOCAL_MODE = false;

function isValidSupabaseUrl(value: string): boolean {
  return /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(value);
}

function isValidSupabaseKey(value: string): boolean {
  return /^sb_publishable_[A-Za-z0-9_-]{16,}$/.test(value)
    || /^eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}$/.test(value);
}

const hasCompleteSupabaseEnv = Boolean(supabaseUrl && supabaseKey);
const hasValidSupabaseEnv = hasCompleteSupabaseEnv && isValidSupabaseUrl(supabaseUrl) && isValidSupabaseKey(supabaseKey);

export const runtime = {
  supabaseUrl,
  supabaseKey,
  hasSupabaseEnv: hasValidSupabaseEnv,
  supabaseConfigError: !supabaseUrl && !supabaseKey
    ? null
    : !hasCompleteSupabaseEnv
      ? "Configuração incompleta do Supabase. Usando modo local."
      : !isValidSupabaseUrl(supabaseUrl)
        ? "URL do Supabase inválida. Usando modo local."
        : !isValidSupabaseKey(supabaseKey)
          ? "Chave pública do Supabase inválida. Usando modo local."
        : null,
  get USE_SUPABASE() {
    return !FORCE_LOCAL_MODE && hasValidSupabaseEnv;
  },
};

export const USE_SUPABASE = runtime.USE_SUPABASE;

export function friendlySupabaseError(error: unknown, fallback = "Não foi possível conectar ao Supabase agora."): string {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
}
