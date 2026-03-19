"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionDropdown, type ActionDropdownItem } from "@/components/ui/ActionDropdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDateISO, formatDateTimeISO } from "@/lib/formatters/date";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shadcn/ui";

type ToastState = { tipo: "sucesso" | "erro"; mensagem: string } | null;

type ActionResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
};

type Props = {
  cobrancaId: number;
  descricao?: string | null;
  origemLabel?: string | null;
  status?: string | null;
  vencimento?: string | null;
  vencimentoOriginal?: string | null;
  vencimentoAjustadoEm?: string | null;
  vencimentoAjusteMotivo?: string | null;
  canceladaEm?: string | null;
  cancelamentoTipo?: string | null;
  matriculaStatus?: string | null;
  matriculaCancelamentoTipo?: string | null;
  compact?: boolean;
  mode?: "buttons" | "dropdown";
  extraDropdownItems?: ActionDropdownItem[];
  showStatusHints?: boolean;
  onSuccess?: () => Promise<void> | void;
};

const STATUSS_QUITADOS = new Set([
  "PAGO",
  "PAGA",
  "RECEBIDO",
  "RECEBIDA",
  "LIQUIDADO",
  "LIQUIDADA",
  "QUITADO",
  "QUITADA",
]);

const TIPOS_CANCELAMENTO = [
  { value: "CANCELAMENTO_OPERACIONAL", label: "Cancelamento operacional" },
  { value: "CANCELAMENTO_POR_MATRICULA_CANCELADA", label: "Matricula cancelada" },
  { value: "CANCELAMENTO_POR_AJUSTE_SISTEMA", label: "Ajuste de sistema" },
  { value: "OUTRO", label: "Outro" },
] as const;

