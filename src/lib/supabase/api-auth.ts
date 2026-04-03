import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  clearSupabaseAuthCookiesFromRequest,
  shouldClearSupabaseAuth,
} from "@/lib/supabase/auth-utils";

export type ApiAuthContext = {
  supabase: ReturnType<typeof createRouteHandlerClient>;
  userId: string;
};

type UnauthorizedPayload = {
  error: "unauthorized";
  message: "Sessao expirada. Faca login novamente.";
  debug: {
    hasCookies: boolean;
    cookieNames: string[];
  };
};

const IS_DEV = process.env.NODE_ENV !== "production";
const UNAUTHORIZED_MESSAGE = "Sessao expirada. Faca login novamente." as const;

function isSessionAuthError(error: unknown): boolean {
  if (shouldClearSupabaseAuth(error)) return true;

  const raw = typeof error === "string"
    ? error
    : (error && typeof error === "object" && "message" in error)
      ? String((error as { message?: unknown }).message ?? "")
      : "";
  const msg = raw.toLowerCase();
  const status = error && typeof error === "object" && "status" in error
    ? Number((error as { status?: unknown }).status)
    : null;

  return status === 400 || status === 401 || msg.includes("auth session missing");
}

function buildUnauthorizedPayload(cookieNames: string[]): UnauthorizedPayload {
  return {
    error: "unauthorized",
    message: UNAUTHORIZED_MESSAGE,
    debug: {
      hasCookies: cookieNames.length > 0,
      cookieNames,
    },
  };
}

export async function requireUser(request: NextRequest): Promise<ApiAuthContext | NextResponse> {
  const pathname = request.nextUrl.pathname;
  const cookieNames = request.cookies.getAll().map((cookie) => cookie.name);

  if (IS_DEV) {
    console.log("[requireUser] request:", pathname, request.url);
    console.log("[requireUser] cookies:", cookieNames);
  }

  const cookieStore = await cookies();

  const supabase = createRouteHandlerClient(
    {
      cookies: () => cookieStore as ReturnType<typeof cookies>,
    },
    {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    },
  );

  let user: { id: string } | null = null;
  const authStart = Date.now();

  try {
    const { data, error } = await supabase.auth.getUser();

    if (IS_DEV) {
      console.log("[requireUser] tempo getUser:", Date.now() - authStart, "ms");
    }

    if (error && !isSessionAuthError(error)) {
      console.error("[requireUser] auth error:", error);
    }

    user = data.user ? { id: data.user.id } : null;
  } catch (error) {
    if (IS_DEV) {
      console.log("[requireUser] tempo getUser:", Date.now() - authStart, "ms");
    }

    if (!isSessionAuthError(error)) {
      throw error;
    }
  }

  if (!user) {
    if (IS_DEV) {
      console.log("[requireUser] auth status: unauthorized");
    }

    const unauthorized = clearSupabaseAuthCookiesFromRequest(
      request,
      NextResponse.json(buildUnauthorizedPayload(cookieNames), { status: 401 }),
    );

    return unauthorized;
  }

  if (IS_DEV) {
    console.log("[requireUser] auth status: authenticated");
  }

  return { supabase, userId: user.id };
}
