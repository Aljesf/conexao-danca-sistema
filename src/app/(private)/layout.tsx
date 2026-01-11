import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import AppShell from "@/components/AppShell";
import MovimentoButton from "@/components/MovimentoButton";
import { getSystemSettings } from "@/lib/systemSettings";

export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const systemSettings = await getSystemSettings();

  return (
    <AppShell systemSettings={systemSettings}>
      {children}
      <MovimentoButton />
    </AppShell>
  );
}
