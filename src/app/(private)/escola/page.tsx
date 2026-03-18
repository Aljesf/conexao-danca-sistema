"use client";

import * as React from "react";
import { EscolaDashboardAlunosModal } from "@/components/escola/EscolaDashboardAlunosModal";
import {
  EscolaTurmaComposicaoCard,
  type DashboardTurmaComposicao,
} from "@/components/escola/EscolaTurmaComposicaoCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type DashboardKpis = {
  total_pessoas: number;
  pessoas_hoje: number;
  pessoas_ontem: number;
  matriculas_efetivadas_total: number;
  matriculas_efetivadas_hoje: number;
  matriculas_efetivadas_ontem: number;
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
  resumoInstitucional: DashboardResumoInstitucional;
  resumoModalidadeAtual: DashboardResumoModalidade;
  turmasComposicao: DashboardTurmaComposicao[];
  cursosDisponiveis: string[];
};

type DashboardDetalheItem = {
  pessoaId: number;
  nome: string;
  idade: number | null;
  turmaNome?: string;
  serieOuNivel?: string | null;
  classificacaoInstitucional: string;
  concessaoTipo: string | null;
  valorMensalCentavos: number | null;
};

type DashboardDetalheGrupo = {
  chave: string;
  total: number;
  itens: DashboardDetalheItem[];
};

type DashboardDetalhesPayload = {
  modo: "institucional" | "turma";
  titulo: string;
  subtitulo?: string;
  total: number;
  totalRegistros: number;
  somaValoresCentavos: number;
  itens: DashboardDetalheItem[];
  grupos: DashboardDetalheGrupo[];
};

type AlunosModalState = {
  open: boolean;
  loading: boolean;
  modo: "institucional" | "turma";
  titulo: string;
  subtitulo?: string;
  totalRegistros: number;
  somaValoresCentavos: number | null;
  itens: DashboardDetalheItem[];
  grupos: DashboardDetalheGrupo[];
  error: string | null;
};

const moedaFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatDiaBR(iso: string) {
  const [y, m, d] = iso.split("-").map((x) => Number(x));
  if (!y || !m || !d) return iso;
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}

function formatCurrencyFromCentavos(value: number | null | undefined) {
  if (typeof value !== "number") return "Nao disponivel";
  return moedaFormatter.format(value / 100);
}

function buildResumoModalidade(
  turmas: DashboardTurmaComposicao[],
  cursoLabel: string,
): DashboardResumoModalidade {
  return {
    cursoLabel,
    totalTurmas: turmas.length,
    alunosAtivosTotal: turmas.reduce((acc, turma) => acc + turma.alunos_ativos_total, 0),
    pagantesTotal: turmas.reduce((acc, turma) => acc + turma.pagantes_total, 0),
    concessaoTotal: turmas.reduce((acc, turma) => acc + turma.concessao_total, 0),
    concessaoIntegralTotal: turmas.reduce(
      (acc, turma) => acc + turma.concessao_integral_total,
      0,
    ),
    concessaoParcialTotal: turmas.reduce(
      (acc, turma) => acc + turma.concessao_parcial_total,
      0,
    ),
    receitaMensalEstimadaCentavos: turmas.reduce(
      (acc, turma) => acc + (turma.receita_mensal_estimada_centavos ?? 0),
      0,
    ),
    receitaPaganteEstimadaCentavos: turmas.reduce(
      (acc, turma) => acc + (turma.receita_pagante_estimada_centavos ?? 0),
      0,
    ),
    receitaConcessaoAbsorvidaCentavos: turmas.reduce(
      (acc, turma) => acc + (turma.receita_concessao_absorvida_centavos ?? 0),
      0,
    ),
  };
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

function DashboardMetricCard({
  eyebrow,
  title,
  value,
  meta,
  details,
  accent = "slate",
  onClick,
}: {
  eyebrow: string;
  title: string;
  value: string | number;
  meta?: string;
  details?: React.ReactNode;
  accent?: "slate" | "emerald" | "sky" | "amber";
  onClick?: () => void;
}) {
  const accentClasses = {
    slate: "from-slate-900 to-slate-700",
    emerald: "from-emerald-700 to-emerald-500",
    sky: "from-sky-700 to-sky-500",
    amber: "from-amber-700 to-amber-500",
  };

  const content = (
    <div className="space-y-4 px-5 py-5 text-left">
      <div className={`h-1.5 w-14 rounded-full bg-gradient-to-r ${accentClasses[accent]}`} />
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          {eyebrow}
        </p>
        <h3 className="text-sm font-medium text-slate-600">{title}</h3>
      </div>
      <div className="text-3xl font-semibold tracking-tight text-slate-950">{value}</div>
      {meta ? <p className="text-sm text-slate-500">{meta}</p> : null}
      {details}
    </div>
  );

  return (
    <Card className="rounded-[24px] border border-slate-200/75 bg-white/95 shadow-[0_22px_50px_-36px_rgba(15,23,42,0.35)]">
      <CardContent className="p-0">
        {onClick ? (
          <div
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
              }
            }}
            className="block w-full rounded-[24px] transition hover:bg-slate-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
          >
            {content}
          </div>
        ) : (
          content
        )}
      </CardContent>
    </Card>
  );
}

