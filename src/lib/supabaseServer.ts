"use server";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseServerSSR } from "./supabaseServerSSR";

let serverClient: SupabaseClient | null = null;

export function getSupabaseServer(): SupabaseClient {
  if (!serverClient) {
    serverClient = getSupabaseServerSSR();
  }
  return serverClient;
}
