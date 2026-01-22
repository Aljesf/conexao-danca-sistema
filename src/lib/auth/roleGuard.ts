import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerAuth, getSupabaseServiceRole } from "@/lib/supabaseServer";

type RolePermissoes = {
  allow?: { pages_prefix?: string[]; api_prefix?: string[] };
  deny?: { pages_prefix?: string[]; api_prefix?: string[] };
};

type RoleRow = {
  codigo: string;
  permissoes: RolePermissoes | null;
  ativo: boolean | null;
};

async function getUserRoles(): Promise<{ roles: string[]; isAuthenticated: boolean }> {
  const supabaseAuth = await getSupabaseServerAuth();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user?.id) {
    return { roles: [], isAuthenticated: false };
  }

  const supabaseAdmin = getSupabaseServiceRole();
  const { data, error } = await supabaseAdmin
    .from("usuario_roles")
    .select("role:roles_sistema(codigo, permissoes, ativo)")
    .eq("user_id", user.id);

  if (error || !data) return { roles: [], isAuthenticated: true };

  const roles = data
    .map((r) => (r as unknown as { role: RoleRow | null }).role)
    .filter((r): r is RoleRow => Boolean(r?.codigo) && (r?.ativo ?? true))
    .map((r) => r.codigo);

  return { roles: Array.from(new Set(roles)), isAuthenticated: true };
}

function startsWithAny(path: string, prefixes: string[]): boolean {
  return prefixes.some((p) => path === p || path.startsWith(`${p}/`));
}

export async function guardApiByRole(req: NextRequest | Request): Promise<NextResponse | null> {
  const path = "nextUrl" in req ? req.nextUrl.pathname : new URL(req.url).pathname;

  const { roles, isAuthenticated } = await getUserRoles();
  if (roles.includes("ADMIN")) return null;

  if (!isAuthenticated) {
    return NextResponse.json({ error: "unauthorized", message: "Nao autenticado." }, { status: 401 });
  }

  if (!roles.length) {
    return NextResponse.json({ error: "forbidden", message: "Sem permissao." }, { status: 403 });
  }

  if (roles.includes("EQUIPE_CADASTRO_BASE")) {
    const allow = ["/api/pessoas", "/api/alunos", "/api/turmas", "/api/academico"];
    const deny = [
      "/api/admin",
      "/api/administracao",
      "/api/loja",
      "/api/cafe",
      "/api/financeiro",
      "/api/matriculas",
      "/api/credito-conexao",
    ];

    if (startsWithAny(path, deny)) {
      return NextResponse.json({ error: "forbidden", message: "Acesso bloqueado para este papel." }, { status: 403 });
    }
    if (startsWithAny(path, allow)) return null;

    return NextResponse.json({ error: "forbidden", message: "API nao liberada para este papel." }, { status: 403 });
  }

  return null;
}
