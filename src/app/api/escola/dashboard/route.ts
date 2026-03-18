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
  distribuicao_niveis_json: DashboardJsonValue | null;
  distribuicao_vinculos_json: DashboardJsonValue | null;
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

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;

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

  return NextResponse.json(
    {
      kpis: kpisData as DashboardKpisRow,
      series7d: (serieData ?? []) as DashboardSerieRow[],
      trends30d: trendsData as DashboardTrendsRow,
      turmasComposicao: (turmasComposicaoData ?? []) as DashboardTurmaComposicaoRow[],
    },
    { status: 200 },
  );
}
