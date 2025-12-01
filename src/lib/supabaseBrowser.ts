// src/lib/supabaseBrowser.ts
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";

export function getSupabaseBrowser(): SupabaseClient {
  // auth-helpers cuida dos cookies httpOnly e sessão compartilhada com o server
  return createClientComponentClient();
}
