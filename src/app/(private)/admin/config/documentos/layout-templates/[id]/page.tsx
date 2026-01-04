import LayoutTemplateEditarClient from "./LayoutTemplateEditarClient";

export default async function AdminDocumentoLayoutTemplateEditarPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return <LayoutTemplateEditarClient id={id} />;
}
