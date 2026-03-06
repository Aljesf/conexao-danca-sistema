"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FinanceHelpCard } from "@/components/FinanceHelpCard";
import { formatBRLFromCents } from "@/lib/formatters/money";
import { formatDateTimeISO } from "@/lib/formatters/date";
import {
  formatarCompetenciaLabel,
  type DashboardFinanceiroMensalResponse,
} from "@/lib/financeiro/creditoConexao/cobrancas";
import { HELP_DASHBOARD_INTELIGENTE } from "@/lib/financeiro/helpDashboardInteligente";

type TendenciaValor = {
  atual_centavos: number;
  anterior_centavos: number;
  variacao_percentual: number | null;
  direcao: "UP" | "DOWN" | "FLAT";
  descricao?: "BASE_ZERO_SUBIU" | "ZEROU" | "SEM_MOVIMENTO" | null;
};

type TendenciaResumo = {
  entradas: TendenciaValor;
  saidas: TendenciaValor;
  resultado: TendenciaValor;
};

type ResumoCentro = {
  centro_custo_id: number;
  centro_custo_codigo: string | null;
  centro_custo_nome: string | null;
  receitas_30d_centavos: number;
  despesas_30d_centavos: number;
  resultado_30d_centavos: number;
  tendencia_resultado: TendenciaValor;
};

type SerieFluxoItem = {
  data: string;
  tipo: "historico" | "projecao";
  entradas_centavos: number;
  saidas_centavos: number;
  saldo_acumulado_centavos: number;
};

type RegraAlerta = {
  codigo: string;
  titulo: string;
  severidade: "INFO" | "ALERTA" | "CRITICO";
  detalhe?: string | null;
};

type AnaliseAlerta = {
  severidade: "INFO" | "ALERTA" | "CRITICO";
  titulo: string;
  por_que_importa: string;
  acao_pratica: string;
  sinal: "\u2191" | "\u2193" | "\u2192";
};

type Snapshot = {
  id: number;
  created_at: string;
  data_base: string;
  periodo_inicio: string;
  periodo_fim: string;
  caixa_hoje_centavos: number;
  entradas_previstas_30d_centavos: number;
  saidas_comprometidas_30d_centavos: number;
  folego_caixa_dias: number | null;
  tendencia: TendenciaResumo;
  resumo_por_centro: ResumoCentro[];
  serie_fluxo_caixa: SerieFluxoItem[];
  regras_alerta: RegraAlerta[];
};

type Analise = {
  id?: number;
  created_at?: string;
  model?: string | null;
  alertas: AnaliseAlerta[];
  texto_curto?: string | null;
  meta?: {
    fonte?: "GPT" | "REGRAS" | null;
    erro_tipo?: "SEM_CHAVE" | "ERRO" | "PARSER";
    erro_msg?: string | null;
  };
};

type DashboardResponse = {
  ok: boolean;
  snapshot: Snapshot;
  analise: Analise | null;
  error?: string;
  has_openai_key?: boolean;
  gpt_status?: "OK" | "SEM_CHAVE" | "ERRO";
  gpt_error_motivo?: string | null;
  model_usado?: string | null;
  diagnostico_gpt?: {
    has_openai_key: boolean;
    model_configurado: string | null;
    modo: "FINANCEIRO";
    status: "OK" | "SEM_CHAVE" | "ERRO" | "PARSER";
    motivo: string | null;
  };
};

type DashboardMensalResponse = DashboardFinanceiroMensalResponse & {
  ok: boolean;
  error?: string;
};

type LineDatum = {
  x: number;
  y: number;
};

function tendenciaIcon(direcao?: "UP" | "DOWN" | "FLAT") {
  if (direcao === "UP") return "\u2191";
  if (direcao === "DOWN") return "\u2193";
  return "\u2192";
}

