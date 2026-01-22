import AppShell from "@/components/AppShell";
import MovimentoButton from "@/components/MovimentoButton";
import { NascMount } from "@/components/nasc/NascMount";
import { getSystemSettings } from "@/lib/systemSettings";
import { requireUser } from "@/lib/auth/requireUser";
import { logoutAction } from "@/app/logout/actions";

export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  const systemSettings = await getSystemSettings();

  return (
    <AppShell systemSettings={systemSettings} user={user} logoutAction={logoutAction}>
      {children}
      <NascMount />
      <MovimentoButton />
    </AppShell>
  );
}
