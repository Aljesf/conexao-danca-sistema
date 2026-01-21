"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { getCookieStore } from "@/lib/nextCookies";

let serverClient: SupabaseClient | null = null;

export async function getSupabaseServer(): Promise<SupabaseClient> {
  if (!serverClient) {
    const cookieStore = await getCookieStore();
    serverClient = createServerComponentClient(
      { cookies: () => cookieStore },
      {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      },
    );
  }
  return serverClient;
}
