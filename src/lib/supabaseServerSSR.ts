import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type CookieOptions = {
  path?: string;
  domain?: string;
  maxAge?: number;
  expires?: Date;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
};

/**
 * Cliente Supabase para uso em Server Components / Route Handlers / Server Actions.
 * Compatível com Next.js 15 (cookies assíncrono em runtime dinâmico) e com cookies Supabase base64-*.
 */
export async function getSupabaseServerSSR() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL não configurada.");
  if (!supabaseAnonKey) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY não configurada.");

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, { ...(options as CookieOptions), path: "/" });
        });
      },
    },
  });
}
