"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatBRLFromCents } from "@/lib/formatters/money";
import { formatarDataLabel, type CobrancaOperacionalItem } from "@/lib/financeiro/creditoConexao/cobrancas";

type Props = {
  item: CobrancaOperacionalItem;
  onRegistrarRecebimento?: (item: CobrancaOperacionalItem) => void;
  onVincularFatura?: (item: CobrancaOperacionalItem) => void;
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

function tipoClassName(tipo: CobrancaOperacionalItem["tipo_cobranca"]): string {
  switch (tipo) {
    case "AVULSA":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "MENSALIDADE":
      return "border-slate-200 bg-slate-50 text-slate-700";
    default:
      return "border-violet-200 bg-violet-50 text-violet-700";
  }
}

function neofinClassName(situacao: CobrancaOperacionalItem["neofin_situacao_operacional"]): string {
  switch (situacao) {
    case "VINCULADA":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "FALHA_INTEGRACAO":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "NAO_VINCULADA":
      return "border-slate-200 bg-slate-50 text-slate-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-500";
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

export function CobrancaRow({ item, onRegistrarRecebimento, onVincularFatura }: Props) {
  const podeVincular = Boolean(onVincularFatura)
    && (item.permite_vinculo_manual
      || item.neofin_situacao_operacional === "NAO_VINCULADA"
      || item.neofin_situacao_operacional === "FALHA_INTEGRACAO");
  const podeRegistrarRecebimento = item.status_operacional !== "PAGO"
    && item.cobranca_fonte === "COBRANCA"
    && Boolean(onRegistrarRecebimento);
  const acaoPrimariaTipo = podeVincular
    ? "VINCULAR"
    : podeRegistrarRecebimento
      ? "RECEBER"
      : item.fatura_url
        ? "FATURA"
        : item.cobranca_url
          ? "DETALHE"
          : "NENHUMA";

  const acaoPrimaria = acaoPrimariaTipo === "VINCULAR"
    ? (
        <Button type="button" onClick={() => onVincularFatura?.(item)} className="w-full sm:w-auto">
          Vincular a fatura oficial
        </Button>
      )
    : acaoPrimariaTipo === "RECEBER"
      ? (
          <Button type="button" onClick={() => onRegistrarRecebimento?.(item)} className="w-full sm:w-auto">
            Registrar recebimento
          </Button>
        )
      : acaoPrimariaTipo === "FATURA" && item.fatura_url
        ? <ActionLink href={item.fatura_url} label="Abrir fatura" />
        : acaoPrimariaTipo === "DETALHE" && item.cobranca_url
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
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tipoClassName(item.tipo_cobranca)}`}>
                {item.tipo_cobranca_label}
              </span>
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${neofinClassName(item.neofin_situacao_operacional)}`}>
                {item.neofin_situacao_label}
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
              <p className="text-xs uppercase tracking-wide text-slate-500">Fatura vinculada</p>
              <p className="mt-1 font-medium text-slate-800">
                {item.fatura_id
                  ? `#${item.fatura_id}${item.fatura_competencia ? ` - ${item.fatura_competencia}` : ""}`
                  : "Sem fatura vinculada"}
              </p>
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
          {podeRegistrarRecebimento && podeVincular ? (
            <Button type="button" variant="secondary" onClick={() => onRegistrarRecebimento?.(item)}>
              Registrar recebimento
            </Button>
          ) : null}
          {item.fatura_url && acaoPrimariaTipo !== "FATURA" ? (
            <ActionLink href={item.fatura_url} label="Abrir fatura vinculada" />
          ) : null}
          {item.cobranca_url && acaoPrimariaTipo !== "DETALHE" ? (
            <ActionLink href={item.cobranca_url} label="Ver cobranca vinculada" />
          ) : null}
          {item.link_pagamento ? (
            <a
              href={item.link_pagamento}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Abrir pagamento NeoFin
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
