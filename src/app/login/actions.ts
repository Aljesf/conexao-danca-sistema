"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import {
  clearSupabaseAuthCookiesFromCookieStore,
  shouldClearSupabaseAuth,
} from "@/lib/supabase/auth-utils";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const cookieStore = await cookies();
  clearSupabaseAuthCookiesFromCookieStore(cookieStore);

  const supabase = createServerActionClient({
    cookies: () => cookieStore as ReturnType<typeof cookies>,
  });

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (shouldClearSupabaseAuth(error)) {
      clearSupabaseAuthCookiesFromCookieStore(cookieStore);
    }
    redirect("/login?erro=1");
  }

  redirect("/pessoas");
}
