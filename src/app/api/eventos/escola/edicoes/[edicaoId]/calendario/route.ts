import { NextResponse } from "next/server";
import {
  criarItemCalendarioEdicaoEvento,
  listarCalendarioEdicaoEvento,
} from "@/lib/eventos/service";
import { validateEdicaoCalendarioPayload } from "@/lib/eventos/validators";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseServiceRole } from "@/lib/supabaseServer";

type Params = {
  params: Promise<{
    edicaoId: string;
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
    throw new Error("nÃ£o autenticado");
  }

  const adminDb = getSupabaseServiceRole();
  const { data, error: rolesError } = await adminDb
    .from("usuario_roles")
    .select("role:roles_sistema(codigo, permissoes, ativo)")
    .eq("user_id", user.id);

  if (rolesError) {
    throw new Error("falha ao carregar permissÃµes");
  }

  const roles = (data ?? []) as RoleJoinRow[];
  const hasPermission = roles.some(({ role }) => {
    if (!role || role.ativo === false) return false;
    if (role.codigo === "ADMIN") return true;
    return hasEventosWritePermission(role.permissoes);
  });

  if (!hasPermission) {
    throw new Error("sem permissÃ£o");
  }

  return { supabase, user };
}

function getStatusFromMessage(message: string) {
  if (message === "nÃ£o autenticado") return 401;
  if (message === "sem permissÃ£o") return 403;
  if (message.includes("nÃ£o encontrada") || message.includes("nÃ£o encontrado")) {
    return 404;
  }
  return 400;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { supabase } = await requireAuthenticatedUser();
    const { edicaoId } = await params;
    const data = await listarCalendarioEdicaoEvento(supabase, edicaoId);

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "erro interno";

    return NextResponse.json(
      { ok: false, error: "falha ao listar itens do calendÃ¡rio", details: message },
      { status: getStatusFromMessage(message) },
    );
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { supabase } = await requireAuthenticatedUser();
    const { edicaoId } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const payload = validateEdicaoCalendarioPayload({ ...body, edicaoId });
    const data = await criarItemCalendarioEdicaoEvento(supabase, payload);

    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "erro interno";

    return NextResponse.json(
      { ok: false, error: "falha ao criar item do calendÃ¡rio", details: message },
      { status: getStatusFromMessage(message) },
    );
  }
}
