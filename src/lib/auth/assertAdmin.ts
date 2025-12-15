import { getSupabaseServer } from "@/lib/supabaseServer";

type AssertAdminResult =
  | { ok: true; supabase: Awaited<ReturnType<typeof getSupabaseServer>>; user: any; profile: any }
  | { ok: false; status: 401 | 403; error: "nao_autenticado" | "perfil_nao_encontrado" | "nao_admin" };

export async function assertAdmin(): Promise<AssertAdminResult> {
  const supabase = await getSupabaseServer();
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  const user = authData?.user;

  if (authErr || !user) {
    return { ok: false, status: 401, error: "nao_autenticado" };
  }

  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("user_id, full_name, is_admin, pessoa_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profErr || !profile) {
    return { ok: false, status: 403, error: "perfil_nao_encontrado" };
  }

  if (!profile.is_admin) {
    return { ok: false, status: 403, error: "nao_admin" };
  }

  return { ok: true, supabase, user, profile };
}
