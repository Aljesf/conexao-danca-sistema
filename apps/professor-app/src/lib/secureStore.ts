import * as SecureStore from "expo-secure-store";

const KEY = "professor_app_supabase_session_v1";

export async function saveSession(raw: string): Promise<void> {
  await SecureStore.setItemAsync(KEY, raw);
}

export async function loadSession(): Promise<string | null> {
  return await SecureStore.getItemAsync(KEY);
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}
