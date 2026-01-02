import ModeloDocumentoEditarClient from "./ModeloDocumentoEditarClient";

export default async function AdminDocumentoModeloEditarPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return <ModeloDocumentoEditarClient id={id} />;
}
