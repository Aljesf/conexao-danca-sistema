"use client";

import { useEffect, useMemo, useState } from "react";
import { FinanceiroDashboardModalShell } from "@/components/financeiro/dashboard/FinanceiroDashboardModalShell";
import { formatDateISO } from "@/lib/formatters/date";
import { formatBRLFromCents } from "@/lib/formatters/money";
import { buildExcelFileName, exportRowsToXlsx } from "@/lib/export/xlsx";
import type {
  DashboardCentroCustoDetalhe,
  DashboardCentroCustoDetalheItem,
} from "@/lib/financeiro/dashboardCentroCusto";
import { Dialog } from "@/shadcn/ui";

type FinanceiroCentroCustoDetalheModalProps = {
  open: boolean;
  detalhe: DashboardCentroCustoDetalhe | null;
  loading: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
};

function tendenciaTexto(atual: number, anterior: number): string {
  if (anterior === 0 && atual === 0) return "Sem movimento nas duas janelas.";
  if (anterior === 0 && atual > 0) return "A janela atual subiu a partir de base zero.";
  if (anterior > 0 && atual === 0) return "A janela atual zerou vs janela anterior.";
  const variacao = ((atual - anterior) / Math.abs(anterior || 1)) * 100;
  const sinal = variacao >= 0 ? "+" : "";
  return `${sinal}${variacao.toFixed(1)}% vs janela anterior equivalente.`;
}

function nomeArquivoCentro(detalhe: DashboardCentroCustoDetalhe): string {
  return buildExcelFileName(["centro-de-custo", detalhe.centro_custo_nome ?? detalhe.centro_custo_codigo, "janela-atual"]);
}

