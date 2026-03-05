"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { sidebarConfig, type SidebarItem, type SidebarSection } from "@/config/sidebarConfig";
import { CONTEXTOS_CONFIG } from "@/config/contextosConfig";
import { useBranding, type ContextKey } from "@/context/BrandingContext";
import UserBadge from "./UserBadge";

type SidebarContext = keyof typeof sidebarConfig;
type AnyContext = SidebarContext | ContextKey;

type SidebarProps = {
  /**
   * Contexto atual do app.
   * Se nao for informado, usar o contexto vindo do BrandingContext.
   */
  context?: AnyContext;
};

const sidebarContextMap: Record<AnyContext, SidebarContext> = {
  escola: "escola",
  loja: "loja",
  lanchonete: "cafe",
  administracao: "admin",
  bolsas: "bolsas",
  financeiro: "financeiro",
  cafe: "cafe",
  admin: "admin",
};

const brandingContextMap: Record<AnyContext, ContextKey> = {
  escola: "escola",
  loja: "loja",
  lanchonete: "lanchonete",
  administracao: "administracao",
  bolsas: "bolsas",
  financeiro: "financeiro",
  cafe: "lanchonete",
  admin: "administracao",
};

const sidebarToContextKey: Record<SidebarContext, "ESCOLA" | "LOJA" | "CAFE" | "ADMIN" | "BOLSAS" | "FINANCEIRO"> = {
  escola: "ESCOLA",
  loja: "LOJA",
  cafe: "CAFE",
  admin: "ADMIN",
  bolsas: "BOLSAS",
  financeiro: "FINANCEIRO",
};

const contextLabels: Record<SidebarContext, string> = {
  escola: CONTEXTOS_CONFIG.find((ctx) => ctx.key === sidebarToContextKey.escola)?.label ?? "Escola",
  loja: CONTEXTOS_CONFIG.find((ctx) => ctx.key === sidebarToContextKey.loja)?.label ?? "AJ Dance Store",
  cafe: CONTEXTOS_CONFIG.find((ctx) => ctx.key === sidebarToContextKey.cafe)?.label ?? "Ballet Cafe",
  admin: CONTEXTOS_CONFIG.find((ctx) => ctx.key === sidebarToContextKey.admin)?.label ?? "Administracao do Sistema",
  bolsas: CONTEXTOS_CONFIG.find((ctx) => ctx.key === sidebarToContextKey.bolsas)?.label ?? "Bolsas & Projetos Sociais",
  financeiro: CONTEXTOS_CONFIG.find((ctx) => ctx.key === sidebarToContextKey.financeiro)?.label ?? "Financeiro",
};

function Section({ id, title, items, defaultOpen = true }: SidebarSection) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `sec:${id}`;
    const stored = window.localStorage.getItem(key);
    if (stored !== null) setOpen(stored === "1");
  }, [id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `sec:${id}`;
    window.localStorage.setItem(key, open ? "1" : "0");
  }, [id, open]);

  return (
    <div className="mb-2">
      <button
        type="button"
        className="mb-1 flex w-full items-center justify-between text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>{title}</span>
        <span className="text-[9px]">{open ? "v" : ">"}</span>
      </button>

      {open && (
        <ul className="space-y-1 pb-2 pl-2">
          {items.map((item, index) => (
            <SidebarLink key={`${id}-${item.href}-${index}`} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}

function SidebarLink({ item }: { item: SidebarItem }) {
  const pathname = usePathname();
  const isActive = pathname === item.href || (item.matchPrefix && pathname.startsWith(item.matchPrefix || ""));
  const icon = item.icon;

  const baseClasses = "flex items-center gap-2 rounded-full px-3 py-2 text-sm transition-colors";
  const activeClasses = "bg-white text-slate-900 shadow";
  const inactiveClasses = "text-slate-700/80 hover:bg-white/60 hover:text-slate-900";

  return (
    <li>
      <Link href={item.href} className={[baseClasses, isActive ? activeClasses : inactiveClasses].join(" ")}>
        {icon && <span className="text-lg leading-none">{icon}</span>}
        <span className="truncate">{item.label}</span>
      </Link>
    </li>
  );
}

export default function Sidebar({ context }: SidebarProps) {
  const { activeContext, configs } = useBranding();

  const rawContext: AnyContext = context ?? activeContext;
  const resolvedContext = sidebarContextMap[rawContext] ?? "escola";
  const sections = sidebarConfig[resolvedContext] ?? [];

  const brandingKey = brandingContextMap[rawContext] ?? "escola";
  const currentConfig = configs[brandingKey];
  const metaLabel = contextLabels[resolvedContext] ?? "Painel interno";
  const logoUrl = currentConfig?.logoUrl;
  const logoFallback = metaLabel.length > 0 ? metaLabel.slice(0, 2).toUpperCase() : "APP";

  return (
    <aside className="flex h-full w-72 flex-col bg-gradient-to-b from-[color:var(--accent-1,#eef2ff)] to-[color:var(--accent-3,#e0e7ff)] text-sm text-slate-700">
      <div className="flex flex-col items-center gap-3 border-b border-black/5 py-6">
        {logoUrl ? (
          <img src={logoUrl} alt={metaLabel} className="h-28 w-28 rounded-3xl object-contain shadow-sm" />
        ) : (
          <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-white text-xl font-semibold text-slate-700 shadow-sm">
            {logoFallback}
          </div>
        )}
        <div className="flex flex-col text-center">
          <span className="text-[10px] uppercase tracking-wider text-slate-500">Contexto ativo</span>
          <span className="text-sm font-semibold text-slate-700">{metaLabel}</span>
        </div>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {sections.map((section, sectionIndex) => (
          <Section
            key={`${section.id}-${sectionIndex}`}
            id={section.id}
            title={section.title}
            items={section.items}
            defaultOpen={section.defaultOpen ?? true}
          />
        ))}
      </nav>

      <div className="border-t border-black/5 px-3 py-3">
        <UserBadge />
      </div>
    </aside>
  );
}
