import { redirect } from "next/navigation";

export default async function EscolaPessoaIdRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/pessoas/${id}`);
}
