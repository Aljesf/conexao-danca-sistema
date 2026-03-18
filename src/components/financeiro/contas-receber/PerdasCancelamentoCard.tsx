"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRLFromCents } from "@/lib/formatters/money";
import type { PerdaCancelamentoItem } from "@/lib/financeiro/contas-receber-auditoria";

type Props = {
  items: PerdaCancelamentoItem[];
};

export function PerdasCancelamentoCard({ items }: Props) {
  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="border-slate-100">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-slate-900">Perdas por cancelamento de matrícula</CardTitle>
            <p className="mt-1 text-sm text-slate-600">
              Diagnóstico em validação. Os vínculos usam a melhor correlação disponível entre matrícula cancelada e saldo em aberto.
            </p>
          </div>
          <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
            Diagnóstico em validação
          </span>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-3 font-medium">Mês / ano</th>
              <th className="px-3 py-3 font-medium">Matrículas canceladas</th>
              <th className="px-3 py-3 font-medium">Valor aberto associado</th>
              <th className="px-3 py-3 font-medium">Valor potencial perdido</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-sm text-slate-500">
                  Nenhum cancelamento de matrícula com impacto financeiro foi encontrado.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.periodo} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-3 py-3 font-medium text-slate-900">{item.periodo}</td>
                  <td className="px-3 py-3 text-slate-700">{item.quantidade_matriculas_canceladas}</td>
                  <td className="px-3 py-3 text-slate-700">{formatBRLFromCents(item.valor_aberto_centavos)}</td>
                  <td className="px-3 py-3 text-slate-700">{formatBRLFromCents(item.valor_potencial_perdido_centavos)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
