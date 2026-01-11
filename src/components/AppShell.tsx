"use client";

import { type ReactNode } from "react";
import { useBranding } from "@/context/BrandingContext";
import { SystemBranding } from "@/components/branding/SystemBranding";
import type { WordmarkSegment } from "@/components/branding/SystemWordmark";
import Sidebar from "./Sidebar";
import ContextSelector from "./ContextSelector";

type Props = {
  children: ReactNode;
  systemSettings?: SystemSettings | null;
};

type SystemSettings = {
  system_name: string;
  logo_color_url: string | null;
  logo_white_url: string | null;
  logo_transparent_url: string | null;
  wordmark_segments: WordmarkSegment[];
};

export default function AppShell({ children, systemSettings }: Props) {
  const { configs, activeContext } = useBranding();
  const brand = configs[activeContext];

  return (
    <div className="app-grid">
      <Sidebar />
      <main className="app-main">
        <header className="app-header">
          <div className="flex items-center gap-3">
            {systemSettings ? (
              <SystemBranding
                settings={systemSettings}
                variant="transparent"
                showWordmark
                showSystemName={false}
              />
            ) : null}
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
          </div>
          <ContextSelector />
        </header>
        <div className="app-content">{children}</div>
      </main>
    </div>
  );
}
