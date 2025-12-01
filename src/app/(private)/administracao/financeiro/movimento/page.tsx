"use client";

import { useMemo, useState } from "react";
import { FinanceHelpCard } from "@/components/FinanceHelpCard";

// Segue modelo docs/modelo_financeiro.md. Dados mockados; conectar Supabase (movimento_financeiro) futuramente.

type Centro = "ESCOLA" | "LOJA" | "CAFE";
type TipoMovimento = "RECEITA" | "DESPESA";
type Origem = "RECEBIMENTO" | "CONTA_PAGAR" | "AJUSTE_MANUAL";

type Movimento = {
  id: number;
  dataMovimento: string;
  tipo: TipoMovimento;
  centroCusto: Centro;
  contaFinanceira: string;
  valorCentavos: number;
  origem: Origem;
  origemId?: number | null;
  descricao: string;
};

const seedMovimento: Movimento[] = [
  {
    id: 1,
    dataMovimento: "2025-10-01",
    tipo: "RECEITA",
    centroCusto: "ESCOLA",
    contaFinanceira: "Caixa Escola",
    valorCentavos: 32000,
    origem: "RECEBIMENTO",
    origemId: 1,
    descricao: "Mensalidade Outubro - Ana",
  },
  {
    id: 2,
    dataMovimento: "2025-10-02",
    tipo: "DESPESA",
    centroCusto: "ESCOLA",
    contaFinanceira: "Bradesco 1234",
    valorCentavos: 120000,
    origem: "CONTA_PAGAR",
    origemId: 2,
    descricao: "Aluguel",
  },
  {
    id: 3,
    dataMovimento: "2025-10-03",
    tipo: "RECEITA",
    centroCusto: "LOJA",
    contaFinanceira: "Maquininha Loja",
    valorCentavos: 8900,
    origem: "RECEBIMENTO",
    origemId: 3,
    descricao: "Venda Loja #123",
  },
  {
    id: 4,
    dataMovimento: "2025-10-04",
    tipo: "DESPESA",
    centroCusto: "CAFE",
    contaFinanceira: "Caixa Café",
    valorCentavos: 4500,
    origem: "CONTA_PAGAR",
    origemId: 4,
    descricao: "Compra insumos Café",
  },
  {
    id: 5,
    dataMovimento: "2025-10-05",
    tipo: "DESPESA",
    centroCusto: "ESCOLA",
    contaFinanceira: "Caixa Escola",
    valorCentavos: 2500,
    origem: "AJUSTE_MANUAL",
    origemId: null,
    descricao: "Diferença de caixa - turno noite",
  },
  {
    id: 6,
    dataMovimento: "2025-10-05",
    tipo: "RECEITA",
    centroCusto: "ESCOLA",
    contaFinanceira: "Caixa Escola",
    valorCentavos: 1500,
    origem: "AJUSTE_MANUAL",
    origemId: null,
    descricao: "Reembolso de insumo comprado em dinheiro",
  },
];

function formatBRL(v: number) {
  return (v / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function origemLabel(origem: Origem) {
  if (origem === "RECEBIMENTO") return "Recebimento";
  if (origem === "CONTA_PAGAR") return "Conta a pagar";
  return "Ajuste manual";
}

export default function MovimentoFinanceiroPage() {
  const [movimentos] = useState<Movimento[]>(seedMovimento);
  const [filtros, setFiltros] = useState<{ centro: Centro | "TODOS"; tipo: TipoMovimento | "TODOS" }>({
    centro: "TODOS",
    tipo: "TODOS",
  });

  const filtrados = useMemo(() => {
    return movimentos.filter((m) => {
      const centroOk = filtros.centro === "TODOS" || m.centroCusto === filtros.centro;
      const tipoOk = filtros.tipo === "TODOS" || m.tipo === filtros.tipo;
      return centroOk && tipoOk;
    });
  }, [movimentos, filtros]);

  const resumo = useMemo(() => {
    return filtrados.reduce(
      (acc, m) => {
        if (m.tipo === "RECEITA") acc.receitas += m.valorCentavos;
        if (m.tipo === "DESPESA") acc.despesas += m.valorCentavos;
        return acc;
      },
      { receitas: 0, despesas: 0 }
    );
  }, [filtrados]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-white px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-800">Movimentação financeira</h1>
          <p className="text-sm text-slate-600">
            Livro caixa consolidado (tabela movimento_financeiro). Resumo por tipo e centro de custo, incluindo ajustes
            manuais de caixa.
          </p>
        </div>

        <FinanceHelpCard
          subtitle="Livro-caixa consolidado."
          items={[
            "Veja todas as entradas (RECEITAS) e saídas (DESPESAS).",
            "Filtre por período, centro de custo ou tipo.",
            "Lançamentos com origem 'AJUSTE_MANUAL' indicam ajustes de caixa.",
            "O saldo considera todos os lançamentos filtrados.",
          ]}
        />

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800">Filtros</h3>
          <p className="text-sm text-slate-600">Centro e tipo.</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
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
            <label className="text-sm text-slate-700">
              Tipo
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                value={filtros.tipo}
                onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value as TipoMovimento | "TODOS" })}
              >
                <option value="TODOS">Todos</option>
                <option value="RECEITA">Receita</option>
                <option value="DESPESA">Despesa</option>
              </select>
            </label>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-600">Receitas (filtradas)</p>
              <p className="text-xl font-semibold text-slate-800">{formatBRL(resumo.receitas)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-600">Despesas (filtradas)</p>
              <p className="text-xl font-semibold text-slate-800">{formatBRL(resumo.despesas)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-600">Saldo (filtrado)</p>
              <p className="text-xl font-semibold text-slate-800">{formatBRL(resumo.receitas - resumo.despesas)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800">Lançamentos</h3>
          <p className="text-sm text-slate-600">
            Exibe recebimentos, contas a pagar e ajustes manuais. Ajustes recebem um selo próprio.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Data</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Tipo</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Centro</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Conta financeira</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Valor</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Origem</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Descrição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtrados.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-700">{m.dataMovimento}</td>
                    <td className="px-3 py-2 text-slate-700">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          m.tipo === "RECEITA" ? "bg-green-50 text-green-700" : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {m.tipo}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{m.centroCusto}</td>
                    <td className="px-3 py-2 text-slate-700">{m.contaFinanceira}</td>
                    <td className="px-3 py-2 font-semibold text-slate-900">{formatBRL(m.valorCentavos)}</td>
                    <td className="px-3 py-2 text-slate-700">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{origemLabel(m.origem)}</span>
                        {m.origemId ? <span className="text-xs text-slate-500">#{m.origemId}</span> : null}
                        {m.origem === "AJUSTE_MANUAL" && (
                          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                            Ajuste manual
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{m.descricao}</td>
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
