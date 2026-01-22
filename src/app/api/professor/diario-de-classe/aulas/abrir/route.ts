import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { canAccessTurma, getUserOrThrow, zDataAula, zTurmaId } from "../../_lib/auth";

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

  const payload = {
    turma_id: body.data.turmaId,
    data_aula: body.data.dataAula,
    hora_inicio: body.data.horaInicio ?? null,
    hora_fim: body.data.horaFim ?? null,
    criado_por: user.id,
  };

  const { data, error } = await supabase
    .from("turma_aulas")
    .upsert(payload, { onConflict: "turma_id,data_aula" })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, code: "ERRO_ABRIR_AULA", message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, aula: data });
}
