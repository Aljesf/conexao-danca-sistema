import { NextResponse } from "next/server";
import {
  adicionarItensInscricaoEdicaoEvento,
  buscarInscricaoEdicaoEvento,
} from "@/lib/eventos/service";
import { validateEdicaoInscricaoAdicionarItensPayload } from "@/lib/eventos/validators";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseServiceRole } from "@/lib/supabaseServer";

type Params = {
  params: Promise<{
    edicaoId: string;
    inscricaoId: string;
  }>;
};

type RoleModulePermission = {
  view?: boolean;
  create?: boolean;
  update?: boolean;
  delete?: boolean;
  read?: boolean;
  write?: boolean;
};

type RolePermissoes = {
  modules?: Record<string, RoleModulePermission>;
} & Record<string, unknown>;

type RoleRecord = {
  codigo: string;
  permissoes: RolePermissoes | null;
  ativo: boolean | null;
};

type RoleJoinRow = {
  role: RoleRecord | null;
};

const EVENTOS_MODULE_KEYS = ["eventos_escola", "eventos", "escola_eventos"] as const;

function isRoleModulePermission(value: unknown): value is RoleModulePermission {
  return typeof value === "object" && value !== null;
}

function hasEventosWritePermission(permissoes: RolePermissoes | null): boolean {
  if (!permissoes) return false;

  for (const key of EVENTOS_MODULE_KEYS) {
    const modulePermission = permissoes.modules?.[key];
    if (modulePermission?.create || modulePermission?.write || modulePermission?.update) {
      return true;
    }
  }

  for (const key of EVENTOS_MODULE_KEYS) {
    const modulePermission = permissoes[key];
    if (
      isRoleModulePermission(modulePermission) &&
      (modulePermission.create || modulePermission.write || modulePermission.update)
    ) {
      return true;
    }
  }

  return false;
}

async function requireAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("nao autenticado");
  }

  const adminDb = getSupabaseServiceRole();
  const { data, error: rolesError } = await adminDb
    .from("usuario_roles")
    .select("role:roles_sistema(codigo, permissoes, ativo)")
    .eq("user_id", user.id);

  if (rolesError) {
    throw new Error("falha ao carregar permissoes");
  }

  const roles = (data ?? []) as RoleJoinRow[];
  const hasPermission = roles.some(({ role }) => {
    if (!role || role.ativo === false) return false;
    if (role.codigo === "ADMIN") return true;
    return hasEventosWritePermission(role.permissoes);
  });

  if (!hasPermission) {
    throw new Error("sem permissao");
  }

  return { db: adminDb, userId: user.id };
}

function getStatusFromMessage(message: string) {
  if (message === "nao autenticado") return 401;
  if (message === "sem permissao") return 403;
  if (message.includes("nao encontrada") || message.includes("nao encontrado")) {
    return 404;
  }
  return 400;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { db } = await requireAuthenticatedUser();
    const { edicaoId, inscricaoId } = await params;
    const data = await buscarInscricaoEdicaoEvento(db, edicaoId, inscricaoId);

    return NextResponse.json(
      { ok: true, data: data.itens ?? [], inscricao: data },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "erro interno";

    return NextResponse.json(
      { ok: false, error: "falha ao buscar itens da inscricao", details: message },
      { status: getStatusFromMessage(message) },
    );
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { db, userId } = await requireAuthenticatedUser();
    const { edicaoId, inscricaoId } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const payload = validateEdicaoInscricaoAdicionarItensPayload({
      ...body,
      edicaoId,
      inscricaoId,
    });
    const data = await adicionarItensInscricaoEdicaoEvento(db, payload, { userId });

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "erro interno";

    return NextResponse.json(
      { ok: false, error: "falha ao ampliar inscricao", details: message },
      { status: getStatusFromMessage(message) },
    );
  }
}
