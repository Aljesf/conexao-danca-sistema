// src/app/layout.tsx

import "./globals.css";
import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard"; // ⬅️ IMPORTANTE

export const metadata: Metadata = {
  title: "Conexão Dados",
  description: "Sistema interno do Conexão Dança",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        {/* Garantimos que TODO o app (exceto /login) passe pelo AuthGuard */}
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
