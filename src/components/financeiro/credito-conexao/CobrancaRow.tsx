"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatBRLFromCents } from "@/lib/formatters/money";
import { formatarDataLabel, type CobrancaOperacionalItem } from "@/lib/financeiro/creditoConexao/cobrancas";

type Props = {
  item: CobrancaOperacionalItem;
  onRegistrarRecebimento?: (item: CobrancaOperacionalItem) => void;
};

function statusClassName(status: CobrancaOperacionalItem["status_operacional"]): string {
  switch (status) {
    case "PAGO":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "PENDENTE_VENCIDO":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function statusLabel(status: CobrancaOperacionalItem["status_operacional"]): string {
  switch (status) {
    case "PAGO":
      return "Pago";
    case "PENDENTE_VENCIDO":
      return "Pendente vencido";
    default:
      return "Pendente a vencer";
  }
}

function neofinClassName(status: CobrancaOperacionalItem["neofin_status"]): string {
  switch (status) {
    case "LIQUIDADA":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "EM_COBRANCA":
      return "border-sky-200 bg-sky-50 text-sky-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function ActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
    >
      {label}
    </Link>
  );
}

export function CobrancaRow({ item, onRegistrarRecebimento }: Props) {
  const acaoPrimaria =
    item.status_operacional !== "PAGO" && onRegistrarRecebimento
      ? (
          <Button type="button" onClick={() => onRegistrarRecebimento(item)} className="w-full sm:w-auto">
            Registrar recebimento
          </Button>
        )
      : item.fatura_url
        ? <ActionLink href={item.fatura_url} label="Abrir fatura" />
        : item.cobranca_url
          ? <ActionLink href={item.cobranca_url} label="Ver detalhe" />
          : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">{item.pessoa_label}</p>
              <p className="truncate text-sm text-slate-600">{item.origem_referencia_label}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClassName(item.status_operacional)}`}>
                {statusLabel(item.status_operacional)}
              </span>
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${neofinClassName(item.neofin_status)}`}>
                {item.neofin_label}
              </span>
            </div>
          </div>

          <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Vencimento</p>
              <p className="mt-1 font-medium text-slate-800">{formatarDataLabel(item.data_vencimento)}</p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Valor</p>
              <p className="mt-1 font-medium text-slate-800">{formatBRLFromCents(item.valor_centavos)}</p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Status bruto</p>
              <p className="mt-1 font-medium text-slate-800">{item.status_cobranca ?? "-"}</p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Atraso</p>
              <p className="mt-1 font-medium text-slate-800">
                {item.dias_em_atraso > 0 ? `${item.dias_em_atraso} dias` : "Sem atraso"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 lg:w-auto lg:min-w-[220px]">
          {acaoPrimaria}
          {item.fatura_url && item.status_operacional !== "PAGO" ? <ActionLink href={item.fatura_url} label="Abrir fatura" /> : null}
          {item.cobranca_url ? <ActionLink href={item.cobranca_url} label="Ver detalhe" /> : null}
          {item.link_pagamento ? (
            <a
              href={item.link_pagamento}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Abrir boleto
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
