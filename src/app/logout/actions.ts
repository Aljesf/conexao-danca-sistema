"use server";

import { redirect } from "next/navigation";
import { getSupabaseServerAuth } from "@/lib/supabaseServer";

export async function logoutAction() {
  const supabase = await getSupabaseServerAuth();
  await supabase.auth.signOut();
  redirect("/login");
}
