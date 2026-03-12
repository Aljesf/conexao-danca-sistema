import { ComponenteReutilizavelPage } from "@/components/documentos/ComponenteReutilizavelPage";

export default function AdminDocumentosRodapesPage() {
  return (
    <ComponenteReutilizavelPage
      tipo="FOOTER"
      title="Rodapes reutilizaveis"
      subtitle="Cadastre e mantenha os rodapes institucionais usados pelos modelos documentais."
      shortDescription="Crie o rodape institucional com assinatura, local, data e blocos finais reutilizaveis."
      hintItems={[
        "Rodapes concentram assinatura, local, data, validacao e observacoes finais.",
        "Um rodape reutilizavel reduz manutencao e padroniza a base visual dos documentos.",
        "A tela tecnica de layout templates continua disponivel para ajustes detalhados.",
      ]}
      defaultHeightPx={80}
    />
  );
}
