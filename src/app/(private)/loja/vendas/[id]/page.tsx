"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Venda = {
  id: number;
  cliente_pessoa_id: number;
  cobranca_id?: number | null;
  cliente?: {
    id: number;
    nome?: string | null;
    nome_fantasia?: string | null;
    cpf?: string | null;
    cnpj?: string | null;
  } | null;
  tipo_venda: string;
  valor_total_centavos: number;
  desconto_centavos: number;
  forma_pagamento: string;
  status_pagamento: string;
  status_venda: string;
  data_venda: string;
  data_vencimento?: string | null;
  observacoes?: string | null;
  observacao_vendedor?: string | null;
  cancelada_em?: string | null;
  motivo_cancelamento?: string | null;
};

type Cobranca = {
  id: number;
  valor_centavos: number;
  vencimento?: string | null;
  data_pagamento?: string | null;
  status?: string | null;
  metodo_pagamento?: string | null;
} | null;

type Recebimento = {
  id: number;
  valor_centavos: number;
  data_pagamento: string;
  metodo_pagamento: string;
  origem_sistema?: string | null;
  observacoes?: string | null;
};

type Item = {
  id: number;
  produto_id: number;
  quantidade: number;
  preco_unitario_centavos: number;
  total_centavos: number;
  beneficiario_pessoa_id?: number | null;
  observacoes?: string | null;
  produto?: {
    id: number;
    nome?: string | null;
    codigo?: string | null;
    unidade?: string | null;
  } | null;
  beneficiario?: {
    id: number;
    nome?: string | null;
    nome_fantasia?: string | null;
  } | null;
};

type ApiResponse<T = any> = {
  ok?: boolean;
  error?: string;
  data?: T;
};

