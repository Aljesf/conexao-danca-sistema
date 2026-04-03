"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSupabaseServerAuth } from "@/lib/supabaseServer";
import { clearSupabaseAuthCookiesFromCookieStore } from "@/lib/supabase/auth-utils";

export async function logoutAction() {
  const cookieStore = await cookies();
  const supabase = await getSupabaseServerAuth();

  try {
    await supabase.auth.signOut();
  } catch {
    // Mesmo com sessao quebrada, limpamos os cookies locais e seguimos para o login.
  }

  clearSupabaseAuthCookiesFromCookieStore(cookieStore);
  redirect("/login");
}
