import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function getSupabaseServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("SERVICE_ROLE_NAO_CONFIGURADO");
  }

  return createClient(url, serviceKey, { auth: { persistSession: false } });
}