function localTodayIso(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function upper(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function targetLabel(cobrancaId: number, descricao: string | null | undefined, origemLabel: string | null | undefined) {
  const resumo = descricao?.trim() || origemLabel?.trim() || "Cobranca selecionada";
  return `#${cobrancaId} - ${resumo}`;
}

export function CobrancaOperacionalActions({
  cobrancaId,
  descricao = null,
  origemLabel = null,
  status = null,
  vencimento = null,
  vencimentoOriginal = null,
  vencimentoAjustadoEm = null,
  vencimentoAjusteMotivo = null,
  canceladaEm = null,
  cancelamentoTipo = null,
  matriculaStatus = null,
  matriculaCancelamentoTipo = null,
  compact = false,
  mode = "buttons",
  extraDropdownItems = [],
  showStatusHints = true,
  onSuccess,
}: Props) {
  const router = useRouter();
  const [toast, setToast] = useState<ToastState>(null);
  const [alterarOpen, setAlterarOpen] = useState(false);
  const [cancelarOpen, setCancelarOpen] = useState(false);
  const [novoVencimento, setNovoVencimento] = useState(vencimento ?? localTodayIso());
  const [motivoVencimento, setMotivoVencimento] = useState("");
  const [motivoCancelamento, setMotivoCancelamento] = useState("");
  const [tipoCancelamento, setTipoCancelamento] =
    useState<(typeof TIPOS_CANCELAMENTO)[number]["value"]>("CANCELAMENTO_OPERACIONAL");
  const [loadingAction, setLoadingAction] = useState<null | "alterar" | "cancelar">(null);

  const statusNormalizado = upper(status);
  const bloqueada = Boolean(canceladaEm) || statusNormalizado === "CANCELADA";
  const quitada = STATUSS_QUITADOS.has(statusNormalizado);
  const podeOperar = !bloqueada && !quitada;
  const matriculaCancelada = upper(matriculaStatus) === "CANCELADA";
  const actionButtonClass = compact ? "h-8 px-2 text-xs" : "";
  const dropdownItems: ActionDropdownItem[] = [
    {
      key: "alterar-vencimento",
      label: "Alterar vencimento",
      disabled: !podeOperar || loadingAction !== null,
      onSelect: () => setAlterarOpen(true),
    },
    {
      key: "cancelar-titulo",
      label: "Cancelar titulo",
      tone: "danger",
      disabled: !podeOperar || loadingAction !== null,
      onSelect: () => setCancelarOpen(true),
    },
    ...extraDropdownItems,
  ];

  useEffect(() => {
    setNovoVencimento(vencimento ?? localTodayIso());
  }, [vencimento]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  async function concluirComRefresh(callback?: () => Promise<void> | void) {
    if (callback) {
      await callback();
    }
    startTransition(() => {
      router.refresh();
    });
  }

  async function alterarVencimento() {
    if (!novoVencimento) {
      setToast({ tipo: "erro", mensagem: "Informe a nova data de vencimento." });
      return;
    }
    if (!motivoVencimento.trim()) {
      setToast({ tipo: "erro", mensagem: "Informe o motivo da alteracao de vencimento." });
      return;
    }

    setLoadingAction("alterar");
    try {
      const response = await fetch(`/api/financeiro/cobrancas/${cobrancaId}/alterar-vencimento`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          novoVencimento,
          motivo: motivoVencimento.trim(),
        }),
      });
      const json = (await response.json().catch(() => null)) as ActionResponse | null;
      if (!response.ok || !json?.ok) {
        throw new Error(json?.message ?? json?.error ?? "falha_alterar_vencimento");
      }

      setAlterarOpen(false);
      setMotivoVencimento("");
      setToast({ tipo: "sucesso", mensagem: `Vencimento da cobranca #${cobrancaId} atualizado.` });
      await concluirComRefresh(onSuccess);
    } catch (error) {
      setToast({
        tipo: "erro",
        mensagem: error instanceof Error ? error.message : "Nao foi possivel alterar o vencimento.",
      });
    } finally {
      setLoadingAction(null);
    }
  }

  async function cancelarTitulo() {
    if (!motivoCancelamento.trim()) {
      setToast({ tipo: "erro", mensagem: "Informe o motivo do cancelamento." });
      return;
    }

    setLoadingAction("cancelar");
    try {
      const response = await fetch(`/api/financeiro/cobrancas/${cobrancaId}/cancelar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          motivo: motivoCancelamento.trim(),
          tipoCancelamento,
        }),
      });
      const json = (await response.json().catch(() => null)) as ActionResponse | null;
      if (!response.ok || !json?.ok) {
        throw new Error(json?.message ?? json?.error ?? "falha_cancelar_cobranca");
      }

      setCancelarOpen(false);
      setMotivoCancelamento("");
      setToast({ tipo: "sucesso", mensagem: `Cobranca #${cobrancaId} cancelada com historico.` });
      await concluirComRefresh(onSuccess);
    } catch (error) {
      setToast({
        tipo: "erro",
        mensagem: error instanceof Error ? error.message : "Nao foi possivel cancelar a cobranca.",
      });
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <>
      <div className={compact ? "flex flex-wrap justify-end gap-2" : "space-y-3"}>
        {showStatusHints && matriculaCancelada ? (
          <div className="text-xs text-amber-700">
            Matricula cancelada{matriculaCancelamentoTipo ? ` - ${matriculaCancelamentoTipo}` : ""}. Avalie o cancelamento manual deste titulo.
          </div>
        ) : null}

        {mode === "dropdown" ? (
          <div className={compact ? "flex justify-end" : "flex"}>
            <ActionDropdown items={dropdownItems} compact={compact} />
          </div>
        ) : (
          <div className={compact ? "flex flex-wrap justify-end gap-2" : "flex flex-wrap gap-2"}>
            <Button
              type="button"
              variant="secondary"
              className={actionButtonClass}
              disabled={!podeOperar || loadingAction !== null}
              onClick={() => setAlterarOpen(true)}
            >
              Alterar vencimento
            </Button>
            <Button
              type="button"
              variant="secondary"
              className={`${actionButtonClass} ${compact ? "" : "border-rose-200 text-rose-700 hover:bg-rose-50"}`}
              disabled={!podeOperar || loadingAction !== null}
              onClick={() => setCancelarOpen(true)}
            >
              Cancelar titulo
            </Button>
          </div>
        )}

        {showStatusHints && !podeOperar ? (
          <div className="text-xs text-slate-500">
            {bloqueada ? "Cobranca ja cancelada." : "Cobranca quitada; alteracao e cancelamento ficam bloqueados."}
          </div>
        ) : null}
      </div>

      {toast ? (
        <div
          className={`fixed bottom-4 right-4 z-50 max-w-md rounded-xl border px-4 py-3 text-sm shadow-lg ${
            toast.tipo === "sucesso"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {toast.mensagem}
        </div>
      ) : null}

      <Dialog open={alterarOpen} onOpenChange={setAlterarOpen}>
        <DialogContent className="max-w-xl p-0">
          <DialogHeader>
            <div className="border-b border-slate-100 px-6 py-5">
              <DialogTitle>Alterar vencimento</DialogTitle>
              <DialogDescription>O vencimento original fica preservado e a alteracao gera historico auditavel.</DialogDescription>
            </div>
          </DialogHeader>
          <div className="space-y-4 p-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">Cobranca selecionada</div>
              <div className="mt-1 text-sm font-medium text-slate-900">{targetLabel(cobrancaId, descricao, origemLabel)}</div>
              <div className="mt-2 grid gap-2 text-xs text-slate-600 md:grid-cols-2">
                <div>Vencimento atual: {formatDateISO(vencimento)}</div>
                <div>Vencimento original: {formatDateISO(vencimentoOriginal)}</div>
                <div>Ultimo ajuste: {formatDateTimeISO(vencimentoAjustadoEm)}</div>
                <div>Motivo anterior: {vencimentoAjusteMotivo ?? "--"}</div>
              </div>
            </div>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Nova data</span>
              <input
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                type="date"
                value={novoVencimento}
                onChange={(event) => setNovoVencimento(event.target.value)}
              />
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Motivo</span>
              <Textarea
                className="min-h-28 border-slate-200 bg-white text-slate-900"
                value={motivoVencimento}
                onChange={(event) => setMotivoVencimento(event.target.value)}
                placeholder="Explique o motivo operacional da alteracao."
              />
            </label>

            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button type="button" variant="secondary" disabled={loadingAction !== null}>
                  Fechar
                </Button>
              </DialogClose>
              <Button type="button" onClick={() => void alterarVencimento()} disabled={loadingAction !== null || !podeOperar}>
                {loadingAction === "alterar" ? "Salvando..." : "Confirmar alteracao"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelarOpen} onOpenChange={setCancelarOpen}>
        <DialogContent className="max-w-xl p-0">
          <DialogHeader>
            <div className="border-b border-slate-100 px-6 py-5">
              <DialogTitle>Cancelar titulo</DialogTitle>
              <DialogDescription>O cancelamento e logico, preserva a cobranca e grava historico completo.</DialogDescription>
            </div>
          </DialogHeader>
          <div className="space-y-4 p-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">Cobranca selecionada</div>
              <div className="mt-1 text-sm font-medium text-slate-900">{targetLabel(cobrancaId, descricao, origemLabel)}</div>
              <div className="mt-2 grid gap-2 text-xs text-slate-600 md:grid-cols-2">
                <div>Status atual: {status ?? "--"}</div>
                <div>Vencimento atual: {formatDateISO(vencimento)}</div>
                <div>Cancelada em: {formatDateTimeISO(canceladaEm)}</div>
                <div>Tipo atual: {cancelamentoTipo ?? "--"}</div>
              </div>
            </div>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Tipo de cancelamento</span>
              <select
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                value={tipoCancelamento}
                onChange={(event) =>
                  setTipoCancelamento(event.target.value as (typeof TIPOS_CANCELAMENTO)[number]["value"])
                }
              >
                {TIPOS_CANCELAMENTO.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Motivo</span>
              <Textarea
                className="min-h-28 border-slate-200 bg-white text-slate-900"
                value={motivoCancelamento}
                onChange={(event) => setMotivoCancelamento(event.target.value)}
                placeholder="Explique o motivo do cancelamento."
              />
            </label>

            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button type="button" variant="secondary" disabled={loadingAction !== null}>
                  Fechar
                </Button>
              </DialogClose>
              <Button type="button" variant="secondary" onClick={() => void cancelarTitulo()} disabled={loadingAction !== null || !podeOperar}>
                {loadingAction === "cancelar" ? "Cancelando..." : "Confirmar cancelamento"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
