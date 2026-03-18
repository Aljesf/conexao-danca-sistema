"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateISO } from "@/lib/formatters/date";
import { formatBRLFromCents } from "@/lib/formatters/money";
import type { RankingResumoItem } from "@/lib/financeiro/contas-receber-auditoria";
import type { RankingModo } from "@/lib/financeiro/contas-receber-view-config";

type Props = {
  title: string;
  subtitle: string;
  mode: RankingModo;
  items: RankingResumoItem[];
  showAll: boolean;
  onToggleAll: () => void;
  emptyMessage: string;
};

function getRows(mode: RankingModo) {
  if (mode === "DEVEDORES") {
    return {
      headers: ["Pessoa", "Titulos vencidos", "Total vencido", "Maior atraso", "Vencimento mais antigo"],
      render: (item: RankingResumoItem) => [
        item.pessoa_nome,
        String(item.quantidade_titulos),
        formatBRLFromCents(item.total_centavos),
        `${item.maior_atraso_dias} dias`,
        formatDateISO(item.vencimento_mais_antigo),
      ],
    };
  }

  if (mode === "EXPOSICAO") {
    return {
      headers: ["Pessoa", "Titulos a vencer", "Total a vencer", "Proximo vencimento", "Maior valor"],
      render: (item: RankingResumoItem) => [
        item.pessoa_nome,
        String(item.quantidade_titulos),
        formatBRLFromCents(item.total_centavos),
        formatDateISO(item.vencimento_mais_proximo),
        formatBRLFromCents(item.maior_valor_centavos),
      ],
    };
  }

  if (mode === "RECEBIMENTOS") {
    return {
      headers: ["Pessoa", "Cobrancas recebidas", "Total recebido", "Maior recebimento", "Data mais recente"],
      render: (item: RankingResumoItem) => [
        item.pessoa_nome,
        String(item.quantidade_titulos),
        formatBRLFromCents(item.total_centavos),
        formatBRLFromCents(item.maior_valor_centavos),
        formatDateISO(item.data_mais_recente),
      ],
    };
  }

  return {
    headers: ["Pessoa", "Ocorrencias", "Total em revisao", "Criticidade", "Leitura"],
    render: (item: RankingResumoItem) => [
      item.pessoa_nome,
      String(item.quantidade_titulos),
      formatBRLFromCents(item.total_centavos),
      String(item.criticidade),
      item.observacao ?? "Revisar trilha financeira",
    ],
  };
}

export function ResumoRankingTable({
  title,
  subtitle,
  mode,
  items,
  showAll,
  onToggleAll,
  emptyMessage,
}: Props) {
  const rows = showAll ? items : items.slice(0, 10);
  const table = getRows(mode);

  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="flex flex-col gap-3 border-slate-100 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-slate-900">{title}</CardTitle>
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        </div>
        {items.length > 10 ? (
          <Button type="button" variant="secondary" onClick={onToggleAll}>
            {showAll ? "Mostrar top 10" : "Ver todos"}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
              {table.headers.map((header) => (
                <th key={header} className="px-3 py-3 font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={table.headers.length} className="px-3 py-8 text-center text-sm text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((item) => (
                <tr key={item.chave} className="border-b border-slate-100 last:border-b-0">
                  {table.render(item).map((value, index) => (
                    <td key={`${item.chave}-${index}`} className={index === 0 ? "px-3 py-3 font-medium text-slate-900" : "px-3 py-3 text-slate-700"}>
                      {value}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
