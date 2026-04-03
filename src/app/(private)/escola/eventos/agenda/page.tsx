import { carregarEdicoesEventos } from "@/app/(private)/escola/eventos/_queries";
import { EventoAreaPage } from "@/components/escola/eventos/EventoAreaPage";

export const dynamic = "force-dynamic";

export default async function EventosAgendaPage() {
  const edicoes = await carregarEdicoesEventos();

  return (
    <EventoAreaPage
      titulo="Agenda e calendario do evento"
      descricao="Abra o calendario interno de cada edicao para organizar inscricoes, ensaios, apresentacoes, reunioes e prazos."
      areaLabel="agenda"
      abaFoco="agenda"
      modoNavegacaoEdicao="calendario"
      edicoes={edicoes}
      observacao="Esta visao centraliza o calendario operacional das edicoes e separa essa rotina da agenda generica da escola."
      semItensMensagem="Nenhuma edicao disponivel para agenda no momento."
    />
  );
}
