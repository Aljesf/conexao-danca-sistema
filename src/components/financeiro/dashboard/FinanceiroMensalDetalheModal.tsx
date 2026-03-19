"use client";

import { useEffect, useMemo, useState } from "react";
import { FinanceiroDashboardModalShell } from "@/components/financeiro/dashboard/FinanceiroDashboardModalShell";
import { buildExcelFileName, exportRowsToXlsx } from "@/lib/export/xlsx";
import { formatDateISO } from "@/lib/formatters/date";
import { formatBRLFromCents } from "@/lib/formatters/money";
import { formatarCompetenciaLabel } from "@/lib/financeiro/creditoConexao/cobrancas";
import type {
  DashboardFinanceiroComposicaoItem,
  DashboardFinanceiroResumoExclusoes,
} from "@/lib/financeiro/dashboardMensalContaInterna";
import { Dialog } from "@/shadcn/ui";

export type FinanceiroMensalModalPayload = {
  titulo: string;
  subtitulo: string | null;
  tipo_total: "moeda" | "percentual";
  total_centavos: number;
  percentual: number | null;
  composicao: DashboardFinanceiroComposicaoItem[];
  observacao_resumo: string | null;
  resumo_exclusoes: DashboardFinanceiroResumoExclusoes;
  natureza: "previsto" | "pago" | "pendente" | "vencido" | "neofin" | "inadimplencia";
};

type FinanceiroMensalDetalheModalProps = {
  open: boolean;
  payload: FinanceiroMensalModalPayload | null;
  onOpenChange: (open: boolean) => void;
};

function competenciaAtualCliente(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 7);
}

function formatarTotalPrincipal(
  tipoTotal: "moeda" | "percentual",
  totalCentavos: number,
  percentual: number | null,
): string {
  if (tipoTotal === "percentual") {
    return `${(percentual ?? 0).toFixed(1)}%`;
  }

  return formatBRLFromCents(totalCentavos);
}

function totalPorNatureza(payload: FinanceiroMensalModalPayload, item: DashboardFinanceiroComposicaoItem): number {
  if (payload.natureza === "pago") return item.valor_recebido_centavos;
  if (payload.natureza === "pendente") return item.valor_pendente_centavos;
  if (payload.natureza === "vencido" || payload.natureza === "inadimplencia") return item.valor_vencido_centavos;
  if (payload.natureza === "neofin") return item.valor_neofin_centavos;
  return item.valor_previsto_centavos;
}

function totalDoModal(payload: FinanceiroMensalModalPayload, items: DashboardFinanceiroComposicaoItem[]) {
  if (payload.tipo_total === "percentual") {
    const totalVencido = items.reduce((acc, item) => acc + item.valor_vencido_centavos, 0);
    const totalPrevisto = items.reduce((acc, item) => acc + item.valor_previsto_centavos, 0);

    return {
      total_centavos: totalVencido,
      percentual: totalPrevisto > 0 ? Math.round((totalVencido / totalPrevisto) * 1000) / 10 : 0,
      total_previsto_centavos: totalPrevisto,
    };
  }

  return {
    total_centavos: items.reduce((acc, item) => acc + totalPorNatureza(payload, item), 0),
    percentual: null as number | null,
    total_previsto_centavos: null as number | null,
  };
}

function nomeArquivoMensal(payload: FinanceiroMensalModalPayload): string {
  const subtituloLimpo = payload.subtitulo?.replace(/^Competencia\s+/i, "") ?? null;
  return buildExcelFileName([payload.titulo, subtituloLimpo]);
}

