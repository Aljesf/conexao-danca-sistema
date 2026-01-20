"use client";

import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import SectionCard from "@/components/layout/SectionCard";

export default function CafeHomePage() {
  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Ballet Café"
        description="Painel do cafe: vendas, produtos e insumos."
      />

      <SectionCard title="Atalhos principais">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Link className="rounded-md border p-4 hover:bg-slate-50" href="/cafe/vendas">
            <div className="text-sm font-semibold">Caixa e vendas</div>
            <div className="mt-1 text-xs text-slate-600">Registrar vendas e pagamentos.</div>
          </Link>
          <Link className="rounded-md border p-4 hover:bg-slate-50" href="/cafe/produtos">
            <div className="text-sm font-semibold">Produtos e receitas</div>
            <div className="mt-1 text-xs text-slate-600">Cardapio e composicao dos produtos.</div>
          </Link>
          <Link className="rounded-md border p-4 hover:bg-slate-50" href="/cafe/insumos">
            <div className="text-sm font-semibold">Insumos</div>
            <div className="mt-1 text-xs text-slate-600">Saldo e abastecimento manual.</div>
          </Link>
        </div>
      </SectionCard>

      <SectionCard title="Fluxo rapido">
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>Cadastre insumos e ajuste saldos quando houver reposicao.</li>
          <li>Cadastre produtos e associe receitas para baixar insumos automaticamente.</li>
          <li>Registre vendas no caixa e acompanhe o status do pagamento.</li>
        </ul>
      </SectionCard>
    </div>
  );
}
