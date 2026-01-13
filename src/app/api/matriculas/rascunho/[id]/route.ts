import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import type { PostgrestError } from "@supabase/supabase-js";

function isSchemaMissing(err: unknown): boolean {
  const e = err as PostgrestError | null;
  return !!e && typeof e.code === "string" && (e.code === "42P01" || e.code === "42703");
}

export async function DELETE(req: Request, ctx: { params: { id: string } }) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;

  const cookieStore = await cookies();
  const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore });
  const { data: auth } = await supabaseAuth.auth.getUser();
  if (!auth?.user) {
    return NextResponse.json({ ok: false, error: "nao_autenticado" }, { status: 401 });
  }

  const id = Number(ctx.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ ok: false, error: "id_invalido" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: mat, error: getErr } = await supabase
    .from("matriculas")
    .select("id,status_fluxo")
    .eq("id", id)
    .maybeSingle();

  if (getErr || !mat) {
    return NextResponse.json({ ok: false, error: "nao_encontrado" }, { status: 404 });
  }

  if (mat.status_fluxo !== "RASCUNHO") {
    return NextResponse.json({ ok: false, error: "nao_e_rascunho" }, { status: 409 });
  }

  const deletar = async (table: string) => {
    const { error } = await supabase.from(table).delete().eq("matricula_id", id);
    if (error && !isSchemaMissing(error)) {
      throw error;
    }
  };

  try {
    await deletar("matriculas_itens");
    await deletar("matricula_execucao_valores");
    await deletar("matriculas_financeiro_linhas");
    await deletar("turma_aluno");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "erro_desconhecido";
    return NextResponse.json({ ok: false, error: "falha_limpeza", detail: msg }, { status: 500 });
  }

  const { error: delErr } = await supabase.from("matriculas").delete().eq("id", id);
  if (delErr) {
    return NextResponse.json({ ok: false, error: "falha_remover_matricula", detail: delErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
