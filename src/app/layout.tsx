import "./globals.css";
import type { Metadata } from "next";
import { UserProvider } from "@/context/UserContext";
import { BrandingProvider } from "@/context/BrandingContext";

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
        <UserProvider>
          <BrandingProvider>{children}</BrandingProvider>
        </UserProvider>
      </body>
    </html>
  );
}
