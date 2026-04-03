import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getUserOrThrow, canAccessTurma } from "../../../_lib/auth";
import { listarAlunosDaTurmaFrequencia } from "@/lib/academico/frequencia";
import { fecharAula, getAulaExecucaoById } from "@/lib/academico/execucao-aula";

const zAulaId = z.coerce.number().int().positive();

type PresencaStatus = "PRESENTE" | "FALTA" | "JUSTIFICADA" | "ATRASO";

function calcularDuracaoMinutos(
  abertaEm: string | null | undefined,
  fechadaEm: string | null | undefined,
): number | null {
  if (!abertaEm || !fechadaEm) return null;

  const inicio = new Date(abertaEm);
  const fim = new Date(fechadaEm);

  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
    return null;
  }

  const diffMs = fim.getTime() - inicio.getTime();
  if (diffMs < 0) return null;

  return Math.round(diffMs / 60000);
}

function buildResumoFechamento(params: {
  aula: Awaited<ReturnType<typeof getAulaExecucaoById>>;
  totalAlunos: number;
  presencas: Array<{ status: PresencaStatus | null }>;
}) {
  const presentes = params.presencas.filter((item) =>
    item.status === "PRESENTE" || item.status === "ATRASO"
  ).length;
  const faltas = params.presencas.filter((item) =>
    item.status === "FALTA" || item.status === "JUSTIFICADA"
  ).length;

  return {
    ok: true as const,
    aula: params.aula,
    aula_id: params.aula.id,
    status_execucao: params.aula.status_execucao,
    aberta_em: params.aula.aberta_em,
    fechada_em: params.aula.fechada_em,
    duracao_minutos: calcularDuracaoMinutos(params.aula.aberta_em, params.aula.fechada_em),
    total_alunos: params.totalAlunos,
    presentes,
    faltas,
    frequencia_salva_em: params.aula.frequencia_salva_em,
    professor_nome: params.aula.fechada_por_nome ?? params.aula.aberta_por_nome ?? null,
  };
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ aulaId: string }> }) {
  const auth = await getUserOrThrow(request);
  if (!auth.ok) return NextResponse.json(auth, { status: auth.status });

  const { aulaId: aulaIdRaw } = await ctx.params;
  const aulaId = zAulaId.safeParse(aulaIdRaw);
  if (!aulaId.success) {
    return NextResponse.json({ ok: false, code: "AULA_ID_INVALIDO" }, { status: 400 });
  }

  const { supabase, user } = auth;

  const { data: aula, error: aulaErr } = await supabase
    .from("turma_aulas")
    .select("id, turma_id, data_aula, fechada_em, aula_numero")
    .eq("id", aulaId.data)
    .single();

  if (aulaErr || !aula) {
    return NextResponse.json({ ok: false, code: "AULA_NAO_ENCONTRADA" }, { status: 404 });
  }

  const perm = await canAccessTurma({ supabase, userId: user.id, turmaId: aula.turma_id });
  if (!perm.ok) return NextResponse.json(perm, { status: perm.status });

  let alunosAtivos: Awaited<ReturnType<typeof listarAlunosDaTurmaFrequencia>>["ativos"] = [];
  try {
    const alunosTurma = await listarAlunosDaTurmaFrequencia({
      supabase,
      turmaId: aula.turma_id,
      refDate: aula.data_aula,
    });
    alunosAtivos = alunosTurma.ativos;
  } catch (error) {
    const message = error instanceof Error ? error.message : "ERRO_LISTAR_ALUNOS_TURMA";
    return NextResponse.json(
      { ok: false, code: "ERRO_LISTAR_ALUNOS_TURMA", message },
      { status: 500 },
    );
  }

  const alunoIds = alunosAtivos.map((item) => item.aluno_pessoa_id);

  if (alunoIds.length === 0) {
    return NextResponse.json(
      { ok: false, code: "TURMA_SEM_ALUNOS", message: "Nao ha alunos para fechar chamada." },
      { status: 422 },
    );
  }

  const { data: presencas, error: presErr } = await supabase
    .from("turma_aula_presencas")
    .select("aluno_pessoa_id,status")
    .eq("aula_id", aula.id);

  if (presErr) {
    return NextResponse.json(
      { ok: false, code: "ERRO_LISTAR_PRESENCAS", message: presErr.message },
      { status: 500 },
    );
  }

  const presencasTipadas = (presencas ?? []) as Array<{
    aluno_pessoa_id: number | null;
    status: PresencaStatus | null;
  }>;

  const presentesSet = new Set<number>(
    presencasTipadas
      .map((item) => item.aluno_pessoa_id)
      .filter((item): item is number => typeof item === "number"),
  );

  if (aula.fechada_em) {
    try {
      const aulaResolvida = await getAulaExecucaoById(supabase, aula.id);
      return NextResponse.json({
        ...buildResumoFechamento({
          aula: aulaResolvida,
          totalAlunos: alunoIds.length,
          presencas: presencasTipadas,
        }),
        message: "Aula ja estava fechada.",
      });
    } catch {
      return NextResponse.json({
        ok: true,
        aula,
        aula_id: aula.id,
        status_execucao: "VALIDADA",
        aberta_em: null,
        fechada_em: aula.fechada_em,
        duracao_minutos: null,
        total_alunos: alunoIds.length,
        presentes: presentesSet.size,
        faltas: Math.max(alunoIds.length - presentesSet.size, 0),
        frequencia_salva_em: null,
        professor_nome: null,
        message: "Aula ja estava fechada.",
      });
    }
  }

  const pendentes = alunoIds.filter((id) => !presentesSet.has(id));
  if (pendentes.length > 0) {
    return NextResponse.json(
      { ok: false, code: "CHAMADA_PENDENTE", message: "Ha alunos sem registro de presenca.", pendentes },
      { status: 422 },
    );
  }

  let aulaNumero: number | null = (aula as { aula_numero?: number | null }).aula_numero ?? null;

  if (!aulaNumero) {
    const { data: maxRow, error: maxErr } = await supabase
      .from("turma_aulas")
      .select("aula_numero")
      .eq("turma_id", aula.turma_id)
      .not("fechada_em", "is", null)
      .order("aula_numero", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxErr) {
      return NextResponse.json(
        { ok: false, code: "ERRO_CALCULAR_AULA_NUMERO", message: maxErr.message },
        { status: 500 },
      );
    }

    const maxVal =
      (maxRow && typeof maxRow === "object" && "aula_numero" in maxRow
        ? (maxRow as { aula_numero?: number | null }).aula_numero
        : null) ?? null;
    aulaNumero = (typeof maxVal === "number" && Number.isFinite(maxVal) ? maxVal : 0) + 1;
  }

  try {
    const aulaAtualizada = await fecharAula({
      supabase,
      aulaId: aula.id,
      userId: user.id,
      aulaNumero,
    });

    return NextResponse.json(
      buildResumoFechamento({
        aula: aulaAtualizada,
        totalAlunos: alunoIds.length,
        presencas: presencasTipadas,
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro";
    return NextResponse.json(
      { ok: false, code: "ERRO_FECHAR_AULA", message },
      { status: 500 },
    );
  }
}
