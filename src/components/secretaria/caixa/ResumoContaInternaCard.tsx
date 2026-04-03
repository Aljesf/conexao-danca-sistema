"use client";

import { SectionCard } from "@/components/layout/SectionCard";
import { formatBRLFromCents } from "@/lib/formatters/money";
import type { SecretariaContaInternaDetalhe } from "./types";

type Props = {
  detalhe: SecretariaContaInternaDetalhe | null;
  loading: boolean;
  error: string | null;
  mensagem: string | null;
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
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

export function ResumoContaInternaCard({ detalhe, loading, error, mensagem }: Props) {
  return (
    <SectionCard
      title="3. Resumo financeiro consolidado"
      description="Leitura rapida do que esta em aberto, do que venceu e da proxima acao financeira da conta."
      className="rounded-[28px] border-slate-200 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.35)]"
    >
      {mensagem ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {mensagem}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      {!detalhe ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
          {loading
            ? "Carregando a conta interna selecionada..."
            : "Selecione uma pessoa para abrir o resumo financeiro da conta interna."}
        </div>
      ) : (
        <div className="space-y-5">
          {detalhe.possui_lancamentos_sem_fatura ? (
            <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
              Existem {detalhe.lancamentos_sem_fatura.length} lancamento(s) sem fatura vinculada. Eles aparecem em um
              bloco separado abaixo para correcao operacional.
            </div>
          ) : null}

          <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
            <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#fff5e9_0%,#ffffff_52%,#eef7f8_100%)] px-5 py-5">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Saldo em aberto</div>
              <div className="mt-2 text-3xl font-semibold text-slate-950">
                {formatBRLFromCents(detalhe.saldo_total_em_aberto_centavos)}
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Panorama geral da conta para orientar o atendimento do caixa.
              </p>
            </div>

            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-rose-600">Total vencido</div>
              <div className="mt-1 text-2xl font-semibold text-rose-700">
                {formatBRLFromCents(detalhe.total_vencido_centavos)}
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-emerald-700">Total a vencer</div>
              <div className="mt-1 text-2xl font-semibold text-emerald-700">
                {formatBRLFromCents(detalhe.total_a_vencer_centavos)}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Proxima fatura</div>
              {detalhe.proxima_fatura ? (
                <>
                  <div className="mt-1 text-lg font-semibold text-slate-950">{detalhe.proxima_fatura.competencia}</div>
                  <div className="mt-1 text-sm text-slate-600">
                    Vence em {formatDateBr(detalhe.proxima_fatura.data_vencimento)}
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-950">
                    {formatBRLFromCents(detalhe.proxima_fatura.saldo_restante_centavos)}
                  </div>
                </>
              ) : (
                <div className="mt-1 text-sm text-slate-500">Nenhuma fatura aberta.</div>
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Sinal operacional da proxima cobranca</p>
                  <p className="text-sm text-slate-500">Ajuda o operador a decidir se recebe a fatura inteira ou por item.</p>
                </div>
                {detalhe.proxima_fatura ? (
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClassName(
                      detalhe.proxima_fatura.status_operacional,
                    )}`}
                  >
                    {detalhe.proxima_fatura.status_operacional}
                  </span>
                ) : null}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                <div className="rounded-2xl bg-slate-50 px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Faturas monitoradas</div>
                  <div className="mt-1 text-xl font-semibold text-slate-950">
                    {detalhe.faturas.filter((f) => f.saldo_restante_centavos > 0 || f.lancamentos.length > 0).length}
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Lancamentos monitorados</div>
                  <div className="mt-1 text-xl font-semibold text-slate-950">{detalhe.total_lancamentos_monitorados}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Alunos vinculados</div>
                  <div className="mt-1 text-xl font-semibold text-slate-950">{detalhe.alunos_relacionados.length}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Inconsistencias</div>
                  <div className="mt-1 text-xl font-semibold text-slate-950">{detalhe.lancamentos_sem_fatura.length}</div>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-5">
              <div>
                <p className="text-sm font-semibold text-slate-900">Saldo por origem</p>
                <p className="text-sm text-slate-500">Mostra onde a conta esta concentrada para reduzir duvidas no balcao.</p>
              </div>

              {detalhe.totais_por_origem.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  Nenhum saldo pendente por origem.
                </div>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {detalhe.totais_por_origem.map((origem) => (
                    <div key={origem.origem} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{origem.origem}</div>
                      <div className="mt-1 text-lg font-semibold text-slate-950">
                        {formatBRLFromCents(origem.valor_em_aberto_centavos)}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">{origem.quantidade_lancamentos} item(ns) em aberto</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

export default ResumoContaInternaCard;