export function FinanceiroCentroCustoDetalheModal({
  open,
  detalhe,
  loading,
  error,
  onOpenChange,
}: FinanceiroCentroCustoDetalheModalProps) {
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroOrigem, setFiltroOrigem] = useState("");
  const [filtroCanal, setFiltroCanal] = useState("");
  const [filtroBusca, setFiltroBusca] = useState("");
  const [exportando, setExportando] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setFiltroTipo("");
    setFiltroOrigem("");
    setFiltroCanal("");
    setFiltroBusca("");
    setFeedback(null);
  }, [detalhe?.centro_custo_id]);

  const itens = useMemo(() => detalhe?.itens_atuais ?? [], [detalhe?.itens_atuais]);
  const opcoesOrigem = useMemo(
    () => Array.from(new Set(itens.map((item) => item.origem).filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [itens],
  );
  const opcoesCanal = useMemo(
    () =>
      Array.from(new Set(itens.map((item) => item.canal).filter((item): item is string => Boolean(item)))).sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
    [itens],
  );

  const itensFiltrados = useMemo(() => {
    const query = filtroBusca.trim().toLowerCase();
    return itens.filter((item) => {
      if (filtroTipo && item.tipo_movimento !== filtroTipo) return false;
      if (filtroOrigem && item.origem !== filtroOrigem) return false;
      if (filtroCanal && (item.canal ?? "") !== filtroCanal) return false;
      if (!query) return true;

      return [
        item.pessoa_documento_origem,
        item.descricao,
        item.origem,
        item.referencia_interna,
        item.observacao_resumo,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [filtroBusca, filtroCanal, filtroOrigem, filtroTipo, itens]);

  const receitasFiltradas = itensFiltrados
    .filter((item) => item.tipo_movimento === "RECEITA")
    .reduce((acc, item) => acc + item.valor_centavos, 0);
  const despesasFiltradas = itensFiltrados
    .filter((item) => item.tipo_movimento === "DESPESA")
    .reduce((acc, item) => acc + item.valor_centavos, 0);
  const resultadoFiltrado = receitasFiltradas - despesasFiltradas;

  async function handleExportarExcel() {
    if (!detalhe) return;
    setExportando(true);
    setFeedback(null);

    try {
      await exportRowsToXlsx<DashboardCentroCustoDetalheItem>({
        fileName: nomeArquivoCentro(detalhe),
        sheetName: "Centro de custo",
        title: `Detalhamento - ${detalhe.centro_custo_nome ?? detalhe.centro_custo_codigo ?? `Centro ${detalhe.centro_custo_id}`}`,
        contextLabel: "Janela atual do dashboard financeiro",
        summaryItems: [
          { label: "Receitas filtradas", value: receitasFiltradas / 100, type: "currency" as const },
          { label: "Despesas filtradas", value: despesasFiltradas / 100, type: "currency" as const },
          { label: "Resultado filtrado", value: resultadoFiltrado / 100, type: "currency" as const },
          { label: "Quantidade", value: itensFiltrados.length, type: "integer" as const },
        ],
        columns: [
          { header: "Centro de custo", width: 24, value: (item) => item.centro_custo_nome ?? item.centro_custo_codigo ?? "" },
          { header: "Tipo", width: 14, align: "center", value: (item) => item.tipo_movimento },
          { header: "Origem", width: 22, value: (item) => item.origem },
          { header: "Pessoa / documento", width: 28, placeholder: "Nao informado", value: (item) => item.pessoa_documento_origem ?? "" },
          { header: "Descricao", width: 40, wrap: true, value: (item) => item.descricao },
          { header: "Data operacional", width: 16, type: "date", align: "center", value: (item) => item.data_operacional },
          { header: "Competencia", width: 14, align: "center", placeholder: "-", value: (item) => item.competencia ?? "" },
          { header: "Status", width: 18, placeholder: "Nao informado", value: (item) => item.status ?? "" },
          { header: "Canal", width: 18, placeholder: "Nao informado", value: (item) => item.canal ?? "" },
          { header: "Valor", width: 16, type: "currency", align: "right", value: (item) => item.valor_centavos / 100 },
          { header: "Referencia interna", width: 28, wrap: true, placeholder: "-", value: (item) => item.referencia_interna ?? "" },
          { header: "Observacao", width: 36, wrap: true, placeholder: "-", value: (item) => item.observacao_resumo ?? "" },
        ],
        rows: itensFiltrados,
      });

      setFeedback("Arquivo Excel gerado com os filtros atuais.");
    } catch (exportError) {
      console.error("[FinanceiroCentroCustoDetalheModal] erro exportar xlsx", exportError);
      setFeedback("Nao foi possivel gerar o arquivo Excel.");
    } finally {
      setExportando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FinanceiroDashboardModalShell
        open={open}
        title={detalhe?.centro_custo_nome ?? detalhe?.centro_custo_codigo ?? "Centro de custo"}
        description="Caixa confirmado da janela atual, com recebimentos e pagamentos efetivos atribuidos ao centro."
        actionSlot={(
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            onClick={() => void handleExportarExcel()}
            disabled={loading || exportando || !detalhe}
          >
            {exportando ? "Exportando..." : "Exportar Excel"}
          </button>
        )}
        topContent={(
          <>
            <div className="grid gap-3 lg:grid-cols-4">
              <div className="rounded-2xl bg-slate-50/85 px-4 py-3 ring-1 ring-inset ring-slate-200/70">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Receitas</p>
                <p className="mt-1.5 text-lg font-semibold text-emerald-700">
                  {loading ? "Carregando..." : formatBRLFromCents(detalhe?.receitas_atual_centavos ?? 0)}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50/85 px-4 py-3 ring-1 ring-inset ring-slate-200/70">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Despesas</p>
                <p className="mt-1.5 text-lg font-semibold text-rose-700">
                  {loading ? "Carregando..." : formatBRLFromCents(detalhe?.despesas_atual_centavos ?? 0)}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50/85 px-4 py-3 ring-1 ring-inset ring-slate-200/70">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Resultado</p>
                <p className="mt-1.5 text-lg font-semibold text-slate-950">
                  {loading ? "Carregando..." : formatBRLFromCents(detalhe?.resultado_atual_centavos ?? 0)}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50/85 px-4 py-3 ring-1 ring-inset ring-slate-200/70">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Tendencia</p>
                <p className="mt-1.5 text-sm font-semibold text-slate-950">
                  {detalhe
                    ? tendenciaTexto(detalhe.resultado_atual_centavos, detalhe.resultado_anterior_centavos)
                    : "Sem dados."}
                </p>
              </div>
            </div>

            {feedback ? <p className="mt-3 text-xs text-slate-500">{feedback}</p> : null}
          </>
        )}
      >
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : null}

        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="grid gap-3 lg:grid-cols-[repeat(4,minmax(0,1fr))]">
            <label className="space-y-1 text-sm text-slate-600">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tipo</span>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                value={filtroTipo}
                onChange={(event) => setFiltroTipo(event.target.value)}
              >
                <option value="">Todos</option>
                <option value="RECEITA">Receita</option>
                <option value="DESPESA">Despesa</option>
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
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Canal</span>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                value={filtroCanal}
                onChange={(event) => setFiltroCanal(event.target.value)}
              >
                <option value="">Todos</option>
                {opcoesCanal.map((opcao) => (
                  <option key={opcao} value={opcao}>
                    {opcao}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm text-slate-600">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Busca</span>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                value={filtroBusca}
                onChange={(event) => setFiltroBusca(event.target.value)}
                placeholder="Pessoa, descricao ou referencia"
              />
            </label>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Receitas filtradas</p>
            <p className="mt-1.5 text-base font-semibold text-emerald-700">{formatBRLFromCents(receitasFiltradas)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Despesas filtradas</p>
            <p className="mt-1.5 text-base font-semibold text-rose-700">{formatBRLFromCents(despesasFiltradas)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Resultado filtrado</p>
            <p className="mt-1.5 text-base font-semibold text-slate-950">{formatBRLFromCents(resultadoFiltrado)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Quantidade</p>
            <p className="mt-1.5 text-base font-semibold text-slate-950">{itensFiltrados.length}</p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[1120px] text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3 text-left">Tipo</th>
                <th className="px-3 py-3 text-left">Origem</th>
                <th className="px-3 py-3 text-left">Pessoa / documento</th>
                <th className="px-3 py-3 text-left">Descricao</th>
                <th className="px-3 py-3 text-left">Data</th>
                <th className="px-3 py-3 text-left">Competencia</th>
                <th className="px-3 py-3 text-left">Canal</th>
                <th className="px-3 py-3 text-left">Status</th>
                <th className="px-3 py-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                    Carregando detalhamento...
                  </td>
                </tr>
              ) : itensFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                    Sem itens para os filtros atuais.
                  </td>
                </tr>
              ) : (
                itensFiltrados.map((item) => (
                  <tr key={item.item_key} className="border-t border-slate-100 align-top">
                    <td className="px-3 py-3">
                      <div className="font-medium text-slate-800">{item.tipo_movimento}</div>
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      <div>{item.origem}</div>
                      <div className="text-xs text-slate-500">{item.referencia_interna ?? "--"}</div>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{item.pessoa_documento_origem ?? "--"}</td>
                    <td className="px-3 py-3 text-slate-600">
                      <div className="font-medium text-slate-800">{item.descricao}</div>
                      <div className="text-xs text-slate-500">{item.observacao_resumo ?? "--"}</div>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{formatDateISO(item.data_operacional)}</td>
                    <td className="px-3 py-3 text-slate-600">{item.competencia ?? "--"}</td>
                    <td className="px-3 py-3 text-slate-600">{item.canal ?? "--"}</td>
                    <td className="px-3 py-3 text-slate-600">{item.status ?? "--"}</td>
                    <td className="px-3 py-3 text-right font-semibold text-slate-800">
                      {formatBRLFromCents(item.valor_centavos)}
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

export default FinanceiroCentroCustoDetalheModal;
