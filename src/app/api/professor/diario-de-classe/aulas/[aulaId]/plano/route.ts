import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserOrThrow, canAccessTurma } from "../../../_lib/auth";

const zAulaId = z.coerce.number().int().positive();

export async function GET(_req: Request, ctx: { params: { aulaId: string } }) {
  const auth = await getUserOrThrow();
  if (!auth.ok) return NextResponse.json(auth, { status: auth.status });

  const aulaId = zAulaId.safeParse(ctx.params.aulaId);
  if (!aulaId.success) {
    return NextResponse.json({ ok: false, code: "AULA_ID_INVALIDO" }, { status: 400 });
  }

  const { supabase, user } = auth;

  const { data: aula, error: aulaErr } = await supabase
    .from("turma_aulas")
    .select("id, turma_id, data_aula, hora_inicio, hora_fim, fechada_em, fechada_por, aula_numero")
    .eq("id", aulaId.data)
    .single();

  if (aulaErr || !aula) {
    return NextResponse.json({ ok: false, code: "AULA_NAO_ENCONTRADA" }, { status: 404 });
  }

  const perm = await canAccessTurma({ supabase, userId: user.id, turmaId: aula.turma_id });
  if (!perm.ok) return NextResponse.json(perm, { status: perm.status });

  const aulaNumero = (aula as { aula_numero?: number | null }).aula_numero ?? null;
  if (!aulaNumero) {
    return NextResponse.json({ ok: true, aula, ciclo: null, plano: null, instancia: null });
  }

  const { data: ciclo, error: cicloErr } = await supabase
    .from("planejamento_ciclos")
    .select("id, turma_id, status, aula_inicio_numero, aula_fim_numero")
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

  let plano = null;
  if (ciclo?.id) {
    const { data: planoRow, error: planoErr } = await supabase
      .from("planos_aula")
      .select(
        "id,ciclo_id,aula_numero,intencao_pedagogica,observacoes_gerais,playlist_url,plano_aula_blocos(id,plano_aula_id,ordem,titulo,objetivo,minutos_min,minutos_ideal,minutos_max,musica_sugestao,observacoes,plano_aula_subblocos(id,bloco_id,ordem,titulo,minutos_min,minutos_ideal,minutos_max,habilidade_id,nivel_abordagem,instrucoes,musica_sugestao))"
      )
      .eq("ciclo_id", ciclo.id)
      .eq("aula_numero", aulaNumero)
      .maybeSingle();

    if (planoErr) {
      return NextResponse.json(
        { ok: false, code: "ERRO_BUSCAR_PLANO", message: planoErr.message },
        { status: 500 }
      );
    }
    plano = planoRow ?? null;
  }

  const { data: instancia, error: instErr } = await supabase
    .from("plano_aula_instancias")
    .select("id, turma_aula_id, plano_aula_id, status, notas_pos_aula, concluido_por, concluido_em")
    .eq("turma_aula_id", aula.id)
    .maybeSingle();

  if (instErr) {
    return NextResponse.json(
      { ok: false, code: "ERRO_BUSCAR_INSTANCIA", message: instErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, aula, ciclo: ciclo ?? null, plano, instancia: instancia ?? null });
}
