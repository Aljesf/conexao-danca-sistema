import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

function startsWithAny(path: string, prefixes: string[]): boolean {
  return prefixes.some((p) => path === p || path.startsWith(`${p}/`));
}

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user?.id) return res;

  const { data: rows } = await supabase
    .from("usuario_roles")
    .select("role:roles_sistema(codigo, ativo)")
    .eq("user_id", auth.user.id);

  type RoleRow = { role: { codigo: string; ativo: boolean | null } | null };
  const roles = (rows ?? [])
    .map((r) => (r as RoleRow).role)
    .filter((r): r is { codigo: string; ativo: boolean | null } => Boolean(r?.codigo) && (r?.ativo ?? true))
    .map((r) => r.codigo);

  if (roles.includes("ADMIN")) return res;

  const path = req.nextUrl.pathname;

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
      const url = req.nextUrl.clone();
      url.pathname = "/pessoas";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
