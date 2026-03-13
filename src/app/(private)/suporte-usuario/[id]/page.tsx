import SuporteTicketDetalheClient from "./SuporteTicketDetalheClient";

export default async function SuporteTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolved = await params;
  return <SuporteTicketDetalheClient ticketId={resolved.id} />;
}
