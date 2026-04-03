import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isPublicPath(pathname: string): boolean {
  if (pathname === "/login") return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname === "/favicon.ico") return true;
  if (pathname.startsWith("/api")) return true;
  return false;
}

type CookieChunk = {
  name: string;
  value: string;
  index: number;
};

function getCookieGroupKey(name: string): string {
  return name.replace(/\.\d+$/, "");
}

function getCookieChunkIndex(name: string): number {
  const match = name.match(/\.(\d+)$/);
  return match ? Number(match[1]) : 0;
}

function tryParseJsonLikeValue(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;

  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}"))
    || (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    JSON.parse(trimmed);
    return true;
  }

  return false;
}

function tryParseBase64Json(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;

  const base64Value = trimmed.startsWith("base64-") ? trimmed.slice("base64-".length) : trimmed;
  const normalized = base64Value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const decoded = atob(padded);

  return tryParseJsonLikeValue(decoded);
}

function isValidSupabaseCookieValue(value: string): boolean {
  const candidates = [value];

  try {
    const decodedURIComponentValue = decodeURIComponent(value);
    if (decodedURIComponentValue !== value) {
      candidates.push(decodedURIComponentValue);
    }
  } catch {
    // noop: malformed percent-encoding is handled by the validations below
  }

  for (const candidate of candidates) {
    try {
      if (tryParseJsonLikeValue(candidate)) return true;
    } catch {
      // noop
    }

    try {
      if (tryParseBase64Json(candidate)) return true;
    } catch {
      // noop
    }
  }

  return false;
}

function clearInvalidCookies(req: NextRequest, res: NextResponse): NextResponse {
  const cookieGroups = new Map<string, CookieChunk[]>();

  for (const cookie of req.cookies.getAll()) {
    if (!cookie.name.startsWith("sb-")) continue;

    const key = getCookieGroupKey(cookie.name);
    const group = cookieGroups.get(key) ?? [];
    group.push({
      name: cookie.name,
      value: cookie.value,
      index: getCookieChunkIndex(cookie.name),
    });
    cookieGroups.set(key, group);
  }

  for (const parts of cookieGroups.values()) {
    const joinedValue = parts
      .sort((left, right) => left.index - right.index)
      .map((part) => part.value)
      .join("");

    if (isValidSupabaseCookieValue(joinedValue)) continue;

    for (const part of parts) {
      res.cookies.set(part.name, "", { path: "/", maxAge: 0 });
    }
  }

  return res;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isPublicPath(pathname)) {
    return clearInvalidCookies(request, NextResponse.next());
  }

  const response = NextResponse.next();
  return clearInvalidCookies(request, response);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
