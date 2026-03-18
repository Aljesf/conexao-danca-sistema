"use client";

import * as React from "react";
import {
  EscolaTurmaComposicaoCard,
  type DashboardTurmaComposicao,
} from "@/components/escola/EscolaTurmaComposicaoCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LineChart,
  Line,
  Legend,
} from "recharts";

type DashboardKpis = {
  total_pessoas: number;
  pessoas_hoje: number;
  pessoas_ontem: number;
  matriculas_efetivadas_total: number;
  matriculas_efetivadas_hoje: number;
  matriculas_efetivadas_ontem: number;
};

type DashboardSerie = {
  dia: string;
  pessoas_cadastradas: number;
  matriculas_efetivadas: number;
};

type DashboardTrends30d = {
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

type DashboardPayload = {
  kpis: DashboardKpis;
  series7d: DashboardSerie[];
  trends30d: DashboardTrends30d;
  turmasComposicao: DashboardTurmaComposicao[];
};

function formatDiaBR(iso: string) {
  const [y, m, d] = iso.split("-").map((x) => Number(x));
  if (!y || !m || !d) return iso;
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}

function trendLabel(atual: number, anterior: number) {
  if (anterior <= 0 && atual <= 0) return { label: "Estavel", tone: "text-slate-600" };
  if (anterior <= 0 && atual > 0) return { label: "Em alta", tone: "text-emerald-700" };

  const delta = atual - anterior;
  const pct = (delta / anterior) * 100;

  if (Math.abs(pct) < 5) return { label: "Estavel", tone: "text-slate-600" };
  if (pct > 0) return { label: `Em alta (+${pct.toFixed(0)}%)`, tone: "text-emerald-700" };
  return { label: `Em queda (${pct.toFixed(0)}%)`, tone: "text-rose-700" };
}

export default function EscolaDashboardPage() {
  const [data, setData] = React.useState<DashboardPayload | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/escola/dashboard", { cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string; details?: string }
          | null;
        throw new Error(body?.details || body?.error || `http_${res.status}`);
      }
      const payload = (await res.json()) as DashboardPayload;
      setData(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "erro_desconhecido");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
  }, []);

  const kpis = data?.kpis;

  const serieChart = (data?.series7d ?? []).map((s) => ({
    dia: formatDiaBR(s.dia),
    pessoas: s.pessoas_cadastradas,
    matriculas: s.matriculas_efetivadas,
  }));

  const trends = data?.trends30d;
  const pessoasTrend = trends ? trendLabel(trends.pessoas_30d, trends.pessoas_prev30d) : null;
  const matriculasTrend = trends
    ? trendLabel(trends.matriculas_30d, trends.matriculas_prev30d)
    : null;
  const alunosTrend = trends
    ? trendLabel(trends.alunos_saldo_30d, trends.alunos_saldo_prev30d)
    : null;

  const turmasComposicao = [...(data?.turmasComposicao ?? [])].sort((a, b) => {
    if (b.alunos_ativos_total !== a.alunos_ativos_total) {
      return b.alunos_ativos_total - a.alunos_ativos_total;
    }

    const ocupacaoA = typeof a.ocupacao_percentual === "number" ? a.ocupacao_percentual : -1;
    const ocupacaoB = typeof b.ocupacao_percentual === "number" ? b.ocupacao_percentual : -1;
    if (ocupacaoB !== ocupacaoA) {
      return ocupacaoB - ocupacaoA;
    }

    return a.nome.localeCompare(b.nome, "pt-BR");
  });

  const turmaSkeletons = Array.from({ length: 4 }, (_, index) => index);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Escola - Dashboard</CardTitle>
            <p className="text-sm text-muted-foreground">
              Visao ampla do cenario: cadastros, matriculas, tendencias e composicao institucional das turmas.
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <button
              className="rounded-md border bg-white px-3 py-2 text-sm hover:bg-slate-50"
              onClick={() => void load()}
              disabled={loading}
            >
              {loading ? "Atualizando..." : "Atualizar"}
            </button>
          </CardContent>
        </Card>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Erro ao carregar dashboard: {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pessoas (Total)</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">
              {loading ? "..." : kpis?.total_pessoas ?? 0}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cadastros Hoje</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">
              {loading ? "..." : kpis?.pessoas_hoje ?? 0}
            </CardContent>
            <CardContent className="pt-0 text-sm text-muted-foreground">
              Ontem: {loading ? "..." : kpis?.pessoas_ontem ?? 0}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Matriculas Efetivadas</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">
              {loading ? "..." : kpis?.matriculas_efetivadas_total ?? 0}
            </CardContent>
            <CardContent className="pt-0 text-sm text-muted-foreground">
              Hoje: {loading ? "..." : kpis?.matriculas_efetivadas_hoje ?? 0} | Ontem:{" "}
              {loading ? "..." : kpis?.matriculas_efetivadas_ontem ?? 0}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tendencia (30 dias) - Pessoas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-2xl font-semibold">{loading ? "..." : trends?.pessoas_30d ?? 0}</div>
              <div className={`text-sm ${pessoasTrend?.tone ?? "text-slate-600"}`}>
                {loading ? "..." : pessoasTrend?.label ?? "-"}
              </div>
              <div className="text-xs text-muted-foreground">
                Comparacao com 30 dias anteriores: {loading ? "..." : trends?.pessoas_prev30d ?? 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tendencia (30 dias) - Matriculas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-2xl font-semibold">
                {loading ? "..." : trends?.matriculas_30d ?? 0}
              </div>
              <div className={`text-sm ${matriculasTrend?.tone ?? "text-slate-600"}`}>
                {loading ? "..." : matriculasTrend?.label ?? "-"}
              </div>
              <div className="text-xs text-muted-foreground">
                Comparacao com 30 dias anteriores: {loading ? "..." : trends?.matriculas_prev30d ?? 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tendencia (30 dias) - Alunos (saldo)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-2xl font-semibold">{loading ? "..." : trends?.alunos_saldo_30d ?? 0}</div>
              <div className={`text-sm ${alunosTrend?.tone ?? "text-slate-600"}`}>
                {loading ? "..." : alunosTrend?.label ?? "-"}
              </div>
              <div className="text-xs text-muted-foreground">
                Entradas: {loading ? "..." : trends?.alunos_entradas_30d ?? 0} | Saidas:{" "}
                {loading ? "..." : trends?.alunos_saidas_30d ?? 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ultimos 7 dias</CardTitle>
            <p className="text-sm text-muted-foreground">
              Cadastros de pessoas (azul) e matriculas efetivadas (verde).
            </p>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={serieChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dia" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line dataKey="pessoas" name="Pessoas" stroke="#2563eb" strokeWidth={2} dot={false} />
                <Line
                  dataKey="matriculas"
                  name="Matriculas efetivadas"
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Saude das Turmas</CardTitle>
            <p className="text-sm text-muted-foreground">
              Composicao operacional e institucional das turmas ativas.
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {turmaSkeletons.map((item) => (
                  <div
                    key={`turma-skeleton-${item}`}
                    className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-slate-100/80"
                  />
                ))}
              </div>
            ) : turmasComposicao.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-10 text-center text-sm text-slate-500">
                Nenhuma turma encontrada para composicao.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {turmasComposicao.map((turma) => (
                  <EscolaTurmaComposicaoCard
                    key={turma.turma_id}
                    turma={turma}
                    hrefDetalhe={`/escola/academico/turmas/${turma.turma_id}`}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
