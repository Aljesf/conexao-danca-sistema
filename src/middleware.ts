import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function isInvalidRefreshTokenError(error: unknown): boolean {
  const raw = typeof error === "string"
    ? error
    : (error && typeof error === "object" && "message" in error)
      ? String((error as { message?: unknown }).message ?? "")
      : "";
  const msg = raw.toLowerCase();
  const status = error && typeof error === "object" && "status" in error
    ? Number((error as { status?: unknown }).status)
    : null;

  return msg.includes("invalid refresh token")
    || msg.includes("refresh token")
    || msg.includes("auth session missing")
    || status === 400;
}

function clearSupabaseCookies(req: NextRequest, res: NextResponse): NextResponse {
  for (const c of req.cookies.getAll()) {
    if (c.name.startsWith("sb-")) {
      res.cookies.set(c.name, "", { path: "/", maxAge: 0 });
    }
  }
  return res;
}

function isPublicPath(pathname: string): boolean {
  if (pathname === "/login") return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname === "/favicon.ico") return true;
  if (pathname.startsWith("/api")) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // EARLY RETURN para rotas publicas
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Resposta base (onde o Supabase vai anexar cookies do refresh)
  const baseResponse = NextResponse.next({ request });

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
            baseResponse.cookies.set(name, value, { ...options, path: "/" });
          });
        },
      },
    }
  );

  // Dispara refresh se necessario e garante que baseResponse receba os cookies atualizados
  let user: unknown = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error && isInvalidRefreshTokenError(error)) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return clearSupabaseCookies(request, NextResponse.redirect(url));
    }
    user = data.user;
  } catch (error) {
    if (isInvalidRefreshTokenError(error)) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return clearSupabaseCookies(request, NextResponse.redirect(url));
    }
    throw error;
  }

  const publicPath = isPublicPath(pathname);

  // Se nao autenticado e tentando rota privada => /login
  if (!user && !publicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";

    const redirectResponse = NextResponse.redirect(url);

    // Copia cookies que foram atualizados no baseResponse para o redirectResponse
    baseResponse.cookies.getAll().forEach((c) => {
      const { name, value, ...options } = c;
      redirectResponse.cookies.set(name, value, { ...options, path: "/" });
    });

    return redirectResponse;
  }

  // Se autenticado e acessando /login => /pessoas
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/pessoas";

    const redirectResponse = NextResponse.redirect(url);

    baseResponse.cookies.getAll().forEach((c) => {
      const { name, value, ...options } = c;
      redirectResponse.cookies.set(name, value, { ...options, path: "/" });
    });

    return redirectResponse;
  }

  return baseResponse;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|login).*)",
  ],
};
