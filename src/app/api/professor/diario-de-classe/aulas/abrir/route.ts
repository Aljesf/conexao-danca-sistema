import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { canAccessTurma, getUserOrThrow, zDataAula, zTurmaId } from "../../_lib/auth";
import { abrirOuCriarAula, getAulaExecucaoById } from "@/lib/academico/execucao-aula";

const zBody = z.object({
  turmaId: zTurmaId,
  dataAula: zDataAula,
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/, "hora_inicio deve ser HH:MM").optional(),
  horaFim: z.string().regex(/^\d{2}:\d{2}$/, "hora_fim deve ser HH:MM").optional(),
});

function buildAulaPayload(
  aula: Awaited<ReturnType<typeof abrirOuCriarAula>> | null,
) {
  return {
    ok: true as const,
    aula,
    aula_id: aula?.id ?? null,
    status_execucao: aula?.status_execucao ?? "PENDENTE",
    aberta_em: aula?.aberta_em ?? null,
    aberta_por: aula?.aberta_por ?? null,
    aula_aberta: Boolean(aula?.aberta_em) && !aula?.fechada_em,
  };
}

/**
 * GET /api/professor/diario-de-classe/aulas/abrir?turmaId=..&dataAula=..
 * Consulta a sessao atual sem abrir a aula.
 */
export async function GET(request: NextRequest) {
  const auth = await getUserOrThrow(request);
  if (!auth.ok) return NextResponse.json(auth, { status: auth.status });

  const url = new URL(request.url);
  const turmaId = zTurmaId.safeParse(url.searchParams.get("turmaId"));
  const dataAula = zDataAula.safeParse(url.searchParams.get("dataAula"));

  if (!turmaId.success || !dataAula.success) {
    return NextResponse.json({ ok: false, code: "QUERY_INVALIDA" }, { status: 400 });
  }

  const { supabase, user } = auth;
  const perm = await canAccessTurma({ supabase, userId: user.id, turmaId: turmaId.data });
  if (!perm.ok) return NextResponse.json(perm, { status: perm.status });

  const { data: aulaBase, error } = await supabase
    .from("turma_aulas")
    .select("id")
    .eq("turma_id", turmaId.data)
    .eq("data_aula", dataAula.data)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { ok: false, code: "ERRO_CONSULTAR_AULA", message: error.message },
      { status: 500 },
    );
  }

  if (!aulaBase?.id) {
    return NextResponse.json(buildAulaPayload(null));
  }

  try {
    const aula = await getAulaExecucaoById(supabase, Number(aulaBase.id));
    return NextResponse.json(buildAulaPayload(aula));
  } catch (loadError) {
    const message = loadError instanceof Error ? loadError.message : "AULA_NAO_ENCONTRADA";
    return NextResponse.json({ ok: false, code: "AULA_NAO_ENCONTRADA", message }, { status: 404 });
  }
}

/**
 * POST /api/professor/diario-de-classe/aulas/abrir
 */
export async function POST(request: NextRequest) {
  const auth = await getUserOrThrow(request);
  if (!auth.ok) return NextResponse.json(auth, { status: auth.status });

  const json = await request.json().catch(() => null);
  const body = zBody.safeParse(json);
  if (!body.success) {
    return NextResponse.json({ ok: false, code: "BODY_INVALIDO", issues: body.error.issues }, { status: 400 });
  }

  const { supabase, user } = auth;

  const perm = await canAccessTurma({ supabase, userId: user.id, turmaId: body.data.turmaId });
  if (!perm.ok) return NextResponse.json(perm, { status: perm.status });

  try {
    const aula = await abrirOuCriarAula({
      supabase,
      turmaId: body.data.turmaId,
      dataAula: body.data.dataAula,
      userId: user.id,
      horaInicio: body.data.horaInicio ?? null,
      horaFim: body.data.horaFim ?? null,
    });

    return NextResponse.json(buildAulaPayload(aula));
  } catch (error) {
    const message = error instanceof Error ? error.message : "ERRO_ABRIR_AULA";
    return NextResponse.json({ ok: false, code: "ERRO_ABRIR_AULA", message }, { status: 500 });
  }
}
