import AppShell from "@/components/AppShell";
import MovimentoButton from "@/components/MovimentoButton";
import AppErrorCaptureProvider from "@/components/providers/AppErrorCaptureProvider";
import SuporteFab from "@/components/suporte/SuporteFab";
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
    <AppErrorCaptureProvider>
      <AppShell systemSettings={systemSettings} user={user} logoutAction={logoutAction}>
        {children}
      </AppShell>
      <SuporteFab user={user} />
      <MovimentoButton />
    </AppErrorCaptureProvider>
  );
}
