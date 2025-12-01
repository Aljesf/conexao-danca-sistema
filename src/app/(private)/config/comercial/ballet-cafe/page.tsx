"use client";

import ContextConfigForm from "@/components/ContextConfigForm";

export default function ConfigCafePage() {
  return (
    <ContextConfigForm
      contextKey="lanchonete"
      title="Configurações do Ballet Café"
      description="Defina logo, nome exibido e paleta do café."
    />
  );
}
