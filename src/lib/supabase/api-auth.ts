import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export type ApiAuthContext = {
  supabase: ReturnType<typeof createServerClient>;
  userId: string;
};

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

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("[requireUser] auth error:", error);
  }

  if (!user) {
    const unauthorized = NextResponse.json(
      { error: "unauthorized", message: "Usuário não autenticado." },
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
