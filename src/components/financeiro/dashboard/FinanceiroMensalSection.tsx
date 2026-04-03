"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatBRLFromCents } from "@/lib/formatters/money";
import { formatarCompetenciaLabel } from "@/lib/financeiro/creditoConexao/cobrancas";
import type {
  DashboardFinanceiroCardDetalhe,
  DashboardFinanceiroCompetenciaDetalhe,
  DashboardFinanceiroMensalResponse,
  DashboardMensalCardKey,
  DashboardMensalNaturezaKey,
} from "@/lib/financeiro/dashboardMensalContaInterna";
import {
  FinanceiroMensalDetalheModal,
  type FinanceiroMensalModalPayload,
} from "@/components/financeiro/dashboard/FinanceiroMensalDetalheModal";

type FinanceiroMensalSectionProps = {
  mensal: DashboardFinanceiroMensalResponse | null;
  loading: boolean;
  error: string | null;
};

type ModalState =
  | {
      tipo: "card";
      indicador: DashboardMensalCardKey;
    }
  | {
      tipo: "competencia";
      competencia: string;
      natureza: DashboardMensalNaturezaKey;
    }
  | null;

function naturezaLabel(natureza: DashboardMensalNaturezaKey): string {
  switch (natureza) {
    case "previsto":
      return "previsto";
    case "pago":
      return "pago";
    case "pendente":
      return "pendente";
    case "vencido":
      return "vencido";
    default:
      return "NeoFin";
  }
}

function detalheCardParaModal(detalhe: DashboardFinanceiroCardDetalhe): FinanceiroMensalModalPayload {
  return {
    titulo: detalhe.titulo,
    subtitulo: detalhe.subtitulo ?? `Competencia ${detalhe.competencia_label}`,
    tipo_total: detalhe.indicador === "inadimplencia_do_mes" ? "percentual" : "moeda",
    total_centavos: detalhe.total_centavos,
    percentual: detalhe.percentual,
    composicao: detalhe.composicao,
    observacao_resumo: detalhe.observacao_resumo,
    resumo_exclusoes: detalhe.resumo_exclusoes,
    natureza:
      detalhe.indicador === "recebido_no_mes" ||
      detalhe.indicador === "recebido_via_neofin" ||
      detalhe.indicador === "recebido_baixa_interna" ||
      detalhe.indicador === "recebido_hoje" ||
      detalhe.indicador === "recebido_ultimos_7_dias"
        ? "pago"
        : detalhe.indicador === "pendente_do_mes"
          ? "pendente"
          : detalhe.indicador === "em_cobranca_neofin"
            ? "neofin"
            : detalhe.indicador === "inadimplencia_do_mes"
              ? "inadimplencia"
              : "previsto",
  };
}

function detalheCompetenciaParaModal(
  competencia: DashboardFinanceiroCompetenciaDetalhe,
  natureza: DashboardMensalNaturezaKey,
): FinanceiroMensalModalPayload {
  const composicao =
    natureza === "previsto"
      ? competencia.composicao_previsto
      : natureza === "pago"
        ? competencia.composicao_pago
        : natureza === "pendente"
          ? competencia.composicao_pendente
          : natureza === "vencido"
            ? competencia.composicao_vencido
            : competencia.composicao_neofin;
  const totalCentavos =
    natureza === "previsto"
      ? competencia.previsto_centavos
      : natureza === "pago"
        ? competencia.pago_centavos
        : natureza === "pendente"
          ? competencia.pendente_centavos
          : natureza === "vencido"
            ? competencia.vencido_centavos
            : competencia.neofin_centavos;

  return {
    titulo: `Composicao do ${naturezaLabel(natureza)} - ${competencia.competencia_label}`,
    subtitulo: `Competencia ${competencia.competencia_label}`,
    tipo_total: "moeda",
    total_centavos: totalCentavos,
    percentual: null,
    composicao,
    observacao_resumo: competencia.observacao_resumo,
    resumo_exclusoes: competencia.resumo_exclusoes,
    natureza,
  };
}

function CardAuditavel({
  titulo,
  valor,
  subtexto,
  loading,
  onClick,
}: {
  titulo: string;
  valor: string;
  subtexto?: string | null;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white"
      onClick={onClick}
    >
      <p className="text-sm text-slate-600">{titulo}</p>
      <p className="mt-2 text-xl font-semibold text-slate-800">{loading ? "Carregando..." : valor}</p>
      {subtexto ? <p className="mt-1 text-xs text-slate-500">{subtexto}</p> : null}
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">Clique para ver composicao</p>
    </button>
  );
}

