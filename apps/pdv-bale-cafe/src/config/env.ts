const DEFAULT_API_BASE_URL = "https://conexaodanca.art.br";
const DEFAULT_API_TIMEOUT_MS = 15_000;

function normalizeText(value: string | undefined, fallback = ""): string {
  const normalized = value?.trim();
  return normalized ? normalized : fallback;
}

function normalizeUrl(value: string | undefined, fallback = ""): string {
  const normalized = normalizeText(value, fallback);
  return normalized.replace(/\/+$/, "");
}

function parseTimeout(value: string | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_API_TIMEOUT_MS;
  }

  return Math.trunc(parsed);
}

export const ENV = {
  API_BASE_URL: normalizeUrl(process.env.EXPO_PUBLIC_API_BASE_URL, DEFAULT_API_BASE_URL),
  SUPABASE_URL: normalizeUrl(process.env.EXPO_PUBLIC_SUPABASE_URL),
  SUPABASE_ANON_KEY: normalizeText(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  APP_ENV: normalizeText(process.env.EXPO_PUBLIC_APP_ENV, __DEV__ ? "development" : "production"),
  API_TIMEOUT_MS: parseTimeout(process.env.EXPO_PUBLIC_API_TIMEOUT_MS),
} as const;
