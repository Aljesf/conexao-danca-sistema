import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export function getSupabaseRoute() {
  return createRouteHandlerClient({ cookies });
}
