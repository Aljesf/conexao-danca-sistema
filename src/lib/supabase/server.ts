"use server";

import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";

export async function createClient() {
  return getSupabaseServerSSR();
}
