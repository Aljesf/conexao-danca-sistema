"use client";

import ContextConfigForm from "@/components/ContextConfigForm";

export default function ConfigLojaPage() {
  return (
    <ContextConfigForm
      contextKey="loja"
      title="Configurações da Loja – AJ Dance Store"
      description="Personalize branding, logo e paleta da loja."
    />
  );
}
