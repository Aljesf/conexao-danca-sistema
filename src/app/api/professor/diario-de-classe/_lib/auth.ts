import { z } from "zod";
import type { NextRequest } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/supabase/api-auth";
import { getProfessorOperationalAccess } from "@/app/api/professor/_lib/operacional";

export type Supa = SupabaseClient<any, any, any, any, any>;
export type AuthUser = { id: string; email: string | null };

function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!authHeader) return null;

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) return null;

  return match[1].trim();
}

export async function getUserOrThrow(
  request: NextRequest,
): Promise<
  | { ok: true; supabase: Supa; user: AuthUser }
  | { ok: false; status: number; code: "NAO_AUTENTICADO" }
> {
  const bearer = extractBearerToken(request);

  if (bearer) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${bearer}` } },
      },
    );

    const authViaHeader = await supabase.auth.getUser();
    if (!authViaHeader.error && authViaHeader.data.user) {
      return {
        ok: true,
        supabase,
        user: { id: authViaHeader.data.user.id, email: authViaHeader.data.user.email ?? null },
      };
    }

    const authViaToken = await supabase.auth.getUser(bearer);
    if (authViaToken.error || !authViaToken.data.user) {
      return { ok: false, status: 401, code: "NAO_AUTENTICADO" };
    }

    return {
      ok: true,
      supabase,
      user: { id: authViaToken.data.user.id, email: authViaToken.data.user.email ?? null },
    };
  }

  const auth = await requireUser(request);
  if (auth instanceof Response) {
    return { ok: false, status: 401, code: "NAO_AUTENTICADO" };
  }
  const userResult = await auth.supabase.auth.getUser();
  return {
    ok: true,
    supabase: auth.supabase,
    user: { id: auth.userId, email: userResult.data.user?.email ?? null },
  };
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

  try {
    const access = await getProfessorOperationalAccess(userId);
    if (access.podeVerOutrasTurmas) return { ok: true };
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
