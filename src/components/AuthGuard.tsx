"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type Props = {
  children: ReactNode;
};

export default function AuthGuard({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const verificar = async () => {
      const supabase = getSupabaseBrowser();
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      // Rota de login é sempre liberada
      if (pathname === "/login") {
        // Se já estiver logado, mando para home
        if (user) {
          router.replace("/");
          return;
        }
        setChecking(false);
        return;
      }

      // Demais rotas: exigem usuário
      if (!user) {
        router.replace("/login");
        return;
      }

      setChecking(false);
    };

    verificar();
  }, [pathname, router]);

  // Enquanto verifica (nas rotas protegidas), mostra um loading simples
  if (checking && pathname !== "/login") {
    return (
      <div className="p-4 text-sm">
        Verificando autenticação…
      </div>
    );
  }

  return <>{children}</>;
}
