"use client";

import { useEffect, useMemo, useState } from "react";
import { FinanceHelpCard } from "@/components/FinanceHelpCard";

type TipoMovimento = "RECEITA" | "DESPESA";

type Movimento = {
  id: number;
  tipo: TipoMovimento;
  centro_custo_nome: string;
  valor_centavos: number;
  data_movimento: string;
  origem?: string | null;
  origem_id?: number | null;
  descricao?: string | null;
};

type CentroCusto = {
  id: number;
  nome: string;
  codigo?: string | null;
};

type Filtros = {
  centroId: string;
  tipo: TipoMovimento | "TODOS";
  dataInicio: string;
  dataFim: string;
};

function formatBRL(v: number) {
  return (v / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function origemLabel(origem?: string | null) {
  if (!origem) return "-";
  if (origem === "RECEBIMENTO") return "Recebimento";
  if (origem === "CONTA_PAGAR") return "Conta a pagar";
  if (origem === "LOJA_VENDA") return "Venda Loja";
  if (origem === "LOJA_CANCELAMENTO") return "Cancelamento Loja";
  if (origem === "AJUSTE_MANUAL") return "Ajuste manual";
  return origem.replaceAll("_", " ");
}

function formatarData(data?: string | null) {
  if (!data) return "-";
  const parsed = new Date(data);
  if (Number.isNaN(parsed.getTime())) return data;
  return parsed.toLocaleDateString("pt-BR");
}

export default function MovimentoFinanceiroPage() {
  const [movimentos, setMovimentos] = useState<Movimento[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const [filtros, setFiltros] = useState<Filtros>({
    centroId: "",
    tipo: "TODOS",
    dataInicio: "",
    dataFim: "",
  });
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    async function carregarCentros() {
      try {
        const res = await fetch("/api/financeiro/centros-custo", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || "Erro ao carregar centros de custo");
        }
        setCentrosCusto(json.data ?? []);
      } catch (err) {
        console.error("Erro ao carregar centros de custo:", err);
      }
    }

    carregarCentros();
  }, []);

  useEffect(() => {
    async function carregarMovimentos() {
      setLoading(true);
      setErro(null);
      try {
        const params = new URLSearchParams();
        if (filtros.tipo !== "TODOS") params.set("tipo", filtros.tipo);
        if (filtros.centroId) params.set("centro_custo_id", filtros.centroId);
        if (filtros.dataInicio) params.set("data_inicio", filtros.dataInicio);
        if (filtros.dataFim) params.set("data_fim", filtros.dataFim);

        const qs = params.toString();
        const url = qs ? `/api/financeiro/movimento?${qs}` : "/api/financeiro/movimento";

        const res = await fetch(url, { cache: "no-store" });
        const json = await res.json();

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || "Erro ao buscar movimento financeiro");
        }

        setMovimentos(json.movimentos ?? []);
      } catch (err: unknown) {
        console.error("Erro ao carregar movimentos financeiros:", err);
        const message = err instanceof Error ? err.message : "Erro ao carregar movimentos financeiros.";
        setErro(message);
        setMovimentos([]);
      } finally {
        setLoading(false);
      }
    }

    carregarMovimentos();
  }, [filtros]);

  const totalReceitas = useMemo(
    () =>
      movimentos
        .filter((m) => m.tipo === "RECEITA")
        .reduce((acc, m) => acc + (m.valor_centavos || 0), 0),
    [movimentos]
  );

  const totalDespesas = useMemo(
    () =>
      movimentos
        .filter((m) => m.tipo === "DESPESA")
        .reduce((acc, m) => acc + (m.valor_centavos || 0), 0),
    [movimentos]
  );

  const saldo = totalReceitas - totalDespesas;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-white px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-800">Movimentacao financeira</h1>
          <p className="text-sm text-slate-600">
            Livro caixa real (tabela movimento_financeiro), consumindo dados direto do Supabase.
          </p>
        </div>

        <FinanceHelpCard
          subtitle="Livro-caixa consolidado."
          items={[
            "Busca lancamentos reais no Supabase (movimento_financeiro).",
            "Filtre por tipo, centro de custo e periodo.",
            "Totais sao calculados sobre o resultado filtrado.",
            "Origem mostra vendas, cancelamentos ou contas a pagar.",
          ]}
        />

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800">Filtros</h3>
          <p className="text-sm text-slate-600">Centro, tipo e periodo.</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="text-sm text-slate-700">
              Centro de custo
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                value={filtros.centroId}
                onChange={(e) => setFiltros({ ...filtros, centroId: e.target.value })}
              >
                <option value="">Todos</option>
                {centrosCusto.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} {c.codigo ? `(${c.codigo})` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-700">
              Tipo
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                value={filtros.tipo}
                onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value as Filtros["tipo"] })}
              >
                <option value="TODOS">Todos</option>
                <option value="RECEITA">Receita</option>
                <option value="DESPESA">Despesa</option>
              </select>
            </label>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="text-sm text-slate-700">
              Data inicio
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                value={filtros.dataInicio}
                onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
              />
            </label>
            <label className="text-sm text-slate-700">
              Data fim
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                value={filtros.dataFim}
                onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
              />
            </label>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-600">Receitas (filtradas)</p>
              <p className="text-xl font-semibold text-slate-800">{formatBRL(totalReceitas)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-600">Despesas (filtradas)</p>
              <p className="text-xl font-semibold text-slate-800">{formatBRL(totalDespesas)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-600">Saldo (filtrado)</p>
              <p className="text-xl font-semibold text-slate-800">{formatBRL(saldo)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800">Lancamentos</h3>
          <p className="text-sm text-slate-600">
            Dados reais da tabela movimento_financeiro (livro-caixa).
          </p>
          {erro && <p className="mt-2 text-sm text-rose-600">{erro}</p>}
          {loading && <p className="mt-2 text-sm text-slate-600">Carregando movimentos...</p>}
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Data</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Tipo</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Centro</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Valor</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Origem</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Descricao</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movimentos.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-700">{formatarData(m.data_movimento)}</td>
                    <td className="px-3 py-2 text-slate-700">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          m.tipo === "RECEITA" ? "bg-green-50 text-green-700" : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {m.tipo}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{m.centro_custo_nome || "-"}</td>
                    <td className="px-3 py-2 font-semibold text-slate-900">{formatBRL(m.valor_centavos)}</td>
                    <td className="px-3 py-2 text-slate-700">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{origemLabel(m.origem)}</span>
                        {m.origem_id ? <span className="text-xs text-slate-500">#{m.origem_id}</span> : null}
                        {m.origem === "AJUSTE_MANUAL" && (
                          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                            Ajuste manual
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{m.descricao || "-"}</td>
                  </tr>
                ))}
                {!loading && movimentos.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center text-sm text-slate-500">
                      Nenhum lancamento encontrado para os filtros selecionados.
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
