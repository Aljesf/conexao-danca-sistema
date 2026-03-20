"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatBRLFromCents } from "@/lib/formatters/money";
import { type LinhaCarteiraCanonica } from "@/lib/financeiro/carteira-operacional-canonica";
import { formatarDataLabel } from "@/lib/financeiro/creditoConexao/cobrancas";

type Props = {
  item: LinhaCarteiraCanonica;
  onRegistrarRecebimento?: (item: LinhaCarteiraCanonica) => void;
  onVincularFatura?: (item: LinhaCarteiraCanonica) => void;
};

function statusClassName(status: LinhaCarteiraCanonica["statusOperacional"]): string {
  if (status === "PAGO") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "VENCIDO") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function situacaoNeoFinClassName(situacao: LinhaCarteiraCanonica["situacaoNeoFin"]): string {
  if (situacao === "EM_COBRANCA_NEOFIN") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (situacao === "FATURA_SEM_NEOFIN") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
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
  const podeRegistrarRecebimento = item.statusOperacional !== "PAGO" && Boolean(onRegistrarRecebimento);
  const podeVincular = item.permiteVinculoManual && Boolean(onVincularFatura);
  const acaoPrimaria = podeVincular
    ? (
        <Button type="button" onClick={() => onVincularFatura?.(item)} className="w-full sm:w-auto">
          Vincular fatura oficial
        </Button>
      )
    : podeRegistrarRecebimento
      ? (
          <Button type="button" onClick={() => onRegistrarRecebimento?.(item)} className="w-full sm:w-auto">
            Registrar recebimento
          </Button>
        )
      : <ActionLink href={item.cobrancaUrl} label="Abrir cobranca" />;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">{item.pessoaLabel}</p>
              <p className="truncate text-sm text-slate-600">{item.origemLabel}</p>
              <p className="text-xs text-slate-500">Cobranca oficial #{item.cobrancaId}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClassName(item.statusOperacional)}`}>
                {item.statusOperacional}
              </span>
              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                {item.origemTipo ?? "SEM_ORIGEM"}{item.origemSubtipo ? ` / ${item.origemSubtipo}` : ""}
              </span>
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${situacaoNeoFinClassName(item.situacaoNeoFin)}`}>
                {item.situacaoNeoFin}
              </span>
            </div>
          </div>

          <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Competencia</p>
              <p className="mt-1 font-medium text-slate-800">{item.competenciaLabel}</p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Vencimento</p>
              <p className="mt-1 font-medium text-slate-800">{formatarDataLabel(item.dataVencimento)}</p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Valor</p>
              <p className="mt-1 font-medium text-slate-800">{formatBRLFromCents(item.valorCentavos)}</p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Saldo</p>
              <p className="mt-1 font-medium text-slate-800">{formatBRLFromCents(item.saldoCentavos)}</p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Fatura vinculada</p>
              <p className="mt-1 font-medium text-slate-800">{item.faturaId ? `#${item.faturaId}` : "Sem fatura vinculada"}</p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Cobranca da fatura</p>
              <p className="mt-1 font-medium text-slate-800">{item.faturaCobrancaId ? `#${item.faturaCobrancaId}` : "Sem cobranca da fatura"}</p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Centro de custo</p>
              <p className="mt-1 font-medium text-slate-800">
                {item.centroCustoNome ? `${item.centroCustoCodigo ?? "--"} | ${item.centroCustoNome}` : "Sem centro de custo"}
              </p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Situacao NeoFin</p>
              <p className="mt-1 font-medium text-slate-800">{item.situacaoNeoFin}</p>
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
          {item.faturaUrl ? <ActionLink href={item.faturaUrl} label="Abrir fatura vinculada" /> : null}
          <ActionLink href={item.cobrancaUrl} label="Ver cobranca oficial" />
        </div>
      </div>
    </div>
  );
}
