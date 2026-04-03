import { EventoEdicaoInscricoesClient } from "@/components/escola/eventos/EventoEdicaoInscricoesClient";
import { carregarInscricoesEdicao } from "../inscricoes/_data";

export const dynamic = "force-dynamic";

type EventoEdicaoInscritosPageProps = {
  params: Promise<{
    edicaoId: string;
  }>;
};

export default async function EventoEdicaoInscritosPage({
  params,
}: EventoEdicaoInscritosPageProps) {
  const { edicaoId } = await params;
  const data = await carregarInscricoesEdicao(edicaoId);

  return <EventoEdicaoInscricoesClient data={data} modo="controle" />;
}
