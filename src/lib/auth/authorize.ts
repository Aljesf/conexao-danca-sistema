import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type SupabaseServerClient = ReturnType<typeof createServerClient>;

function getSupabaseServerClient(): SupabaseServerClient {
  const cookieStore = cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  // Importante: para checagem de permissoes do usuario logado,
  // use ANON + cookies (RLS deve permitir ler o proprio perfil/roles).
  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: any) {
        cookieStore.set({ name, value: "", ...options });
      },
    },
  });
}

export type AuthUser = {
  id: string;
  email: string | null;
};

export async function requireUser(): Promise<{ supabase: SupabaseServerClient; user: AuthUser }> {
  const supabase = getSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Nao autenticado.");
  }

  return { supabase, user: { id: user.id, email: user.email } };
}

export async function isTechAdmin(userId: string): Promise<boolean> {
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return false;
  return Boolean(data?.is_admin);
}

/**
 * Ajuste aqui para o seu RBAC real.
 * Esta implementacao tenta padroes comuns:
 * - usuario_roles(user_id, role_codigo)
 * - usuario_roles(user_id, role)
 * - usuario_roles(user_id, role_id) + roles_sistema(codigo)
 */
export async function hasAnyRole(userId: string, roleCodigos: string[]): Promise<boolean> {
  const { supabase } = await requireUser();

  // Tentativa 1: usuario_roles com coluna role_codigo
  const q1 = await supabase
    .from("usuario_roles")
    .select("role_codigo")
    .eq("user_id", userId)
    .in("role_codigo", roleCodigos);

  if (!q1.error && Array.isArray(q1.data) && q1.data.length > 0) return true;

  // Tentativa 2: usuario_roles com coluna role
  const q2 = await supabase
    .from("usuario_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", roleCodigos);

  if (!q2.error && Array.isArray(q2.data) && q2.data.length > 0) return true;

  // Tentativa 3: usuario_roles com role_id + roles_sistema
  const q3 = await supabase
    .from("usuario_roles")
    .select("role_id")
    .eq("user_id", userId);

  if (!q3.error && Array.isArray(q3.data) && q3.data.length > 0) {
    const roleIds = Array.from(new Set(q3.data.map((r) => (r as { role_id?: string | null }).role_id).filter(Boolean))) as string[];
    if (roleIds.length > 0) {
      const q4 = await supabase
        .from("roles_sistema")
        .select("codigo")
        .in("id", roleIds)
        .in("codigo", roleCodigos);

      if (!q4.error && Array.isArray(q4.data) && q4.data.length > 0) return true;
    }
  }

  // Se nada funcionou, considerar sem role (nao quebra o sistema)
  return false;
}

export type PermissionRule =
  | { kind: "ANY_AUTHENTICATED" }
  | { kind: "TECH_ADMIN_ONLY" }
  | { kind: "TECH_ADMIN_OR_ROLE"; roles: string[] };

export async function requirePermission(
  rule: PermissionRule
): Promise<{ supabase: SupabaseServerClient; user: AuthUser }> {
  const { supabase, user } = await requireUser();

  if (rule.kind === "ANY_AUTHENTICATED") {
    return { supabase, user };
  }

  const techAdmin = await isTechAdmin(user.id);
  if (techAdmin) {
    return { supabase, user };
  }

  if (rule.kind === "TECH_ADMIN_ONLY") {
    throw new Error("Sem permissao.");
  }

  if (rule.kind === "TECH_ADMIN_OR_ROLE") {
    const ok = await hasAnyRole(user.id, rule.roles);
    if (!ok) throw new Error("Sem permissao.");
    return { supabase, user };
  }

  throw new Error("Sem permissao.");
}
