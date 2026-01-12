"use client";

import Link from "next/link";
import { type ReactNode, useState } from "react";
import { SystemLogoImage } from "@/components/branding/SystemLogoImage";
import type { WordmarkSegment } from "@/components/branding/SystemWordmark";
import Sidebar from "./Sidebar";
import ContextSelector from "./ContextSelector";
import UserBadge from "./UserBadge";

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
  const [searchTerm, setSearchTerm] = useState("");
  const logoSrc = systemSettings?.logo_transparent_url ?? systemSettings?.logo_color_url ?? null;

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // TODO: conectar busca global quando houver rota dedicada.
  }

  return (
    <div className="app-grid">
      <Sidebar />
      <main className="app-main">
        <header className="app-header">
          <div className="flex w-full items-center gap-4">
            <div className="flex shrink-0 items-center">
              <Link href="/" className="flex items-center">
                <SystemLogoImage src={logoSrc} width={120} height={60} className="h-10 w-auto" />
              </Link>
            </div>
            <form className="flex w-full flex-1 flex-wrap items-center gap-2" onSubmit={handleSearchSubmit}>
              <input
                className="min-w-[220px] flex-1 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="Buscar pessoa, matricula, turma..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/escola/matriculas/nova"
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-300"
                >
                  Nova matricula
                </Link>
                <Link
                  href="/escola/pessoas/nova"
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-300"
                >
                  Nova pessoa
                </Link>
              </div>
            </form>
            <div className="flex shrink-0 items-center gap-3">
              <ContextSelector />
              <UserBadge />
            </div>
          </div>
        </header>
        <div className="app-content">{children}</div>
      </main>
    </div>
  );
}
