import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

/**
 * Cliente Supabase para o browser.
 * Usa localStorage (padrão do supabase-js) e evita adapter de cookies no client,
 * eliminando conflito com cookies antigos em formato base64-*.
 */
export function getSupabaseBrowser(): SupabaseClient {
  if (browserClient) return browserClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL não configurada.");
  if (!supabaseAnonKey) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY não configurada.");

  browserClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return browserClient;
}
