import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateISO } from "@/lib/formatters/date";
import { formatBRLFromCents } from "@/lib/formatters/money";
import type { PerdaCancelamentoItem } from "@/lib/financeiro/contas-receber-auditoria";

type Props = {
  items: PerdaCancelamentoItem[];
};

function statusBadgeClass(item: PerdaCancelamentoItem) {
  if (item.valor_aberto_centavos > 0) return "bg-rose-50 text-rose-700 ring-rose-200";
  if (item.diagnostico_em_validacao) return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-emerald-50 text-emerald-700 ring-emerald-200";
}

export function PerdasCancelamentoTable({ items }: Props) {
  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="border-slate-100">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-slate-900">Perdas por cancelamento de matricula</CardTitle>
            <p className="mt-1 text-sm text-slate-600">
              Lista detalhada apenas de cancelamentos com semantica de desistencia real e impacto financeiro.
            </p>
          </div>
          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
            {items.length} matricula(s)
          </span>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-3 font-medium">Matricula</th>
              <th className="px-3 py-3 font-medium">Aluno</th>
              <th className="px-3 py-3 font-medium">Responsavel</th>
              <th className="px-3 py-3 font-medium">Turma</th>
              <th className="px-3 py-3 font-medium">Valor aberto</th>
              <th className="px-3 py-3 font-medium">Valor potencial</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium text-right">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-sm text-slate-500">
                  Nenhuma matricula cancelada com perda financeira confirmada foi encontrada.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.matricula_id} className="border-b border-slate-100 align-top last:border-b-0">
                  <td className="px-3 py-3">
                    <div className="font-medium text-slate-900">Matricula #{item.matricula_id}</div>
                    <div className="text-xs text-slate-500">
                      {item.conta_interna_id ? `Conta interna #${item.conta_interna_id}` : "Sem conta interna resolvida"}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-700">{item.aluno_nome}</td>
                  <td className="px-3 py-3 text-slate-700">{item.responsavel_nome}</td>
                  <td className="px-3 py-3 text-slate-700">{item.turma ?? "Turma em revisao"}</td>
                  <td className="px-3 py-3 text-slate-700">{formatBRLFromCents(item.valor_aberto_centavos)}</td>
                  <td className="px-3 py-3 text-slate-700">{formatBRLFromCents(item.valor_potencial_centavos)}</td>
                  <td className="px-3 py-3 text-slate-700">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${statusBadgeClass(item)}`}>
                      {item.status_financeiro}
                    </span>
                    <div className="mt-1 text-xs text-slate-500">{formatDateISO(item.data_cancelamento)}</div>
                    {item.diagnostico_em_validacao ? (
                      <div className="mt-1 text-xs text-amber-700">Semantica inferida por motivo legado</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col items-end gap-2">
                      {item.cobranca_id_principal ? (
                        <Link
                          href={`/financeiro/cobrancas/${item.cobranca_id_principal}`}
                          className="text-sm font-medium text-slate-900 underline-offset-2 hover:text-slate-700 hover:underline"
                        >
                          Ver cobranca
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-400">Sem cobranca aberta</span>
                      )}
                      <details className="max-w-xs text-left">
                        <summary className="cursor-pointer text-xs font-medium text-slate-600 hover:text-slate-900">
                          Expandir detalhes
                        </summary>
                        <div className="mt-2 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                          <div>Cancelamento: {item.cancelamento_tipo ?? "Em revisao"}</div>
                          <div>Motivo: {item.motivo_cancelamento ?? "Sem motivo registrado"}</div>
                          <div>
                            Cobrancas relacionadas:
                            {item.cobrancas_relacionadas.length === 0 ? (
                              <span> nenhuma em aberto</span>
                            ) : null}
                          </div>
                          {item.cobrancas_relacionadas.map((cobranca) => (
                            <div key={cobranca.cobranca_id} className="rounded-md border border-slate-200 bg-white px-2 py-2">
                              <div className="font-medium text-slate-800">
                                <Link
                                  href={`/financeiro/cobrancas/${cobranca.cobranca_id}`}
                                  className="underline-offset-2 hover:text-slate-700 hover:underline"
                                >
                                  Cobranca #{cobranca.cobranca_id}
                                </Link>
                              </div>
                              <div>Vencimento: {formatDateISO(cobranca.vencimento)}</div>
                              <div>Saldo: {formatBRLFromCents(cobranca.saldo_aberto_centavos)}</div>
                              <div>Status: {cobranca.status_cobranca ?? "Em revisao"}</div>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
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
