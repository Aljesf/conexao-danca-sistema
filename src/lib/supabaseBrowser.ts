"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

/**
 * Retorna um cliente do Supabase para uso em COMPONENTES CLIENT.
 * Usa o helper oficial createClientComponentClient da lib
 * @supabase/auth-helpers-nextjs.
 */
export function getSupabaseBrowser(): SupabaseClient {
  if (!browserClient) {
    browserClient = createClientComponentClient();
  }
  return browserClient;
}
