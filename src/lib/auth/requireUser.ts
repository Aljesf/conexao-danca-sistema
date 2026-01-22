import { redirect } from "next/navigation";
import { getSupabaseServerAuth } from "@/lib/supabaseServer";

export type RequireUserResult = {
  id: string;
  email: string | null;
};

export async function requireUser(): Promise<RequireUserResult> {
  const supabase = await getSupabaseServerAuth();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    redirect("/login");
  }

  return { id: data.user.id, email: data.user.email ?? null };
}
