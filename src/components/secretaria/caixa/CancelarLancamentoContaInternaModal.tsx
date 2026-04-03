"use client";

import { useEffect, useState } from "react";
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
import type { SecretariaContaInternaDetalhe, SecretariaContaLancamentoResumo } from "./types";

type CancelamentoResponse = {
  ok: true;
  detalhe: SecretariaContaInternaDetalhe;
  lancamento: SecretariaContaLancamentoResumo | null;
  detalhe?: string;
  error?: string;
};

type Props = {
  open: boolean;
  lancamento: SecretariaContaLancamentoResumo | null;
  onClose: () => void;
  onSuccess: (payload: CancelamentoResponse) => Promise<void> | void;
};

function getFriendlyCancelError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("motivo_cancelamento")) {
    return "Informe o motivo do cancelamento para continuar.";
  }

  if (normalized.includes("ja_cancelado")) {
    return "Esse lancamento ja foi cancelado anteriormente.";
  }

  if (normalized.includes("nao_pode_cancelar") || normalized.includes("ja_recebido")) {
    return "Nao e permitido cancelar um lancamento que ja tenha recebimento registrado.";
  }

  return "Nao foi possivel cancelar o lancamento agora. Tente novamente ou chame a administracao.";
}

export function CancelarLancamentoContaInternaModal({ open, lancamento, onClose, onSuccess }: Props) {
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMotivo("");
    setError(null);
  }, [open, lancamento?.id]);

  async function handleSubmit() {
    if (!lancamento) return;

    if (!motivo.trim()) {
      setError("Informe o motivo do cancelamento para continuar.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/secretaria/caixa/cancelar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lancamento_id: lancamento.id,
          motivo_cancelamento: motivo.trim(),
        }),
      });

      const body = (await response.json().catch(() => null)) as
        | (CancelamentoResponse & { detalhe?: string; error?: string; ok?: boolean })
        | null;

      if (!response.ok || !body?.ok) {
        throw new Error(body?.detalhe ?? body?.error ?? `http_${response.status}`);
      }

      await onSuccess(body);
      onClose();
    } catch (requestError) {
      setError(
        getFriendlyCancelError(
          requestError instanceof Error ? requestError.message : "erro_cancelamento_desconhecido",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : null)}>
      <DialogContent className="max-w-2xl p-0">
        <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#fff3eb_0%,#ffffff_52%,#f6faf7_100%)] px-6 py-5">
          <DialogHeader>
            <DialogTitle>Cancelar lancamento da conta interna</DialogTitle>
            <DialogDescription>
              O cancelamento e logico, auditavel e remove o item do saldo operacional exibido.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-5 px-6 py-6">
          {!lancamento ? (
            <div className="text-sm text-slate-500">Selecione um lancamento para continuar.</div>
          ) : (
            <>
              <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-5">
                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Lancamento selecionado</div>
                <div className="mt-2 text-lg font-semibold text-slate-950">{lancamento.descricao}</div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                  <span className="rounded-full bg-slate-100 px-3 py-1">{lancamento.origem_sistema}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1">#{lancamento.id}</span>
                  {lancamento.fatura_id ? (
                    <span className="rounded-full bg-slate-100 px-3 py-1">Fatura #{lancamento.fatura_id}</span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">Sem fatura vinculada</span>
                  )}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Valor original</div>
                  <div className="mt-1 text-base font-semibold text-slate-950">
                    {formatBRLFromCents(lancamento.valor_original_centavos)}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Valor pago</div>
                  <div className="mt-1 text-base font-semibold text-slate-950">
                    {formatBRLFromCents(lancamento.valor_pago_centavos)}
                  </div>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-amber-700">Saldo atual</div>
                  <div className="mt-1 text-base font-semibold text-amber-800">
                    {formatBRLFromCents(lancamento.saldo_restante_centavos)}
                  </div>
                </div>
              </div>

              <div className="space-y-2 rounded-[28px] border border-slate-200 bg-white px-5 py-5">
                <label className="text-sm font-medium text-slate-700">Motivo do cancelamento</label>
                <Textarea
                  value={motivo}
                  onChange={(event) => setMotivo(event.target.value)}
                  rows={4}
                  placeholder="Explique por que este lancamento deve ser retirado do fluxo operacional."
                  className="rounded-2xl border-slate-200 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                />
                <p className="text-sm text-slate-500">
                  O motivo fica registrado para auditoria e para revisao posterior da secretaria.
                </p>
              </div>
            </>
          )}

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
          ) : null}
        </div>

        <DialogFooter className="border-t border-slate-200 px-6 py-4">
          <DialogClose asChild>
            <Button variant="secondary" disabled={saving}>
              Fechar
            </Button>
          </DialogClose>
          <Button
            onClick={handleSubmit}
            disabled={!lancamento || saving}
            className="bg-rose-600 hover:bg-rose-700"
          >
            {saving ? "Cancelando..." : "Confirmar cancelamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CancelarLancamentoContaInternaModal;
