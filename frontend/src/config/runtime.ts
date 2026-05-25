const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? "";
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";

export const FORCE_LOCAL_MODE = false;

function isValidSupabaseUrl(value: string): boolean {
  return /^https?:\/\/[^\s]+$/i.test(value);
}

const hasCompleteSupabaseEnv = Boolean(supabaseUrl && supabaseKey);
const hasValidSupabaseEnv = hasCompleteSupabaseEnv && isValidSupabaseUrl(supabaseUrl);

export const runtime = {
  supabaseUrl,
  supabaseKey,
  hasSupabaseEnv: hasValidSupabaseEnv,
  supabaseConfigError: !supabaseUrl && !supabaseKey
    ? null
    : !hasCompleteSupabaseEnv
      ? "Configuração incompleta do Supabase. Usando modo local."
      : !hasValidSupabaseEnv
        ? "URL do Supabase inválida. Usando modo local."
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
