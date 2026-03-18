import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";

type DashboardJsonPrimitive = string | number | boolean | null;
type DashboardJsonValue =
  | DashboardJsonPrimitive
  | { [key: string]: DashboardJsonValue }
  | DashboardJsonValue[];

type DashboardKpisRow = {
  total_pessoas: number;
  pessoas_hoje: number;
  pessoas_ontem: number;
  matriculas_efetivadas_total: number;
  matriculas_efetivadas_hoje: number;
  matriculas_efetivadas_ontem: number;
};

type DashboardTurmaComposicaoRow = {
  turma_id: number;
  nome: string;
  tipo_turma: string | null;
  ano_referencia: number | null;
  status: string | null;
  curso: string | null;
  curso_slug_ou_chave_filtro: string | null;
  nivel: string | null;
  turno: string | null;
  capacidade: number | null;
  professor_nome: string | null;
  alunos_ativos_total: number;
  vagas_disponiveis: number | null;
  ocupacao_percentual: number | null;
  pagantes_total: number;
  concessao_total: number;
  concessao_integral_total: number;
  concessao_parcial_total: number;
  outros_vinculos_total: number;
  receita_mensal_estimada_centavos: number;
  receita_pagante_estimada_centavos: number;
  receita_concessao_absorvida_centavos: number;
  distribuicao_niveis_json: DashboardJsonValue | null;
  distribuicao_vinculos_json: DashboardJsonValue | null;
};

type DashboardResumoInstitucional = {
  pagantes_total: number;
  concessao_total: number;
  concessao_integral_total: number;
  concessao_parcial_total: number;
  receita_mensal_estimada_centavos: number;
  receita_pagante_estimada_centavos: number;
  receita_concessao_absorvida_centavos: number;
};

type DashboardResumoModalidadeRow = {
  curso: string | null;
  total_turmas: number | string;
  alunos_ativos_total: number | string;
  pagantes_total: number | string;
  concessao_total: number | string;
  concessao_integral_total: number | string;
  concessao_parcial_total: number | string;
  receita_mensal_estimada_centavos: number | string;
  receita_pagante_estimada_centavos: number | string;
  receita_concessao_absorvida_centavos: number | string;
};

type DashboardResumoModalidade = {
  cursoLabel: string;
  totalTurmas: number;
  alunosAtivosTotal: number;
  pagantesTotal: number;
  concessaoTotal: number;
  concessaoIntegralTotal: number;
  concessaoParcialTotal: number;
  receitaMensalEstimadaCentavos: number;
  receitaPaganteEstimadaCentavos: number;
  receitaConcessaoAbsorvidaCentavos: number;
};

type DashboardSerieRow = {
  dia: string;
  pessoas_cadastradas: number;
  matriculas_efetivadas: number;
};

