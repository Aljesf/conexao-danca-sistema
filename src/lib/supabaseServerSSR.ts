import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

/**
 * Cliente Supabase para uso em Server Components.
 * Leitura de cookies apenas; qualquer refresh persistido deve acontecer no middleware ou em actions.
 */
export async function getSupabaseServerSSR() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL não configurada.");
  if (!supabaseAnonKey) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY não configurada.");

  return createServerComponentClient({
    cookies: () => cookieStore as ReturnType<typeof cookies>,
  }, {
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
  });
}
