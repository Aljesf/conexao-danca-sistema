import { ComponenteReutilizavelPage } from "@/components/documentos/ComponenteReutilizavelPage";

export default function AdminDocumentosCabecalhosPage() {
  return (
    <ComponenteReutilizavelPage
      tipo="HEADER"
      title="Cabecalhos reutilizaveis"
      subtitle="Cadastre e mantenha os cabecalhos institucionais usados pelos modelos documentais."
      shortDescription="Crie o cabecalho institucional que sera reaproveitado em contratos, recibos, declaracoes e outros documentos."
      hintItems={[
        "Cabecalhos concentram identidade institucional, logo e dados superiores do documento.",
        "Use componentes reutilizaveis para evitar HTML duplicado entre modelos.",
        "A edicao fina continua disponivel na tela tecnica de layout templates.",
      ]}
      defaultHeightPx={120}
    />
  );
}
