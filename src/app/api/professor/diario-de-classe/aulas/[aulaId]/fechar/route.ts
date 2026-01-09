import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserOrThrow, canAccessTurma } from "../../../_lib/auth";

const zAulaId = z.coerce.number().int().positive();

export async function POST(_req: Request, ctx: { params: { aulaId: string } }) {
  const auth = await getUserOrThrow();
  if (!auth.ok) return NextResponse.json(auth, { status: auth.status });

  const aulaId = zAulaId.safeParse(ctx.params.aulaId);
  if (!aulaId.success) return NextResponse.json({ ok: false, code: "AULA_ID_INVALIDO" }, { status: 400 });

  const { supabase, user } = auth;

  const { data: aula, error: aulaErr } = await supabase
    .from("turma_aulas")
    .select("id, turma_id, data_aula, fechada_em")
    .eq("id", aulaId.data)
    .single();

  if (aulaErr || !aula) return NextResponse.json({ ok: false, code: "AULA_NAO_ENCONTRADA" }, { status: 404 });

  const perm = await canAccessTurma({ supabase, userId: user.id, turmaId: aula.turma_id });
  if (!perm.ok) return NextResponse.json(perm, { status: perm.status });

  if (aula.fechada_em) {
    return NextResponse.json({ ok: true, aula, message: "Aula ja estava fechada." });
  }

  const { data: alunos, error: alunosErr } = await supabase
    .from("turma_aluno")
    .select("aluno_pessoa_id")
    .eq("turma_id", aula.turma_id);

  if (alunosErr) {
    return NextResponse.json(
      { ok: false, code: "ERRO_LISTAR_ALUNOS_TURMA", message: alunosErr.message },
      { status: 500 }
    );
  }

  const alunoIds = (alunos ?? [])
    .map((a) => a.aluno_pessoa_id)
    .filter((x): x is number => typeof x === "number");

  if (alunoIds.length === 0) {
    return NextResponse.json(
      { ok: false, code: "TURMA_SEM_ALUNOS", message: "Nao ha alunos para fechar chamada." },
      { status: 422 }
    );
  }

  const { data: presencas, error: presErr } = await supabase
    .from("turma_aula_presencas")
    .select("aluno_pessoa_id")
    .eq("aula_id", aula.id);

  if (presErr) {
    return NextResponse.json(
      { ok: false, code: "ERRO_LISTAR_PRESENCAS", message: presErr.message },
      { status: 500 }
    );
  }

  const presentesSet = new Set<number>(
    (presencas ?? [])
      .map((p) => p.aluno_pessoa_id)
      .filter((x): x is number => typeof x === "number")
  );

  const pendentes = alunoIds.filter((id) => !presentesSet.has(id));
  if (pendentes.length > 0) {
    return NextResponse.json(
      { ok: false, code: "CHAMADA_PENDENTE", message: "Ha alunos sem registro de presenca.", pendentes },
      { status: 422 }
    );
  }

  const { data: aulaUpd, error: updErr } = await supabase
    .from("turma_aulas")
    .update({ fechada_em: new Date().toISOString(), fechada_por: user.id })
    .eq("id", aula.id)
    .select("id, turma_id, data_aula, fechada_em, fechada_por")
    .single();

  if (updErr || !aulaUpd) {
    return NextResponse.json(
      { ok: false, code: "ERRO_FECHAR_AULA", message: updErr?.message ?? "Erro" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, aula: aulaUpd });
}
