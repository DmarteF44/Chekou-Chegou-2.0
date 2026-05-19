const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? "";
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";

export const FORCE_LOCAL_MODE = false;

export const runtime = {
  supabaseUrl,
  supabaseKey,
  hasSupabaseEnv: Boolean(supabaseUrl && supabaseKey),
  get USE_SUPABASE() {
    return !FORCE_LOCAL_MODE && Boolean(supabaseUrl && supabaseKey);
  },
};

export const USE_SUPABASE = runtime.USE_SUPABASE;

export function friendlySupabaseError(error: unknown, fallback = "Não foi possível conectar ao Supabase agora."): string {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
}
