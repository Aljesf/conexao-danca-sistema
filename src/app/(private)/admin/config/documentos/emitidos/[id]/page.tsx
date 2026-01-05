import DocumentoEmitidoDetalheClient from "./DocumentoEmitidoDetalheClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <DocumentoEmitidoDetalheClient id={id} />;
}
