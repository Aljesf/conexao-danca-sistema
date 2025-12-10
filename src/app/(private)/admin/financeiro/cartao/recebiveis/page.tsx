"use client";

import { useEffect, useMemo, useState } from "react";

type RecebivelCartao = {
  id: number;
  venda_id: number;
  valor_bruto_centavos: number;
  valor_liquido_centavos: number;
  numero_parcelas: number;
  data_prevista_pagamento: string;
  status: string;
  cartao_maquinas?: { nome?: string | null; operadora?: string | null } | null;
  cartao_bandeiras?: { nome?: string | null } | null;
};

type Filtros = {
  status: string;
  dataInicio: string;
  dataFim: string;
};

function formatBRL(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(data?: string | null) {
  if (!data) return "-";
  const parsed = new Date(data);
  if (Number.isNaN(parsed.getTime())) return data;
  return parsed.toLocaleDateString("pt-BR");
}

const hojeISO = new Date().toISOString().slice(0, 10);

export default function RecebiveisCartaoPage() {
  const [recebiveis, setRecebiveis] = useState<RecebivelCartao[]>([]);
  const [loading, setLoading] = useState(false);
  const [baixandoId, setBaixandoId] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<Filtros>({
    status: "PREVISTO",
    dataInicio: "",
    dataFim: "",
  });
  const [dataPagamento, setDataPagamento] = useState<string>(hojeISO);

  const totais = useMemo(() => {
    const bruto = recebiveis.reduce((acc, r) => acc + (r.valor_bruto_centavos || 0), 0);
    const liquido = recebiveis.reduce((acc, r) => acc + (r.valor_liquido_centavos || 0), 0);
    return { bruto, liquido };
  }, [recebiveis]);

  async function carregarRecebiveis() {
    try {
      setLoading(true);
      setErro(null);

      const params = new URLSearchParams();
      if (filtros.status) params.set("status", filtros.status);
      if (filtros.dataInicio) params.set("data_inicio", filtros.dataInicio);
      if (filtros.dataFim) params.set("data_fim", filtros.dataFim);

      const url = params.toString()
        ? `/api/financeiro/cartao/recebiveis?${params.toString()}`
        : "/api/financeiro/cartao/recebiveis";

      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Erro ao carregar recebiveis de cartao.");
      }

      setRecebiveis(json.recebiveis ?? []);
    } catch (e: any) {
      console.error("Erro ao carregar recebiveis de cartao:", e);
      setErro(e?.message || "Erro ao carregar recebiveis de cartao.");
      setRecebiveis([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarRecebiveis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.status, filtros.dataInicio, filtros.dataFim]);

  async function marcarComoRecebido(recebivel: RecebivelCartao) {
    try {
      setBaixandoId(recebivel.id);
      setErro(null);

      const res = await fetch("/api/financeiro/cartao/recebiveis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recebivel_id: recebivel.id,
          data_pagamento: dataPagamento || hojeISO,
          valor_liquido_centavos: recebivel.valor_liquido_centavos,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Erro ao baixar recebivel de cartao", text);
        setErro("Erro ao registrar repasse do cartao.");
        return;
      }

      await carregarRecebiveis();
    } catch (e: any) {
      console.error("Erro ao baixar recebivel de cartao", e);
      setErro("Erro ao registrar repasse do cartao.");
    } finally {
      setBaixandoId(null);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-white px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-800">Recebiveis de cartao</h1>
          <p className="text-sm text-slate-600">
            Concilie os repasses das operadoras. Aqui listamos o que foi vendido no credito e ainda esta como PREVISTO
            ou PAGO, com um clique para registrar o repasse real.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800">Filtros e data do repasse</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <label className="text-sm text-slate-700">
              Status
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                value={filtros.status}
                onChange={(e) => setFiltros((prev) => ({ ...prev, status: e.target.value }))}
              >
                <option value="PREVISTO">Previstos</option>
                <option value="PAGO">Pagos</option>
                <option value="CANCELADO">Cancelados</option>
              </select>
            </label>
            <label className="text-sm text-slate-700">
              Data inicio prevista
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                value={filtros.dataInicio}
                onChange={(e) => setFiltros((prev) => ({ ...prev, dataInicio: e.target.value }))}
              />
            </label>
            <label className="text-sm text-slate-700">
              Data fim prevista
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                value={filtros.dataFim}
                onChange={(e) => setFiltros((prev) => ({ ...prev, dataFim: e.target.value }))}
              />
            </label>
            <label className="text-sm text-slate-700">
              Data para marcar como recebido
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-slate-800"
                value={dataPagamento}
                onChange={(e) => setDataPagamento(e.target.value)}
              />
            </label>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">Qtd. recebiveis</p>
              <p className="text-xl font-semibold text-slate-800">{recebiveis.length}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">Total bruto</p>
              <p className="text-xl font-semibold text-slate-800">{formatBRL(totais.bruto)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">Total liquido</p>
              <p className="text-xl font-semibold text-slate-800">{formatBRL(totais.liquido)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Lista de recebiveis</h3>
              <p className="text-sm text-slate-600">
                Os valores previstos sao trazidos da tabela cartao_recebiveis. Clique para registrar o repasse real.
              </p>
            </div>
            <button
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              onClick={carregarRecebiveis}
              disabled={loading}
            >
              Atualizar
            </button>
          </div>

          {erro && <p className="mt-2 text-sm text-rose-600">{erro}</p>}
          {loading && <p className="mt-2 text-sm text-slate-600">Carregando recebiveis...</p>}

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Data prevista</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Venda</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Maquininha</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Bandeira</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Parcelas</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-700">Bruto</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-700">Liquido</th>
                  <th className="px-3 py-2 text-center font-semibold text-slate-700">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recebiveis.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-700">
                      {formatarData(r.data_prevista_pagamento)}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      <div className="font-semibold text-slate-900">Venda #{r.venda_id}</div>
                      <div className="text-xs text-slate-500 uppercase">{r.status}</div>
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {r.cartao_maquinas?.nome ?? "-"}
                      {r.cartao_maquinas?.operadora
                        ? ` (${r.cartao_maquinas.operadora})`
                        : ""}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{r.cartao_bandeiras?.nome ?? "-"}</td>
                    <td className="px-3 py-2 text-slate-700">{r.numero_parcelas}x</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-900">
                      {formatBRL(r.valor_bruto_centavos)}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-emerald-700">
                      {formatBRL(r.valor_liquido_centavos)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => marcarComoRecebido(r)}
                        disabled={baixandoId === r.id || r.status !== "PREVISTO"}
                      >
                        {baixandoId === r.id ? "Registrando..." : "Marcar recebido"}
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && recebiveis.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-4 text-center text-sm text-slate-500">
                      Nenhum recebivel encontrado para os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