function variacaoTexto(t: TendenciaValor | undefined) {
  if (!t) return "Sem historico";
  if (t.descricao === "BASE_ZERO_SUBIU") return "Subiu a partir de base zero";
  if (t.descricao === "ZEROU") return "Zerou vs periodo anterior";
  if (t.descricao === "SEM_MOVIMENTO") return "Sem movimento em ambos periodos";
  if (t.variacao_percentual === null || Number.isNaN(t.variacao_percentual)) return "Sem historico";
  const sign = t.variacao_percentual >= 0 ? "+" : "";
  return `${sign}${t.variacao_percentual.toFixed(1)}% vs 30d anterior`;
}

function ordenarAlertas(alertas: AnaliseAlerta[]) {
  const peso = { CRITICO: 3, ALERTA: 2, INFO: 1 };
  return [...(alertas || [])].sort(
    (a, b) => (peso[b.severidade] || 0) - (peso[a.severidade] || 0)
  );
}

function buildPolyline(points: LineDatum[]) {
  return points.map((p) => `${p.x},${p.y}`).join(" ");
}

function normalizeSeries(data: SerieFluxoItem[], height: number, width: number) {
  const padding = 24;
  const plotWidth = Math.max(width - padding * 2, 50);
  const plotHeight = Math.max(height - padding * 2, 50);
  const maxVal = Math.max(
    ...data.flatMap((d) => [
      d.entradas_centavos,
      d.saidas_centavos,
      d.saldo_acumulado_centavos,
    ]),
    1
  );
  const minVal = Math.min(
    ...data.flatMap((d) => [
      d.entradas_centavos,
      d.saidas_centavos,
      d.saldo_acumulado_centavos,
    ]),
    0
  );
  const range = maxVal - minVal || 1;
  const step = data.length > 1 ? plotWidth / (data.length - 1) : plotWidth;

  const scaleY = (v: number) => padding + plotHeight - ((v - minVal) / range) * plotHeight;

  const entradas: LineDatum[] = [];
  const saidas: LineDatum[] = [];
  const saldo: LineDatum[] = [];

  data.forEach((d, idx) => {
    const x = padding + idx * step;
    entradas.push({ x, y: scaleY(d.entradas_centavos) });
    saidas.push({ x, y: scaleY(d.saidas_centavos) });
    saldo.push({ x, y: scaleY(d.saldo_acumulado_centavos) });
  });

  return {
    entradas,
    saidas,
    saldo,
    minVal,
    maxVal,
    padding,
  };
}