export default function VendaDetalhePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const vendaId = params?.id ? String(params.id) : "";
  const [venda, setVenda] = useState<Venda | null>(null);
  const [itens, setItens] = useState<Item[]>([]);
  const [cobranca, setCobranca] = useState<Cobranca>(null);
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [mensagem, setMensagem] = useState<string | null>(null);

  async function carregar() {
    if (!vendaId || Number.isNaN(Number(vendaId))) {
      setMensagem("ID de venda inválido.");
      setVenda(null);
      setItens([]);
      setCobranca(null);
      setRecebimentos([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setMensagem(null);
    try {
      const res = await fetch(`/api/loja/vendas/${vendaId}`, { cache: "no-store" });
      const json: ApiResponse<{
        venda: Venda;
        itens: Item[];
        cobranca?: Cobranca;
        recebimentos?: Recebimento[];
      }> = await res.json();
      if (!res.ok || !json.ok || !json.data) {
        setMensagem(json.error || "Erro ao carregar venda.");
        setVenda(null);
        setItens([]);
        setCobranca(null);
        setRecebimentos([]);
        return;
      }
      setVenda(json.data.venda as Venda);
      setItens(json.data.itens as Item[]);
      setCobranca((json.data as any)?.cobranca ?? null);
      setRecebimentos((json.data as any)?.recebimentos ?? []);
    } catch (err) {
      console.error("Erro ao carregar venda:", err);
      setMensagem("Erro inesperado ao carregar venda.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendaId]);

  async function cancelarVenda() {
    if (!window.confirm("Cancelar esta venda?")) return;
    try {
      const res = await fetch(`/api/loja/vendas/${vendaId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "cancelar" }),
      });
      const json: ApiResponse = await res.json();
      if (!res.ok || !json.ok) {
        setMensagem(json.error || "Erro ao cancelar venda.");
        return;
      }
      await carregar();
      setMensagem("Venda cancelada com sucesso.");
    } catch (err) {
      console.error("Erro ao cancelar venda:", err);
      setMensagem("Erro inesperado ao cancelar venda.");
    }
  }

  const formatCurrency = (cents: number) =>
    (cents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    });

  const subtotal = itens.reduce((sum, i) => sum + i.total_centavos, 0);
  const total = venda ? Math.max(subtotal - venda.desconto_centavos, 0) : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      <header className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Detalhe da venda</h1>
            <p className="text-sm text-gray-600">
              Recibo simplificado da venda #{vendaId} na AJ Dance Store.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-md border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
              onClick={() => router.push("/loja/caixa")}
            >
              Voltar ao caixa
            </button>
            <button
              type="button"
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
              onClick={() => window.print()}
            >
              Imprimir
            </button>
          </div>
        </div>
      </header>

      {mensagem && (
        <div className="text-sm border rounded-md px-3 py-2 bg-amber-50 border-amber-200 text-amber-800">
          {mensagem}
        </div>
      )}

      {loading && <p className="text-sm text-gray-500">Carregando...</p>}
      {!loading && venda && (
        <>
          <section className="bg-white border rounded-xl shadow-sm p-4 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-sm font-semibold">
                  Venda #{venda.id} — {new Date(venda.data_venda).toLocaleString("pt-BR")}
                </h2>
                <p className="text-xs text-gray-500">
                  Cliente:{" "}
                  {venda.cliente?.nome_fantasia ||
                    venda.cliente?.nome ||
                    `Pessoa ${venda.cliente_pessoa_id}`}
                </p>
              </div>
              <div className="flex gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full border bg-gray-50">
                  {venda.tipo_venda}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full border bg-gray-50">
                  {venda.status_pagamento}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full border bg-gray-50">
                  {venda.status_venda}
                </span>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-2 text-sm text-gray-700">
              <div>
                <span className="font-medium">Forma de pagamento: </span>
                {venda.forma_pagamento}
              </div>
              <div>
                <span className="font-medium">Data de vencimento: </span>
                {venda.data_vencimento || "—"}
              </div>
              <div>
                <span className="font-medium">Observacoes: </span>
                {venda.observacoes || "—"}
              </div>
              <div>
                <span className="font-medium">Obs. vendedor: </span>
                {venda.observacao_vendedor || "—"}
              </div>
            </div>
          </section>

          <section className="bg-white border rounded-xl shadow-sm p-4 space-y-2">
            <h3 className="text-sm font-semibold">Financeiro</h3>
            <div className="text-xs text-gray-700 space-y-1">
              <div>
                <span className="font-medium">Status pagamento: </span>
                {venda.status_pagamento}
              </div>
              {cobranca && (
                <>
                  <div>
                    <span className="font-medium">Cobrança:</span>{" "}
                    #{cobranca.id} —{" "}
                    {formatCurrency(cobranca.valor_centavos)}
                  </div>
                  <div>
                    <span className="font-medium">Vencimento:</span>{" "}
                    {cobranca.vencimento || "—"}
                  </div>
                  <div>
                    <span className="font-medium">Status cobrança:</span>{" "}
                    {cobranca.status || "—"}
                  </div>
                  {cobranca.data_pagamento && (
                    <div>
                      <span className="font-medium">Data pagamento (cobrança):</span>{" "}
                      {cobranca.data_pagamento}
                    </div>
                  )}
                </>
              )}
              {recebimentos && recebimentos.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="font-medium">Recebimentos:</div>
                  <ul className="list-disc list-inside space-y-1 text-gray-800">
                    {recebimentos.map((r) => (
                      <li key={r.id}>
                        {formatCurrency(r.valor_centavos)} — {r.metodo_pagamento} em{" "}
                        {new Date(r.data_pagamento).toLocaleString("pt-BR")}{" "}
                        {r.origem_sistema ? `(${r.origem_sistema})` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {!cobranca && (!recebimentos || recebimentos.length === 0) && (
                <p className="text-gray-500">Sem registros financeiros vinculados.</p>
              )}
            </div>
          </section>

          <section className="bg-white border rounded-xl shadow-sm p-4 space-y-3">
            <h3 className="text-sm font-semibold">Itens da venda</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Produto</th>
                    <th className="px-3 py-2 text-right">Qtd</th>
                    <th className="px-3 py-2 text-right">Preco unit.</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2 text-left">Beneficiario</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-4 text-center text-xs text-gray-500"
                      >
                        Nenhum item encontrado.
                      </td>
                    </tr>
                  )}
                  {itens.map((i) => (
                    <tr key={i.id} className="border-t">
                      <td className="px-3 py-2">
                        <div className="text-gray-800">
                          {i.produto?.nome || `Produto ${i.produto_id}`}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {i.observacoes || i.produto?.codigo || ""}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700">
                        {i.quantidade}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700">
                        {formatCurrency(i.preco_unitario_centavos)}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-800">
                        {formatCurrency(i.total_centavos)}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {i.beneficiario?.nome_fantasia ||
                          i.beneficiario?.nome ||
                          (i.beneficiario_pessoa_id
                            ? `Pessoa ${i.beneficiario_pessoa_id}`
                            : "—")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end text-sm text-gray-800">
              <div className="space-y-1 w-64">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Desconto</span>
                  <span>{formatCurrency(venda.desconto_centavos)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </section>

          {venda.status_venda === "ATIVA" && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={cancelarVenda}
                className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700"
              >
                Cancelar venda
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
