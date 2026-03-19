import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateISO } from "@/lib/formatters/date";
import { formatBRLFromCents } from "@/lib/formatters/money";
import type { PerdaCancelamentoItem } from "@/lib/financeiro/contas-receber-auditoria";

type Props = {
  items: PerdaCancelamentoItem[];
};

function statusBadgeClass(item: PerdaCancelamentoItem) {
  if (item.possuiSaldoAberto) return "bg-rose-50 text-rose-700 ring-rose-200";
  if (item.possuiValorPotencial) return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function origemBadgeClass(origem: string) {
  if (origem === "COBRANCA_CANCELADA_MANUAL") return "bg-amber-50 text-amber-700 ring-amber-200";
  if (origem === "MOTIVO_LEGADO_EVASAO") return "bg-slate-100 text-slate-700 ring-slate-200";
  return "bg-emerald-50 text-emerald-700 ring-emerald-200";
}

function origemPerdaLabel(origem: string) {
  if (origem === "COBRANCA_CANCELADA_MANUAL") return "Cobranca cancelada manualmente";
  if (origem === "MOTIVO_LEGADO_EVASAO") return "Motivo legado compativel";
  if (origem === "MATRICULA_DESISTENCIA_REAL") return "Matricula com desistencia real";
  return "Origem em revisao";
}

export function PerdasCancelamentoTable({ items }: Props) {
  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="border-slate-100">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-slate-900">Perdas por cancelamento de matricula</CardTitle>
            <p className="mt-1 text-sm text-slate-600">
              Lista detalhada de perdas reconhecidas por desistencia real, motivo legado compativel ou cancelamento manual de cobranca vinculado a matricula cancelada.
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
              <th className="px-3 py-3 font-medium">Origem da perda</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium text-right">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-sm text-slate-500">
                  Nenhuma matricula cancelada elegivel para perda financeira foi encontrada.
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
                    <div className="mt-1 text-xs text-slate-500">{formatDateISO(item.data_cancelamento)}</div>
                  </td>
                  <td className="px-3 py-3 text-slate-700">{item.aluno_nome}</td>
                  <td className="px-3 py-3 text-slate-700">{item.responsavel_nome}</td>
                  <td className="px-3 py-3 text-slate-700">{item.turma ?? "Turma em revisao"}</td>
                  <td className="px-3 py-3 text-slate-700">
                    <div className="font-medium">{formatBRLFromCents(item.valor_aberto_centavos)}</div>
                    <div className="text-xs text-slate-500">
                      {item.possuiSaldoAberto ? "Associado a titulos ainda em aberto" : "Sem saldo aberto no momento"}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    <div className="font-medium">{formatBRLFromCents(item.valor_potencial_centavos)}</div>
                    <div className="text-xs text-slate-500">
                      {item.possuiValorPotencial ? "Valor potencial perdido" : "Sem valor potencial apurado"}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    <div className="space-y-2">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${origemBadgeClass(item.origemSemanticaPerda)}`}>
                        {origemPerdaLabel(item.origemSemanticaPerda)}
                      </span>
                      <div className="text-xs text-slate-600">{item.motivoEntradaPerda}</div>
                      <div className="text-xs text-slate-500">{item.cancelamentoReconhecidoPor}</div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${statusBadgeClass(item)}`}>
                      {item.status_financeiro}
                    </span>
                    {item.diagnostico_em_validacao ? (
                      <div className="mt-1 text-xs text-amber-700">Regra validada com fallback semantico</div>
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
                        <span className="text-xs text-slate-400">Sem cobranca vinculada</span>
                      )}
                      <details className="max-w-sm text-left">
                        <summary className="cursor-pointer text-xs font-medium text-slate-600 hover:text-slate-900">
                          Expandir detalhes
                        </summary>
                        <div className="mt-2 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                          <div className="grid gap-2 md:grid-cols-2">
                            <div className="rounded-md border border-slate-200 bg-white px-2 py-2">
                              <div className="font-medium text-slate-800">Motivo de entrada</div>
                              <div className="mt-1">{item.motivoEntradaPerda}</div>
                            </div>
                            <div className="rounded-md border border-slate-200 bg-white px-2 py-2">
                              <div className="font-medium text-slate-800">Reconhecido por</div>
                              <div className="mt-1">{item.cancelamentoReconhecidoPor}</div>
                            </div>
                            <div className="rounded-md border border-slate-200 bg-white px-2 py-2">
                              <div className="font-medium text-slate-800">Cancelamento da matricula</div>
                              <div className="mt-1">{item.cancelamento_tipo ?? "Em revisao"}</div>
                            </div>
                            <div className="rounded-md border border-slate-200 bg-white px-2 py-2">
                              <div className="font-medium text-slate-800">Motivo registrado</div>
                              <div className="mt-1">{item.motivo_cancelamento ?? "Sem motivo registrado"}</div>
                            </div>
                          </div>

                          {item.causaExclusaoAnterior ? (
                            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                              <div className="font-medium">Causa da exclusao anterior</div>
                              <div className="mt-1">{item.causaExclusaoAnterior}</div>
                            </div>
                          ) : null}

                          <div className="grid gap-2 md:grid-cols-3">
                            <div className="rounded-md border border-slate-200 bg-white px-2 py-2">
                              <div className="font-medium text-slate-800">Possui saldo aberto</div>
                              <div className="mt-1">{item.possuiSaldoAberto ? "Sim" : "Nao"}</div>
                            </div>
                            <div className="rounded-md border border-slate-200 bg-white px-2 py-2">
                              <div className="font-medium text-slate-800">Possui valor potencial</div>
                              <div className="mt-1">{item.possuiValorPotencial ? "Sim" : "Nao"}</div>
                            </div>
                            <div className="rounded-md border border-slate-200 bg-white px-2 py-2">
                              <div className="font-medium text-slate-800">Possui cobranca cancelada</div>
                              <div className="mt-1">{item.possuiCobrancaCancelada ? "Sim" : "Nao"}</div>
                            </div>
                          </div>

                          <div>
                            <div className="font-medium text-slate-800">Cobrancas relacionadas</div>
                            <div className="mt-2 space-y-2">
                              {item.cobrancas_relacionadas.length === 0 ? (
                                <div className="rounded-md border border-slate-200 bg-white px-2 py-2 text-slate-500">
                                  Nenhuma cobranca relacionada encontrada.
                                </div>
                              ) : (
                                item.cobrancas_relacionadas.map((cobranca) => (
                                  <div key={`${cobranca.origem_evento}-${cobranca.cobranca_id}`} className="rounded-md border border-slate-200 bg-white px-2 py-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Link
                                        href={`/financeiro/cobrancas/${cobranca.cobranca_id}`}
                                        className="font-medium text-slate-800 underline-offset-2 hover:text-slate-700 hover:underline"
                                      >
                                        Cobranca #{cobranca.cobranca_id}
                                      </Link>
                                      <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
                                        {cobranca.origem_evento === "ABERTA" ? "Aberta" : "Cancelada"}
                                      </span>
                                    </div>
                                    <div className="mt-1 grid gap-1 text-slate-600">
                                      <div>Vencimento: {formatDateISO(cobranca.vencimento)}</div>
                                      <div>Valor: {formatBRLFromCents(cobranca.valor_centavos)}</div>
                                      <div>Saldo aberto: {formatBRLFromCents(cobranca.saldo_aberto_centavos)}</div>
                                      <div>Status: {cobranca.status_cobranca ?? "Em revisao"}</div>
                                      {cobranca.cancelada_em ? <div>Cancelada em: {formatDateISO(cobranca.cancelada_em)}</div> : null}
                                      {cobranca.cancelamento_tipo ? <div>Tipo de cancelamento: {cobranca.cancelamento_tipo}</div> : null}
                                      {cobranca.cancelamento_motivo ? <div>Motivo do cancelamento: {cobranca.cancelamento_motivo}</div> : null}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
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
