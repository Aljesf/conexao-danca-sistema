import type { SupabaseClient } from "@supabase/supabase-js";

type Supa = SupabaseClient<any, any, any, any, any>;

const SEM_PERMISSAO_MESSAGE = "Voce nao tem permissao para registrar frequencia desta turma.";
const ERRO_PERMISSAO_MESSAGE = "Nao foi possivel validar a permissao de frequencia no momento.";

export type FrequenciaTurmaPermissionResult =
  | {
      ok: true;
      role: "admin" | "professor_turma";
      isAdmin: boolean;
      colaboradorId: number | null;
    }
  | {
      ok: false;
      status: 403 | 500;
      code: "SEM_ACESSO_TURMA" | "ERRO_PERMISSAO_TURMA";
      message: string;
    };

export async function isAdmin(supabase: Supa, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error("ERRO_PERMISSAO_ADMIN");
  }

  return Boolean(data?.is_admin);
}

export async function getColaboradorIdForUser(
  supabase: Supa,
  userId: string,
): Promise<number | null> {
  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("pessoa_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (profErr) {
    throw new Error("ERRO_BUSCAR_PROFILE");
  }

  if (!profile?.pessoa_id) {
    return null;
  }

  const { data: colaborador, error: colabErr } = await supabase
    .from("colaboradores")
    .select("id, ativo")
    .eq("pessoa_id", profile.pessoa_id)
    .maybeSingle();

  if (colabErr) {
    throw new Error("ERRO_BUSCAR_COLABORADOR");
  }

  if (!colaborador?.id || colaborador.ativo === false) {
    return null;
  }

  return colaborador.id;
}

export async function isProfessorDaTurma(params: {
  supabase: Supa;
  turmaId: number;
  colaboradorId: number;
}): Promise<boolean> {
  const { data, error } = await params.supabase
    .from("turma_professores")
    .select("id")
    .eq("turma_id", params.turmaId)
    .eq("colaborador_id", params.colaboradorId)
    .eq("ativo", true)
    .maybeSingle();

  if (error) {
    throw new Error("ERRO_PERMISSAO_TURMA");
  }

  return Boolean(data?.id);
}

export async function canManageFrequenciaTurma(params: {
  supabase: Supa;
  userId: string;
  turmaId: number;
}): Promise<FrequenciaTurmaPermissionResult> {
  const { supabase, userId, turmaId } = params;

  try {
    const admin = await isAdmin(supabase, userId);
    if (admin) {
      return { ok: true, role: "admin", isAdmin: true, colaboradorId: null };
    }

    const colaboradorId = await getColaboradorIdForUser(supabase, userId);
    if (!colaboradorId) {
      return {
        ok: false,
        status: 403,
        code: "SEM_ACESSO_TURMA",
        message: SEM_PERMISSAO_MESSAGE,
      };
    }

    const professorDaTurma = await isProfessorDaTurma({
      supabase,
      turmaId,
      colaboradorId,
    });

    if (!professorDaTurma) {
      return {
        ok: false,
        status: 403,
        code: "SEM_ACESSO_TURMA",
        message: SEM_PERMISSAO_MESSAGE,
      };
    }

    return {
      ok: true,
      role: "professor_turma",
      isAdmin: false,
      colaboradorId,
    };
  } catch {
    return {
      ok: false,
      status: 500,
      code: "ERRO_PERMISSAO_TURMA",
      message: ERRO_PERMISSAO_MESSAGE,
    };
  }
}
