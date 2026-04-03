import * as SecureStore from "expo-secure-store";

const SESSION_KEY = "pdv_bale_cafe_supabase_session_v1";

export async function saveSession(raw: string): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, raw);
}

export async function loadSession(): Promise<string | null> {
  return await SecureStore.getItemAsync(SESSION_KEY);
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
