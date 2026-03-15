import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { canAccessTurma, getColaboradorIdForUser, getUserOrThrow } from "../diario-de-classe/_lib/auth";
import { getAulaOrFail, salvarPresencasDaAula, zBodyFrequencia } from "../diario-de-classe/_lib/presencas";

const zBody = z.object({
  aulaId: z.coerce.number().int().positive(),
  itens: zBodyFrequencia.shape.itens,
});

export async function POST(request: NextRequest) {
  const auth = await getUserOrThrow(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const body = zBody.safeParse(json);
  if (!body.success) {
    return NextResponse.json({ ok: false, code: "BODY_INVALIDO", issues: body.error.issues }, { status: 400 });
  }

  const { supabase, user } = auth;

  const aulaRes = await getAulaOrFail({ supabase, aulaId: body.data.aulaId });
  if (!aulaRes.ok) {
    return NextResponse.json(aulaRes, { status: aulaRes.status });
  }

  const perm = await canAccessTurma({ supabase, userId: user.id, turmaId: aulaRes.aula.turma_id });
  if (!perm.ok) {
    return NextResponse.json(perm, { status: perm.status });
  }

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
      aulaId: body.data.aulaId,
      itens: body.data.itens,
      registradoPorAuthUserId: user.id,
      registradoPorColaboradorId: colaboradorId,
    });

    return NextResponse.json({ ok: true, ...result }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "ERRO_SALVAR_PRESENCAS";
    return NextResponse.json({ ok: false, code: "ERRO_SALVAR_PRESENCAS", message: msg }, { status: 500 });
  }
}
