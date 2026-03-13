import SuporteTicketDetalheClient from "../../[id]/SuporteTicketDetalheClient";

export default async function SuporteTicketDetalheRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolved = await params;
  return <SuporteTicketDetalheClient ticketId={resolved.id} />;
}
