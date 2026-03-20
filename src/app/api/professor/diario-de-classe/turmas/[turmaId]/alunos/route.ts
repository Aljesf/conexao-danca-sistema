import { NextResponse, type NextRequest } from "next/server";
import { canAccessTurma, getUserOrThrow, zTurmaId } from "../../../_lib/auth";
import { listarAlunosDaTurmaFrequencia } from "@/lib/academico/frequencia";

/**
 * GET /api/professor/diario-de-classe/turmas/:turmaId/alunos
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ turmaId: string }> }) {
  const auth = await getUserOrThrow(request);
  if (!auth.ok) return NextResponse.json(auth, { status: auth.status });

  const { turmaId: turmaIdRaw } = await ctx.params;
  const turmaId = zTurmaId.safeParse(turmaIdRaw);
  if (!turmaId.success) {
    return NextResponse.json({ ok: false, code: "TURMA_ID_INVALIDO" }, { status: 400 });
  }

  const { supabase, user } = auth;

  const perm = await canAccessTurma({ supabase, userId: user.id, turmaId: turmaId.data });
  if (!perm.ok) return NextResponse.json(perm, { status: perm.status });

  try {
    const alunosTurma = await listarAlunosDaTurmaFrequencia({
      supabase,
      turmaId: turmaId.data,
    });

    return NextResponse.json({
      ok: true,
      alunos: alunosTurma.ativos.map((row) => ({
        aluno_pessoa_id: row.aluno_pessoa_id,
        nome: row.nome ?? null,
        data_nascimento: row.data_nascimento ?? null,
        matricula_id: row.matricula_id ?? null,
        matricula_status: row.matricula_status ?? null,
        turma_aluno_status: row.turma_aluno_status ?? null,
      })),
      alunos_ativos: alunosTurma.ativos.map((row) => ({
        aluno_pessoa_id: row.aluno_pessoa_id,
        nome: row.nome ?? null,
        data_nascimento: row.data_nascimento ?? null,
        matricula_id: row.matricula_id ?? null,
        matricula_status: row.matricula_status ?? null,
        turma_aluno_status: row.turma_aluno_status ?? null,
      })),
      alunos_historico: alunosTurma.historico.map((row) => ({
        aluno_pessoa_id: row.aluno_pessoa_id,
        nome: row.nome ?? null,
        data_nascimento: row.data_nascimento ?? null,
        matricula_id: row.matricula_id ?? null,
        matricula_status: row.matricula_status ?? null,
        turma_aluno_status: row.turma_aluno_status ?? null,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ERRO_LISTAR_ALUNOS";
    return NextResponse.json(
      { ok: false, code: "ERRO_LISTAR_ALUNOS", message },
      { status: 500 }
    );
  }
}
