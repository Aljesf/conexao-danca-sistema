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

function contextoClassName(contexto: LinhaCarteiraCanonica["contextoPrincipal"]): string {
  if (contexto === "ESCOLA") return "border-sky-200 bg-sky-50 text-sky-700";
  if (contexto === "CAFE") return "border-amber-200 bg-amber-50 text-amber-700";
  if (contexto === "LOJA") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function neofinBadge(item: LinhaCarteiraCanonica): { label: string; className: string } {
  if (item.houveGeracaoNeoFin) {
    return {
      label: "Cobranca NeoFin gerada",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (!item.possuiFaturaInterna) {
    return {
      label: "Sem fatura interna vinculada",
      className: "border-slate-200 bg-slate-50 text-slate-700",
    };
  }

  return {
    label: "Cobranca NeoFin nao gerada",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  };
}

function formatarAlunos(item: LinhaCarteiraCanonica["itens"][number]): string {
  if (item.alunoNomes.length === 0) return "Sem aluno identificado";
  return item.alunoNomes.join(", ");
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

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

export function CobrancaRow({ item, onRegistrarRecebimento, onVincularFatura }: Props) {
  const podeRegistrarRecebimento = item.statusOperacional !== "PAGO" && Boolean(onRegistrarRecebimento);
  const podeVincular = item.permiteVinculoManual && Boolean(onVincularFatura);
  const neofin = neofinBadge(item);

  const acaoPrimaria = podeVincular ? (
    <Button type="button" onClick={() => onVincularFatura?.(item)} className="w-full sm:w-auto">
      Vincular fatura interna
    </Button>
  ) : podeRegistrarRecebimento ? (
    <Button type="button" onClick={() => onRegistrarRecebimento?.(item)} className="w-full sm:w-auto">
      Registrar recebimento
    </Button>
  ) : (
    <ActionLink href={item.cobrancaUrl} label="Abrir cobranca oficial" />
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-lg font-semibold text-slate-950">{item.pessoaNome}</p>
              <p className="text-sm font-medium text-slate-700">Cobranca oficial #{item.cobrancaId}</p>
              <p className="mt-1 text-sm text-slate-500">
                Base da cobranca: conta interna
                {item.contaInternaId ? ` · ${item.contaInternaLabel}` : ""}
                {item.contaInternaDescricao ? ` · ${item.contaInternaDescricao}` : ""}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClassName(item.statusOperacional)}`}>
                {item.statusOperacional}
              </span>
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${contextoClassName(item.contextoPrincipal)}`}>
                {item.contextoPrincipal}
              </span>
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${neofin.className}`}>
                {neofin.label}
              </span>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetaCard label="Competencia" value={item.competenciaLabel} />
            <MetaCard label="Vencimento" value={formatarDataLabel(item.dataVencimento)} />
            <MetaCard label="Valor" value={formatBRLFromCents(item.valorCentavos)} />
            <MetaCard label="Saldo" value={formatBRLFromCents(item.saldoCentavos)} />
            <MetaCard
              label="Fatura interna"
              value={item.faturaContaInternaId ? `#${item.faturaContaInternaId}` : "Sem fatura interna vinculada"}
            />
            <MetaCard
              label="Cobranca da fatura"
              value={item.cobrancaFaturaId ? `#${item.cobrancaFaturaId}` : "Sem cobranca da fatura"}
            />
            <MetaCard
              label="Cobranca NeoFin"
              value={item.houveGeracaoNeoFin ? "Gerada" : "Nao gerada"}
            />
            <MetaCard
              label="Centro de custo"
              value={item.centroCustoNome ? `${item.centroCustoCodigo ?? "--"} | ${item.centroCustoNome}` : "Sem centro de custo"}
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Itens da cobranca</p>
                <p className="text-sm text-slate-600">
                  Composicao: matriculas, lancamentos e ajustes da conta interna.
                </p>
              </div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{item.itens.length} item(ns)</p>
            </div>

            <div className="mt-4 space-y-3">
              {item.itens.map((detalhe, index) => (
                <div key={`${item.cobrancaId}-${detalhe.lancamentoId ?? index}-${index}`} className="rounded-xl border border-white bg-white px-3 py-3 shadow-sm">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900">{detalhe.tipoItem ?? "Lancamento da conta interna"}</p>
                      <p className="text-sm text-slate-700">{detalhe.descricao ?? "Item sem descricao detalhada"}</p>
                      <p className="text-xs text-slate-500">Aluno(s): {formatarAlunos(detalhe)}</p>
                      <p className="text-xs text-slate-500">
                        {detalhe.referenciaItem ? `Referencia ${detalhe.referenciaItem}` : "Sem referencia detalhada"}
                        {detalhe.lancamentoId ? ` · Lancamento #${detalhe.lancamentoId}` : ""}
                      </p>
                    </div>
                    <div className="text-sm font-semibold text-slate-900">{formatBRLFromCents(detalhe.valorCentavos)}</div>
                  </div>
                </div>
              ))}
            </div>

            {item.neofinInvoiceId ? (
              <p className="mt-4 text-xs text-slate-500">NeoFin invoice: {item.neofinInvoiceId}</p>
            ) : null}
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 lg:w-auto lg:min-w-[230px]">
          {acaoPrimaria}
          {podeRegistrarRecebimento && podeVincular ? (
            <Button type="button" variant="secondary" onClick={() => onRegistrarRecebimento?.(item)}>
              Registrar recebimento
            </Button>
          ) : null}
          {item.faturaUrl ? <ActionLink href={item.faturaUrl} label="Abrir fatura interna" /> : null}
          <ActionLink href={item.cobrancaUrl} label="Ver cobranca oficial" />
        </div>
      </div>
    </div>
  );
}
