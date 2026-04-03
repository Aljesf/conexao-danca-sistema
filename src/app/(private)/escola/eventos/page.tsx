import { carregarEdicoesEventos } from "@/app/(private)/escola/eventos/_queries";
import { EventosPageClient } from "@/components/escola/eventos/EventosPageClient";

export const dynamic = "force-dynamic";

export default async function EventosPage() {
  const edicoes = await carregarEdicoesEventos();

  return <EventosPageClient edicoes={edicoes} />;
}
