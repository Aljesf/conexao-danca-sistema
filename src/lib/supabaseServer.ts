import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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
 * Cliente Supabase no SERVER para autenticação baseada em cookies (sessão do usuário).
 * Compatível com Next.js 15 (cookies assíncrono) e cookies Supabase base64-*.
 * Usa SEMPRE ANON KEY.
 */
export async function getSupabaseServerAuth() {
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

/**
 * Cliente Supabase SERVER com Service Role (apenas server-to-server).
 * Não usa cookies.
 */
let serviceClient: SupabaseClient | null = null;

export function getSupabaseServiceRole(): SupabaseClient {
  if (serviceClient) return serviceClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL não configurada.");
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada.");

  serviceClient = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return serviceClient;
}

// Backward-compatible alias for older imports.
export async function getSupabaseServer() {
  return getSupabaseServerAuth();
}
