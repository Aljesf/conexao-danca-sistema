import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function isPublicPath(pathname: string): boolean {
  // APIs nao devem sofrer redirect para /login. A propria rota retorna JSON 401/403.
  if (pathname.startsWith("/api")) return true;

  // Ajuste aqui conforme seu projeto
  const publicPaths = [
    "/login",
    "/logout",
    "/auth",
    "/auth/callback",
    "/favicon.ico",
  ];

  if (publicPaths.includes(pathname)) return true;

  // Permite rotas publicas por prefixo, se existir no projeto
  if (pathname.startsWith("/public")) return true;

  return false;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Se for /api/**: nao mexer com redirect nem refresh; deixar a rota responder.
  if (pathname.startsWith("/api")) {
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
