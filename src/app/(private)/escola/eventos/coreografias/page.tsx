import { carregarEdicoesEventos } from "@/app/(private)/escola/eventos/_queries";
import { EventoAreaPage } from "@/components/escola/eventos/EventoAreaPage";

export const dynamic = "force-dynamic";

export default async function EventosCoreografiasPage() {
  const edicoes = await carregarEdicoesEventos();

  return (
    <EventoAreaPage
      titulo="Coreografias e elencos"
      descricao="Acesse rapidamente as edicoes com foco na estrutura artistica, elenco e ordem prevista de apresentacao."
      areaLabel="coreografias"
      abaFoco="coreografias"
      modoNavegacaoEdicao="coreografias"
      edicoes={edicoes}
      observacao="A area de coreografias funciona como entrada direta para o gerenciamento artistico de cada edicao."
      semItensMensagem="Nenhuma edicao disponivel para coreografias no momento."
    />
  );
}
