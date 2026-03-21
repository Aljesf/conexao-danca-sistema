import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { canAccessTurma, getUserOrThrow, zDataAula, zTurmaId } from "../../_lib/auth";
import { abrirOuCriarAula } from "@/lib/academico/execucao-aula";

const zBody = z.object({
  turmaId: zTurmaId,
  dataAula: zDataAula,
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/, "hora_inicio deve ser HH:MM").optional(),
  horaFim: z.string().regex(/^\d{2}:\d{2}$/, "hora_fim deve ser HH:MM").optional(),
});

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

    return NextResponse.json({ ok: true, aula });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ERRO_ABRIR_AULA";
    return NextResponse.json({ ok: false, code: "ERRO_ABRIR_AULA", message }, { status: 500 });
  }
}
