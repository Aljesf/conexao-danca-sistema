export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

export default function Page() {
  redirect("/admin/escola/configuracoes/matriculas/tabelas/nova");
}