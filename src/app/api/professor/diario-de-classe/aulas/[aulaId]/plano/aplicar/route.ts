import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserOrThrow, canAccessTurma } from "../../../../_lib/auth";

const zAulaId = z.coerce.number().int().positive();

export async function POST(_req: Request, ctx: { params: Promise<{ aulaId: string }> }) {
  const auth = await getUserOrThrow();
  if (!auth.ok) return NextResponse.json(auth, { status: auth.status });

  const { aulaId: aulaIdRaw } = await ctx.params;
  const aulaId = zAulaId.safeParse(aulaIdRaw);
  if (!aulaId.success) {
    return NextResponse.json({ ok: false, code: "AULA_ID_INVALIDO" }, { status: 400 });
  }

  const { supabase, user } = auth;

  const { data: aula, error: aulaErr } = await supabase
    .from("turma_aulas")
    .select("id, turma_id, data_aula, aula_numero")
    .eq("id", aulaId.data)
    .single();

  if (aulaErr || !aula) {
    return NextResponse.json({ ok: false, code: "AULA_NAO_ENCONTRADA" }, { status: 404 });
  }

  const perm = await canAccessTurma({ supabase, userId: user.id, turmaId: aula.turma_id });
  if (!perm.ok) return NextResponse.json(perm, { status: perm.status });

  const aulaNumero = (aula as { aula_numero?: number | null }).aula_numero ?? null;
  if (!aulaNumero) {
    return NextResponse.json({ ok: false, code: "AULA_NUMERO_NAO_DEFINIDO" }, { status: 422 });
  }

  const { data: ciclo, error: cicloErr } = await supabase
    .from("planejamento_ciclos")
    .select("id")
    .eq("turma_id", aula.turma_id)
    .in("status", ["APROVADO", "EM_EXECUCAO"])
    .lte("aula_inicio_numero", aulaNumero)
    .gte("aula_fim_numero", aulaNumero)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cicloErr) {
    return NextResponse.json({ ok: false, code: "ERRO_BUSCAR_CICLO", message: cicloErr.message }, { status: 500 });
  }

  if (!ciclo?.id) {
    return NextResponse.json({ ok: false, code: "CICLO_NAO_ENCONTRADO" }, { status: 404 });
  }

  const { data: plano, error: planoErr } = await supabase
    .from("planos_aula")
    .select("id")
    .eq("ciclo_id", ciclo.id)
    .eq("aula_numero", aulaNumero)
    .maybeSingle();

  if (planoErr) {
    return NextResponse.json({ ok: false, code: "ERRO_BUSCAR_PLANO", message: planoErr.message }, { status: 500 });
  }

  if (!plano?.id) {
    return NextResponse.json({ ok: false, code: "PLANO_NAO_ENCONTRADO" }, { status: 404 });
  }

  const payload = {
    turma_aula_id: aula.id,
    plano_aula_id: plano.id,
    status: "EM_EXECUCAO",
    created_by: user.id,
    updated_by: user.id,
  };

  const { data: instancia, error: instErr } = await supabase
    .from("plano_aula_instancias")
    .upsert(payload, { onConflict: "turma_aula_id" })
    .select("id, turma_aula_id, plano_aula_id, status, notas_pos_aula, concluido_por, concluido_em")
    .single();

  if (instErr || !instancia) {
    return NextResponse.json(
      { ok: false, code: "ERRO_APLICAR_PLANO", message: instErr?.message ?? "Erro" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, instancia });
}
