import { NextResponse } from "next/server";
import { atualizarParticipanteExternoEvento } from "@/lib/eventos/service";
import { validateParticipanteExternoUpdatePayload } from "@/lib/eventos/validators";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseServiceRole } from "@/lib/supabaseServer";

type Params = {
  params: Promise<{
    participanteId: string;
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

  return { db: adminDb, user };
}

function getStatusFromMessage(message: string) {
  if (message === "nao autenticado") return 401;
  if (message === "sem permissao") return 403;
  if (message.includes("nao encontrada") || message.includes("nao encontrado")) {
    return 404;
  }
  return 400;
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { db, user } = await requireAuthenticatedUser();
    const { participanteId } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const payload = validateParticipanteExternoUpdatePayload({
      ...body,
      participanteExternoId: participanteId,
    });
    const data = await atualizarParticipanteExternoEvento(db, payload, {
      userId: user.id,
    });

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "erro interno";

    return NextResponse.json(
      { ok: false, error: "falha ao atualizar participante externo", details: message },
      { status: getStatusFromMessage(message) },
    );
  }
}
