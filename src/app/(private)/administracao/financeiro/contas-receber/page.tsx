"use client";

import { useMemo, useState } from "react";
import { FinanceHelpCard } from "@/components/FinanceHelpCard";

// Segue modelo docs/modelo_financeiro.md. Dados mockados; conectar Supabase (tabela cobrancas) futuramente.

type StatusCobranca = "PENDENTE" | "PAGO" | "ATRASADO";
type Centro = "ESCOLA" | "LOJA" | "CAFE";

type Cobranca = {
  id: number;
  pessoa: string;
  descricao: string;
  valorCentavos: number;
  vencimento: string;
  status: StatusCobranca;
  centroCusto: Centro;
  origemTipo: string;
  linkPagamento?: string;
};

const seedCobrancas: Cobranca[] = [
  {
    id: 1,
    pessoa: "Ana Souza",
    descricao: "Mensalidade Outubro",
    valorCentavos: 32000,
    vencimento: "2025-10-10",
    status: "PENDENTE",
    centroCusto: "ESCOLA",
    origemTipo: "MENSALIDADE",
    linkPagamento: "https://pagamento.exemplo/1",
  },
  {
    id: 2,
    pessoa: "Bruno Lima",
    descricao: "Workshop Jazz",
    valorCentavos: 15000,
    vencimento: "2025-10-05",
    status: "ATRASADO",
    centroCusto: "ESCOLA",
    origemTipo: "WORKSHOP",
  },
  {
    id: 3,
    pessoa: "Cliente Loja",
    descricao: "Compra Loja - Pedido #123",
    valorCentavos: 8900,
    vencimento: "2025-10-12",
    status: "PENDENTE",
    centroCusto: "LOJA",
    origemTipo: "VENDA_LOJA",
  },
  {
    id: 4,
    pessoa: "Maria Café",
    descricao: "Encomenda Café",
    valorCentavos: 4500,
    vencimento: "2025-10-03",
    status: "PAGO",
    centroCusto: "CAFE",
    origemTipo: "VENDA_CAFE",
  },
];

function formatBRL(v: number) {
  return (v / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ContasReceberPage() {
  const [lista, setLista] = useState<Cobranca[]>(seedCobrancas);
  const [filtros, setFiltros] = useState<{ status: StatusCobranca | "TODOS"; centro: Centro | "TODOS"; busca: string }>({
    status: "TODOS",
    centro: "TODOS",
    busca: "",
  });

  const filtradas = useMemo(() => {
    return lista.filter((c) => {
      const statusOk = filtros.status === "TODOS" || c.status === filtros.status;
      const centroOk = filtros.centro === "TODOS" || c.centroCusto === filtros.centro;
      const busca = filtros.busca.toLowerCase().trim();
      const buscaOk =
        !busca ||
        c.pessoa.toLowerCase().includes(busca) ||
        c.descricao.toLowerCase().includes(busca) ||
        c.origemTipo.toLowerCase().includes(busca);
      return statusOk && centroOk && buscaOk;
    });
  }, [lista, filtros]);

  function marcarPago(id: number) {
    setLista((prev) => prev.map((c) => (c.id === id ? { ...c, status: "PAGO" } : c)));
  }

  const totais = useMemo(() => {
    return filtradas.reduce(
      (acc, c) => {
        if (c.status !== "PAGO") acc.aberto += c.valorCentavos;
        if (c.status === "ATRASADO") acc.atraso += c.valorCentavos;
        return acc;
      },
      { aberto: 0, atraso: 0 }
    );
  }, [filtradas]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-white px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-800">Contas a receber</h1>
          <p className="text-sm text-slate-600">
            Base na tabela <strong>cobrancas</strong>. Use o modelo financeiro para integração com Supabase.
          </p>
        </div>

        <FinanceHelpCard
          subtitle="Cobranças e recebimentos futuros."
          items={[
            "Visualize mensalidades, workshops e outras cobranças.",
            "Use os filtros para ver cobranças pendentes, pagas ou atrasadas.",
            "Cada cobrança pertence a um centro de custo.",
            "No futuro, esta tela será integrada à Nelfim para sincronizar boletos.",
          ]}
        />

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800">Filtros</h3>
          <p className="text-sm text-slate-600">Status, centro de custo e busca por pessoa/descrição.</p>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <label className="text-sm text-slate-700">
              Status
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                value={filtros.status}
                onChange={(e) => setFiltros({ ...filtros, status: e.target.value as StatusCobranca | "TODOS" })}
              >
                <option value="TODOS">Todos</option>
                <option value="PENDENTE">Pendente</option>
                <option value="PAGO">Pago</option>
                <option value="ATRASADO">Atrasado</option>
              </select>
            </label>
            <label className="text-sm text-slate-700">
              Centro de custo
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                value={filtros.centro}
                onChange={(e) => setFiltros({ ...filtros, centro: e.target.value as Centro | "TODOS" })}
              >
                <option value="TODOS">Todos</option>
                <option value="ESCOLA">Escola</option>
                <option value="LOJA">Loja</option>
                <option value="CAFE">Café</option>
              </select>
            </label>
            <label className="md:col-span-2 text-sm text-slate-700">
              Buscar (pessoa, descrição, origem)
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                value={filtros.busca}
                onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
                placeholder="Digite para filtrar"
              />
            </label>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-600">Em aberto</p>
              <p className="text-xl font-semibold text-slate-800">{formatBRL(totais.aberto)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-600">Em atraso</p>
              <p className="text-xl font-semibold text-rose-700">{formatBRL(totais.atraso)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-600">Filtradas</p>
              <p className="text-xl font-semibold text-slate-800">{filtradas.length} cobranças</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800">Cobranças</h3>
          <p className="text-sm text-slate-600">Clique em “Marcar como pago” para atualizar o status (UI apenas).</p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Pessoa</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Descrição</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Vencimento</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Valor</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Status</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Centro</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Origem</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtradas.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-800">{c.pessoa}</td>
                    <td className="px-3 py-2 text-slate-700">{c.descricao}</td>
                    <td className="px-3 py-2 text-slate-700">{c.vencimento}</td>
                    <td className="px-3 py-2 font-semibold text-slate-900">{formatBRL(c.valorCentavos)}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          c.status === "PAGO"
                            ? "bg-green-50 text-green-700"
                            : c.status === "ATRASADO"
                            ? "bg-rose-50 text-rose-700"
                            : "bg-orange-50 text-orange-700"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{c.centroCusto}</td>
                    <td className="px-3 py-2 text-slate-700">{c.origemTipo}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        {c.status !== "PAGO" && (
                          <button
                            onClick={() => marcarPago(c.id)}
                            className="rounded-full bg-purple-600 px-3 py-1 text-xs font-semibold text-white shadow"
                          >
                            Marcar como pago
                          </button>
                        )}
                        {c.linkPagamento && (
                          <a
                            href={c.linkPagamento}
                            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-purple-700"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Ver link
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
