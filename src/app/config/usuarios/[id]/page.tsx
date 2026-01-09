import { redirect } from "next/navigation";

export default function UsuariosLegacyIdRedirectPage() {
  redirect("/admin/usuarios");
}
