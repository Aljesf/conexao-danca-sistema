export const dynamic = "force-dynamic";

import { FinanceHelpCard } from "@/components/FinanceHelpCard";
import PlanosPagamentoForm from "./PlanosPagamentoForm";

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-800">Novo plano de pagamento</h1>
              <p className="text-sm text-slate-600">
                Defina ciclo de cobranca, termino e regras de total. Valores ficam na Tabela de Precos.
              </p>
            </div>
          </div>
        </div>

        <FinanceHelpCard
          subtitle="Entenda esta tela"
          items={[
            "Ciclo de cobranca define unico, parcelado ou mensal.",
            "Cobranca mensal exige termino (fim do ano, turma, projeto ou data especifica).",
            "Prorrata afeta apenas a primeira cobranca.",
          ]}
        />

        <PlanosPagamentoForm />
      </div>
    </div>
  );
}
