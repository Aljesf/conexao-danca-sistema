import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { canAccessTurma, getColaboradorIdForUser, getUserOrThrow } from "../diario-de-classe/_lib/auth";
import {
  getAulaOrFail,
  salvarPresencasDaAula,
  zItemFrequencia,
} from "../diario-de-classe/_lib/presencas";

const zBody = z
  .object({
    aulaId: z.coerce.number().int().positive(),
    itens: z.array(zItemFrequencia).max(200).default([]),
    removerAlunoPessoaIds: z.array(z.coerce.number().int().positive()).max(200).default([]),
  })
  .superRefine((body, ctx) => {
    if (body.itens.length > 0 || body.removerAlunoPessoaIds.length > 0) {
      return;
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Envie ao menos uma presenca para salvar ou remover.",
      path: ["itens"],
    });
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
      removerAlunoPessoaIds: body.data.removerAlunoPessoaIds,
      registradoPorAuthUserId: user.id,
      registradoPorColaboradorId: colaboradorId,
    });

    return NextResponse.json({ ok: true, ...result }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "ERRO_SALVAR_PRESENCAS";
    return NextResponse.json({ ok: false, code: "ERRO_SALVAR_PRESENCAS", message: msg }, { status: 500 });
  }
}
