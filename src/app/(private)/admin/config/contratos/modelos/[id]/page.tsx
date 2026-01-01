import ModeloContratoEditarClient from "./ModeloContratoEditarClient";

export default async function AdminContratoModeloEditarPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return <ModeloContratoEditarClient id={id} />;
}
