import type { User } from "@supabase/supabase-js";
import { getUserOrThrow, isAdminUser, type Supa } from "@/app/api/professor/diario-de-classe/_lib/auth";

type AdminContext =
  | { ok: true; supabase: Supa; user: User }
  | { ok: false; status: number; body: { ok: false; code: string; message?: string } };

export async function getAdminContext(): Promise<AdminContext> {
  const auth = await getUserOrThrow();
  if (!auth.ok) {
    return { ok: false, status: auth.status, body: { ok: false, code: auth.code } };
  }

  try {
    const admin = await isAdminUser(auth.supabase, auth.user.id);
    if (!admin) {
      return { ok: false, status: 403, body: { ok: false, code: "SEM_PERMISSAO" } };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "ERRO_PERMISSAO_ADMIN";
    return { ok: false, status: 500, body: { ok: false, code: "ERRO_PERMISSAO_ADMIN", message: msg } };
  }

  return { ok: true, supabase: auth.supabase, user: auth.user };
}
