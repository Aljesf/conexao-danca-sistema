"use client";

import { Button } from "@/components/ui/button";
import { formatBRLFromCents } from "@/lib/formatters/money";
import type { SecretariaContaLancamentoResumo } from "./types";

type Props = {
  lancamentos: SecretariaContaLancamentoResumo[];
  loading: boolean;
  onReceber: (lancamento: SecretariaContaLancamentoResumo) => void;
  onCancelar: (lancamento: SecretariaContaLancamentoResumo) => void;
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

export function LancamentosContaInternaTable({ lancamentos, loading, onReceber, onCancelar }: Props) {
  if (loading) {
    return <div className="text-sm text-slate-500">Carregando lancamentos sem fatura...</div>;
  }

  if (lancamentos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
        Nenhuma inconsistencia operacional encontrada. Todos os lancamentos atuais estao vinculados a uma fatura.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {lancamentos.map((lancamento) => (
        <div
          key={lancamento.id}
          className="rounded-[28px] border border-amber-200 bg-[linear-gradient(135deg,#fff8ef_0%,#ffffff_58%,#fffdf8_100%)] p-5 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.3)]"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
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
                <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                  Sem fatura vinculada
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-2xl bg-white px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Data</div>
                  <div className="mt-1 text-base font-semibold text-slate-950">
                    {formatDateBr(lancamento.data_lancamento)}
                  </div>
                </div>
                <div className="rounded-2xl bg-white px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Valor original</div>
                  <div className="mt-1 text-base font-semibold text-slate-950">
                    {formatBRLFromCents(lancamento.valor_original_centavos)}
                  </div>
                </div>
                <div className="rounded-2xl bg-white px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Valor pago</div>
                  <div className="mt-1 text-base font-semibold text-slate-950">
                    {formatBRLFromCents(lancamento.valor_pago_centavos)}
                  </div>
                </div>
                <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-amber-700">Saldo restante</div>
                  <div className="mt-1 text-xl font-semibold text-amber-800">
                    {formatBRLFromCents(lancamento.saldo_restante_centavos)}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-white px-4 py-4 text-sm text-amber-800">
                Este item nao esta agrupado em nenhuma fatura. Revise o cadastro financeiro e corrija a inconsistencia
                operacional o quanto antes.
              </div>
            </div>

            <div className="flex min-w-[240px] flex-col gap-3">
              <Button className="h-12 rounded-2xl" onClick={() => onReceber(lancamento)} disabled={!lancamento.pode_receber}>
                {lancamento.pode_receber ? "Receber item" : "Item sem recebimento"}
              </Button>
              <Button
                variant="secondary"
                className="h-12 rounded-2xl"
                onClick={() => onCancelar(lancamento)}
                disabled={!lancamento.pode_cancelar}
              >
                {lancamento.pode_cancelar ? "Cancelar item" : "Cancelamento indisponivel"}
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default LancamentosContaInternaTable;
