import type { NextRequest, NextResponse } from "next/server";

type CookieResetOptions = {
  path: string;
  maxAge: number;
  expires: Date;
};

type CookieNameCarrier = {
  name: string;
};

type CookieStoreLike = {
  getAll(): CookieNameCarrier[];
  set(name: string, value: string, options: CookieResetOptions): unknown;
};

const AUTH_COOKIE_PREFIX = "sb-";
const LEGACY_AUTH_COOKIE_PREFIX = "supabase-auth-token";
const COOKIE_RESET_OPTIONS: CookieResetOptions = {
  path: "/",
  maxAge: 0,
  expires: new Date(0),
};

function getErrorRecord(error: unknown): Record<string, unknown> | null {
  return error && typeof error === "object" ? (error as Record<string, unknown>) : null;
}

export function getSupabaseAuthErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;

  const record = getErrorRecord(error);
  if (typeof record?.message === "string") return record.message;
  if (typeof record?.error_description === "string") return record.error_description;
  if (typeof record?.error === "string") return record.error;
  if (typeof record?.code === "string") return record.code;

  return "";
}

export function getSupabaseAuthErrorCode(error: unknown): string | null {
  const record = getErrorRecord(error);
  return typeof record?.code === "string" ? record.code : null;
}

export function getSupabaseAuthErrorStatus(error: unknown): number | null {
  const record = getErrorRecord(error);
  return typeof record?.status === "number" ? record.status : null;
}

export function isSupabaseInvalidRefreshTokenError(error: unknown): boolean {
  const code = getSupabaseAuthErrorCode(error)?.toLowerCase() ?? "";
  const message = getSupabaseAuthErrorMessage(error).toLowerCase();

  return code === "refresh_token_not_found"
    || code === "invalid_refresh_token"
    || message.includes("refresh_token_not_found")
    || message.includes("invalid refresh token")
    || message.includes("refresh token not found");
}

export function isSupabaseSessionMissingError(error: unknown): boolean {
  const message = getSupabaseAuthErrorMessage(error).toLowerCase();
  const status = getSupabaseAuthErrorStatus(error);

  return message.includes("auth session missing")
    || message.includes("session from session_id claim in jwt does not exist")
    || message.includes("session not found")
    || (status === 401 && message.includes("session"));
}

export function shouldClearSupabaseAuth(error: unknown): boolean {
  return isSupabaseInvalidRefreshTokenError(error) || isSupabaseSessionMissingError(error);
}

export function isSupabaseAuthCookieName(name: string): boolean {
  return name.startsWith(AUTH_COOKIE_PREFIX)
    || name === LEGACY_AUTH_COOKIE_PREFIX
    || name.startsWith(`${LEGACY_AUTH_COOKIE_PREFIX}.`);
}

export function clearSupabaseAuthCookiesByName(
  cookieNames: Iterable<string>,
  setCookie: (name: string, value: string, options: CookieResetOptions) => void,
): string[] {
  const cleared = new Set<string>();

  for (const name of cookieNames) {
    if (!isSupabaseAuthCookieName(name)) continue;
    if (cleared.has(name)) continue;

    setCookie(name, "", COOKIE_RESET_OPTIONS);
    cleared.add(name);
  }

  return Array.from(cleared);
}

export function clearSupabaseAuthCookiesFromCookieStore(cookieStore: CookieStoreLike): string[] {
  return clearSupabaseAuthCookiesByName(
    cookieStore.getAll().map((cookie) => cookie.name),
    (name, value, options) => {
      cookieStore.set(name, value, options);
    },
  );
}

export function clearSupabaseAuthCookiesFromRequest(
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  clearSupabaseAuthCookiesByName(
    request.cookies.getAll().map((cookie) => cookie.name),
    (name, value, options) => {
      response.cookies.set(name, value, options);
    },
  );

  return response;
}

function isSupabaseBrowserStorageKey(key: string): boolean {
  return key.startsWith(AUTH_COOKIE_PREFIX) && key.includes("auth-token");
}

export function clearSupabaseBrowserAuthStorage(): void {
  if (typeof window === "undefined") return;

  try {
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);
      if (!key || !isSupabaseBrowserStorageKey(key)) continue;
      window.localStorage.removeItem(key);
    }
  } catch (error) {
    console.error("[auth] falha ao limpar localStorage do Supabase", error);
  }

  try {
    const cookies = document.cookie.split(";");
    for (const cookieEntry of cookies) {
      const [rawName] = cookieEntry.split("=");
      const cookieName = rawName?.trim();
      if (!cookieName || !isSupabaseAuthCookieName(cookieName)) continue;

      document.cookie = `${cookieName}=; Max-Age=0; path=/`;
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
  } catch (error) {
    console.error("[auth] falha ao limpar cookies do Supabase no browser", error);
  }
}
