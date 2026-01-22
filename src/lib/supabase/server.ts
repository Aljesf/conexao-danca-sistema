import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";

/**
 * Server Component client: SOMENTE LEITURA de cookies.
 * Escrita de cookies deve acontecer no middleware ou em Route Handlers.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // NO-OP proposital:
          // Next.js bloqueia escrita de cookies durante render de Server Components.
          // Sessao e atualizada no middleware.
        },
      },
    },
  );
}

export async function createClient() {
  return getSupabaseServerSSR();
}
