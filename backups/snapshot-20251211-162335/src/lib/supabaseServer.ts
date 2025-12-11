"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerSSR } from "./supabaseServerSSR";

let serverClient: SupabaseClient | null = null;

export async function getSupabaseServer(): Promise<SupabaseClient> {
  if (!serverClient) {
    serverClient = await getSupabaseServerSSR();
  }
  return serverClient;
}
