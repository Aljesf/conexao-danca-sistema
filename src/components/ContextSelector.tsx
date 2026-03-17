"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useBranding } from "@/context/BrandingContext";
import {
  CONTEXTOS_CONFIG,
  detectContextByPathname,
  type AppContextItem,
} from "@/config/contextosConfig";
import { getFallbackRouteForContext } from "@/lib/contexto-home";

async function resolveContextHome(contexto: string, fallback: string) {
  try {
    const response = await fetch(`/api/me/contexto-home/resolver?contexto=${encodeURIComponent(contexto)}`, {
      method: "GET",
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as
      | { rota_principal?: string }
      | null;

    if (response.ok && payload?.rota_principal) {
      return payload.rota_principal;
    }
  } catch (error) {
    console.warn("[ContextSelector] falha ao resolver home do contexto:", error);
  }

  return fallback;
}

export default function ContextSelector() {
  const { activeContext, setActiveContext, configs } = useBranding();
  const [open, setOpen] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const currentOption = CONTEXTOS_CONFIG.find((opt) => opt.brandingKey === activeContext);
  const activeByPath = detectContextByPathname(pathname);
  const active = activeByPath ?? currentOption ?? null;
  const current = configs[activeByPath?.brandingKey ?? activeContext];

  function choose(opt: AppContextItem) {
    setActiveContext(opt.brandingKey);
    setOpen(false);
    setPendingKey(opt.key);

    const fallback = getFallbackRouteForContext(opt.key) || opt.href;
    void (async () => {
      const target = await resolveContextHome(opt.key, fallback);
      setPendingKey(null);
      if (pathname !== target) {
        router.push(target);
      }
    })();
  }

  return (
    <div style={{ position: "relative" }}>
      <button type="button" className="ctx-select" onClick={() => setOpen((v) => !v)}>
        <span className="text-lg leading-none">{active?.emoji ?? "##"}</span>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.1 }}>Contexto</div>
          <strong>{current.displayName || active?.label || "Selecionar contexto"}</strong>
        </div>
        <span style={{ marginLeft: "auto", color: "#7c3aed" }}>v</span>
      </button>

      {open ? (
        <div className="ctx-menu">
          {CONTEXTOS_CONFIG.map((opt) => (
            <button
              key={opt.key}
              type="button"
              className="ctx-item"
              onClick={() => choose(opt)}
              aria-current={active?.key === opt.key ? "page" : undefined}
              disabled={pendingKey !== null}
            >
              <span className="text-lg leading-none">{opt.emoji}</span>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 700 }}>
                  {opt.label}
                  {pendingKey === opt.key ? "..." : ""}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{opt.description}</div>
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
