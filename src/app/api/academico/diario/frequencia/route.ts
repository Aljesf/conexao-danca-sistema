import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  canAccessTurma,
  getUserOrThrow,
} from "@/app/api/professor/diario-de-classe/_lib/auth";
import { getAulaOrFail, salvarPresencasDaAula } from "@/app/api/professor/diario-de-classe/_lib/presencas";
import { registrarFrequenciaSalvaNaAula } from "@/lib/academico/execucao-aula";

const zBody = z.object({
  diario_aula_id: z.coerce.number().int().positive(),
  frequencias: z
    .array(
      z.object({
        aluno_pessoa_id: z.coerce.number().int().positive(),
        presente: z.boolean().nullable(),
      })
    )
    .min(1)
    .max(200),
});

export async function POST(request: NextRequest) {
  const auth = await getUserOrThrow(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const body = zBody.safeParse(json);
  if (!body.success) {
    return NextResponse.json({ error: "Dados invalidos", issues: body.error.issues }, { status: 400 });
  }

  const { supabase, user } = auth;

  const aulaRes = await getAulaOrFail({ supabase, aulaId: body.data.diario_aula_id });
  if (!aulaRes.ok) {
    return NextResponse.json({ error: aulaRes.code }, { status: aulaRes.status });
  }

  const perm = await canAccessTurma({ supabase, userId: user.id, turmaId: aulaRes.aula.turma_id });
  if (!perm.ok) {
    return NextResponse.json({ error: perm.message ?? perm.code }, { status: perm.status });
  }

  const itens = body.data.frequencias
    .filter((item) => item.presente !== null)
    .map((item) => ({
      alunoPessoaId: item.aluno_pessoa_id,
      status: item.presente ? "PRESENTE" : "FALTA",
    })) as Array<{ alunoPessoaId: number; status: "PRESENTE" | "FALTA" }>;
  const removerAlunoPessoaIds = body.data.frequencias
    .filter((item) => item.presente === null)
    .map((item) => item.aluno_pessoa_id);

  try {
    await salvarPresencasDaAula({
      supabase,
      aulaId: body.data.diario_aula_id,
      itens,
      removerAlunoPessoaIds,
      registradoPorAuthUserId: user.id,
    });
    await registrarFrequenciaSalvaNaAula({
      supabase,
      aulaId: body.data.diario_aula_id,
      userId: user.id,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Nao foi possivel salvar a frequencia no momento." },
      { status: 500 }
    );
  }
}
