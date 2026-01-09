import { redirect } from "next/navigation";

export default function UsuariosLegacyNovoRedirectPage() {
  redirect("/admin/usuarios/novo");
}
