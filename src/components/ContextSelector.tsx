"use client";

import { useState } from "react";
import { useBranding, type ContextKey } from "@/context/BrandingContext";

const OPTIONS: { key: ContextKey; label: string; emoji: string }[] = [
  { key: "escola", label: "Escola", emoji: "🏫" },
  { key: "loja", label: "Loja", emoji: "🛍️" },
  { key: "lanchonete", label: "Lanchonete", emoji: "☕" },
  { key: "administracao", label: "Administração", emoji: "🛡️" },
];

export default function ContextSelector() {
  const { activeContext, setActiveContext, configs } = useBranding();
  const [open, setOpen] = useState(false);
  const current = configs[activeContext];

  function choose(key: ContextKey) {
    setActiveContext(key);
    setOpen(false);
  }

  return (
    <div style={{ position: "relative" }}>
      <button type="button" className="ctx-select" onClick={() => setOpen((v) => !v)}>
        <span>🎚️</span>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.1 }}>
            Contexto
          </div>
          <strong>{current.displayName || OPTIONS.find(o => o.key === activeContext)?.label}</strong>
        </div>
        <span style={{ marginLeft: "auto", color: "#7c3aed" }}>▾</span>
      </button>

      {open ? (
        <div className="ctx-menu">
          {OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              className="ctx-item"
              onClick={() => choose(opt.key)}
            >
              <span>{opt.emoji}</span>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 700 }}>{opt.label}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  {configs[opt.key]?.displayName || "Definir no cadastro"}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
