import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

type DashboardKpisRow = {
  total_pessoas: number;
  pessoas_hoje: number;
  pessoas_ontem: number;
  matriculas_efetivadas_total: number;
  matriculas_efetivadas_hoje: number;
  matriculas_efetivadas_ontem: number;
};

type DashboardTurmaRow = {
  turma_id: number;
  nome: string;
  tipo_turma: string | null;
  ano_referencia: number | null;
  status: string | null;
  capacidade: number | null;
  alunos_ativos: number;
};

type DashboardSerieRow = {
  dia: string;
  pessoas_cadastradas: number;
  matriculas_efetivadas: number;
};

export async function GET() {
  const supabase = await getSupabaseServer();

  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth?.user) {
    return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
  }

  const { data: kpisData, error: kpisError } = await supabase
    .from("vw_escola_dashboard_kpis")
    .select("*")
    .single();

  if (kpisError || !kpisData) {
    return NextResponse.json(
      { error: "falha_kpis", details: kpisError?.message ?? "kpis_vazio" },
      { status: 500 },
    );
  }

  const { data: turmasData, error: turmasError } = await supabase
    .from("vw_escola_dashboard_turmas")
    .select("*")
    .order("nome", { ascending: true });

  if (turmasError) {
    return NextResponse.json(
      { error: "falha_turmas", details: turmasError.message },
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

  return NextResponse.json(
    {
      kpis: kpisData as DashboardKpisRow,
      turmas: (turmasData ?? []) as DashboardTurmaRow[],
      series7d: (serieData ?? []) as DashboardSerieRow[],
    },
    { status: 200 },
  );
}
