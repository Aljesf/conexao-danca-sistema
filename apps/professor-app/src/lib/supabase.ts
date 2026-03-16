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

let restoreAttempted = false;

export async function restoreSessionFromStorage(): Promise<Session | null> {
  const raw = await loadSession();
  restoreAttempted = true;

  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Session;
    const { data, error } = await supabase.auth.setSession({
      access_token: parsed.access_token,
      refresh_token: parsed.refresh_token,
    });

    if (error || !data.session) {
      await clearSession();
      return null;
    }

    return data.session;
  } catch {
    await clearSession();
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

export async function clearPersistedSession(): Promise<void> {
  await clearSession();
  await supabase.auth.signOut().catch(() => undefined);
}

export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) return data.session.access_token;

  if (!restoreAttempted) {
    const restored = await restoreSessionFromStorage();
    return restored?.access_token ?? null;
  }

  return null;
}

supabase.auth.onAuthStateChange(async (_event, session) => {
  await persistSessionToStorage(session ?? null);
});
