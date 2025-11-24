"use client";

import Sidebar from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthGuard>
          <div className="app-grid">
            <Sidebar />
            <main className="app-main">{children}</main>
          </div>
        </AuthGuard>
      </body>
    </html>
  );
}
