import { redirect } from "next/navigation";

export default function Page({ params }: { params: { id: string } }) {
  const id = encodeURIComponent(params.id);
  redirect(`/admin/config/documentos/conjuntos#conjunto-${id}`);
}
