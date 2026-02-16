import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export type ApiAuthContext = {
  supabase: ReturnType<typeof createServerClient>;
  userId: string;
};

function isSessionAuthError(error: unknown): boolean {
  const raw = typeof error === "string"
    ? error
    : (error && typeof error === "object" && "message" in error)
      ? String((error as { message?: unknown }).message ?? "")
      : "";
  const msg = raw.toLowerCase();
  const status = error && typeof error === "object" && "status" in error
    ? Number((error as { status?: unknown }).status)
    : null;

  return msg.includes("auth session missing")
    || msg.includes("invalid refresh token")
    || msg.includes("refresh token")
    || status === 400
    || status === 401;
}

export async function requireUser(request: NextRequest): Promise<ApiAuthContext | NextResponse> {
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, { ...options, path: "/" });
          });
        },
      },
    },
  );

  let user: { id: string } | null = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      if (!isSessionAuthError(error)) {
        console.error("[requireUser] auth error:", error);
      }
    }
    user = data.user ? { id: data.user.id } : null;
  } catch (error) {
    if (!isSessionAuthError(error)) {
      throw error;
    }
  }

  if (!user) {
    const unauthorized = NextResponse.json(
      { error: "unauthorized", message: "Sessão expirada. Faça login novamente." },
      { status: 401 },
    );

    response.cookies.getAll().forEach((c) => {
      const { name, value, ...options } = c;
      unauthorized.cookies.set(name, value, { ...options, path: "/" });
    });

    return unauthorized;
  }

  return { supabase, userId: user.id };
}
