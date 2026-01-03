import LayoutDocumentoEditarClient from "./LayoutDocumentoEditarClient";

export default async function AdminDocumentoLayoutEditarPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return <LayoutDocumentoEditarClient id={id} />;
}