export function FinanceiroMensalDetalheModal({
  open,
  payload,
  onOpenChange,
}: FinanceiroMensalDetalheModalProps) {
  const [filtroCompetencia, setFiltroCompetencia] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroOrigem, setFiltroOrigem] = useState("");
  const [filtroNeofin, setFiltroNeofin] = useState("");
  const [filtroPessoa, setFiltroPessoa] = useState("");
  const [exportando, setExportando] = useState(false);
  const [feedbackExportacao, setFeedbackExportacao] = useState<string | null>(null);
  const competenciaAtual = useMemo(() => competenciaAtualCliente(), []);

  useEffect(() => {
    setFiltroCompetencia("");
    setFiltroStatus("");
    setFiltroOrigem("");
    setFiltroNeofin("");
    setFiltroPessoa("");
    setFeedbackExportacao(null);
  }, [payload?.titulo]);

  const opcoesCompetencia = useMemo(
    () =>
      Array.from(new Set((payload?.composicao ?? []).map((item) => item.competencia)))
        .sort((a, b) => a.localeCompare(b))
        .map((competencia) => ({
          valor: competencia,
          label: formatarCompetenciaLabel(competencia),
        })),
    [payload?.composicao],
  );
  const opcoesStatus = useMemo(
    () =>
      Array.from(new Set((payload?.composicao ?? []).map((item) => item.status_label))).sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
    [payload?.composicao],
  );
  const opcoesOrigem = useMemo(
    () =>
      Array.from(new Set((payload?.composicao ?? []).map((item) => item.origem_label))).sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
    [payload?.composicao],
  );
  const opcoesNeofin = useMemo(
    () =>
      Array.from(new Set((payload?.composicao ?? []).map((item) => item.neofin_label))).sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
    [payload?.composicao],
  );

  const itensFiltrados = useMemo(() => {
    const query = filtroPessoa.trim().toLowerCase();

    return (payload?.composicao ?? []).filter((item) => {
      if (filtroCompetencia && item.competencia !== filtroCompetencia) return false;
      if (filtroStatus && item.status_label !== filtroStatus) return false;
      if (filtroOrigem && item.origem_label !== filtroOrigem) return false;
      if (filtroNeofin && item.neofin_label !== filtroNeofin) return false;
      if (!query) return true;

      return [
        item.pessoa_nome,
        item.pessoa_label,
        item.descricao,
        item.referencia,
        item.canal_recebimento_label,
        item.origem_recebimento_sistema,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [filtroCompetencia, filtroNeofin, filtroOrigem, filtroPessoa, filtroStatus, payload?.composicao]);

  const totaisFiltrados = useMemo(() => {
    if (!payload) {
      return {
        total_centavos: 0,
        percentual: null as number | null,
        total_previsto_centavos: null as number | null,
      };
    }

    return totalDoModal(payload, itensFiltrados);
  }, [itensFiltrados, payload]);

  const itensSemNeofin = itensFiltrados.filter((item) => item.neofin_situacao_operacional !== "VINCULADA").length;
  const itensNeoFinConfirmados = itensFiltrados.filter((item) => item.confirmado_via_neofin).length;
  const itensBaixaInterna = itensFiltrados.filter((item) => item.confirmado_via_baixa_interna).length;
  const itensVencidos = itensFiltrados.filter((item) => item.valor_vencido_centavos > 0).length;
  const itensFuturos = itensFiltrados.filter((item) => item.competencia > competenciaAtual).length;
  const itensGeradosAntecipadamente = itensFiltrados.filter((item) => item.gerado_antecipadamente).length;

  async function handleExportarExcel() {
    if (!payload) return;

    setExportando(true);
    setFeedbackExportacao(null);

    try {
      await exportRowsToXlsx<DashboardFinanceiroComposicaoItem>({
        fileName: nomeArquivoMensal(payload),
        sheetName: "Composicao",
        title: payload.titulo,
        contextLabel: payload.subtitulo,
        summaryItems: [
          ...(payload.tipo_total === "percentual"
            ? [
                { label: "Percentual exibido", value: (totaisFiltrados.percentual ?? 0) / 100, type: "percent" as const },
                { label: "Total vencido", value: totaisFiltrados.total_centavos / 100, type: "currency" as const },
                {
                  label: "Base prevista",
                  value: (totaisFiltrados.total_previsto_centavos ?? 0) / 100,
                  type: "currency" as const,
                },
              ]
            : [{ label: "Total exibido", value: totaisFiltrados.total_centavos / 100, type: "currency" as const }]),
          { label: "Quantidade", value: itensFiltrados.length, type: "integer" as const },
          { label: "Itens vencidos", value: itensVencidos, type: "integer" as const },
          { label: "Itens sem vinculo NeoFin", value: itensSemNeofin, type: "integer" as const },
          { label: "NeoFin confirmado", value: itensNeoFinConfirmados, type: "integer" as const },
          { label: "Baixa interna", value: itensBaixaInterna, type: "integer" as const },
          { label: "Competencias futuras", value: itensFuturos, type: "integer" as const },
        ],
        columns: [
          { header: "Pessoa", width: 28, value: (item) => item.pessoa_nome },
          { header: "Descricao", width: 42, wrap: true, value: (item) => item.descricao },
          { header: "Origem", width: 22, value: (item) => item.origem_label },
          { header: "Canal", width: 18, placeholder: "Nao informado", value: (item) => item.canal_recebimento_label ?? "" },
          { header: "Competencia", width: 16, align: "center", value: (item) => item.competencia_label },
          { header: "Vencimento", width: 14, type: "date", align: "center", value: (item) => item.data_vencimento ?? "" },
          { header: "Data pagamento", width: 16, type: "date", align: "center", value: (item) => item.data_pagamento ?? "" },
          { header: "Status", width: 20, value: (item) => item.status_label },
          { header: "NeoFin", width: 22, value: (item) => item.neofin_label },
          { header: "Valor", width: 16, type: "currency", align: "right", value: (item) => totalPorNatureza(payload, item) / 100 },
          { header: "Observacao resumida", width: 38, wrap: true, value: (item) => item.observacao_resumo ?? "" },
          { header: "Centro de custo", width: 20, placeholder: "-", value: () => "" },
          { header: "Conta interna", width: 14, placeholder: "-", value: (item) => item.conta_interna_id ?? "" },
          { header: "Fatura", width: 12, placeholder: "-", value: (item) => item.fatura_id ?? "" },
          { header: "Cobranca", width: 12, placeholder: "-", value: (item) => item.cobranca_id ?? "" },
          { header: "Recebimento", width: 14, placeholder: "-", value: (item) => item.recebimento_id ?? "" },
          { header: "Referencia operacional", width: 34, wrap: true, value: (item) => item.referencia },
        ],
        rows: itensFiltrados,
      });

      setFeedbackExportacao("Arquivo Excel gerado com os filtros atuais.");
    } catch (error) {
      console.error("[FinanceiroMensalDetalheModal] erro exportar xlsx", error);
      setFeedbackExportacao("Nao foi possivel gerar o arquivo Excel.");
    } finally {
      setExportando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FinanceiroDashboardModalShell
        open={open}
        title={payload?.titulo ?? "Detalhamento"}
        description={payload?.subtitulo ?? undefined}
        actionSlot={(
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            onClick={() => void handleExportarExcel()}
            disabled={!payload || exportando}
          >
            {exportando ? "Exportando..." : "Exportar Excel"}
          </button>
        )}
        topContent={(
          <>
            <div className="grid gap-3 lg:grid-cols-5">
              <div className="rounded-2xl bg-slate-50/85 px-4 py-3 ring-1 ring-inset ring-slate-200/70">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Total exibido</p>
                <p className="mt-1.5 text-lg font-semibold text-slate-950">
                  {formatarTotalPrincipal(payload?.tipo_total ?? "moeda", totaisFiltrados.total_centavos, totaisFiltrados.percentual)}
                </p>
                {payload?.tipo_total === "percentual" ? (
                  <p className="mt-1 text-xs text-slate-500">
                    {formatBRLFromCents(totaisFiltrados.total_centavos)} vencidos
                    {totaisFiltrados.total_previsto_centavos !== null
                      ? ` de ${formatBRLFromCents(totaisFiltrados.total_previsto_centavos)} previstos`
                      : ""}
                  </p>
                ) : null}
              </div>

              <div className="rounded-2xl bg-slate-50/85 px-4 py-3 ring-1 ring-inset ring-slate-200/70">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Quantidade</p>
                <p className="mt-1.5 text-lg font-semibold text-slate-950">{itensFiltrados.length}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Este total e composto por {itensFiltrados.length} {itensFiltrados.length === 1 ? "item" : "itens"}.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50/85 px-4 py-3 ring-1 ring-inset ring-slate-200/70">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">NeoFin confirmado</p>
                <p className="mt-1.5 text-lg font-semibold text-slate-950">{itensNeoFinConfirmados}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {itensNeoFinConfirmados} {itensNeoFinConfirmados === 1 ? "item tem" : "itens tem"} confirmacao financeira NeoFin.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50/85 px-4 py-3 ring-1 ring-inset ring-slate-200/70">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Baixa interna</p>
                <p className="mt-1.5 text-lg font-semibold text-slate-950">{itensBaixaInterna}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {itensBaixaInterna} {itensBaixaInterna === 1 ? "item foi" : "itens foram"} confirmados por meios internos.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50/85 px-4 py-3 ring-1 ring-inset ring-slate-200/70">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Itens vencidos</p>
                <p className="mt-1.5 text-lg font-semibold text-slate-950">{itensVencidos}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {itensVencidos} {itensVencidos === 1 ? "item ja venceu" : "itens ja venceram"}.
                </p>
              </div>
            </div>

            {itensFuturos > 0 ? (
              <p className="mt-3 text-xs text-slate-500">
                {itensFuturos} {itensFuturos === 1 ? "item pertence" : "itens pertencem"} a competencias futuras.
              </p>
            ) : null}
            {itensGeradosAntecipadamente > 0 ? (
              <p className="mt-2 text-xs text-slate-500">
                Previsao baseada em lancamentos ativos ja gerados na Conta Interna Aluno.
              </p>
            ) : null}
            {itensSemNeofin > 0 ? (
              <p className="mt-2 text-xs text-slate-500">
                {itensSemNeofin} {itensSemNeofin === 1 ? "item esta" : "itens estao"} sem vinculo NeoFin.
              </p>
            ) : null}
            {(payload?.resumo_exclusoes.total_itens_excluidos ?? 0) > 0 ? (
              <p className="mt-2 text-xs text-slate-500">
                Itens cancelados/expurgados foram excluidos desta composicao principal.
              </p>
            ) : null}
            {payload?.resumo_exclusoes.mensagem ? (
              <p className="mt-2 text-xs text-slate-500">{payload.resumo_exclusoes.mensagem}</p>
            ) : null}
            {feedbackExportacao ? (
              <p className="mt-2 text-xs text-slate-500">{feedbackExportacao}</p>
            ) : null}
          </>
        )}
      >
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="grid gap-3 lg:grid-cols-[repeat(4,minmax(0,1fr))_1.2fr]">
            <label className="space-y-1 text-sm text-slate-600">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Competencia</span>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                value={filtroCompetencia}
                onChange={(event) => setFiltroCompetencia(event.target.value)}
              >
                <option value="">Todas</option>
                {opcoesCompetencia.map((opcao) => (
                  <option key={opcao.valor} value={opcao.valor}>
                    {opcao.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm text-slate-600">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</span>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                value={filtroStatus}
                onChange={(event) => setFiltroStatus(event.target.value)}
              >
                <option value="">Todos</option>
                {opcoesStatus.map((opcao) => (
                  <option key={opcao} value={opcao}>
                    {opcao}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm text-slate-600">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Origem</span>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                value={filtroOrigem}
                onChange={(event) => setFiltroOrigem(event.target.value)}
              >
                <option value="">Todas</option>
                {opcoesOrigem.map((opcao) => (
                  <option key={opcao} value={opcao}>
                    {opcao}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm text-slate-600">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">NeoFin</span>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                value={filtroNeofin}
                onChange={(event) => setFiltroNeofin(event.target.value)}
              >
                <option value="">Todos</option>
                {opcoesNeofin.map((opcao) => (
                  <option key={opcao} value={opcao}>
                    {opcao}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm text-slate-600">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pessoa</span>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                value={filtroPessoa}
                onChange={(event) => setFiltroPessoa(event.target.value)}
                placeholder="Buscar por pessoa ou descricao"
              />
            </label>
          </div>
        </div>

        {payload?.observacao_resumo ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            {payload.observacao_resumo}
          </div>
        ) : null}

        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[1160px] text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3 text-left">Pessoa</th>
                <th className="px-3 py-3 text-left">Descricao</th>
                <th className="px-3 py-3 text-left">Origem</th>
                <th className="px-3 py-3 text-left">Canal</th>
                <th className="px-3 py-3 text-left">Competencia</th>
                <th className="px-3 py-3 text-left">Vencimento</th>
                <th className="px-3 py-3 text-left">Status</th>
                <th className="px-3 py-3 text-left">NeoFin</th>
                <th className="px-3 py-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {itensFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                    Sem itens para os filtros atuais.
                  </td>
                </tr>
              ) : (
                itensFiltrados.map((item) => (
                  <tr key={item.cobranca_key} className="border-t border-slate-100 align-top">
                    <td className="px-3 py-3">
                      <div className="font-medium text-slate-800">{item.pessoa_nome}</div>
                      <div className="text-xs text-slate-500">Pessoa #{item.pessoa_id ?? "--"}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-slate-800">{item.descricao}</div>
                      <div className="text-xs text-slate-500">
                        {item.referencia}
                        {item.observacao_resumo ? ` | ${item.observacao_resumo}` : ""}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      <div>{item.origem_label}</div>
                      <div className="text-xs text-slate-500">
                        {item.conta_conexao_id ? `Conta #${item.conta_conexao_id}` : "Sem conta interna"}
                        {item.origem_lancamento ? ` | ${item.origem_lancamento}` : ""}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      <div>{item.canal_recebimento_label ?? "Nao classificado"}</div>
                      <div className="text-xs text-slate-500">
                        {item.forma_pagamento_codigo ?? item.metodo_pagamento ?? item.origem_recebimento_sistema ?? "--"}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{item.competencia_label}</td>
                    <td className="px-3 py-3 text-slate-600">
                      <div>{formatDateISO(item.data_vencimento)}</div>
                      <div className="text-xs text-slate-500">Pagamento: {formatDateISO(item.data_pagamento)}</div>
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      <div>{item.status_label}</div>
                      <div className="text-xs text-slate-500">
                        {item.status_normalizado}
                        {item.status_original ? ` | ${item.status_original}` : item.status_bruto ? ` | ${item.status_bruto}` : ""}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      <div>{item.neofin_label}</div>
                      <div className="text-xs text-slate-500">
                        {item.fatura_id ? `Fatura #${item.fatura_id}` : "Sem fatura vinculada"}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-slate-800">
                      {formatBRLFromCents(totalPorNatureza(payload!, item))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </FinanceiroDashboardModalShell>
    </Dialog>
  );
}

export default FinanceiroMensalDetalheModal;
