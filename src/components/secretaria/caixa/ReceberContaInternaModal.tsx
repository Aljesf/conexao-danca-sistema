"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatBRLFromCents } from "@/lib/formatters/money";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shadcn/ui";
import type {
  SecretariaContaFinanceiraOpcao,
  SecretariaFormaPagamentoOpcao,
  SecretariaPagamentoResponse,
  SecretariaRecebimentoAlvo,
} from "./types";

type Props = {
  open: boolean;
  alvo: SecretariaRecebimentoAlvo | null;
  formasPagamento: SecretariaFormaPagamentoOpcao[];
  contasFinanceiras: SecretariaContaFinanceiraOpcao[];
  onClose: () => void;
  onSuccess: (payload: SecretariaPagamentoResponse) => Promise<void> | void;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDateBr(value: string | null): string {
  if (!value) return "--";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function parsePositiveInt(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const normalized = Math.trunc(parsed);
  return normalized > 0 ? normalized : null;
}

function formatCentavosParaInput(value: number): string {
  return (value / 100).toFixed(2).replace(".", ",");
}

function parseMoneyToCents(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) return null;

  const withoutCurrency = normalized.replace(/\s/g, "").replace(/R\$/gi, "");
  const commaValue = withoutCurrency.includes(",")
    ? withoutCurrency.replace(/\./g, "").replace(",", ".")
    : withoutCurrency;

  const parsed = Number(commaValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed * 100);
}

function getFriendlyPaymentError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("saldo")) {
    return "O valor informado nao pode ultrapassar o saldo restante.";
  }

  if (normalized.includes("forma de pagamento") || normalized.includes("forma_pagamento")) {
    return "Selecione uma forma de pagamento valida.";
  }

  if (normalized.includes("conta financeira") || normalized.includes("conta_financeira")) {
    return "Selecione a conta financeira que recebera o valor.";
  }

  if (normalized.includes("maior que zero")) {
    return "Informe um valor maior que zero.";
  }

  if (normalized.includes("http_")) {
    return "Nao foi possivel registrar o pagamento agora. Tente novamente ou chame a administracao.";
  }

  return message;
}

function getSaldoRestante(alvo: SecretariaRecebimentoAlvo | null): number {
  if (!alvo) return 0;
  return alvo.item.saldo_restante_centavos;
}

function getValorOriginal(alvo: SecretariaRecebimentoAlvo | null): number {
  if (!alvo) return 0;
  return alvo.item.valor_original_centavos;
}

function getValorPago(alvo: SecretariaRecebimentoAlvo | null): number {
  if (!alvo) return 0;
  return alvo.item.valor_pago_centavos;
}

function getFormaLabel(item: SecretariaFormaPagamentoOpcao): string {
  return item.descricao_exibicao || item.formas_pagamento?.nome || item.forma_pagamento_codigo;
}

