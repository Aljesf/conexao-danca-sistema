import { redirect } from "next/navigation";

export default function EscolaPessoasRedirectPage() {
  // legado: /escola/pessoas -> rota atual de pessoas
  redirect("/pessoas");
}
