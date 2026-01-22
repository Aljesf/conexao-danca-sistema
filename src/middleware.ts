import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function startsWithAny(path: string, prefixes: string[]): boolean {
  return prefixes.some((p) => path === p || path.startsWith(`${p}/`));
}

function copyResponseCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
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
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { data: auth } = await supabase.auth.getUser();

  if (request.nextUrl.pathname.startsWith("/api")) {
    return response;
  }

  if (!auth?.user?.id) return response;

  const { data: rows } = await supabase
    .from("usuario_roles")
    .select("role:roles_sistema(codigo, ativo)")
    .eq("user_id", auth.user.id);

  type RoleRow = { role: { codigo: string; ativo: boolean | null } | null };
  const roles = (rows ?? [])
    .map((r) => (r as RoleRow).role)
    .filter((r): r is { codigo: string; ativo: boolean | null } => Boolean(r?.codigo) && (r?.ativo ?? true))
    .map((r) => r.codigo);

  if (roles.includes("ADMIN")) return response;

  const path = request.nextUrl.pathname;

  if (roles.includes("EQUIPE_CADASTRO_BASE")) {
    const allowPages = ["/pessoas", "/turmas", "/academico"];
    const denyPages = [
      "/administracao",
      "/admin",
      "/loja",
      "/cafe",
      "/financeiro",
      "/matriculas",
      "/credito-conexao",
    ];

    if (startsWithAny(path, denyPages) || !startsWithAny(path, allowPages)) {
      const url = request.nextUrl.clone();
      url.pathname = "/pessoas";
      url.search = "";
      const redirectResponse = NextResponse.redirect(url);
      copyResponseCookies(response, redirectResponse);
      return redirectResponse;
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
