import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import MovimentoButton from "@/components/MovimentoButton";
import { NascMount } from "@/components/nasc/NascMount";
import { getSystemSettings } from "@/lib/systemSettings";

export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || error) {
    redirect("/login");
  }

  const systemSettings = await getSystemSettings();

  return (
    <AppShell systemSettings={systemSettings}>
      {children}
      <NascMount />
      <MovimentoButton />
    </AppShell>
  );
}