type DashboardTrendsRow = {
  pessoas_30d: number;
  pessoas_prev30d: number;
  matriculas_30d: number;
  matriculas_prev30d: number;
  alunos_entradas_30d: number;
  alunos_saidas_30d: number;
  alunos_saldo_30d: number;
  alunos_entradas_prev30d: number;
  alunos_saidas_prev30d: number;
  alunos_saldo_prev30d: number;
};

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function slugifyCurso(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function cursoMatches(
  turma: Pick<DashboardTurmaComposicaoRow, "curso" | "curso_slug_ou_chave_filtro">,
  cursoFilter: string,
  cursoFilterSlug: string,
): boolean {
  const cursoRaw = turma.curso?.trim().toLowerCase() ?? "";
  const cursoSlug = turma.curso_slug_ou_chave_filtro?.trim().toLowerCase() ?? "";
  return cursoRaw === cursoFilter.toLowerCase() || cursoSlug === cursoFilterSlug;
}

function mapResumoModalidade(
  row: DashboardResumoModalidadeRow | null | undefined,
): DashboardResumoModalidade {
  return {
    cursoLabel: row?.curso?.trim() || "Recorte geral",
    totalTurmas: toNumber(row?.total_turmas),
    alunosAtivosTotal: toNumber(row?.alunos_ativos_total),
    pagantesTotal: toNumber(row?.pagantes_total),
    concessaoTotal: toNumber(row?.concessao_total),
    concessaoIntegralTotal: toNumber(row?.concessao_integral_total),
    concessaoParcialTotal: toNumber(row?.concessao_parcial_total),
    receitaMensalEstimadaCentavos: toNumber(row?.receita_mensal_estimada_centavos),
    receitaPaganteEstimadaCentavos: toNumber(row?.receita_pagante_estimada_centavos),
    receitaConcessaoAbsorvidaCentavos: toNumber(
      row?.receita_concessao_absorvida_centavos,
    ),
  };
}

function aggregateResumoModalidade(
  rows: DashboardTurmaComposicaoRow[],
  cursoLabel: string,
): DashboardResumoModalidade {
  return {
    cursoLabel,
    totalTurmas: rows.length,
    alunosAtivosTotal: rows.reduce((acc, row) => acc + toNumber(row.alunos_ativos_total), 0),
    pagantesTotal: rows.reduce((acc, row) => acc + toNumber(row.pagantes_total), 0),
    concessaoTotal: rows.reduce((acc, row) => acc + toNumber(row.concessao_total), 0),
    concessaoIntegralTotal: rows.reduce(
      (acc, row) => acc + toNumber(row.concessao_integral_total),
      0,
    ),
    concessaoParcialTotal: rows.reduce(
      (acc, row) => acc + toNumber(row.concessao_parcial_total),
      0,
    ),
    receitaMensalEstimadaCentavos: rows.reduce(
      (acc, row) => acc + toNumber(row.receita_mensal_estimada_centavos),
      0,
    ),
    receitaPaganteEstimadaCentavos: rows.reduce(
      (acc, row) => acc + toNumber(row.receita_pagante_estimada_centavos),
      0,
    ),
    receitaConcessaoAbsorvidaCentavos: rows.reduce(
      (acc, row) => acc + toNumber(row.receita_concessao_absorvida_centavos),
      0,
    ),
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;
  const cursoParam = request.nextUrl.searchParams.get("curso")?.trim() ?? "";
  const cursoFilter = cursoParam.length > 0 ? cursoParam : null;
  const cursoFilterSlug = cursoFilter ? slugifyCurso(cursoFilter) : null;

  const { data: kpisData, error: kpisError } = await supabase
    .from("vw_escola_dashboard_kpis")
    .select("*")
    .single();

  if (kpisError) {
    return NextResponse.json(
      { error: "falha_kpis", details: kpisError.message },
      { status: 500 },
    );
  }

  const { data: resumoInstitucionalData, error: resumoInstitucionalError } = await supabase
    .from("vw_escola_dashboard_resumo_institucional")
    .select("*")
    .single();

  if (resumoInstitucionalError) {
    return NextResponse.json(
      {
        error: "falha_resumo_institucional",
        details: resumoInstitucionalError.message,
      },
      { status: 500 },
    );
  }

  const { data: resumoModalidadeData, error: resumoModalidadeError } = await supabase
    .from("vw_escola_dashboard_modalidade_resumo")
    .select("*")
    .order("curso", { ascending: true });

  if (resumoModalidadeError) {
    return NextResponse.json(
      {
        error: "falha_resumo_modalidade",
        details: resumoModalidadeError.message,
      },
      { status: 500 },
    );
  }

  const { data: turmasComposicaoData, error: turmasComposicaoError } = await supabase
    .from("vw_escola_dashboard_turmas_composicao")
    .select("*")
    .order("alunos_ativos_total", { ascending: false })
    .order("ocupacao_percentual", { ascending: false, nullsFirst: false })
    .order("nome", { ascending: true });

  if (turmasComposicaoError) {
    return NextResponse.json(
      {
        error: "falha_turmas_composicao",
        details: turmasComposicaoError.message,
      },
      { status: 500 },
    );
  }

  const turmasComposicaoTodas = ((turmasComposicaoData ?? []) as DashboardTurmaComposicaoRow[]).map(
    (turma) => ({
      ...turma,
      turma_id: toNumber(turma.turma_id),
      ano_referencia: toNullableNumber(turma.ano_referencia),
      capacidade: toNullableNumber(turma.capacidade),
      alunos_ativos_total: toNumber(turma.alunos_ativos_total),
      vagas_disponiveis: toNullableNumber(turma.vagas_disponiveis),
      ocupacao_percentual: toNullableNumber(turma.ocupacao_percentual),
      pagantes_total: toNumber(turma.pagantes_total),
      concessao_total: toNumber(turma.concessao_total),
      concessao_integral_total: toNumber(turma.concessao_integral_total),
      concessao_parcial_total: toNumber(turma.concessao_parcial_total),
      outros_vinculos_total: toNumber(turma.outros_vinculos_total),
      receita_mensal_estimada_centavos: toNumber(turma.receita_mensal_estimada_centavos),
      receita_pagante_estimada_centavos: toNumber(turma.receita_pagante_estimada_centavos),
      receita_concessao_absorvida_centavos: toNumber(
        turma.receita_concessao_absorvida_centavos,
      ),
    }),
  );

  const turmasComposicao = turmasComposicaoTodas.filter((turma) => {
    if (!cursoFilter || !cursoFilterSlug) return true;
    return cursoMatches(turma, cursoFilter, cursoFilterSlug);
  });

  const cursosDisponiveis = Array.from(
    new Set(
      turmasComposicaoTodas
        .map((turma) => turma.curso?.trim())
        .filter((curso): curso is string => Boolean(curso)),
    ),
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const { data: serieData, error: serieError } = await supabase
    .from("vw_escola_dashboard_series_7d")
    .select("*")
    .order("dia", { ascending: true });

  if (serieError) {
    return NextResponse.json(
      { error: "falha_serie", details: serieError.message },
      { status: 500 },
    );
  }

  const { data: trendsData, error: trendsError } = await supabase
    .from("vw_escola_dashboard_trends_30d")
    .select("*")
    .single();

  if (trendsError) {
    return NextResponse.json(
      { error: "falha_trends", details: trendsError.message },
      { status: 500 },
    );
  }

  const resumoInstitucional = resumoInstitucionalData
    ? {
        pagantes_total: toNumber(resumoInstitucionalData.pagantes_total),
        concessao_total: toNumber(resumoInstitucionalData.concessao_total),
        concessao_integral_total: toNumber(resumoInstitucionalData.concessao_integral_total),
        concessao_parcial_total: toNumber(resumoInstitucionalData.concessao_parcial_total),
        receita_mensal_estimada_centavos: toNumber(
          resumoInstitucionalData.receita_mensal_estimada_centavos,
        ),
        receita_pagante_estimada_centavos: toNumber(
          resumoInstitucionalData.receita_pagante_estimada_centavos,
        ),
        receita_concessao_absorvida_centavos: toNumber(
          resumoInstitucionalData.receita_concessao_absorvida_centavos,
        ),
      }
    : null;

  const resumoModalidadeAtual = (() => {
    if (!cursoFilter || !cursoFilterSlug) {
      return aggregateResumoModalidade(turmasComposicaoTodas, "Recorte geral");
    }

    const resumoEncontrado = ((resumoModalidadeData ?? []) as DashboardResumoModalidadeRow[]).find(
      (row) => slugifyCurso(row.curso ?? "") === cursoFilterSlug,
    );

    if (resumoEncontrado) {
      return mapResumoModalidade(resumoEncontrado);
    }

    return aggregateResumoModalidade(turmasComposicao, cursoFilter);
  })();

  return NextResponse.json(
    {
      kpis: kpisData as DashboardKpisRow,
      series7d: (serieData ?? []) as DashboardSerieRow[],
      trends30d: trendsData as DashboardTrendsRow,
      resumoInstitucional: resumoInstitucional as DashboardResumoInstitucional,
      resumoModalidadeAtual,
      turmasComposicao,
      cursosDisponiveis,
    },
    { status: 200 },
  );
}
