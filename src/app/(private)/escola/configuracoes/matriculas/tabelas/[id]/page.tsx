export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

export default function Page({ params }: { params: { id: string } }) {
  redirect(`/admin/escola/configuracoes/matriculas/tabelas/${params.id}`);
}