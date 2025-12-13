import { redirect } from "next/navigation";

export default function EscolaPessoaNovaRedirectPage() {
  // Rota legado/atalho: mantém compatibilidade com links antigos.
  redirect("/pessoas/nova");
}
