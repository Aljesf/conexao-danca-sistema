import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { canAccessTurma, getColaboradorIdForUser, getUserOrThrow } from "../../../_lib/auth";
import { getAulaOrFail, salvarPresencasDaAula, zBodyFrequencia } from "../../../_lib/presencas";

const zAulaId = z.coerce.number().int().positive();

/**
 * GET /api/professor/diario-de-classe/aulas/:aulaId/presencas
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ aulaId: string }> }) {
  const auth = await getUserOrThrow(request);
  if (!auth.ok) return NextResponse.json(auth, { status: auth.status });

  const { aulaId: aulaIdRaw } = await ctx.params;
  const aulaId = zAulaId.safeParse(aulaIdRaw);
  if (!aulaId.success) return NextResponse.json({ ok: false, code: "AULA_ID_INVALIDO" }, { status: 400 });

  const { supabase, user } = auth;

  const aulaRes = await getAulaOrFail({ supabase, aulaId: aulaId.data });
  if (!aulaRes.ok) return NextResponse.json(aulaRes, { status: aulaRes.status });

  const perm = await canAccessTurma({ supabase, userId: user.id, turmaId: aulaRes.aula.turma_id });
  if (!perm.ok) return NextResponse.json(perm, { status: perm.status });

  const { data, error } = await supabase
    .from("turma_aula_presencas")
    .select("*")
    .eq("aula_id", aulaId.data)
    .order("aluno_pessoa_id", { ascending: true });

  if (error) {
    return NextResponse.json(
      { ok: false, code: "ERRO_BUSCAR_PRESENCAS", message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, aula: aulaRes.aula, presencas: data ?? [] });
}

/**
 * PUT /api/professor/diario-de-classe/aulas/:aulaId/presencas
 */
export async function PUT(request: NextRequest, ctx: { params: Promise<{ aulaId: string }> }) {
  const auth = await getUserOrThrow(request);
  if (!auth.ok) return NextResponse.json(auth, { status: auth.status });

  const { aulaId: aulaIdRaw } = await ctx.params;
  const aulaId = zAulaId.safeParse(aulaIdRaw);
  if (!aulaId.success) return NextResponse.json({ ok: false, code: "AULA_ID_INVALIDO" }, { status: 400 });

  const json = await request.json().catch(() => null);
  const body = zBodyFrequencia.safeParse(json);
  if (!body.success) return NextResponse.json({ ok: false, code: "BODY_INVALIDO", issues: body.error.issues }, { status: 400 });

  const { supabase, user } = auth;

  const aulaRes = await getAulaOrFail({ supabase, aulaId: aulaId.data });
  if (!aulaRes.ok) return NextResponse.json(aulaRes, { status: aulaRes.status });

  const perm = await canAccessTurma({ supabase, userId: user.id, turmaId: aulaRes.aula.turma_id });
  if (!perm.ok) return NextResponse.json(perm, { status: perm.status });

  let colaboradorId: number | null = null;
  try {
    colaboradorId = await getColaboradorIdForUser(supabase, user.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "ERRO_BUSCAR_COLABORADOR";
    return NextResponse.json({ ok: false, code: msg }, { status: 500 });
  }

  try {
    const result = await salvarPresencasDaAula({
      supabase,
      aulaId: aulaId.data,
      itens: body.data.itens,
      removerAlunoPessoaIds: body.data.removerAlunoPessoaIds,
      registradoPorAuthUserId: user.id,
      registradoPorColaboradorId: colaboradorId,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "ERRO_SALVAR_PRESENCAS";
    return NextResponse.json({ ok: false, code: "ERRO_SALVAR_PRESENCAS", message: msg }, { status: 500 });
  }
}