export default function FinanceiroDashboardPage() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [analise, setAnalise] = useState<Analise | null>(null);
  const [mensal, setMensal] = useState<DashboardFinanceiroMensalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [reanalisando, setReanalisando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensalError, setMensalError] = useState<string | null>(null);
  const [gptInfo, setGptInfo] = useState<{
    status?: "OK" | "SEM_CHAVE" | "ERRO";
    motivo?: string | null;
    hasKey?: boolean;
    model?: string | null;
  }>({});
  const [helpOpen, setHelpOpen] = useState(false);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    setMensalError(null);
    try {
      const [inteligenteResult, mensalResult] = await Promise.allSettled([
        fetch("/api/financeiro/dashboard-inteligente", { cache: "no-store" }).then(async (res) => {
          const json = (await res.json()) as DashboardResponse;
          if (!res.ok || !json?.ok) throw new Error(json?.error || "Erro ao carregar dashboard.");
          return json;
        }),
        fetch("/api/financeiro/dashboard/mensal", { cache: "no-store" }).then(async (res) => {
          const json = (await res.json()) as DashboardMensalResponse;
          if (!res.ok || !json?.ok) throw new Error(json?.error || "Erro ao carregar leitura mensal.");
          return json;
        }),
      ]);

      if (inteligenteResult.status === "rejected") {
        throw inteligenteResult.reason;
      }

      const json = inteligenteResult.value;
      setSnapshot(json.snapshot);
      setAnalise(json.analise);
      setGptInfo({
        status: json.gpt_status,
        motivo: json.gpt_error_motivo,
        hasKey: json.has_openai_key,
        model: json.model_usado,
      });

      if (mensalResult.status === "fulfilled") {
        setMensal(mensalResult.value);
      } else {
        setMensal(null);
        setMensalError(
          mensalResult.reason instanceof Error
            ? mensalResult.reason.message
            : "Erro ao carregar leitura mensal do financeiro.",
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro inesperado ao carregar dashboard.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function reanalisar() {
    setReanalisando(true);
    setError(null);
    try {
      const res = await fetch("/api/financeiro/dashboard-inteligente/reanalisar", {
        method: "POST",
      });
      const json = (await res.json()) as DashboardResponse;
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Erro ao reanalisar.");
      setSnapshot(json.snapshot);
      setAnalise(json.analise);
      setGptInfo({
        status: json.gpt_status,
        motivo: json.gpt_error_motivo,
        hasKey: json.has_openai_key,
        model: json.model_usado,
      });
      try {
        const mensalRes = await fetch("/api/financeiro/dashboard/mensal", { cache: "no-store" });
        const mensalJson = (await mensalRes.json()) as DashboardMensalResponse;
        if (!mensalRes.ok || !mensalJson?.ok) {
          throw new Error(mensalJson?.error || "Erro ao recarregar leitura mensal.");
        }
        setMensal(mensalJson);
        setMensalError(null);
      } catch (mensalErr: unknown) {
        setMensal(null);
        setMensalError(
          mensalErr instanceof Error ? mensalErr.message : "Erro ao recarregar leitura mensal.",
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao reanalisar dashboard.";
      setError(message);
    } finally {
      setReanalisando(false);
    }
  }

  const alertasMostrados = useMemo(() => {
    if (analise?.alertas?.length) return ordenarAlertas(analise.alertas).slice(0, 3);
    if (snapshot?.regras_alerta?.length) {
      return snapshot.regras_alerta.slice(0, 3).map((r) => {
        return {
          severidade: r.severidade,
          titulo: r.titulo,
          por_que_importa: r.detalhe ?? "Alerta calculado pelo motor interno.",
          acao_pratica: "Revisar dados e registrar movimentos.",
          sinal: "→" as const,
        };
      });
    }
    return [];
  }, [analise, snapshot]);

  const serieChart = useMemo(() => snapshot?.serie_fluxo_caixa ?? [], [snapshot]);
  const blocoCentros = useMemo(() => snapshot?.resumo_por_centro ?? [], [snapshot]);
  const tendencia = snapshot?.tendencia;
  const competenciaMensalLabel = mensal ? formatarCompetenciaLabel(mensal.competencia_atual) : "--";

  const cardsSaude = [
    {
      titulo: "Caixa disponivel hoje",
      valor: formatBRLFromCents(snapshot?.caixa_hoje_centavos ?? null),
      tendencia: tendencia?.resultado,
    },
    {
      titulo: "Entradas previstas (30d)",
      valor: formatBRLFromCents(snapshot?.entradas_previstas_30d_centavos ?? null),
      tendencia: tendencia?.entradas,
    },
    {
      titulo: "Saidas comprometidas (30d)",
      valor: formatBRLFromCents(snapshot?.saidas_comprometidas_30d_centavos ?? null),
      tendencia: tendencia?.saidas,
    },
  ];

  if (snapshot?.folego_caixa_dias !== null && snapshot?.folego_caixa_dias !== undefined) {
    cardsSaude.push({
      titulo: "Folego de caixa (dias)",
      valor: `${snapshot.folego_caixa_dias}`,
      tendencia: tendencia?.resultado,
    });
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-white px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-lg font-semibold text-slate-800">Dashboard Financeiro Inteligente</h1>
              <p className="text-sm text-slate-600">
                Visao futura, tendencia e alertas automaticos com dados reais do Supabase.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link href="/admin/financeiro/centros-custo" className="text-purple-600 font-medium">
                Centros de custo
              </Link>
              <Link href="/admin/financeiro/categorias" className="text-purple-600 font-medium">
                Categorias
              </Link>
              <Link href="/admin/financeiro/contas-receber" className="text-purple-600 font-medium">
                Contas a receber
              </Link>
              <Link href="/admin/financeiro/contas-pagar" className="text-purple-600 font-medium">
                Contas a pagar
              </Link>
              <Link href="/admin/financeiro/movimento" className="text-purple-600 font-medium">
                Movimento
              </Link>
            </div>
          </div>

          <FinanceHelpCard
            subtitle="Visao geral do financeiro com saude imediata, leitura mensal SaaS e alertas inteligentes."
            items={[
              "Saude imediata e saude mensal mostram previsto, pago, pendente, vencido e carteira em NeoFin.",
              "A leitura mensal ajuda a comparar competencias recentes e priorizar cobranca e conversao.",
              "Fluxo de caixa, alertas simples e leitura inteligente mantem a visao executiva do financeiro.",
            ]}
          />

          {error ? (
            <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
        </div>

        {/* Bloco 1 */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Saude imediata</h2>
              <p className="text-sm text-slate-600">Valores consolidados e comparacao vs 30d anterior.</p>
            </div>
            {loading ? <span className="text-xs text-slate-500">Carregando...</span> : null}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cardsSaude.map((card) => (
              <div
                key={card.titulo}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <p className="text-sm text-slate-600">{card.titulo}</p>
                <p className="text-xl font-semibold text-slate-800">
                  {loading ? "Carregando..." : card.valor}
                </p>
                <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                  <span>{tendenciaIcon(card.tendencia?.direcao)}</span>
                  <span>{variacaoTexto(card.tendencia)}</span>
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Saude mensal do financeiro</h2>
              <p className="text-sm text-slate-600">
                Leitura rapida da competencia {competenciaMensalLabel} com foco em cobranca e conversao.
              </p>
            </div>
            <Link
              href="/admin/financeiro/credito-conexao/cobrancas"
              className="inline-flex items-center rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Abrir cobrancas do aluno
            </Link>
          </div>

          {mensalError ? (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {mensalError}
            </div>
          ) : null}

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {[
              {
                titulo: "Previsto para receber no mes",
                valor: formatBRLFromCents(mensal?.cards.previsto_mes_centavos ?? null),
              },
              {
                titulo: "Recebido no mes",
                valor: formatBRLFromCents(mensal?.cards.pago_mes_centavos ?? null),
              },
              {
                titulo: "Pendente do mes",
                valor: formatBRLFromCents(mensal?.cards.pendente_mes_centavos ?? null),
              },
              {
                titulo: "Em cobranca NeoFin",
                valor: formatBRLFromCents(mensal?.cards.neofin_mes_centavos ?? null),
              },
              {
                titulo: "Inadimplencia do mes",
                valor: `${(mensal?.cards.inadimplencia_mes_percentual ?? 0).toFixed(1)}%`,
              },
            ].map((card) => (
              <div key={card.titulo} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-600">{card.titulo}</p>
                <p className="mt-2 text-xl font-semibold text-slate-800">{loading ? "Carregando..." : card.valor}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-800">Competencias recentes</h3>
                  <p className="text-sm text-slate-600">
                    Compare previsto, pago, pendente, vencido e NeoFin para decidir a prioridade do mes.
                  </p>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left">Competencia</th>
                      <th className="px-3 py-2 text-right">Previsto</th>
                      <th className="px-3 py-2 text-right">Pago</th>
                      <th className="px-3 py-2 text-right">Pendente</th>
                      <th className="px-3 py-2 text-right">Vencido</th>
                      <th className="px-3 py-2 text-right">NeoFin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(mensal?.meses ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                          Sem competencias disponiveis no recorte atual.
                        </td>
                      </tr>
                    ) : (
                      (mensal?.meses ?? []).map((mes) => (
                        <tr key={mes.competencia} className="border-t border-slate-100">
                          <td className="px-3 py-2 font-medium text-slate-800">
                            {formatarCompetenciaLabel(mes.competencia)}
                          </td>
                          <td className="px-3 py-2 text-right">{formatBRLFromCents(mes.previsto_centavos)}</td>
                          <td className="px-3 py-2 text-right">{formatBRLFromCents(mes.pago_centavos)}</td>
                          <td className="px-3 py-2 text-right">{formatBRLFromCents(mes.pendente_centavos)}</td>
                          <td className="px-3 py-2 text-right">{formatBRLFromCents(mes.vencido_centavos)}</td>
                          <td className="px-3 py-2 text-right">{formatBRLFromCents(mes.neofin_centavos)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-sm">
              <h3 className="text-base font-semibold text-slate-800">Leitura rapida do mes</h3>
              <p className="mt-1 text-sm text-slate-600">
                Priorize a carteira vencida, acompanhe NeoFin e mantenha o foco em cobranca ativa antes de abrir novo ciclo.
              </p>

              <div className="mt-4 space-y-3">
                {(mensal?.destaques ?? []).map((item, index) => (
                  <div key={`${item.titulo}-${index}`} className="rounded-lg border border-slate-200 bg-white p-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${
                        item.tipo === "ALERTA" ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"
                      }`}
                    >
                      {item.tipo}
                    </span>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{item.titulo}</p>
                    <p className="mt-1 text-sm text-slate-600">{item.descricao}</p>
                    <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Acao sugerida: {item.acao_sugerida}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bloco 2 */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Leitura Inteligente do Sistema (GPT)</h2>
                <p className="text-sm text-slate-600">
                  Ate 3 alertas priorizados, com base no snapshot do dia.
                </p>
              </div>
              <button
                type="button"
                aria-label="Help do bloco GPT"
                className="mt-0.5 h-7 w-7 rounded-full border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => setHelpOpen(true)}
              >
                ?
              </button>
            </div>
            <div className="flex gap-2">
              <button
                className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => void loadDashboard()}
                disabled={loading || reanalisando}
              >
                Atualizar
              </button>
              <button
                className="rounded-md bg-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-500 disabled:opacity-60"
                onClick={reanalisar}
                disabled={loading || reanalisando}
              >
                {reanalisando ? "Reanalisando..." : "Reanalisar agora"}
              </button>
            </div>
          </div>

          <div className="mt-3 text-xs text-slate-500">
            Ultima analise:{" "}
            {analise?.created_at
              ? formatDateTimeISO(analise.created_at)
              : snapshot?.created_at
              ? formatDateTimeISO(snapshot.created_at)
              : "--"}
            {analise?.meta?.fonte === "REGRAS" || !analise?.model ? (
              <span className="ml-2 text-[11px] font-medium text-slate-500">
                (Gerado por regras - GPT indisponivel)
              </span>
            ) : null}
            {gptInfo?.status === "SEM_CHAVE" ? (
              <span className="ml-2 text-[11px] font-medium text-amber-700">GPT: sem chave</span>
            ) : null}
            {gptInfo?.status === "ERRO" ? (
              <span className="ml-2 text-[11px] font-medium text-amber-700">GPT: erro (ver log)</span>
            ) : null}
          </div>

          {analise?.texto_curto ? (
            <p className="mt-3 text-sm text-slate-700 leading-relaxed">{analise.texto_curto}</p>
          ) : null}

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {alertasMostrados.length === 0 ? (
              <div className="col-span-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Sem alertas no momento.
              </div>
            ) : null}
            {alertasMostrados.map((a, idx) => (
              <div
                key={`${a.titulo}-${idx}`}
                className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span
                      className={`inline-block rounded-full px-2 py-1 text-[11px] font-semibold ${
                        a.severidade === "CRITICO"
                          ? "bg-rose-100 text-rose-700"
                          : a.severidade === "ALERTA"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {a.severidade}
                    </span>
                    <p className="mt-2 text-sm font-semibold text-slate-800 flex items-center gap-1">
                      <span>{a.sinal}</span>
                      <span>{a.titulo}</span>
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500">Por que importa: {a.por_que_importa}</p>
                <p className="mt-1 text-sm text-slate-700">Ação prática: {a.acao_pratica}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bloco 3 */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Fluxo de caixa no tempo</h2>
              <p className="text-sm text-slate-600">Historico 90d + projecao 30d (entradas, saidas e saldo).</p>
            </div>
            {loading ? <span className="text-xs text-slate-500">Carregando...</span> : null}
          </div>

          <div className="mt-4">
            {serieChart.length === 0 ? (
              <p className="text-sm text-slate-600">Sem dados para o periodo.</p>
            ) : (
              <ChartFluxo data={serieChart} />
            )}
          </div>
        </div>

        {/* Bloco 4 */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Resultado por centro de custo</h2>
              <p className="text-sm text-slate-600">Comparacao dos ultimos 30d vs janela anterior.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {blocoCentros.length === 0 ? (
              <p className="text-sm text-slate-600">Nenhum centro de custo encontrado.</p>
            ) : null}
            {blocoCentros.map((c) => (
              <div key={c.centro_custo_id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">
                      {c.centro_custo_nome || c.centro_custo_codigo || `Centro ${c.centro_custo_id}`}
                    </h3>
                    <p className="text-xs text-slate-500">30 dias</p>
                  </div>
                  <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
                    {tendenciaIcon(c.tendencia_resultado.direcao)}
                  </span>
                </div>
                <div className="mt-3 space-y-1 text-sm text-slate-700">
                  <div className="flex justify-between">
                    <span>Receitas</span>
                    <span className="text-green-700">{formatBRLFromCents(c.receitas_30d_centavos)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Despesas</span>
                    <span className="text-rose-700">{formatBRLFromCents(c.despesas_30d_centavos)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Resultado</span>
                    <span className="font-semibold text-slate-900">
                      {formatBRLFromCents(c.resultado_30d_centavos)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Tendencia</span>
                    <span>{variacaoTexto(c.tendencia_resultado)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bloco 5 */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800">Drill-down</h3>
          <p className="text-sm text-slate-600">Acesse rapidamente os modulos de gestao financeira.</p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <Link href="/admin/financeiro/contas-receber" className="rounded-md border border-slate-200 px-3 py-2 font-medium text-purple-700 hover:bg-purple-50">
              Contas a receber
            </Link>
            <Link href="/admin/financeiro/contas-pagar" className="rounded-md border border-slate-200 px-3 py-2 font-medium text-purple-700 hover:bg-purple-50">
              Contas a pagar
            </Link>
            <Link href="/admin/financeiro/movimento" className="rounded-md border border-slate-200 px-3 py-2 font-medium text-purple-700 hover:bg-purple-50">
              Movimento
            </Link>
            <Link href="/admin/financeiro/categorias" className="rounded-md border border-slate-200 px-3 py-2 font-medium text-purple-700 hover:bg-purple-50">
              Categorias
            </Link>
            <Link href="/admin/financeiro/centros-custo" className="rounded-md border border-slate-200 px-3 py-2 font-medium text-purple-700 hover:bg-purple-50">
              Centros de custo
            </Link>
          </div>
        </div>
      </div>

      {helpOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-10 sm:items-center">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Help — Bloco 2</p>
                <h3 className="text-lg font-semibold text-slate-800">Leitura Inteligente do Sistema</h3>
                <p className="text-xs text-slate-500">Fonte: docs/financeiro/dashboard-inteligente-help.md</p>
              </div>
              <button
                type="button"
                className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setHelpOpen(false)}
              >
                Fechar
              </button>
            </div>
            <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-slate-800 whitespace-pre-wrap">
              {HELP_DASHBOARD_INTELIGENTE}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ChartFluxo({ data }: { data: SerieFluxoItem[] }) {
  const height = 260;
  const width = 900;
  const { entradas, saidas, saldo } = normalizeSeries(data, height, width);

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-full">
        <polyline
          fill="none"
          stroke="#16a34a"
          strokeWidth="2"
          points={buildPolyline(entradas)}
        />
        <polyline
          fill="none"
          stroke="#dc2626"
          strokeWidth="2"
          points={buildPolyline(saidas)}
        />
        <polyline
          fill="none"
          stroke="#7c3aed"
          strokeWidth="2.5"
          points={buildPolyline(saldo)}
        />
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-600">
        <span className="flex items-center gap-2">
          <span className="inline-block h-1 w-4 bg-green-600" />
          Entradas
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-1 w-4 bg-rose-600" />
          Saidas
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-1 w-4 bg-purple-600" />
          Saldo acumulado
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Serie historica (90d) + projecao (30d) a partir de cobrancas e contas a pagar por vencimento.
      </p>
    </div>
  );
}