export function ReceberContaInternaModal({
  open,
  alvo,
  formasPagamento,
  contasFinanceiras,
  onClose,
  onSuccess,
}: Props) {
  const [valorReceber, setValorReceber] = useState<string>("");
  const [formaPagamentoCodigo, setFormaPagamentoCodigo] = useState<string>("");
  const [contaFinanceiraId, setContaFinanceiraId] = useState<string>("");
  const [dataPagamento, setDataPagamento] = useState<string>(todayIso());
  const [observacao, setObservacao] = useState<string>("");
  const [valorRecebido, setValorRecebido] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saldoRestante = getSaldoRestante(alvo);
  const valorReceberCentavos = parseMoneyToCents(valorReceber);
  const selectedForma = useMemo(
    () => formasPagamento.find((item) => item.forma_pagamento_codigo === formaPagamentoCodigo) ?? null,
    [formaPagamentoCodigo, formasPagamento],
  );

  const isDinheiro =
    selectedForma?.exige_troco === true ||
    (selectedForma?.tipo_base ?? selectedForma?.formas_pagamento?.tipo_base ?? "").toUpperCase() === "DINHEIRO" ||
    formaPagamentoCodigo.toUpperCase() === "DINHEIRO";

  const valorRecebidoCentavos = parseMoneyToCents(valorRecebido);
  const trocoCentavos =
    isDinheiro && valorRecebidoCentavos !== null && valorReceberCentavos !== null && valorRecebidoCentavos > valorReceberCentavos
      ? valorRecebidoCentavos - valorReceberCentavos
      : 0;

  useEffect(() => {
    if (!open || !alvo) return;

    const defaultForma = formasPagamento[0] ?? null;
    const defaultContaId =
      defaultForma?.conta_financeira_id ??
      (contasFinanceiras.length > 0 ? contasFinanceiras[0]?.id ?? null : null);

    setValorReceber(formatCentavosParaInput(alvo.item.saldo_restante_centavos));
    setFormaPagamentoCodigo(defaultForma?.forma_pagamento_codigo ?? "");
    setContaFinanceiraId(defaultContaId ? String(defaultContaId) : "");
    setDataPagamento(todayIso());
    setObservacao("");
    setValorRecebido("");
    setError(null);
  }, [open, alvo, formasPagamento, contasFinanceiras]);

  useEffect(() => {
    if (!selectedForma?.conta_financeira_id) return;
    if (contaFinanceiraId.trim()) return;
    setContaFinanceiraId(String(selectedForma.conta_financeira_id));
  }, [contaFinanceiraId, selectedForma]);

  async function handleSubmit() {
    if (!alvo) return;

    const contaId = parsePositiveInt(contaFinanceiraId);

    if (!valorReceberCentavos) {
      setError("Informe um valor maior que zero.");
      return;
    }

    if (valorReceberCentavos > saldoRestante) {
      setError("O valor informado nao pode ultrapassar o saldo restante.");
      return;
    }

    if (!formaPagamentoCodigo) {
      setError("Selecione a forma de pagamento.");
      return;
    }

    if (!contaId) {
      setError("Selecione a conta financeira.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const endpoint =
        alvo.tipo === "FATURA"
          ? "/api/secretaria/caixa/pagamentos/fatura"
          : "/api/secretaria/caixa/pagamentos/lancamento";

      const payload =
        alvo.tipo === "FATURA"
          ? {
              fatura_id: alvo.item.id,
              valor_pagamento_centavos: valorReceberCentavos,
              forma_pagamento_codigo: formaPagamentoCodigo,
              conta_financeira_id: contaId,
              data_pagamento: dataPagamento,
              observacao: observacao.trim() || null,
            }
          : {
              lancamento_id: alvo.item.id,
              valor_pagamento_centavos: valorReceberCentavos,
              forma_pagamento_codigo: formaPagamentoCodigo,
              conta_financeira_id: contaId,
              data_pagamento: dataPagamento,
              observacao: observacao.trim() || null,
            };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = (await response.json().catch(() => null)) as
        | (SecretariaPagamentoResponse & { detalhe?: string; error?: string })
        | null;

      if (!response.ok || !body?.ok) {
        throw new Error(body?.detalhe ?? body?.error ?? `http_${response.status}`);
      }

      await onSuccess(body);
      onClose();
    } catch (requestError) {
      setError(
        getFriendlyPaymentError(
          requestError instanceof Error
            ? requestError.message
            : "Nao foi possivel registrar o pagamento agora. Tente novamente ou chame a administracao.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  const isParcial =
    valorReceberCentavos !== null && valorReceberCentavos > 0 && valorReceberCentavos < saldoRestante;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : null)}>
      <DialogContent className="max-w-4xl p-0">
        <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#fff2e2_0%,#ffffff_52%,#edf8f8_100%)] px-6 py-5">
          <DialogHeader>
            <DialogTitle>Receber {alvo?.tipo === "FATURA" ? "fatura" : "lancamento"} da conta interna</DialogTitle>
            <DialogDescription>
              Registre o recebimento com clareza, sem ultrapassar o saldo em aberto.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-6 px-6 py-6">
          {!alvo ? (
            <div className="text-sm text-slate-500">Selecione uma fatura ou lancamento para continuar.</div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Alvo do recebimento</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {alvo.tipo === "FATURA" ? `Fatura #${alvo.item.id}` : `Lancamento #${alvo.item.id}`}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {alvo.tipo === "FATURA" ? alvo.item.competencia : alvo.item.descricao}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Valor original</div>
                  <div className="mt-1 text-base font-semibold text-slate-950">
                    {formatBRLFromCents(getValorOriginal(alvo))}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Valor ja pago</div>
                  <div className="mt-1 text-base font-semibold text-slate-950">
                    {formatBRLFromCents(getValorPago(alvo))}
                  </div>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-amber-700">Saldo restante</div>
                  <div className="mt-1 text-xl font-semibold text-amber-800">{formatBRLFromCents(saldoRestante)}</div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                <div className="space-y-2 rounded-[28px] border border-slate-200 bg-white px-5 py-5">
                  <label className="text-sm font-medium text-slate-700">Valor a receber</label>
                  <Input
                    value={valorReceber}
                    onChange={(event) => setValorReceber(event.target.value)}
                    inputMode="decimal"
                    placeholder="0,00"
                    className="h-12 rounded-2xl border-slate-200 text-base focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setValorReceber(formatCentavosParaInput(saldoRestante))}>
                      Receber total
                    </Button>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      {isParcial ? "Pagamento parcial" : "Pagamento total"}
                    </span>
                  </div>
                  <div className="text-sm text-slate-500">
                    Valor digitado:{" "}
                    {valorReceberCentavos !== null ? formatBRLFromCents(valorReceberCentavos) : "Informe um valor valido"}
                  </div>

                  {isDinheiro ? (
                    <div className="mt-3 space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                      <label className="text-sm font-medium text-emerald-800">Valor recebido em dinheiro</label>
                      <Input
                        value={valorRecebido}
                        onChange={(event) => setValorRecebido(event.target.value)}
                        inputMode="decimal"
                        placeholder="0,00"
                        className="h-12 rounded-2xl border-emerald-200 bg-white text-base focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                      />
                      {trocoCentavos > 0 ? (
                        <div className="rounded-xl bg-emerald-100 px-4 py-3 text-center">
                          <div className="text-[11px] uppercase tracking-[0.14em] text-emerald-700">Troco a devolver</div>
                          <div className="mt-1 text-2xl font-semibold text-emerald-800">
                            {formatBRLFromCents(trocoCentavos)}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="space-y-4 rounded-[28px] border border-slate-200 bg-white px-5 py-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Forma de pagamento</label>
                    <select
                      value={formaPagamentoCodigo}
                      onChange={(event) => setFormaPagamentoCodigo(event.target.value)}
                      className="h-12 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    >
                      <option value="">Selecione</option>
                      {formasPagamento.map((item) => (
                        <option key={item.forma_pagamento_codigo} value={item.forma_pagamento_codigo}>
                          {getFormaLabel(item)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Conta financeira</label>
                    <select
                      value={contaFinanceiraId}
                      onChange={(event) => setContaFinanceiraId(event.target.value)}
                      className="h-12 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    >
                      <option value="">Selecione</option>
                      {contasFinanceiras.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.codigo ? `${item.codigo} - ${item.nome}` : item.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">Data do pagamento</label>
                    <Input
                      type="date"
                      value={dataPagamento}
                      onChange={(event) => setDataPagamento(event.target.value)}
                      className="h-12 rounded-2xl border-slate-200 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    />
                    <div className="text-sm text-slate-500">Data operacional: {formatDateBr(dataPagamento)}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 rounded-[28px] border border-slate-200 bg-white px-5 py-5">
                <label className="text-sm font-medium text-slate-700">Observacao do atendimento</label>
                <Textarea
                  rows={4}
                  value={observacao}
                  onChange={(event) => setObservacao(event.target.value)}
                  placeholder="Ex.: pagamento parcial em dinheiro, comprovante apresentado no balcao, ajuste de atendimento."
                  className="rounded-2xl border-slate-200 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                />
              </div>

              {formasPagamento.length === 0 || contasFinanceiras.length === 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  Nao foi possivel carregar todas as opcoes operacionais deste recebimento.
                </div>
              ) : null}

              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
              ) : null}
            </>
          )}
        </div>

        <DialogFooter className="border-t border-slate-200 px-6 py-4">
          <DialogClose asChild>
            <Button variant="outline" disabled={saving}>
              Cancelar
            </Button>
          </DialogClose>
          <Button
            className="rounded-2xl"
            onClick={() => void handleSubmit()}
            disabled={!alvo || saving || formasPagamento.length === 0 || contasFinanceiras.length === 0}
          >
            {saving ? "Registrando..." : "Confirmar recebimento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ReceberContaInternaModal;
