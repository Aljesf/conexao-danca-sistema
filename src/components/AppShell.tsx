"use client";

import { type ReactNode } from "react";
import { useBranding } from "@/context/BrandingContext";
import Sidebar from "./Sidebar";
import ContextSelector from "./ContextSelector";

type Props = {
  children: ReactNode;
};

export default function AppShell({ children }: Props) {
  const { configs, activeContext } = useBranding();
  const brand = configs[activeContext];

  return (
    <div className="app-grid">
      <Sidebar />
      <main className="app-main">
        <header className="app-header">
          <div className="brand-inline">
            {brand.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.logoUrl} alt={brand.displayName} className="brand-img" />
            ) : null}
            <div className="brand-text">
              <div className="brand-caption">Contexto ativo</div>
              <div className="brand-name">{brand.displayName}</div>
            </div>
          </div>
          <ContextSelector />
        </header>
        <div className="app-content">{children}</div>
      </main>
    </div>
  );
}
