import { carregarEdicoesEventos } from "@/app/(private)/escola/eventos/_queries";
import { EventoAreaPage } from "@/components/escola/eventos/EventoAreaPage";

export const dynamic = "force-dynamic";

export default async function EventosProducoesPage() {
  const edicoes = await carregarEdicoesEventos();

  return (
    <EventoAreaPage
      titulo="Producoes e contratacoes"
      descricao="Abra coreografias, participacoes artisticas e contratacoes da operacao do evento."
      areaLabel="producoes"
      abaFoco="coreografias"
      edicoes={edicoes}
      observacao="A area de producoes concentra o caminho para coreografias e contratacoes dentro de cada edicao."
      semItensMensagem="Nenhuma edicao disponivel para producoes no momento."
    />
  );
}
