import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { getCookieStore } from "@/lib/nextCookies";

export async function getSupabaseRoute() {
  const cookieStore = await getCookieStore();
  return createRouteHandlerClient({
    cookies: () => cookieStore,
  });
}
