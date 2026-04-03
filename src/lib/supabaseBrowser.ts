import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  clearSupabaseBrowserAuthStorage,
  shouldClearSupabaseAuth,
} from "@/lib/supabase/auth-utils";

let browserClient: SupabaseClient | null = null;

/**
 * Cliente Supabase para o browser.
 * Mantemos a sessão alinhada aos cookies do app para evitar drift entre browser e server.
 */
export function getSupabaseBrowser(): SupabaseClient {
  if (browserClient) return browserClient;

  browserClient = createClientComponentClient();

  const originalGetUser = browserClient.auth.getUser.bind(browserClient.auth);
  browserClient.auth.getUser = async (...args) => {
    const result = await originalGetUser(...args);

    if (result.error && shouldClearSupabaseAuth(result.error)) {
      clearSupabaseBrowserAuthStorage();
      return { data: { user: null }, error: result.error };
    }

    return result;
  };

  const originalGetSession = browserClient.auth.getSession.bind(browserClient.auth);
  browserClient.auth.getSession = async () => {
    const result = await originalGetSession();

    if (result.error && shouldClearSupabaseAuth(result.error)) {
      clearSupabaseBrowserAuthStorage();
      return { data: { session: null }, error: result.error };
    }

    return result;
  };

  return browserClient;
}
