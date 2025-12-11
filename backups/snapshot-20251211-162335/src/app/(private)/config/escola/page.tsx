"use client";

import ContextConfigForm from "@/components/ContextConfigForm";

export default function ConfigEscolaPage() {
  return (
    <ContextConfigForm
      contextKey="escola"
      title="Configurações da Escola"
      description="Defina identidade visual e dados institucionais da escola."
    />
  );
}
