import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

type RolePermissoes = {
  allow?: { pages_prefix?: string[]; api_prefix?: string[] };
  deny?: { pages_prefix?: string[]; api_prefix?: string[] };
};

type RoleRow = {
  codigo: string;
  permissoes: RolePermissoes | null;
  ativo: boolean | null;
};

async function getUserRoles(): Promise<string[]> {
  const supabase = await getSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user?.id) return [];

  const { data, error } = await supabase
    .from("usuario_roles")
    .select("role:roles_sistema(codigo, permissoes, ativo)")
    .eq("user_id", auth.user.id);

  if (error || !data) return [];

  const roles = data
    .map((r) => (r as unknown as { role: RoleRow | null }).role)
    .filter((r): r is RoleRow => Boolean(r?.codigo) && (r?.ativo ?? true))
    .map((r) => r.codigo);

  return Array.from(new Set(roles));
}

function startsWithAny(path: string, prefixes: string[]): boolean {
  return prefixes.some((p) => path === p || path.startsWith(`${p}/`));
}

export async function guardApiByRole(req: NextRequest | Request): Promise<NextResponse | null> {
  const path = "nextUrl" in req ? req.nextUrl.pathname : new URL(req.url).pathname;

  const roles = await getUserRoles();
  if (roles.includes("ADMIN")) return null;

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
