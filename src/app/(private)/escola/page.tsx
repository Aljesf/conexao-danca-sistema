"use client";

import * as React from "react";
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

type DashboardAlunoTurma = {
  turma_id: number;
  turma_nome: string;
  aluno_pessoa_id: number;
  aluno_nome: string;
  dt_inicio: string | null;
  dt_fim: string | null;
  status: string | null;
  matricula_id: number | null;
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
  alunosTurma: DashboardAlunoTurma[];
  trends30d: DashboardTrends30d;
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Escola - Dashboard</CardTitle>
            <p className="text-sm text-muted-foreground">
              Visao ampla do cenario: cadastros, matriculas e vinculos por turma.
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
              <div className="text-2xl font-semibold">
                {loading ? "..." : trends?.pessoas_30d ?? 0}
              </div>
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
              <div className="text-2xl font-semibold">
                {loading ? "..." : trends?.alunos_saldo_30d ?? 0}
              </div>
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
              Cadastros de pessoas e matriculas efetivadas por dia.
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
                <Line dataKey="pessoas" name="Pessoas" />
                <Line dataKey="matriculas" name="Matriculas efetivadas" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alunos x Turmas</CardTitle>
            <p className="text-sm text-muted-foreground">
              Vinculos ativos por turma (amostra ate 200 linhas).
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto rounded-md border bg-white">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left">
                    <th className="border-b px-3 py-2">Turma</th>
                    <th className="border-b px-3 py-2">Aluno</th>
                    <th className="border-b px-3 py-2">Inicio</th>
                    <th className="border-b px-3 py-2">Matricula ID</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.alunosTurma ?? []).map((r) => (
                    <tr key={`${r.turma_id}-${r.aluno_pessoa_id}`} className="hover:bg-slate-50">
                      <td className="border-b px-3 py-2">{r.turma_nome}</td>
                      <td className="border-b px-3 py-2">{r.aluno_nome}</td>
                      <td className="border-b px-3 py-2">{r.dt_inicio ?? "-"}</td>
                      <td className="border-b px-3 py-2">{r.matricula_id ?? "-"}</td>
                    </tr>
                  ))}
                  {!loading && (data?.alunosTurma?.length ?? 0) === 0 ? (
                    <tr>
                      <td className="px-3 py-6 text-center text-muted-foreground" colSpan={4}>
                        Nenhum vinculo ativo encontrado.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
