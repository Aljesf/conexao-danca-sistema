"use client";

import { Button } from "@/components/ui/button";
import { formatBRLFromCents } from "@/lib/formatters/money";
import type { SecretariaContaFaturaAgrupada, SecretariaContaLancamentoResumo } from "./types";

type Props = {
  faturas: SecretariaContaFaturaAgrupada[];
  loading: boolean;
  onReceberFatura: (fatura: SecretariaContaFaturaAgrupada) => void;
  onReceberLancamento: (lancamento: SecretariaContaLancamentoResumo) => void;
  onCancelarLancamento: (lancamento: SecretariaContaLancamentoResumo) => void;
};

function formatDateBr(value: string | null): string {
  if (!value) return "--";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function statusClassName(status: string): string {
  const normalized = status.toUpperCase();
  if (normalized === "QUITADO") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (normalized === "PARCIAL") return "bg-amber-50 text-amber-700 ring-amber-200";
  if (normalized === "EM_ATRASO") return "bg-rose-50 text-rose-700 ring-rose-200";
  if (normalized === "CANCELADO") return "bg-slate-200 text-slate-700 ring-slate-300";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

export function FaturasContaInternaTable({
  faturas,
  loading,
  onReceberFatura,
  onReceberLancamento,
  onCancelarLancamento,
}: Props) {
  if (loading) {
    return <div className="text-sm text-slate-500">Carregando faturas...</div>;
  }

  const faturasFiltradas = faturas.filter(
    (fatura) => fatura.saldo_restante_centavos > 0 || fatura.lancamentos.length > 0,
  );

  if (faturasFiltradas.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
        Nenhuma fatura com saldo em aberto ou lancamentos pendentes para esta conta interna.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {faturasFiltradas.map((fatura) => {
        const podeReceberFatura = fatura.saldo_restante_centavos > 0;

        return (
          <div
            key={fatura.id}
            className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.38)]"
          >
            <div className="flex flex-col gap-5 border-b border-slate-100 pb-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-xl font-semibold text-slate-950">{fatura.competencia}</div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClassName(
                      fatura.status_operacional,
                    )}`}
                  >
                    {fatura.status_operacional}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    Vence em {formatDateBr(fatura.data_vencimento)}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 px-4 py-4">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Valor total</div>
                    <div className="mt-1 text-base font-semibold text-slate-950">
                      {formatBRLFromCents(fatura.valor_original_centavos)}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-4">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Valor pago</div>
                    <div className="mt-1 text-base font-semibold text-slate-950">
                      {formatBRLFromCents(fatura.valor_pago_centavos)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-amber-700">Saldo em aberto</div>
                    <div className="mt-1 text-xl font-semibold text-amber-800">
                      {formatBRLFromCents(fatura.saldo_restante_centavos)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex min-w-[250px] flex-col gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Acao principal</div>
                  <div className="mt-2 text-sm text-slate-600">
                    {podeReceberFatura
                      ? "Receba a fatura inteira quando o atendimento resolver toda a competencia."
                      : "Esta fatura nao exige nova acao de recebimento."}
                  </div>
                </div>

                <Button className="h-12 rounded-2xl" onClick={() => onReceberFatura(fatura)} disabled={!podeReceberFatura}>
                  {podeReceberFatura ? "Receber fatura" : "Fatura sem saldo"}
                </Button>
              </div>
            </div>

            <div className="pt-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Lancamentos desta fatura</div>
                  <div className="text-sm text-slate-500">
                    Os itens ficam subordinados a esta competencia e podem ser recebidos ou cancelados individualmente.
                  </div>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {fatura.lancamentos.length} item(ns)
                </span>
              </div>

              {fatura.lancamentos.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  Nenhum lancamento vinculado a esta fatura.
                </div>
              ) : (
                <div className="space-y-3">
                  {fatura.lancamentos.map((lancamento) => {
                    return (
                      <div
                        key={lancamento.id}
                        className="rounded-[24px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#fbfdff_100%)] px-4 py-4"
                      >
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-base font-semibold text-slate-950">{lancamento.descricao}</div>
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClassName(
                                  lancamento.status_operacional,
                                )}`}
                              >
                                {lancamento.status_operacional}
                              </span>
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                                {lancamento.origem_sistema}
                              </span>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-4">
                              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                                <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Data</div>
                                <div className="mt-1 text-sm font-semibold text-slate-950">
                                  {formatDateBr(lancamento.data_lancamento)}
                                </div>
                              </div>
                              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                                <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Valor</div>
                                <div className="mt-1 text-sm font-semibold text-slate-950">
                                  {formatBRLFromCents(lancamento.valor_original_centavos)}
                                </div>
                              </div>
                              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                                <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Pago</div>
                                <div className="mt-1 text-sm font-semibold text-slate-950">
                                  {formatBRLFromCents(lancamento.valor_pago_centavos)}
                                </div>
                              </div>
                              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                                <div className="text-[11px] uppercase tracking-[0.14em] text-amber-700">Saldo restante</div>
                                <div className="mt-1 text-base font-semibold text-amber-800">
                                  {formatBRLFromCents(lancamento.saldo_restante_centavos)}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                              {lancamento.aluno_nome ? <span>Aluno: {lancamento.aluno_nome}</span> : null}
                              {lancamento.referencia_item ? <span>Referencia: {lancamento.referencia_item}</span> : null}
                              {lancamento.motivo_cancelamento ? (
                                <span>Motivo cancelamento: {lancamento.motivo_cancelamento}</span>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex min-w-[250px] flex-col gap-3">
                            <Button
                              className="h-11 rounded-2xl"
                              onClick={() => onReceberLancamento(lancamento)}
                              disabled={!lancamento.pode_receber}
                            >
                              {lancamento.pode_receber ? "Receber item" : "Item sem recebimento"}
                            </Button>
                            <Button
                              variant="secondary"
                              className="h-11 rounded-2xl"
                              onClick={() => onCancelarLancamento(lancamento)}
                              disabled={!lancamento.pode_cancelar}
                            >
                              {lancamento.pode_cancelar ? "Cancelar item" : "Cancelamento indisponivel"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default FaturasContaInternaTable;
