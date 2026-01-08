import { redirect } from "next/navigation";

export default function PeriodoLetivoNovoRedirect() {
  redirect("/escola/academico/periodos-letivos#criar-periodo");
}
