// Supabase client placeholder.
//
// FUTURE: install @supabase/supabase-js and uncomment the code below.
// Configuration (NEVER commit real secrets):
//   /app/frontend/.env
//     EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
//     EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key>
//
// SECURITY:
// - Only the ANON key may live in the mobile app.
// - The SERVICE_ROLE key MUST stay on the server (Edge Functions).
// - Mercado Pago Access Token MUST live in a Supabase Edge Function, not here.
//
// Migration plan per service:
//   authService    → supabase.auth.signInWithPassword / signUp / getSession
//   driverService  → table: driver_applications, drivers
//   catalogService → tables: stores, products, product_categories, coupons
//   orderService   → table: orders + realtime channel for status & chat
//   paymentService → POST to Edge Function `/mp-create-preference` etc.
//
// While Supabase is OFF, every service falls back to AsyncStorage and the
// public API remains identical, so screens won't need changes.

/*
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true },
      })
    : null;
*/

export const supabase: null = null;

export function isSupabaseEnabled(): boolean {
  return false; // Flip to `!!supabase` once the client above is uncommented.
}
