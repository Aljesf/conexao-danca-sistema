import { createClient, type Session } from "@supabase/supabase-js";
import { ENV } from "../config/env";
import { clearSession, loadSession, saveSession } from "./secureStore";

if (!ENV.SUPABASE_URL || !ENV.SUPABASE_ANON_KEY) {
  // Validacao de ambiente acontece na tela de login.
}

export const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

export async function restoreSessionFromStorage(): Promise<Session | null> {
  const raw = await loadSession();
  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as Session;
    const { data, error } = await supabase.auth.setSession(session);
    if (error) return null;
    return data.session ?? null;
  } catch {
    return null;
  }
}

export async function persistSessionToStorage(session: Session | null): Promise<void> {
  if (!session) {
    await clearSession();
    return;
  }
  await saveSession(JSON.stringify(session));
}

export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
