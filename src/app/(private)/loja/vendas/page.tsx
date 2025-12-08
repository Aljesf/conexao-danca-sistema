"use client";

import { useEffect, useMemo, useState } from "react";

type VendaTipo = "VENDA" | "CREDIARIO_INTERNO" | "ENTREGA_FIGURINO";
type StatusPagamento = "PENDENTE" | "PAGO" | "PARCIAL";
type StatusVenda = "ATIVA" | "CANCELADA";

type Venda = {
  id: number;
  cliente_pessoa_id: number;
  cliente_nome?: string | null;
  tipo_venda: VendaTipo;
  valor_total_centavos: number;
  desconto_centavos: number;
  forma_pagamento: string;
  status_pagamento: StatusPagamento;
  status_venda: StatusVenda;
  data_venda: string;
  data_vencimento?: string | null;
};

type ApiResponse<T = any> = {
  ok?: boolean;
  error?: string;
  data?: T;
};

export default function LojaVendasListaPage() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [filtros, setFiltros] = useState({
    q: "",
    status_pagamento: "",
    status_venda: "",
    tipo_venda: "",
  });

  async function carregar() {
    setLoading(true);
    setMensagem(null);
    try {
      const params = new URLSearchParams();
      if (filtros.q.trim()) params.set("q", filtros.q.trim());
      if (filtros.status_pagamento) params.set("status_pagamento", filtros.status_pagamento);
      if (filtros.status_venda) params.set("status_venda", filtros.status_venda);
      if (filtros.tipo_venda) params.set("tipo_venda", filtros.tipo_venda);

      const res = await fetch(`/api/loja/vendas?${params.toString()}`, {
        cache: "no-store",
      });
      const json: ApiResponse<{ items: Venda[] }> = await res.json();
      if (!res.ok || !json.ok || !json.data) {
        setMensagem(json.error || "Erro ao listar vendas.");
        setVendas([]);
        return;
      }
      setVendas(json.data.items ?? []);
    } catch (err) {
      console.error("Erro ao carregar vendas:", err);
      setMensagem("Erro inesperado ao listar vendas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const vendasOrdenadas = useMemo(
    () =>
      [...vendas].sort(
        (a, b) => new Date(b.data_venda).getTime() - new Date(a.data_venda).getTime()
      ),
    [vendas]
  );

  const formatCurrency = (cents: number) =>
    (cents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    });

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Historico de vendas — Loja v0</h1>
        <p className="text-sm text-gray-600">
          Registros de vendas e entregas realizadas na AJ Dance Store.
        </p>
      </header>

      <section className="bg-white border rounded-xl shadow-sm p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium mb-1">
              Buscar por cliente ou ID da venda
            </label>
            <input
              value={filtros.q}
              onChange={(e) => setFiltros((prev) => ({ ...prev, q: e.target.value }))}
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="Nome do cliente ou numero da venda"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Status pagamento</label>
            <select
              value={filtros.status_pagamento}
              onChange={(e) =>
                setFiltros((prev) => ({ ...prev, status_pagamento: e.target.value }))
              }
              className="w-full border rounded-md px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              <option value="PAGO">Pago</option>
              <option value="PENDENTE">Pendente</option>
              <option value="PARCIAL">Parcial</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Tipo de venda</label>
            <select
              value={filtros.tipo_venda}
              onChange={(e) =>
                setFiltros((prev) => ({ ...prev, tipo_venda: e.target.value }))
              }
              className="w-full border rounded-md px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              <option value="VENDA">Venda</option>
              <option value="CREDIARIO_INTERNO">Crediario interno</option>
              <option value="ENTREGA_FIGURINO">Entrega de figurino</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Status da venda</label>
            <select
              value={filtros.status_venda}
              onChange={(e) =>
                setFiltros((prev) => ({ ...prev, status_venda: e.target.value }))
              }
              className="w-full border rounded-md px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              <option value="ATIVA">Ativa</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={carregar}
            className="px-3 py-1.5 text-xs rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Carregando..." : "Aplicar filtros"}
          </button>
          <button
            type="button"
            onClick={() => {
              setFiltros({ q: "", status_pagamento: "", status_venda: "", tipo_venda: "" });
              setTimeout(carregar, 0);
            }}
            className="px-3 py-1.5 text-xs rounded-md border hover:bg-gray-50"
            disabled={loading}
          >
            Limpar
          </button>
        </div>
      </section>

      <section className="bg-white border rounded-xl shadow-sm p-4 space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-semibold">Vendas</h2>
          <span className="text-xs text-gray-500">{vendas.length} registro(s)</span>
        </div>

        {mensagem && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {mensagem}
          </div>
        )}

        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">Data</th>
                <th className="px-3 py-2 text-left">Cliente</th>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-left">Forma</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-center">Pagamento</th>
                <th className="px-3 py-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {vendasOrdenadas.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-4 text-center text-xs text-gray-500"
                  >
                    Nenhuma venda encontrada.
                  </td>
                </tr>
              )}
              {vendasOrdenadas.map((v) => {
                const data = new Date(v.data_venda);
                return (
                  <tr
                    key={v.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      window.location.href = `/loja/vendas/${v.id}`;
                    }}
                  >
                    <td className="px-3 py-2 text-gray-700">
                      {data.toLocaleDateString("pt-BR")}{" "}
                      <span className="text-[11px] text-gray-500">
                        {data.toLocaleTimeString("pt-BR")}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-800">
                      {v.cliente_nome || `Pessoa ${v.cliente_pessoa_id}`}
                    </td>
                    <td className="px-3 py-2 text-gray-700">{v.tipo_venda}</td>
                    <td className="px-3 py-2 text-gray-700">{v.forma_pagamento}</td>
                    <td className="px-3 py-2 text-right text-gray-800">
                      {formatCurrency(v.valor_total_centavos)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          v.status_pagamento === "PAGO"
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : v.status_pagamento === "PARCIAL"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-gray-100 text-gray-600 border border-gray-200"
                        }`}
                      >
                        {v.status_pagamento}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          v.status_venda === "ATIVA"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {v.status_venda}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
