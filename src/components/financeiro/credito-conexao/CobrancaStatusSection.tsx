"use client";

import { formatBRLFromCents } from "@/lib/formatters/money";
import { type CobrancaOperacionalItem } from "@/lib/financeiro/creditoConexao/cobrancas";
import { CobrancaRow } from "./CobrancaRow";

type Props = {
  titulo: string;
  descricao: string;
  tipo: "pago" | "pendente_a_vencer" | "pendente_vencido";
  itens: CobrancaOperacionalItem[];
  onRegistrarRecebimento?: (item: CobrancaOperacionalItem) => void;
};

function calcularTotal(tipo: Props["tipo"], itens: CobrancaOperacionalItem[]): number {
  return itens.reduce((acc, item) => {
    if (tipo === "pago") {
      return acc + item.valor_pago_centavos;
    }
    return acc + item.saldo_aberto_centavos;
  }, 0);
}

function toneClassName(tipo: Props["tipo"]): string {
  switch (tipo) {
    case "pago":
      return "border-emerald-100 bg-emerald-50";
    case "pendente_vencido":
      return "border-rose-100 bg-rose-50";
    default:
      return "border-amber-100 bg-amber-50";
  }
}

export function CobrancaStatusSection({ titulo, descricao, tipo, itens, onRegistrarRecebimento }: Props) {
  const total = calcularTotal(tipo, itens);

  return (
    <section className={`rounded-xl border p-4 ${toneClassName(tipo)}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{titulo}</h3>
          <p className="text-sm text-slate-600">{descricao}</p>
        </div>
        <div className="text-sm text-slate-700">
          <span className="font-semibold">{itens.length}</span> item(ns) •{" "}
          <span className="font-semibold">{formatBRLFromCents(total)}</span>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {itens.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white/80 px-4 py-5 text-sm text-slate-500">
            Nenhuma cobranca nesta faixa operacional.
          </div>
        ) : (
          itens.map((item) => (
            <CobrancaRow
              key={`${tipo}-${item.cobranca_id}`}
              item={item}
              onRegistrarRecebimento={onRegistrarRecebimento}
            />
          ))
        )}
      </div>
    </section>
  );
}
