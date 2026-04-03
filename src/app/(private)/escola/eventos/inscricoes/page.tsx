import { carregarEdicoesEventos } from "@/app/(private)/escola/eventos/_queries";
import { EventoAreaPage } from "@/components/escola/eventos/EventoAreaPage";

export const dynamic = "force-dynamic";

export default async function EventosInscricoesPage() {
  const edicoes = await carregarEdicoesEventos();

  return (
    <EventoAreaPage
      titulo="Inscricoes do modulo"
      descricao="Acesse rapidamente as edicoes com foco na leitura e gestao inicial das inscricoes."
      areaLabel="inscricoes"
      abaFoco="inscricoes"
      modoNavegacaoEdicao="inscricoes"
      edicoes={edicoes}
      observacao="As inscricoes agora possuem fluxo operacional dedicado por edicao, sem duplicar a area consolidada do detalhe."
      semItensMensagem="Nenhuma edicao disponivel para inscricoes no momento."
    />
  );
}
