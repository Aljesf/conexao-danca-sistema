export const dynamic = "force-dynamic";

import { FinanceHelpCard } from "@/components/FinanceHelpCard";
import TabelaMatriculaNovaForm from "./TabelaMatriculaNovaForm";

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-800">Nova tabela de precos (Escola)</h1>
              <p className="text-sm text-slate-600">
                Defina em quais alvos a tabela se aplica e cadastre o ano. Depois, crie os itens (MENSALIDADE/RECORRENTE).
              </p>
            </div>
          </div>
        </div>

        <FinanceHelpCard
          subtitle="Entenda esta tela"
          items={[
            "A tabela pode valer para turmas, cursos livres, workshops ou projetos.",
            "Sem MENSALIDADE/RECORRENTE ativa, a matricula falha com 409.",
            "Ano de referencia e obrigatorio para cobertura e precificacao.",
          ]}
        />

        <TabelaMatriculaNovaForm />
      </div>
    </div>
  );
}
