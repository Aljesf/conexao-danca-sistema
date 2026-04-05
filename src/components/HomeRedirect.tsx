"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { resolveContextHome } from "@/config/contextHomeMap";
import { useBranding } from "@/context/BrandingContext";

export default function HomeRedirect() {
  const router = useRouter();
  const { activeContext, isReady } = useBranding();

  useEffect(() => {
    if (!isReady) return;
    router.replace(resolveContextHome(activeContext));
  }, [activeContext, isReady, router]);

  return (
    <div className="flex h-screen items-center justify-center text-sm text-gray-400">
      Carregando...
    </div>
  );
}
