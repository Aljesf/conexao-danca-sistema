"use client";

import SectionCard from "@/components/layout/SectionCard";

export default function AdminFormsQuestionsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4">
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <SectionCard
          title="Banco de Perguntas"
          description="MVP: cadastro basico de perguntas. Integracao visual com o padrao do sistema vira na proxima refatoracao de UI."
        >
          <div className="rounded-lg border bg-white p-4 text-sm text-slate-600">
            Implementar UI padrao (cards/tables) conforme layout de Pessoas/Financeiro.
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
