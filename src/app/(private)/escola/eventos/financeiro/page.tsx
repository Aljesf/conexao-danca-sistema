import { carregarEdicoesEventos } from "@/app/(private)/escola/eventos/_queries";
import { EventoAreaPage } from "@/components/escola/eventos/EventoAreaPage";

export const dynamic = "force-dynamic";

export default async function EventosFinanceiroPage() {
  const edicoes = await carregarEdicoesEventos();

  return (
    <EventoAreaPage
      titulo="Financeiro do evento"
      descricao="Leia o resumo basico de receitas, despesas e referencias financeiras por edicao."
      areaLabel="financeiro"
      abaFoco="financeiro"
      edicoes={edicoes}
      observacao="Nenhuma regra financeira nova foi criada aqui. Esta navegacao apenas expoe melhor a leitura ja existente no detalhe da edicao."
      semItensMensagem="Nenhuma edicao disponivel para consulta financeira no momento."
    />
  );
}
