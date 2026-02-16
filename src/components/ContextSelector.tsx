"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useBranding } from "@/context/BrandingContext";
import { CONTEXTOS_CONFIG, detectContextByPathname, type AppContextItem } from "@/config/contextosConfig";

export default function ContextSelector() {
  const { activeContext, setActiveContext, configs } = useBranding();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const currentOption = CONTEXTOS_CONFIG.find((opt) => opt.brandingKey === activeContext);
  const activeByPath = detectContextByPathname(pathname);
  const active = activeByPath ?? currentOption ?? null;
  const current = configs[activeContext];

  function choose(opt: AppContextItem) {
    setActiveContext(opt.brandingKey);
    setOpen(false);
    if (pathname !== opt.href) {
      router.push(opt.href);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <button type="button" className="ctx-select" onClick={() => setOpen((v) => !v)}>
        <span className="text-lg leading-none">{active?.emoji ?? "🧭"}</span>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.1 }}>Contexto</div>
          <strong>{current.displayName || active?.label || "Selecionar contexto"}</strong>
        </div>
        <span style={{ marginLeft: "auto", color: "#7c3aed" }}>▾</span>
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
            >
              <span className="text-lg leading-none">{opt.emoji}</span>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 700 }}>{opt.label}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{opt.description}</div>
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
