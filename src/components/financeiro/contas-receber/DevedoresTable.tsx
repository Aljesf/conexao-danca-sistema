"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateISO } from "@/lib/formatters/date";
import { formatBRLFromCents } from "@/lib/formatters/money";
import type { DevedorAuditoriaItem } from "@/lib/financeiro/contas-receber-auditoria";

type Props = {
  items: DevedorAuditoriaItem[];
  showAll: boolean;
  onToggleAll: () => void;
  onVerTitulos: (item: DevedorAuditoriaItem) => void;
};

export function DevedoresTable({ items, showAll, onToggleAll, onVerTitulos }: Props) {
  const rows = showAll ? items : items.slice(0, 10);

  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="flex flex-col gap-3 border-slate-100 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-slate-900">Principais devedores</CardTitle>
          <p className="mt-1 text-sm text-slate-600">
            Lista sempre baseada em títulos vencidos com saldo em aberto.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={onToggleAll}>
          {showAll ? "Mostrar top 10" : "Ver todos"}
        </Button>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-3 font-medium">Pessoa</th>
              <th className="px-3 py-3 font-medium">Títulos vencidos</th>
              <th className="px-3 py-3 font-medium">Total vencido</th>
              <th className="px-3 py-3 font-medium">Maior atraso</th>
              <th className="px-3 py-3 font-medium">Vencimento mais antigo</th>
              <th className="px-3 py-3 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-slate-500">
                  Nenhum devedor vencido encontrado nos filtros atuais.
                </td>
              </tr>
            ) : (
              rows.map((item) => (
                <tr key={item.pessoa_id} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-3 py-3 font-medium text-slate-900">{item.pessoa_nome}</td>
                  <td className="px-3 py-3 text-slate-700">{item.titulos_vencidos}</td>
                  <td className="px-3 py-3 text-slate-700">{formatBRLFromCents(item.total_vencido_centavos)}</td>
                  <td className="px-3 py-3 text-slate-700">{item.maior_atraso_dias} dias</td>
                  <td className="px-3 py-3 text-slate-700">{formatDateISO(item.vencimento_mais_antigo)}</td>
                  <td className="px-3 py-3 text-right">
                    <Button type="button" variant="secondary" onClick={() => onVerTitulos(item)}>
                      Ver títulos
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
