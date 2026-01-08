import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type SupabaseEnv = {
  url: string;
  anonKey: string;
};

function getSupabaseEnv(): SupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("SUPABASE_ENV_NAO_CONFIGURADO");
  }
  return { url, anonKey };
}

/**
 * Guard MVP:
 * - exige usuário logado
 * - exige flag de role no app_metadata.roles contendo "MOVIMENTO_ADMIN"
 */
export async function requireMovimentoAdmin(): Promise<{ userId: string }> {
  const { url, anonKey } = getSupabaseEnv();

  const cookieStore = cookies();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value;
      },
      set() {},
      remove() {},
    },
  });

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    throw new Error("NAO_AUTENTICADO");
  }

  const rolesUnknown = (auth.user.app_metadata as { roles?: unknown } | null)?.roles;
  const roles = Array.isArray(rolesUnknown) ? rolesUnknown : [];

  if (!roles.includes("MOVIMENTO_ADMIN")) {
    throw new Error("SEM_PERMISSAO_MOVIMENTO_ADMIN");
  }

  return { userId: auth.user.id };
}
