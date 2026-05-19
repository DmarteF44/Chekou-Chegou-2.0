import "@/src/lib/polyfills";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js/dist/module";
import { runtime } from "@/src/config/runtime";

export const supabase = runtime.hasSupabaseEnv
  ? createClient(runtime.supabaseUrl, runtime.supabaseKey, {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  })
  : null;

export function requireSupabase() {
  if (!supabase) throw new Error("Supabase não configurado. Configure EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  return supabase;
}
