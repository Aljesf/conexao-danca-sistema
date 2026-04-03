import { carregarEdicoesEventos } from "@/app/(private)/escola/eventos/_queries";
import { EventoAreaPage } from "@/components/escola/eventos/EventoAreaPage";

export const dynamic = "force-dynamic";

export default async function EventosRelatoriosPage() {
  const edicoes = await carregarEdicoesEventos();

  return (
    <EventoAreaPage
      titulo="Relatorios do modulo"
      descricao="Entrada temporaria para leitura e consolidacao do modulo de eventos da escola."
      areaLabel="relatorios"
      abaFoco="resumo"
      edicoes={edicoes}
      observacao="Os relatorios detalhados ainda nao foram implementados como paginas proprias. Por enquanto, a area orienta o acesso ao resumo de cada edicao."
      semItensMensagem="Nenhuma edicao disponivel para relatorios no momento."
    />
  );
}
