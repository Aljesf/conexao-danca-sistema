import type { User } from "@supabase/supabase-js";
import { z } from "zod";
import { getSupabaseRoute } from "@/lib/supabaseRoute";

export type Supa = Awaited<ReturnType<typeof getSupabaseRoute>>;

async function getSupabaseServerClient(): Promise<Supa> {
  return await getSupabaseRoute();
}

export async function getUserOrThrow():
  Promise<
    | { ok: true; supabase: Supa; user: User }
    | { ok: false; status: number; code: "NAO_AUTENTICADO" }
  > {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return { ok: false, status: 401, code: "NAO_AUTENTICADO" };
  }
  return { ok: true, supabase, user: data.user };
}

export async function isAdminUser(supabase: Supa, userId: string): Promise<boolean> {
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

export async function getColaboradorIdForUser(supabase: Supa, userId: string): Promise<number | null> {
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

export async function canAccessTurma(params: {
  supabase: Supa;
  userId: string;
  turmaId: number;
}): Promise<{ ok: true } | { ok: false; status: number; code: string }> {
  const { supabase, userId, turmaId } = params;

  try {
    const admin = await isAdminUser(supabase, userId);
    if (admin) return { ok: true };
  } catch {
    return { ok: false, status: 500, code: "ERRO_PERMISSAO_TURMA" };
  }

  let colaboradorId: number | null = null;
  try {
    colaboradorId = await getColaboradorIdForUser(supabase, userId);
  } catch {
    return { ok: false, status: 500, code: "ERRO_PERMISSAO_TURMA" };
  }

  if (!colaboradorId) {
    return { ok: false, status: 403, code: "SEM_ACESSO_TURMA" };
  }

  const { data, error } = await supabase
    .from("turma_professores")
    .select("id")
    .eq("turma_id", turmaId)
    .eq("colaborador_id", colaboradorId)
    .eq("ativo", true)
    .maybeSingle();

  if (error) {
    return { ok: false, status: 500, code: "ERRO_PERMISSAO_TURMA" };
  }

  if (!data) {
    return { ok: false, status: 403, code: "SEM_ACESSO_TURMA" };
  }

  return { ok: true };
}

export const zTurmaId = z.coerce.number().int().positive();
export const zDataAula = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data_aula deve ser YYYY-MM-DD");
