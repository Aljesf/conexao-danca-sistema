import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function RedirectPage() {
  redirect("/escola/academico/turmas/nova");
}
