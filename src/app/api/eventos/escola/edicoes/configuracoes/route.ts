import { NextResponse } from "next/server";
import {
  buscarConfiguracaoEdicaoEvento,
  salvarConfiguracaoEdicaoEvento,
} from "@/lib/eventos/service";
import { validateEdicaoConfiguracaoPayload } from "@/lib/eventos/validators";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseServiceRole } from "@/lib/supabaseServer";

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

function getErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof Error) {
    const extendedError = error as Error & {
      code?: string;
      details?: string;
      hint?: string;
    };

    return {
      message: extendedError.message || fallbackMessage,
      details: extendedError.details ?? extendedError.hint ?? extendedError.message,
      code: extendedError.code ?? null,
    };
  }

  if (typeof error === "object" && error !== null) {
    const record = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };

    return {
      message:
        typeof record.message === "string" && record.message
          ? record.message
          : fallbackMessage,
      details:
        typeof record.details === "string" && record.details
          ? record.details
          : typeof record.hint === "string" && record.hint
            ? record.hint
            : null,
      code: typeof record.code === "string" ? record.code : null,
    };
  }

  return {
    message: fallbackMessage,
    details: null,
    code: null,
  };
}

export async function GET(request: Request) {
  try {
    const { db } = await requireAuthenticatedUser();
    const url = new URL(request.url);
    const edicaoId = url.searchParams.get("edicaoId");

    if (!edicaoId) {
      throw new Error("edicaoId e obrigatorio");
    }

    const data = await buscarConfiguracaoEdicaoEvento(db, edicaoId);

    return NextResponse.json({ ok: true, success: true, data }, { status: 200 });
  } catch (error) {
    console.error("EVENTOS EDICAO CONFIG GET ERROR:", error);
    const errorResponse = getErrorResponse(
      error,
      "falha ao buscar configuracoes da edicao",
    );

    return NextResponse.json(
      { ok: false, success: false, ...errorResponse },
      { status: getStatusFromMessage(errorResponse.message) },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { db } = await requireAuthenticatedUser();
    const body: unknown = await request.json();
    const payload = validateEdicaoConfiguracaoPayload(body);
    const data = await salvarConfiguracaoEdicaoEvento(db, payload);

    return NextResponse.json({ ok: true, success: true, data }, { status: 200 });
  } catch (error) {
    console.error("EVENTOS EDICAO CONFIG POST ERROR:", error);
    const errorResponse = getErrorResponse(
      error,
      "falha ao salvar configuracoes da edicao",
    );

    return NextResponse.json(
      { ok: false, success: false, ...errorResponse },
      { status: getStatusFromMessage(errorResponse.message) },
    );
  }
}
