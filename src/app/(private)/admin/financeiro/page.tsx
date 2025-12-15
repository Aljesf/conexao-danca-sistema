"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FinanceHelpCard } from "@/components/FinanceHelpCard";

type ResumoCentro = {
  centro_custo_id: number | null;
  centro_custo_codigo?: string | null;
  centro_custo_nome?: string | null;
  receitas_centavos: number;
  despesas_centavos: number;
  saldo_centavos: number;
};

type DashboardResponse = {
  ok: boolean;
  pagar_pendente_centavos: number;
  receber_pendente_centavos: number;
  saldo_periodo_centavos: number;
  resumo_por_centro_custo?: ResumoCentro[];
  error?: string;
};

function formatBRL(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function FinanceiroDashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/financeiro/dashboard");
        const json = (await res.json()) as DashboardResponse;
        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || "Erro ao carregar dashboard financeiro.");
        }
        if (active) setData(json);
      } catch (err: any) {
        if (active) setError(err?.message ?? "Erro inesperado ao carregar dashboard.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const resumoCentros = useMemo(() => data?.resumo_por_centro_custo ?? [], [data]);

  const totais = useMemo(
    () => ({
      saldo: data?.saldo_periodo_centavos ?? 0,
      receber: data?.receber_pendente_centavos ?? 0,
      pagar: data?.pagar_pendente_centavos ?? 0,
    }),
    [data]
  );

  const loadingText = loading ? "Carregando..." : undefined;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-white px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-slate-800">Dashboard Financeiro</h1>
              <p className="text-sm text-slate-600">
                Visao consolidada do caixa por centro de custo com dados reais do Supabase.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/admin/financeiro/centros-custo" className="text-purple-600 font-medium">
                Centros de custo
              </Link>
              <Link href="/admin/financeiro/categorias" className="text-purple-600 font-medium">
                Categorias
              </Link>
              <Link href="/admin/financeiro/contas-receber" className="text-purple-600 font-medium">
                Contas a receber
              </Link>
              <Link href="/admin/financeiro/contas-pagar" className="text-purple-600 font-medium">
                Contas a pagar
              </Link>
              <Link href="/admin/financeiro/movimento" className="text-purple-600 font-medium">
                Movimento
              </Link>
            </div>
          </div>

          <FinanceHelpCard
            subtitle="Visao geral do financeiro com dados reais."
            items={[
              "Resumo de saldo do periodo, contas a pagar e a receber.",
              "Valores carregados de cobrancas, contas_pagar e movimento_financeiro.",
              "Os atalhos permitem acessar rapidamente as principais telas do financeiro.",
              "Use filtros globais da pagina (quando disponiveis) para refinar o periodo exibido.",
            ]}
          />

          {error ? (
            <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-600">Saldo do periodo</p>
              <p className="text-xl font-semibold text-slate-800">
                {loading ? loadingText : formatBRL(totais.saldo)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-600">Receber pendente</p>
              <p className="text-xl font-semibold text-slate-800">
                {loading ? loadingText : formatBRL(totais.receber)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-600">Pagar pendente</p>
              <p className="text-xl font-semibold text-slate-800">
                {loading ? loadingText : formatBRL(totais.pagar)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Resumo por centro de custo</h3>
              <p className="text-sm text-slate-600">Saldo, receitas e despesas agrupados por centro.</p>
            </div>
            {loading ? (
              <span className="text-xs font-medium text-slate-500">Atualizando...</span>
            ) : null}
          </div>

          {loading && resumoCentros.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">Carregando dados do dashboard...</p>
          ) : null}

          {!loading && resumoCentros.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">
              Nenhum movimento financeiro encontrado para o periodo selecionado.
            </p>
          ) : null}

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resumoCentros.map((item) => {
              const centroLabel =
                item.centro_custo_nome ||
                item.centro_custo_codigo ||
                (item.centro_custo_id ? `Centro #${item.centro_custo_id}` : "Sem centro");

              return (
                <div
                  key={`${centroLabel}-${item.centro_custo_id ?? "none"}`}
                  className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800">{centroLabel}</h3>
                      <p className="text-sm text-slate-600">Centro de custo</p>
                    </div>
                    <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
                      Resumo
                    </span>
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    <div className="flex justify-between">
                      <span>Saldo</span>
                      <span className="font-semibold text-slate-900">{formatBRL(item.saldo_centavos)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Receitas</span>
                      <span className="text-green-700">{formatBRL(item.receitas_centavos)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Despesas</span>
                      <span className="text-rose-700">{formatBRL(item.despesas_centavos)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800">Atalhos rapidos</h3>
          <p className="text-sm text-slate-600">Navegue para os modulos de gestao financeira.</p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <Link href="/admin/financeiro/centros-custo" className="text-purple-600 font-medium">
              Centros de custo
            </Link>
            <Link href="/admin/financeiro/categorias" className="text-purple-600 font-medium">
              Categorias
            </Link>
            <Link href="/admin/financeiro/contas-receber" className="text-purple-600 font-medium">
              Contas a receber
            </Link>
            <Link href="/admin/financeiro/contas-pagar" className="text-purple-600 font-medium">
              Contas a pagar
            </Link>
            <Link href="/admin/financeiro/movimento" className="text-purple-600 font-medium">
              Movimento
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
