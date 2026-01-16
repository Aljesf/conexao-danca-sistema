"use client";

import SectionCard from "@/components/layout/SectionCard";

export default function AdminFormsTemplatesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4">
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <SectionCard
          title="Formularios (Templates)"
          description="Placeholder para construtor de formularios."
        >
          <div className="rounded-lg border bg-white p-4 text-sm text-slate-600">
            Implementar UI de templates (publicacao, versao e ordem de perguntas).
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
