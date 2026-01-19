import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserOrThrow, canAccessTurma } from "../../../../_lib/auth";

const zAulaId = z.coerce.number().int().positive();

export async function POST(req: Request, ctx: { params: Promise<{ aulaId: string }> }) {
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
    .select("id, turma_id, fechada_em")
    .eq("id", aulaId.data)
    .single();

  if (aulaErr || !aula) {
    return NextResponse.json({ ok: false, code: "AULA_NAO_ENCONTRADA" }, { status: 404 });
  }

  const perm = await canAccessTurma({ supabase, userId: user.id, turmaId: aula.turma_id });
  if (!perm.ok) return NextResponse.json(perm, { status: perm.status });

  if (!aula.fechada_em) {
    return NextResponse.json({ ok: false, code: "CHAMADA_NAO_FECHADA" }, { status: 422 });
  }

  const body = await req.json().catch(() => null);
  const schema = z.object({
    notas_pos_aula: z.string().trim().optional().nullable(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, code: "PAYLOAD_INVALIDO" }, { status: 400 });
  }

  const { data: instanciaAtual, error: instErr } = await supabase
    .from("plano_aula_instancias")
    .select("id, turma_aula_id, status")
    .eq("turma_aula_id", aula.id)
    .maybeSingle();

  if (instErr) {
    return NextResponse.json(
      { ok: false, code: "ERRO_BUSCAR_INSTANCIA", message: instErr.message },
      { status: 500 }
    );
  }

  if (!instanciaAtual?.id) {
    return NextResponse.json({ ok: false, code: "PLANO_NAO_APLICADO" }, { status: 404 });
  }

  const payload = {
    status: "CONCLUIDO",
    concluido_por: user.id,
    concluido_em: new Date().toISOString(),
    notas_pos_aula: parsed.data.notas_pos_aula ?? null,
    updated_by: user.id,
  };

  const { data: instancia, error: updErr } = await supabase
    .from("plano_aula_instancias")
    .update(payload)
    .eq("id", instanciaAtual.id)
    .select("id, turma_aula_id, plano_aula_id, status, notas_pos_aula, concluido_por, concluido_em")
    .single();

  if (updErr || !instancia) {
    return NextResponse.json(
      { ok: false, code: "ERRO_CONCLUIR_PLANO", message: updErr?.message ?? "Erro" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, instancia });
}
