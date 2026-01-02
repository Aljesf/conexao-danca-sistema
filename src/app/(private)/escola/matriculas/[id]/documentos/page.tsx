import MatriculaDocumentosClient from "./MatriculaDocumentosClient";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return <MatriculaDocumentosClient id={id} />;
}
