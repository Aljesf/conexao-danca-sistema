import { createClient } from "@supabase/supabase-js";

function getEnvOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`ENV_NAO_CONFIGURADA: ${key}`);
  }
  return value;
}

/**
 * Cliente Supabase ADMIN (Service Role).
 * Uso exclusivo em rotas server-side com checagem de admin antes.
 */
export function getSupabaseAdmin() {
  const url = getEnvOrThrow("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRole = getEnvOrThrow("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
