import { NextResponse, type NextRequest } from "next/server";
import { canAccessTurma, getUserOrThrow, zTurmaId } from "../../../_lib/auth";

type TurmaAlunoRow = {
  aluno_pessoa_id: number;
  pessoa: { nome: string | null; nascimento: string | null } | null;
};

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

  const { data, error } = await supabase
    .from("turma_aluno")
    .select("aluno_pessoa_id, pessoa:pessoas(id,nome,nascimento)")
    .eq("turma_id", turmaId.data)
    .order("aluno_pessoa_id", { ascending: true });

  if (error) {
    return NextResponse.json(
      { ok: false, code: "ERRO_LISTAR_ALUNOS", message: error.message },
      { status: 500 }
    );
  }

  const alunos = (data as TurmaAlunoRow[] | null)?.map((row) => ({
    aluno_pessoa_id: row.aluno_pessoa_id,
    nome: row.pessoa?.nome ?? null,
    data_nascimento: row.pessoa?.nascimento ?? null,
  })) ?? [];

  return NextResponse.json({ ok: true, alunos });
}
