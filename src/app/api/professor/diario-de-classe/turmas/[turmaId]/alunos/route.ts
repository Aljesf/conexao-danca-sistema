import { NextResponse, type NextRequest } from "next/server";
import { canAccessTurma, getUserOrThrow, zTurmaId } from "../../../_lib/auth";

type TurmaAlunoRow = {
  aluno_pessoa_id: number;
  matricula_id: number | null;
  status: string | null;
  matricula: { status: string | null } | null;
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
    .select("aluno_pessoa_id, matricula_id, status, matricula:matriculas(status), pessoa:pessoas(id,nome,nascimento)")
    .eq("turma_id", turmaId.data)
    .order("aluno_pessoa_id", { ascending: true });

  if (error) {
    return NextResponse.json(
      { ok: false, code: "ERRO_LISTAR_ALUNOS", message: error.message },
      { status: 500 }
    );
  }

  const rows = (data as unknown as TurmaAlunoRow[] | null) ?? [];

  const alunosNormalizados = rows.map((row) => ({
    aluno_pessoa_id: row.aluno_pessoa_id,
    nome: row.pessoa?.nome ?? null,
    data_nascimento: row.pessoa?.nascimento ?? null,
    matricula_id: row.matricula_id ?? null,
    matricula_status: row.matricula?.status ?? null,
    turma_aluno_status: row.status ?? null,
  }));

  const alunosAtivos = alunosNormalizados.filter((row) => String(row.matricula_status ?? "").toUpperCase() === "ATIVA");
  const alunosHistorico = alunosNormalizados.filter(
    (row) => String(row.matricula_status ?? "").toUpperCase() !== "ATIVA",
  );

  return NextResponse.json({
    ok: true,
    alunos: alunosAtivos,
    alunos_ativos: alunosAtivos,
    alunos_historico: alunosHistorico,
  });
}
