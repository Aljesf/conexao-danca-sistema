import type { ReactNode } from "react";
import { MigratedPageNotice } from "@/components/migracao/MigratedPageNotice";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <MigratedPageNotice />
      {children}
    </>
  );
}
