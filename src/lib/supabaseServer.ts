import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export function getSupabaseServer() {
  const store = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => store.get(name)?.value,
        set: (name, value, options: CookieOptions) => { store.set(name, value, options); },
        remove: (name, options: CookieOptions) => { store.set(name, "", { ...options, maxAge: 0 }); },
      },
    }
  );
}

