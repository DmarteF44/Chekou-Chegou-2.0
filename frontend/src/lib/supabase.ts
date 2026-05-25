import "@/src/lib/polyfills";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { runtime } from "@/src/config/runtime";

function buildSupabaseClient(): SupabaseClient | null {
  if (!runtime.hasSupabaseEnv) return null;

  try {
    return createClient(runtime.supabaseUrl, runtime.supabaseKey, {
      auth: {
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  } catch (error) {
    console.warn("Supabase não pôde ser iniciado; usando fallback local.", error);
    return null;
  }
}

export const supabase = buildSupabaseClient();

export function requireSupabase() {
  if (!supabase) throw new Error("Supabase não configurado ou indisponível. O modo local permanece ativo.");
  return supabase;
}
