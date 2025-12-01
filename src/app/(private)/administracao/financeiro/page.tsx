"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FinanceHelpCard } from "@/components/FinanceHelpCard";

// Esta tela segue docs/modelo_financeiro.md. Dados mockados; conectar Supabase futuramente.

type Centro = "ESCOLA" | "LOJA" | "CAFE";

type SaldoCentro = {
  centro: Centro;
  saldoCentavos: number;
  receberPendentesCentavos: number;
  pagarPendentesCentavos: number;
};

const mockSaldos: SaldoCentro[] = [
  { centro: "ESCOLA", saldoCentavos: 1525000, receberPendentesCentavos: 380000, pagarPendentesCentavos: 210000 },
  { centro: "LOJA", saldoCentavos: 845000, receberPendentesCentavos: 120000, pagarPendentesCentavos: 95000 },
  { centro: "CAFE", saldoCentavos: 415000, receberPendentesCentavos: 65000, pagarPendentesCentavos: 72000 },
];

function formatBRL(value: number) {
  return (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function FinanceiroDashboardPage() {
  const [saldos] = useState<SaldoCentro[]>(mockSaldos);

  const totais = useMemo(() => {
    return saldos.reduce(
      (acc, item) => {
        acc.saldo += item.saldoCentavos;
        acc.receber += item.receberPendentesCentavos;
        acc.pagar += item.pagarPendentesCentavos;
        return acc;
      },
      { saldo: 0, receber: 0, pagar: 0 }
    );
  }, [saldos]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-white px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-slate-800">Dashboard Financeiro</h1>
              <p className="text-sm text-slate-600">
                Visão consolidada do caixa por centro de custo. Baseado no modelo definido em docs/modelo_financeiro.md.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/(private)/administracao/financeiro/centros-custo" className="text-purple-600 font-medium">
                Centros de custo
              </Link>
              <Link href="/(private)/administracao/financeiro/categorias" className="text-purple-600 font-medium">
                Categorias
              </Link>
              <Link href="/(private)/administracao/financeiro/contas-receber" className="text-purple-600 font-medium">
                Contas a receber
              </Link>
              <Link href="/(private)/administracao/financeiro/contas-pagar" className="text-purple-600 font-medium">
                Contas a pagar
              </Link>
              <Link href="/(private)/administracao/financeiro/movimento" className="text-purple-600 font-medium">
                Movimentação
              </Link>
            </div>
          </div>

          <FinanceHelpCard
            subtitle="Visão geral do financeiro."
            items={[
              "Veja o resumo de receitas, despesas e saldo por centro de custo.",
              "Use este painel para acompanhar a saúde financeira da escola, loja e café.",
              "Os atalhos permitem acessar rapidamente as principais telas do financeiro.",
              "Os valores exibidos serão conectados ao Supabase conforme avançarmos.",
            ]}
          />

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-600">Saldo consolidado</p>
              <p className="text-xl font-semibold text-slate-800">{formatBRL(totais.saldo)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-600">Receber pendente</p>
              <p className="text-xl font-semibold text-slate-800">{formatBRL(totais.receber)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-600">Pagar pendente</p>
              <p className="text-xl font-semibold text-slate-800">{formatBRL(totais.pagar)}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {saldos.map((item) => (
            <div key={item.centro} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">{item.centro}</h3>
                  <p className="text-sm text-slate-600">Centro de custo</p>
                </div>
                <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">Resumo</span>
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <div className="flex justify-between">
                  <span>Saldo</span>
                  <span className="font-semibold text-slate-900">{formatBRL(item.saldoCentavos)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Receber pendente</span>
                  <span className="text-orange-600">{formatBRL(item.receberPendentesCentavos)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pagar pendente</span>
                  <span className="text-rose-600">{formatBRL(item.pagarPendentesCentavos)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800">Atalhos rápidos</h3>
          <p className="text-sm text-slate-600">Navegue para os módulos de gestão financeira.</p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <Link href="/(private)/administracao/financeiro/centros-custo" className="text-purple-600 font-medium">
              Centros de custo
            </Link>
            <Link href="/(private)/administracao/financeiro/categorias" className="text-purple-600 font-medium">
              Categorias
            </Link>
            <Link href="/(private)/administracao/financeiro/contas-receber" className="text-purple-600 font-medium">
              Contas a receber
            </Link>
            <Link href="/(private)/administracao/financeiro/contas-pagar" className="text-purple-600 font-medium">
              Contas a pagar
            </Link>
            <Link href="/(private)/administracao/financeiro/movimento" className="text-purple-600 font-medium">
              Movimentação
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
