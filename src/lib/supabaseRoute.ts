import { getSupabaseServerAuth } from "@/lib/supabaseServer";

export async function getSupabaseRoute() {
  return await getSupabaseServerAuth();
}
