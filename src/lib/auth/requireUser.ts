import { redirect } from "next/navigation";
import { getSupabaseServerAuth } from "@/lib/supabaseServer";

export type RequireUserResult = {
  id: string;
  email: string | null;
  name: string | null;
};

export async function requireUser(): Promise<RequireUserResult> {
  const supabase = await getSupabaseServerAuth();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    redirect("/login");
  }

  const userName =
    typeof data.user.user_metadata?.full_name === "string"
      ? data.user.user_metadata.full_name
      : typeof data.user.user_metadata?.name === "string"
        ? data.user.user_metadata.name
        : null;

  return {
    id: data.user.id,
    email: data.user.email ?? null,
    name: userName,
  };
}
