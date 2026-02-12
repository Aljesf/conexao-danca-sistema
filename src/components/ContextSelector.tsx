"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useBranding, type ContextKey } from "@/context/BrandingContext";

type ContextOption = {
  key: ContextKey;
  label: string;
  subtitle: string;
  href: string;
  icon: string;
};

const OPTIONS: ContextOption[] = [
  {
    key: "escola",
    label: "Escola",
    subtitle: "Operacao academica e matriculas",
    href: "/escola",
    icon: "??",
  },
  {
    key: "loja",
    label: "AJ Dance Store",
    subtitle: "Vendas e estoque da loja",
    href: "/loja",
    icon: "???",
  },
  {
    key: "lanchonete",
    label: "Ballet Cafe",
    subtitle: "Operacao e vendas do cafe",
    href: "/cafe",
    icon: "?",
  },
  {
    key: "administracao",
    label: "Administracao do Sistema",
    subtitle: "Configuracoes e governanca",
    href: "/admin",
    icon: "???",
  },
  {
    key: "bolsas",
    label: "Bolsas & Projetos Sociais",
    subtitle: "Gestao de bolsas e projetos sociais",
    href: "/bolsas",
    icon: "??",
  },
];

export default function ContextSelector() {
  const { activeContext, setActiveContext, configs } = useBranding();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const currentOption = OPTIONS.find((opt) => opt.key === activeContext);
  const current = configs[activeContext];

  function choose(opt: ContextOption) {
    setActiveContext(opt.key);
    setOpen(false);
    if (pathname !== opt.href) {
      router.push(opt.href);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <button type="button" className="ctx-select" onClick={() => setOpen((v) => !v)}>
        <span>{currentOption?.icon ?? "???"}</span>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.1 }}>Contexto</div>
          <strong>{current.displayName || currentOption?.label}</strong>
        </div>
        <span style={{ marginLeft: "auto", color: "#7c3aed" }}>?</span>
      </button>

      {open ? (
        <div className="ctx-menu">
          {OPTIONS.map((opt) => (
            <button key={opt.key} type="button" className="ctx-item" onClick={() => choose(opt)}>
              <span>{opt.icon}</span>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 700 }}>{opt.label}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{opt.subtitle}</div>
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
