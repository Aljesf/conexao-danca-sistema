"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateISO } from "@/lib/formatters/date";
import { formatBRLFromCents } from "@/lib/formatters/money";
import type { CobrancaListaItem, ContextoPrincipal } from "@/lib/financeiro/contas-receber-auditoria";

type Props = {
  items: CobrancaListaItem[];
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  onAuditar: (item: CobrancaListaItem) => void;
  onReceber: (item: CobrancaListaItem) => void;
};

const CONTEXTO_STYLES: Record<ContextoPrincipal, string> = {
  ESCOLA: "bg-sky-50 text-sky-800 ring-sky-200",
  CAFE: "bg-amber-50 text-amber-800 ring-amber-200",
  LOJA: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  OUTRO: "bg-slate-100 text-slate-700 ring-slate-200",
};

function contextoLabel(contexto: ContextoPrincipal) {
  if (contexto === "ESCOLA") return "Escola";
  if (contexto === "CAFE") return "Café";
  if (contexto === "LOJA") return "Loja";
  return "Outro";
}

function bucketLabel(item: CobrancaListaItem) {
  if (item.competencia_ano_mes && item.bucket) return `${item.competencia_ano_mes} · ${item.bucket}`;
  return item.competencia_ano_mes ?? item.bucket ?? "Sem bucket";
}

function situacaoLabel(item: CobrancaListaItem) {
  const interno = item.status_interno ?? "SEM_STATUS";
  const bruto = item.status_cobranca ?? "SEM_STATUS";
  return `${interno} · ${bruto}`;
}

export function CobrancasTable({
  items,
  page,
  totalPages,
  total,
  onPageChange,
  onAuditar,
  onReceber,
}: Props) {
  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="border-slate-100">
        <CardTitle className="text-slate-900">Cobranças auditáveis</CardTitle>
        <p className="mt-1 text-sm text-slate-600">
          Leitura por contexto financeiro, origem operacional e centro de custo.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-3 font-medium">Tipo</th>
                <th className="px-3 py-3 font-medium">Pessoa</th>
                <th className="px-3 py-3 font-medium">Contexto</th>
                <th className="px-3 py-3 font-medium">Origem detalhada</th>
                <th className="px-3 py-3 font-medium">Vencimento</th>
                <th className="px-3 py-3 font-medium">Competência / bucket</th>
                <th className="px-3 py-3 font-medium">Valor</th>
                <th className="px-3 py-3 font-medium">Situação</th>
                <th className="px-3 py-3 font-medium">Centro de custo</th>
                <th className="px-3 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center text-sm text-slate-500">
                    Nenhuma cobrança encontrada para os filtros atuais.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.cobranca_id} className="border-b border-slate-100 align-top last:border-b-0">
                    <td className="px-3 py-3 text-slate-700">{item.origem_tipo ?? "Cobrança"}</td>
                    <td className="px-3 py-3 font-medium text-slate-900">{item.pessoa_nome}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
                          CONTEXTO_STYLES[item.contexto_principal]
                        }`}
                      >
                        {contextoLabel(item.contexto_principal)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-700">{item.origem_label}</td>
                    <td className="px-3 py-3 text-slate-700">{formatDateISO(item.vencimento)}</td>
                    <td className="px-3 py-3 text-slate-700">{bucketLabel(item)}</td>
                    <td className="px-3 py-3 text-slate-700">
                      <div>{formatBRLFromCents(item.valor_aberto_centavos)}</div>
                      <div className="text-xs text-slate-500">total {formatBRLFromCents(item.valor_centavos)}</div>
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      <div>{situacaoLabel(item)}</div>
                      <div className="text-xs text-slate-500">{item.atraso_dias > 0 ? `${item.atraso_dias} dias` : "sem atraso"}</div>
                    </td>
                    <td className="px-3 py-3 text-slate-700">{item.centro_custo_nome ?? "Sem centro de custo"}</td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="secondary" onClick={() => onAuditar(item)}>
                          Auditar
                        </Button>
                        <Button
                          type="button"
                          onClick={() => onReceber(item)}
                          disabled={item.valor_aberto_centavos <= 0 || item.status_interno === "QUITADA"}
                        >
                          Receber
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Página {page} de {totalPages} · {total} cobrança(s)
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
              Anterior
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              Próxima
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
