import type { CafeVendaRecibo } from "@/lib/cafe/venda-recibo";

type CafeVendaReciboPrintProps = {
  venda: CafeVendaRecibo;
};

function brl(value: number) {
  return (value / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR");
}

export default function CafeVendaReciboPrint({ venda }: CafeVendaReciboPrintProps) {
  return (
    <div className="space-y-6 print:space-y-4">
      <div className="rounded-[24px] border border-[#eadfcd] bg-[linear-gradient(180deg,#fffefb_0%,#fff8ef_100%)] px-6 py-6 print:rounded-none print:border-slate-300 print:bg-white print:px-0 print:py-0">
        <div className="flex flex-col gap-4 border-b border-dashed border-[#d7c3a4] pb-5 print:border-slate-300">
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8c6640] print:text-slate-500">
              Ballet Cafe
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 print:text-xl">
              Recibo da venda
            </h1>
            <p className="text-sm leading-6 text-slate-600">
              Comprovante operacional para consulta e reimpressao da venda registrada.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[18px] border border-[#eadfcd] bg-white px-4 py-3 print:border-slate-300">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Numero
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-950">{venda.numero_legivel}</div>
            </div>
            <div className="rounded-[18px] border border-[#eadfcd] bg-white px-4 py-3 print:border-slate-300">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Data e hora
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-950">
                {formatDateTime(venda.created_at)}
              </div>
            </div>
            <div className="rounded-[18px] border border-[#eadfcd] bg-white px-4 py-3 print:border-slate-300">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Forma de pagamento
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-950">
                {venda.forma_pagamento ?? "Nao informado"}
              </div>
            </div>
            <div className="rounded-[18px] border border-[#eadfcd] bg-white px-4 py-3 print:border-slate-300">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Total
              </div>
              <div className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
                {brl(venda.total_centavos)}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="rounded-[18px] border border-[#eadfcd] bg-white px-4 py-4 print:border-slate-300">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Comprador
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-950">
                {venda.comprador.nome ?? "Nao identificado"}
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Perfil resolvido: {venda.perfil_resolvido ?? "Nao identificado"}
              </p>
            </div>

            <div className="rounded-[18px] border border-[#eadfcd] bg-white px-4 py-4 print:border-slate-300">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Tabela de preco
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-950">
                {venda.tabela_preco ?? "Tabela padrao do Ballet Cafe"}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-[18px] border border-[#eadfcd] bg-white px-4 py-4 print:border-slate-300">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Centro de custo
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-950">
                {venda.centro_custo.nome ?? "Ballet Cafe"}
              </div>
            </div>

            <div className="rounded-[18px] border border-[#eadfcd] bg-white px-4 py-4 print:border-slate-300">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Competencia
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-950">
                {venda.competencia ?? "Nao aplicavel"}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-[18px] border border-[#eadfcd] bg-white print:border-slate-300">
          <div className="border-b border-[#f1e8db] px-4 py-3 print:border-slate-300">
            <div className="text-sm font-semibold text-slate-950">Itens da venda</div>
          </div>
          <div className="divide-y divide-[#f1e8db] print:divide-slate-300">
            {venda.itens.map((item, index) => (
              <div
                key={`${item.produto_id ?? "item"}-${index}`}
                className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_80px_120px_120px]"
              >
                <div>
                  <div className="text-sm font-medium text-slate-900">{item.produto_nome}</div>
                  {item.produto_id ? (
                    <div className="text-xs text-slate-500">Produto #{item.produto_id}</div>
                  ) : null}
                </div>
                <div className="text-sm text-slate-700 sm:text-right">{item.quantidade}x</div>
                <div className="text-sm text-slate-700 sm:text-right">
                  {brl(item.valor_unitario_centavos)}
                </div>
                <div className="text-sm font-semibold text-slate-950 sm:text-right">
                  {brl(item.subtotal_centavos)}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-[#f1e8db] px-4 py-4 print:border-slate-300">
            <div className="flex items-center justify-between text-base font-semibold text-slate-950">
              <span>Total</span>
              <span>{brl(venda.total_centavos)}</span>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-[18px] border border-[#eadfcd] bg-white px-4 py-4 print:border-slate-300">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Referencias correlatas
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <div className="text-xs font-medium text-slate-500">Cobranca</div>
              <div className="mt-1 text-sm font-semibold text-slate-950">
                {venda.cobranca_id ? `#${venda.cobranca_id}` : "Nao aplicavel"}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">Fatura</div>
              <div className="mt-1 text-sm font-semibold text-slate-950">
                {venda.fatura_id ? `#${venda.fatura_id}` : "Nao aplicavel"}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">Conta interna</div>
              <div className="mt-1 text-sm font-semibold text-slate-950">
                {venda.conta_interna_id ? `#${venda.conta_interna_id}` : "Nao aplicavel"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
