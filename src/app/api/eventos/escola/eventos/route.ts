import { NextResponse } from "next/server";
import { criarEventoEscola } from "@/lib/eventos/service";
import { validateEventoPayload } from "@/lib/eventos/validators";
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

type ErrorLike = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
  stack?: string;
};

const EVENTOS_MODULE_KEYS = ["eventos_escola", "eventos", "escola_eventos"] as const;
const IS_DEV = process.env.NODE_ENV !== "production";
const VALIDATION_MESSAGES = new Set([
  "payload invalido",
  "titulo e obrigatorio",
  "tipoEvento invalido",
  "naturezaEvento invalido",
  "abrangenciaEvento invalido",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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

function getErrorInfo(error: unknown) {
  const candidate = (typeof error === "object" && error !== null
    ? error
    : {}) as ErrorLike;

  return {
    message: candidate.message ?? "erro ao criar evento",
    details: candidate.details ?? null,
    hint: candidate.hint ?? null,
    code: candidate.code ?? null,
    stack: candidate.stack ?? null,
  };
}

function resolveStatusCode(errorInfo: ReturnType<typeof getErrorInfo>): number {
  if (errorInfo.message === "nao autenticado") return 401;
  if (errorInfo.message === "sem permissao") return 403;
  if (VALIDATION_MESSAGES.has(errorInfo.message)) return 400;
  if (errorInfo.code) return 500;
  return 400;
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

  return { supabase, user };
}

export async function POST(request: Request) {
  try {
    const { supabase } = await requireAuthenticatedUser();
    const body: unknown = await request.json();

    const normalizedPayload = isRecord(body)
      ? {
          ...body,
          tipoEvento: body.tipoEvento ?? body.tipo_evento,
          naturezaEvento: body.naturezaEvento ?? body.natureza,
          abrangenciaEvento: body.abrangenciaEvento ?? body.abrangencia,
          publicoAlvo: body.publicoAlvo ?? body.publico_alvo,
          ativo: typeof body.ativo === "boolean" ? body.ativo : true,
        }
      : body;

    const payload = validateEventoPayload(normalizedPayload);
    const data = await criarEventoEscola(supabase, payload);

    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error) {
    console.error("EVENTO CREATE ERROR:", error);

    const errorInfo = getErrorInfo(error);
    const status = resolveStatusCode(errorInfo);

    return NextResponse.json(
      {
        ok: false,
        error: true,
        message: errorInfo.message,
        details: errorInfo.details ?? errorInfo.hint ?? errorInfo.code ?? null,
        code: errorInfo.code,
        hint: errorInfo.hint,
        ...(IS_DEV ? { stack: errorInfo.stack } : {}),
      },
      { status },
    );
  }
}
