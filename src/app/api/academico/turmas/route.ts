import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

type TurmaRow = {
  turma_id: number;
  nome: string | null;
  curso: string | null;
  nivel: string | null;
  turno: string | null;
  status: string | null;
  periodo_letivo_id: number | null;
  ano_referencia: number | null;
};

type UnidadeExecucaoRow = {
  unidade_execucao_id: number | null;
  origem_id: number | null;
  servico_id: number | null;
  ativo: boolean | null;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const periodoLetivoIdRaw = url.searchParams.get("periodo_letivo_id");
  const curso = url.searchParams.get("curso");

  const periodo_letivo_id = periodoLetivoIdRaw ? Number(periodoLetivoIdRaw) : NaN;

  if (!curso || !curso.trim()) {
    return NextResponse.json({ error: "curso_obrigatorio" }, { status: 400 });
  }

  if (!Number.isFinite(periodo_letivo_id)) {
    return NextResponse.json({ error: "periodo_letivo_id_obrigatorio" }, { status: 400 });
  }

  const cursoNome = curso.trim();

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Usuario nao autenticado." }, { status: 401 });
  }

  const { data: turmasData, error: turmasErr } = await supabase
    .from("turmas")
    .select("turma_id,nome,curso,nivel,turno,status,periodo_letivo_id,ano_referencia")
    .eq("periodo_letivo_id", periodo_letivo_id)
    .eq("curso", cursoNome)
    .neq("status", "CANCELADA")
    .order("nome", { ascending: true });

  if (turmasErr) {
    return NextResponse.json(
      { error: "falha_listar_turmas", message: turmasErr.message },
      { status: 500 },
    );
  }

  const turmas = (turmasData ?? []) as TurmaRow[];
  const turmaIds = turmas
    .map((turma) => turma.turma_id)
    .filter((id): id is number => Number.isFinite(id));

  const unidadesPorTurma = new Map<number, { unidade_execucao_id: number | null; servico_id: number | null }>();

  if (turmaIds.length > 0) {
    const { data: ueData, error: ueErr } = await supabase
      .from("escola_unidades_execucao")
      .select("unidade_execucao_id,origem_id,servico_id,ativo")
      .eq("origem_tipo", "TURMA")
      .eq("ativo", true)
      .in("origem_id", turmaIds);

    if (ueErr) {
      return NextResponse.json(
        { error: "falha_listar_unidades_execucao", message: ueErr.message },
        { status: 500 },
      );
    }

    (ueData ?? []).forEach((row) => {
      const ue = row as UnidadeExecucaoRow;
      const turmaId = typeof ue.origem_id === "number" ? ue.origem_id : null;
      if (!turmaId || unidadesPorTurma.has(turmaId)) return;
      unidadesPorTurma.set(turmaId, {
        unidade_execucao_id: ue.unidade_execucao_id ?? null,
        servico_id: ue.servico_id ?? null,
      });
    });
  }

  const payload = turmas.map((turma) => {
    const vinculo = unidadesPorTurma.get(turma.turma_id) ?? null;
    return {
      turma_id: turma.turma_id,
      nome: turma.nome ?? null,
      curso: turma.curso ?? null,
      nivel: turma.nivel ?? null,
      turno: turma.turno ?? null,
      status: turma.status ?? null,
      periodo_letivo_id: turma.periodo_letivo_id ?? null,
      ano_referencia: turma.ano_referencia ?? null,
      unidade_execucao_id: vinculo?.unidade_execucao_id ?? null,
      servico_id: vinculo?.servico_id ?? null,
    };
  });

  return NextResponse.json({ turmas: payload }, { status: 200 });
}
