import DocumentoEmitidoDetalheClient from "./DocumentoEmitidoDetalheClient";

export default function Page({ params }: { params: { id: string } }) {
  return <DocumentoEmitidoDetalheClient id={params.id} />;
}