const modalStateInicial: AlunosModalState = {
  open: false,
  loading: false,
  modo: "institucional",
  titulo: "",
  subtitulo: "",
  totalRegistros: 0,
  somaValoresCentavos: null,
  itens: [],
  grupos: [],
  error: null,
};

export default function EscolaDashboardPage() {
  const [data, setData] = React.useState<DashboardPayload | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [cursoSelecionado, setCursoSelecionado] = React.useState<string>("Todos");
  const [alunosModal, setAlunosModal] = React.useState<AlunosModalState>(modalStateInicial);

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

  React.useEffect(() => {
    if (!data) return;
    if (cursoSelecionado === "Todos") return;
    if (!data.cursosDisponiveis.includes(cursoSelecionado)) {
      setCursoSelecionado("Todos");
    }
  }, [cursoSelecionado, data]);

  async function abrirModalDetalhes(query: string) {
    setAlunosModal((current) => ({
      ...current,
      open: true,
      loading: true,
      error: null,
    }));

    try {
      const res = await fetch(`/api/escola/dashboard/detalhes?${query}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string; details?: string }
          | null;
        throw new Error(body?.details || body?.error || `http_${res.status}`);
      }

      const payload = (await res.json()) as DashboardDetalhesPayload;
      setAlunosModal({
        open: true,
        loading: false,
        modo: payload.modo,
        titulo: payload.titulo,
        subtitulo: payload.subtitulo,
        totalRegistros: payload.totalRegistros,
        somaValoresCentavos: payload.somaValoresCentavos,
        itens: payload.itens,
        grupos: payload.grupos,
        error: null,
      });
    } catch (e) {
      setAlunosModal((current) => ({
        ...current,
        open: true,
        loading: false,
        error: e instanceof Error ? e.message : "erro_desconhecido",
      }));
    }
  }

  const kpis = data?.kpis;
  const resumoInstitucional = data?.resumoInstitucional;
  const trends = data?.trends30d;
  const cursosDisponiveis = data?.cursosDisponiveis ?? [];
  const usarSelectDeCurso = cursosDisponiveis.length > 6;

  const pessoasTrend = trends ? trendLabel(trends.pessoas_30d, trends.pessoas_prev30d) : null;
  const matriculasTrend = trends
    ? trendLabel(trends.matriculas_30d, trends.matriculas_prev30d)
    : null;
  const alunosTrend = trends
    ? trendLabel(trends.alunos_saldo_30d, trends.alunos_saldo_prev30d)
    : null;

  const serieChart = (data?.series7d ?? []).map((s) => ({
    dia: formatDiaBR(s.dia),
    pessoas: s.pessoas_cadastradas,
    matriculas: s.matriculas_efetivadas,
  }));

  const turmasOrdenadas = [...(data?.turmasComposicao ?? [])].sort((a, b) => {
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

  const turmasFiltradas = turmasOrdenadas.filter((turma) => {
    if (cursoSelecionado === "Todos") return true;
    return turma.curso === cursoSelecionado;
  });

  const resumoModalidadeAtual = data
    ? buildResumoModalidade(
        turmasFiltradas,
        cursoSelecionado === "Todos" ? "Recorte geral" : cursoSelecionado,
      )
    : null;

  const queryCursoSelecionado =
    cursoSelecionado === "Todos"
      ? ""
      : `&curso=${encodeURIComponent(cursoSelecionado)}`;

  const turmaSkeletons = Array.from({ length: 4 }, (_, index) => index);

  return (
    <>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.08),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#ffffff_100%)] px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <Card className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-white/95 shadow-[0_28px_70px_-45px_rgba(15,23,42,0.42)]">
            <div className="h-1.5 w-full bg-gradient-to-r from-sky-500 via-emerald-500 to-amber-400" />
            <CardHeader className="space-y-3 pb-3">
              <CardTitle className="text-2xl font-semibold tracking-tight text-slate-950">
                Escola - Dashboard
              </CardTitle>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                Visao ampla do cenario: cadastros, matriculas, tendencias e composicao
                institucional das turmas.
              </p>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-0">
              <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-slate-100 px-3 py-1.5 ring-1 ring-inset ring-slate-200/80">
                  {loading ? "..." : `${turmasOrdenadas.length} turmas monitoradas`}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 ring-1 ring-inset ring-slate-200/80">
                  {loading ? "..." : `${cursosDisponiveis.length} cursos com composicao`}
                </span>
              </div>

              <button
                className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                onClick={() => void load()}
                disabled={loading}
              >
                {loading ? "Atualizando..." : "Atualizar"}
              </button>
            </CardContent>
          </Card>

          {error ? (
            <div className="rounded-[24px] border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700 shadow-[0_18px_45px_-34px_rgba(185,28,28,0.35)]">
              Erro ao carregar dashboard: {error}
            </div>
          ) : null}

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                  Indicadores operacionais
                </h2>
                <p className="text-sm text-slate-500">
                  Cadastros e matriculas consolidados do dashboard da Escola.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <DashboardMetricCard
                eyebrow="Cadastros"
                title="Pessoas no cadastro"
                value={loading ? "..." : kpis?.total_pessoas ?? 0}
                accent="sky"
              />
              <DashboardMetricCard
                eyebrow="Movimento diario"
                title="Cadastros hoje"
                value={loading ? "..." : kpis?.pessoas_hoje ?? 0}
                meta={`Ontem: ${loading ? "..." : kpis?.pessoas_ontem ?? 0}`}
                accent="emerald"
              />
              <DashboardMetricCard
                eyebrow="Matriculas"
                title="Matriculas efetivadas"
                value={loading ? "..." : kpis?.matriculas_efetivadas_total ?? 0}
                meta={`Hoje: ${loading ? "..." : kpis?.matriculas_efetivadas_hoje ?? 0} | Ontem: ${loading ? "..." : kpis?.matriculas_efetivadas_ontem ?? 0}`}
                accent="amber"
              />
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                Leitura institucional
              </h2>
              <p className="text-sm text-slate-500">
                Totais agregados de pagantes, concessoes e financeiro operacional da Escola.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <DashboardMetricCard
                eyebrow="Institucional"
                title="Pagantes"
                value={loading ? "..." : resumoInstitucional?.pagantes_total ?? 0}
                meta="Clique para listar os vinculos ativos pagantes da Escola."
                onClick={() => void abrirModalDetalhes("escopo=institucional&tipo=pagantes")}
              />
              <DashboardMetricCard
                eyebrow="Institucional"
                title="Concessoes"
                value={loading ? "..." : resumoInstitucional?.concessao_total ?? 0}
                meta="Clique para listar os vinculos ativos de concessao da Escola."
                details={
                  <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-50/85 px-3 py-3 text-sm text-slate-600 ring-1 ring-inset ring-slate-200/70">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void abrirModalDetalhes("escopo=institucional&tipo=concessoes_integrais");
                      }}
                      className="rounded-xl px-2 py-1 text-left transition hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Integrais
                      </p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">
                        {loading ? "..." : resumoInstitucional?.concessao_integral_total ?? 0}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void abrirModalDetalhes("escopo=institucional&tipo=concessoes_parciais");
                      }}
                      className="rounded-xl px-2 py-1 text-left transition hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Parciais
                      </p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">
                        {loading ? "..." : resumoInstitucional?.concessao_parcial_total ?? 0}
                      </p>
                    </button>
                  </div>
                }
                accent="sky"
                onClick={() => void abrirModalDetalhes("escopo=institucional&tipo=concessoes")}
              />
              <DashboardMetricCard
                eyebrow="Financeiro operacional"
                title="Receita mensal estimada total"
                value={
                  loading
                    ? "..."
                    : formatCurrencyFromCentavos(
                        resumoInstitucional?.receita_mensal_estimada_centavos,
                      )
                }
                meta="Total estimado = receita pagante + absorcao institucional."
                details={
                  <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-50/85 px-3 py-3 text-sm text-slate-600 ring-1 ring-inset ring-slate-200/70">
                    <div className="rounded-xl bg-white/70 px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Receita pagante
                      </p>
                      <p className="mt-1 text-base font-semibold text-slate-900">
                        {loading
                          ? "..."
                          : formatCurrencyFromCentavos(
                              resumoInstitucional?.receita_pagante_estimada_centavos,
                            )}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/70 px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Absorcao institucional
                      </p>
                      <p className="mt-1 text-base font-semibold text-slate-900">
                        {loading
                          ? "..."
                          : formatCurrencyFromCentavos(
                              resumoInstitucional?.receita_concessao_absorvida_centavos,
                            )}
                      </p>
                    </div>
                  </div>
                }
                accent="emerald"
              />
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.95fr]">
            <Card className="rounded-[28px] border border-slate-200/75 bg-white/95 shadow-[0_24px_55px_-38px_rgba(15,23,42,0.35)]">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-950">Ultimos 7 dias</CardTitle>
                <p className="text-sm text-slate-500">
                  Cadastros de pessoas (azul) e matriculas efetivadas (verde).
                </p>
              </CardHeader>
              <CardContent className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={serieChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                    <XAxis dataKey="dia" stroke="#64748b" />
                    <YAxis allowDecimals={false} stroke="#64748b" />
                    <Tooltip />
                    <Legend />
                    <Line dataKey="pessoas" name="Pessoas" stroke="#0f766e" strokeWidth={2.5} dot={false} />
                    <Line
                      dataKey="matriculas"
                      name="Matriculas efetivadas"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-4">
              <DashboardMetricCard
                eyebrow="Tendencias 30d"
                title="Pessoas"
                value={loading ? "..." : trends?.pessoas_30d ?? 0}
                meta={`Comparacao: ${loading ? "..." : trends?.pessoas_prev30d ?? 0} | ${loading ? "..." : pessoasTrend?.label ?? "-"}`}
                accent="sky"
              />
              <DashboardMetricCard
                eyebrow="Tendencias 30d"
                title="Matriculas"
                value={loading ? "..." : trends?.matriculas_30d ?? 0}
                meta={`Comparacao: ${loading ? "..." : trends?.matriculas_prev30d ?? 0} | ${loading ? "..." : matriculasTrend?.label ?? "-"}`}
                accent="emerald"
              />
              <DashboardMetricCard
                eyebrow="Tendencias 30d"
                title="Saldo de alunos"
                value={loading ? "..." : trends?.alunos_saldo_30d ?? 0}
                meta={`Entradas: ${loading ? "..." : trends?.alunos_entradas_30d ?? 0} | Saidas: ${loading ? "..." : trends?.alunos_saidas_30d ?? 0} | ${loading ? "..." : alunosTrend?.label ?? "-"}`}
                accent="amber"
              />
            </div>
          </div>

          <Card className="rounded-[30px] border border-slate-200/80 bg-white/95 shadow-[0_28px_70px_-45px_rgba(15,23,42,0.38)]">
            <CardHeader className="gap-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg font-semibold tracking-tight text-slate-950">
                    Saude das Turmas
                  </CardTitle>
                  <p className="text-sm text-slate-500">
                    Composicao operacional, institucional e estimativa mensal por turma.
                  </p>
                </div>

                <div className="flex flex-col gap-2 lg:items-end">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Curso
                  </span>
                  {usarSelectDeCurso ? (
                    <select
                      value={cursoSelecionado}
                      onChange={(event) => setCursoSelecionado(event.target.value)}
                      className="min-w-56 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm outline-none ring-0 transition focus:border-slate-400"
                    >
                      <option value="Todos">Todos</option>
                      {cursosDisponiveis.map((curso) => (
                        <option key={curso} value={curso}>
                          {curso}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setCursoSelecionado("Todos")}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                          cursoSelecionado === "Todos"
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        Todos
                      </button>
                      {cursosDisponiveis.map((curso) => (
                        <button
                          key={curso}
                          type="button"
                          onClick={() => setCursoSelecionado(curso)}
                          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                            cursoSelecionado === curso
                              ? "bg-slate-900 text-white"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          {curso}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="rounded-[24px] border border-slate-200/75 bg-slate-50/80 px-4 py-4 shadow-[0_18px_45px_-38px_rgba(15,23,42,0.25)]">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Resumo da modalidade filtrada
                    </h3>
                    <p className="text-sm text-slate-600">
                      {loading
                        ? "..."
                        : `${resumoModalidadeAtual?.cursoLabel ?? data?.resumoModalidadeAtual.cursoLabel ?? "Recorte geral"} em leitura operacional.`}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500">
                    Alunos ativos representam a ocupacao real do recorte atual.
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl bg-white/85 px-4 py-3 ring-1 ring-inset ring-slate-200/70">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Total de turmas
                    </p>
                    <p className="mt-1.5 text-xl font-semibold text-slate-900">
                      {loading ? "..." : resumoModalidadeAtual?.totalTurmas ?? 0}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/85 px-4 py-3 ring-1 ring-inset ring-slate-200/70">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Alunos ativos
                    </p>
                    <p className="mt-1.5 text-xl font-semibold text-slate-900">
                      {loading ? "..." : resumoModalidadeAtual?.alunosAtivosTotal ?? 0}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      void abrirModalDetalhes(
                        `escopo=institucional&tipo=pagantes${queryCursoSelecionado}`,
                      )
                    }
                    className="rounded-2xl bg-white/85 px-4 py-3 text-left ring-1 ring-inset ring-slate-200/70 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Pagantes
                    </p>
                    <p className="mt-1.5 text-xl font-semibold text-slate-900">
                      {loading ? "..." : resumoModalidadeAtual?.pagantesTotal ?? 0}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void abrirModalDetalhes(
                        `escopo=institucional&tipo=concessoes${queryCursoSelecionado}`,
                      )
                    }
                    className="rounded-2xl bg-white/85 px-4 py-3 text-left ring-1 ring-inset ring-slate-200/70 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Concessoes
                    </p>
                    <p className="mt-1.5 text-xl font-semibold text-slate-900">
                      {loading ? "..." : resumoModalidadeAtual?.concessaoTotal ?? 0}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Integrais: {loading ? "..." : resumoModalidadeAtual?.concessaoIntegralTotal ?? 0}{" "}
                      | Parciais: {loading ? "..." : resumoModalidadeAtual?.concessaoParcialTotal ?? 0}
                    </p>
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-2xl bg-white/85 px-4 py-3 ring-1 ring-inset ring-slate-200/70">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Receita pagante
                    </p>
                    <p className="mt-1.5 text-lg font-semibold text-slate-900">
                      {loading
                        ? "..."
                        : formatCurrencyFromCentavos(
                            resumoModalidadeAtual?.receitaPaganteEstimadaCentavos,
                          )}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/85 px-4 py-3 ring-1 ring-inset ring-slate-200/70">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Absorcao institucional
                    </p>
                    <p className="mt-1.5 text-lg font-semibold text-slate-900">
                      {loading
                        ? "..."
                        : formatCurrencyFromCentavos(
                            resumoModalidadeAtual?.receitaConcessaoAbsorvidaCentavos,
                          )}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/85 px-4 py-3 ring-1 ring-inset ring-slate-200/70">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Receita total estimada
                    </p>
                    <p className="mt-1.5 text-lg font-semibold text-slate-900">
                      {loading
                        ? "..."
                        : formatCurrencyFromCentavos(
                            resumoModalidadeAtual?.receitaMensalEstimadaCentavos,
                          )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] bg-slate-50/80 px-4 py-3 ring-1 ring-inset ring-slate-200/70">
                <div className="text-sm text-slate-600">
                  Exibindo{" "}
                  <span className="font-semibold text-slate-900">
                    {loading ? "..." : turmasFiltradas.length}
                  </span>{" "}
                  {cursoSelecionado === "Todos"
                    ? "turmas no recorte geral."
                    : `turmas do curso ${cursoSelecionado}.`}
                </div>
                <div className="text-sm text-slate-500">
                  Receita estimada exibida nas turmas filtradas:{" "}
                  <span className="font-semibold text-slate-900">
                    {loading
                      ? "..."
                      : formatCurrencyFromCentavos(
                          turmasFiltradas.reduce(
                            (acc, turma) => acc + (turma.receita_mensal_estimada_centavos ?? 0),
                            0,
                          ),
                        )}
                  </span>
                </div>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {turmaSkeletons.map((item) => (
                    <div
                      key={`turma-skeleton-${item}`}
                      className="h-[30rem] animate-pulse rounded-[28px] bg-slate-100/80 ring-1 ring-inset ring-slate-200/70"
                    />
                  ))}
                </div>
              ) : turmasFiltradas.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-10 text-center text-sm text-slate-500">
                  Nenhuma turma encontrada para composicao.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {turmasFiltradas.map((turma) => (
                    <EscolaTurmaComposicaoCard
                      key={turma.turma_id}
                      turma={turma}
                      hrefDetalhe={`/escola/academico/turmas/${turma.turma_id}`}
                      onClickAlunosAtivos={() =>
                        void abrirModalDetalhes(
                          `escopo=turma&turma_id=${turma.turma_id}&tipo=alunos_ativos`,
                        )
                      }
                      onClickPagantes={() =>
                        void abrirModalDetalhes(
                          `escopo=turma&turma_id=${turma.turma_id}&tipo=pagantes`,
                        )
                      }
                      onClickConcessoes={() =>
                        void abrirModalDetalhes(
                          `escopo=turma&turma_id=${turma.turma_id}&tipo=concessoes`,
                        )
                      }
                      onClickConcessoesIntegrais={() =>
                        void abrirModalDetalhes(
                          `escopo=turma&turma_id=${turma.turma_id}&tipo=concessoes_integrais`,
                        )
                      }
                      onClickConcessoesParciais={() =>
                        void abrirModalDetalhes(
                          `escopo=turma&turma_id=${turma.turma_id}&tipo=concessoes_parciais`,
                        )
                      }
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <EscolaDashboardAlunosModal
        open={alunosModal.open}
        onOpenChange={(open) =>
          setAlunosModal((current) => ({
            ...current,
            open,
            error: open ? current.error : null,
          }))
        }
        titulo={alunosModal.titulo}
        subtitulo={alunosModal.subtitulo}
        modo={alunosModal.modo}
        totalRegistros={alunosModal.totalRegistros}
        somaValoresCentavos={alunosModal.somaValoresCentavos}
        loading={alunosModal.loading}
        error={alunosModal.error}
        itens={alunosModal.itens}
        grupos={alunosModal.grupos}
      />
    </>
  );
}
