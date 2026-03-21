import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getUserOrThrow, canAccessTurma } from "../../../_lib/auth";
import { getPlanoContextoDaAula } from "@/lib/academico/turmas-operacional";

const zAulaId = z.coerce.number().int().positive();

export async function GET(request: NextRequest, ctx: { params: Promise<{ aulaId: string }> }) {
  const auth = await getUserOrThrow(request);
  if (!auth.ok) return NextResponse.json(auth, { status: auth.status });

  const { aulaId: aulaIdRaw } = await ctx.params;
  const aulaId = zAulaId.safeParse(aulaIdRaw);
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

  try {
    const contexto = await getPlanoContextoDaAula({
      supabase,
      aulaId: aula.id,
    });

    return NextResponse.json({
      ok: true,
      aula,
      ciclo: contexto.ciclo,
      plano: contexto.plano,
      instancia: contexto.instancia,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ERRO_BUSCAR_PLANO_AULA";
    return NextResponse.json({ ok: false, code: "ERRO_BUSCAR_PLANO_AULA", message }, { status: 500 });
  }
}