function CellButton({ valor, onClick }: { valor: number; onClick: () => void }) {
  return (
    <button
      type="button"
      className="w-full text-right font-medium text-slate-700 underline-offset-4 transition hover:text-slate-950 hover:underline"
      onClick={onClick}
    >
      {formatBRLFromCents(valor)}
    </button>
  );
}

export function FinanceiroMensalSection({ mensal, loading, error }: FinanceiroMensalSectionProps) {
  const [modalState, setModalState] = useState<ModalState>(null);
  const payloadModal = useMemo(() => {
    if (!modalState || !mensal) return null;

    if (modalState.tipo === "card") {
      return detalheCardParaModal(mensal.cards_detalhe[modalState.indicador]);
    }

    const competencia = mensal.meses.find((item) => item.competencia === modalState.competencia);
    return competencia ? detalheCompetenciaParaModal(competencia, modalState.natureza) : null;
  }, [mensal, modalState]);

  const cardsPrincipais = [
    {
      indicador: "previsto_para_receber" as const,
      titulo: "Previsto para receber no mes",
      valor: formatBRLFromCents(mensal?.cards.previsto_mes_centavos ?? null),
      subtexto: mensal?.cards_detalhe.previsto_para_receber.observacao_resumo ?? null,
    },
    {
      indicador: "recebido_no_mes" as const,
      titulo: "Recebido no mes",
      valor: formatBRLFromCents(mensal?.cards.pago_mes_centavos ?? null),
      subtexto: "Entram apenas recebimentos financeiros confirmados e elegiveis.",
    },
    {
      indicador: "pendente_do_mes" as const,
      titulo: "Pendente do mes",
      valor: formatBRLFromCents(mensal?.cards.pendente_mes_centavos ?? null),
      subtexto: "Saldo aberto elegivel do recorte operacional da competencia.",
    },
    {
      indicador: "em_cobranca_neofin" as const,
      titulo: "Em cobranca NeoFin",
      valor: formatBRLFromCents(mensal?.cards.neofin_mes_centavos ?? null),
      subtexto: "Carteira vinculada e ainda em acompanhamento operacional.",
    },
    {
      indicador: "inadimplencia_do_mes" as const,
      titulo: "Inadimplencia do mes",
      valor: `${(mensal?.cards.inadimplencia_mes_percentual ?? 0).toFixed(1)}%`,
      subtexto: mensal?.cards_detalhe.inadimplencia_do_mes
        ? `${formatBRLFromCents(mensal.cards_detalhe.inadimplencia_do_mes.total_centavos)} vencidos`
        : null,
    },
  ];

  const cardsSaudeImediata = [
    {
      indicador: "recebido_via_neofin" as const,
      titulo: "Recebido via NeoFin",
      valor: formatBRLFromCents(mensal?.cards.recebido_via_neofin_mes_centavos ?? null),
      subtexto: "So conta quando existe confirmacao financeira local do recebimento.",
    },
    {
      indicador: "recebido_baixa_interna" as const,
      titulo: "Recebido por baixa interna",
      valor: formatBRLFromCents(mensal?.cards.recebido_baixa_interna_mes_centavos ?? null),
      subtexto: "Dinheiro, PIX, cartao e outros meios internos confirmados.",
    },
    {
      indicador: "recebido_hoje" as const,
      titulo: "Recebido hoje",
      valor: formatBRLFromCents(mensal?.cards.recebido_hoje_centavos ?? null),
      subtexto: "Usa a data efetiva de recebimento ou baixa confirmada.",
    },
    {
      indicador: "recebido_ultimos_7_dias" as const,
      titulo: "Recebido ultimos 7 dias",
      valor: formatBRLFromCents(mensal?.cards.recebido_ultimos_7_dias_centavos ?? null),
      subtexto: "Janela movel incluindo hoje com detalhamento por canal.",
    },
  ];

  return (
    <>
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Saude mensal do financeiro</h2>
            <p className="text-sm text-slate-600">
              Leitura rapida da competencia {mensal?.cards_detalhe.previsto_para_receber.competencia_label ?? "--"} com foco em auditoria operacional, recebimentos confirmados e carteira elegivel.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Serie canonica do painel:{" "}
              {mensal?.faixa_competencias
                ? `${formatarCompetenciaLabel(mensal.faixa_competencias.inicio)} ate ${formatarCompetenciaLabel(mensal.faixa_competencias.fim)}`
                : "--"}.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Previsao baseada em lancamentos ativos ja gerados na Conta Interna. NeoFin so entra como recebido quando ha confirmacao financeira local; sincronizacao remota isolada nao compoe o total.
            </p>
          </div>
          <Link
            href="/admin/financeiro/credito-conexao/cobrancas"
            className="inline-flex items-center rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Abrir Conta Interna
          </Link>
        </div>

        {error ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {error}
          </div>
        ) : null}

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {cardsPrincipais.map((card) => (
            <CardAuditavel
              key={card.indicador}
              titulo={card.titulo}
              valor={card.valor}
              subtexto={card.subtexto}
              loading={loading}
              onClick={() => setModalState({ tipo: "card", indicador: card.indicador })}
            />
          ))}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cardsSaudeImediata.map((card) => (
            <CardAuditavel
              key={card.indicador}
              titulo={card.titulo}
              valor={card.valor}
              subtexto={card.subtexto}
              loading={loading}
              onClick={() => setModalState({ tipo: "card", indicador: card.indicador })}
            />
          ))}
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Leitura rapida do mes</h3>
              <p className="mt-1 text-sm text-slate-600">
                Acompanhe vencidos elegiveis, confirmacao de recebimentos NeoFin e a carteira futura ja gerada sem reduzir a largura da tabela principal.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setModalState({ tipo: "card", indicador: "previsto_para_receber" })}
              >
                Ver composicao
              </button>
              {(mensal?.cards.pendente_mes_centavos ?? 0) > 0 ? (
                <button
                  type="button"
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => setModalState({ tipo: "card", indicador: "pendente_do_mes" })}
                >
                  Ver itens pendentes
                </button>
              ) : null}
              {(mensal?.cards.neofin_mes_centavos ?? 0) > 0 ? (
                <button
                  type="button"
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => setModalState({ tipo: "card", indicador: "em_cobranca_neofin" })}
                >
                  Ver carteira NeoFin
                </button>
              ) : null}
              {(mensal?.cards.recebido_hoje_centavos ?? 0) > 0 ? (
                <button
                  type="button"
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => setModalState({ tipo: "card", indicador: "recebido_hoje" })}
                >
                  Ver recebimentos de hoje
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
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

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recebimento NeoFin</p>
              <p className="mt-2 text-sm text-slate-600">
                O total considera apenas recebimentos com confirmacao financeira local vinculada a carteira NeoFin.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Baixa interna</p>
              <p className="mt-2 text-sm text-slate-600">
                Recebimentos presenciais, internos ou manuais ficam segregados dos recebimentos NeoFin confirmados.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Previsao futura</p>
              <p className="mt-2 text-sm text-slate-600">
                Competencias futuras entram quando ja existem lancamentos ativos gerados por matricula ou conta interna.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Competencias do ano</h3>
            <p className="text-sm text-slate-600">
              Ordem cronologica crescente do menor mes do recorte ate dezembro, incluindo meses futuros e meses zerados quando nao houver lancamento elegivel.
            </p>
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[760px] text-sm">
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
                    <tr
                      key={mes.competencia}
                      className={`border-t border-slate-100 ${mes.quantidade_itens === 0 ? "bg-slate-50/70" : ""}`}
                    >
                      <td className="px-3 py-3 align-top">
                        <div className="font-medium text-slate-800">{mes.competencia_label}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {mes.observacao_resumo ?? "Sem observacao operacional."}
                        </div>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <CellButton
                          valor={mes.previsto_centavos}
                          onClick={() => setModalState({ tipo: "competencia", competencia: mes.competencia, natureza: "previsto" })}
                        />
                      </td>
                      <td className="px-3 py-3 align-top">
                        <CellButton
                          valor={mes.pago_centavos}
                          onClick={() => setModalState({ tipo: "competencia", competencia: mes.competencia, natureza: "pago" })}
                        />
                      </td>
                      <td className="px-3 py-3 align-top">
                        <CellButton
                          valor={mes.pendente_centavos}
                          onClick={() => setModalState({ tipo: "competencia", competencia: mes.competencia, natureza: "pendente" })}
                        />
                      </td>
                      <td className="px-3 py-3 align-top">
                        <CellButton
                          valor={mes.vencido_centavos}
                          onClick={() => setModalState({ tipo: "competencia", competencia: mes.competencia, natureza: "vencido" })}
                        />
                      </td>
                      <td className="px-3 py-3 align-top">
                        <CellButton
                          valor={mes.neofin_centavos}
                          onClick={() => setModalState({ tipo: "competencia", competencia: mes.competencia, natureza: "neofin" })}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <FinanceiroMensalDetalheModal
        open={Boolean(modalState && payloadModal)}
        payload={payloadModal}
        onOpenChange={(open) => {
          if (!open) setModalState(null);
        }}
      />
    </>
  );
}

export default FinanceiroMensalSection;
