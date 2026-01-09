import { redirect } from "next/navigation";

export default function UsuariosLegacyRedirectPage() {
  redirect("/admin/usuarios");
}
