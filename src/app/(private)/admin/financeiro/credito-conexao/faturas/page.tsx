"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type FaturaConexao = {
  id: number;
  conta_conexao_id: number;
  periodo_referencia: string;
  data_fechamento: string;
  data_vencimento: string | null;
  valor_total_centavos: number;
  valor_taxas_centavos: number;
  status: string;
  created_at: string;
};

export default function FaturasCreditoConexaoPage() {
  const [faturas, setFaturas] = useState<FaturaConexao[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function carregarFaturas() {
    try {
      setLoading(true);
      setErro(null);

      const res = await fetch("/api/financeiro/credito-conexao/faturas");
      if (!res.ok) {
        throw new Error(await res.text());
      }

      const json = await res.json();
      setFaturas(json.faturas ?? []);
    } catch (e: any) {
      console.error("Erro ao carregar faturas Crédito Conexão", e);
      setErro("Erro ao carregar faturas do Cartão Conexão.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarFaturas();
  }, []);

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("pt-BR");
  }

  function formatCurrency(centavos: number) {
    return (centavos / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatStatus(status: string) {
    switch (status) {
      case "ABERTA":
        return "Aberta";
      case "PAGA":
        return "Paga";
      case "EM_ATRASO":
        return "Em atraso";
      case "CANCELADA":
        return "Cancelada";
      default:
        return status;
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Crédito Conexão — Faturas</h1>
        <p className="text-sm text-gray-600">
          Visualize as faturas geradas do Cartão Conexão (Aluno/Colaborador), com valores de
          compras, taxas e total consolidado.
        </p>
      </div>

      {erro && <div className="text-sm text-red-600">{erro}</div>}

      <div className="border rounded-xl bg-white shadow-sm">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="text-sm font-semibold">Faturas</h2>
          <button
            type="button"
            onClick={carregarFaturas}
            className="text-xs px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700"
          >
            Atualizar
          </button>
        </div>

        {loading ? (
          <div className="p-4 text-sm text-gray-600">Carregando faturas...</div>
        ) : faturas.length === 0 ? (
          <div className="p-4 text-sm text-gray-600">Nenhuma fatura cadastrada.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left">ID</th>
                  <th className="px-3 py-2 text-left">Conta</th>
                  <th className="px-3 py-2 text-left">Período</th>
                  <th className="px-3 py-2 text-left">Fechamento</th>
                  <th className="px-3 py-2 text-left">Vencimento</th>
                  <th className="px-3 py-2 text-right">Compras</th>
                  <th className="px-3 py-2 text-right">Taxas</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {faturas.map((f) => {
                  const valorTotal = f.valor_total_centavos;
                  const valorTaxas = f.valor_taxas_centavos ?? 0;
                  const valorCompras = valorTotal - valorTaxas;

                  return (
                    <tr key={f.id} className="border-t">
                      <td className="px-3 py-2">
                        <Link
                          href={`/admin/financeiro/credito-conexao/faturas/${f.id}`}
                          className="text-indigo-600 hover:underline"
                        >
                          {f.id}
                        </Link>
                      </td>
                      <td className="px-3 py-2">Conta #{f.conta_conexao_id}</td>
                      <td className="px-3 py-2">{f.periodo_referencia}</td>
                      <td className="px-3 py-2">{formatDate(f.data_fechamento)}</td>
                      <td className="px-3 py-2">{formatDate(f.data_vencimento)}</td>
                      <td className="px-3 py-2 text-right">
                        {formatCurrency(valorCompras)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatCurrency(valorTaxas)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatCurrency(valorTotal)}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            f.status === "ABERTA"
                              ? "bg-amber-50 text-amber-700"
                              : f.status === "PAGA"
                              ? "bg-emerald-50 text-emerald-700"
                              : f.status === "EM_ATRASO"
                              ? "bg-red-50 text-red-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {formatStatus(f.status)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
