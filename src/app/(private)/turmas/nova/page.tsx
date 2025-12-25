import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function TurmasNovaRedirectPage() {
  redirect("/academico/turmas/nova");
}
