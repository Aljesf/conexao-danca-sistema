"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";
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

type GlobalSearchResults = {
  pessoas: Array<{ id: number; nome: string | null; email: string | null; cpf: string | null }>;
  turmas: Array<{ turma_id: number; nome: string; status: string | null }>;
  matriculas: Array<{ id: number; pessoa_id: number | null; ano_referencia: number | null; status: string | null }>;
};

export default function AppShell({ children, systemSettings }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<GlobalSearchResults>({
    pessoas: [],
    turmas: [],
    matriculas: [],
  });
  const logoSrc = systemSettings?.logo_transparent_url ?? systemSettings?.logo_color_url ?? null;

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (debouncedTerm.length >= 2) setSearchOpen(true);
  }

  function handleResultClick() {
    setSearchOpen(false);
    setSearchTerm("");
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (debouncedTerm.length < 2) {
      setSearchResults({ pessoas: [], turmas: [], matriculas: [] });
      setSearchLoading(false);
      setSearchError(null);
      setSearchOpen(false);
      return;
    }

    const controller = new AbortController();
    setSearchLoading(true);
    setSearchError(null);
    setSearchOpen(true);

    fetch(`/api/search?q=${encodeURIComponent(debouncedTerm)}`, { signal: controller.signal })
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as
          | {
              ok?: boolean;
              pessoas?: GlobalSearchResults["pessoas"];
              turmas?: GlobalSearchResults["turmas"];
              matriculas?: GlobalSearchResults["matriculas"];
              error?: string;
            }
          | null;
        if (!res.ok || !body?.ok) {
          throw new Error(body?.error ?? "erro_busca_global");
        }
        setSearchResults({
          pessoas: body?.pessoas ?? [],
          turmas: body?.turmas ?? [],
          matriculas: body?.matriculas ?? [],
        });
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setSearchError(err instanceof Error ? err.message : "erro_busca_global");
        setSearchResults({ pessoas: [], turmas: [], matriculas: [] });
      })
      .finally(() => {
        setSearchLoading(false);
      });

    return () => controller.abort();
  }, [debouncedTerm]);

  const totalResultados =
    searchResults.pessoas.length + searchResults.turmas.length + searchResults.matriculas.length;

  const showEmptyState = !searchLoading && !searchError && totalResultados === 0;

  const showResults =
    searchOpen && (searchLoading || searchError || showEmptyState || totalResultados > 0);

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
              <div className="relative min-w-[220px] flex-1">
                <input
                  className="w-full rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="Buscar pessoa, matricula, turma..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  onFocus={() => {
                    if (debouncedTerm.length >= 2) setSearchOpen(true);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") setSearchOpen(false);
                  }}
                />
                {showResults ? (
                  <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-auto rounded-2xl border border-slate-200 bg-white shadow-lg">
                    {searchLoading ? (
                      <div className="px-4 py-3 text-sm text-slate-500">Buscando...</div>
                    ) : null}
                    {searchError ? (
                      <div className="px-4 py-3 text-sm text-rose-600">
                        Falha na busca global: {searchError}
                      </div>
                    ) : null}
                    {showEmptyState ? (
                      <div className="px-4 py-3 text-sm text-slate-500">
                        Nenhum resultado encontrado.
                      </div>
                    ) : null}
                    {searchResults.pessoas.length > 0 ? (
                      <div className="border-t border-slate-100">
                        <div className="px-4 pt-3 text-[11px] font-semibold uppercase text-slate-500">
                          Pessoas
                        </div>
                        <ul className="pb-2">
                          {searchResults.pessoas.map((pessoa) => (
                            <li key={`pessoa-${pessoa.id}`}>
                              <Link
                                href={`/escola/pessoas/${pessoa.id}`}
                                className="block px-4 py-2 text-sm hover:bg-slate-50"
                                onClick={handleResultClick}
                              >
                                <div className="font-medium">
                                  {pessoa.nome ?? `Pessoa #${pessoa.id}`}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {pessoa.email ?? pessoa.cpf ?? `ID ${pessoa.id}`}
                                </div>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {searchResults.turmas.length > 0 ? (
                      <div className="border-t border-slate-100">
                        <div className="px-4 pt-3 text-[11px] font-semibold uppercase text-slate-500">
                          Turmas
                        </div>
                        <ul className="pb-2">
                          {searchResults.turmas.map((turma) => (
                            <li key={`turma-${turma.turma_id}`}>
                              <Link
                                href={`/escola/academico/turmas/${turma.turma_id}`}
                                className="block px-4 py-2 text-sm hover:bg-slate-50"
                                onClick={handleResultClick}
                              >
                                <div className="font-medium">{turma.nome}</div>
                                <div className="text-xs text-slate-500">
                                  {turma.status ?? "Status indefinido"}
                                </div>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {searchResults.matriculas.length > 0 ? (
                      <div className="border-t border-slate-100">
                        <div className="px-4 pt-3 text-[11px] font-semibold uppercase text-slate-500">
                          Matriculas
                        </div>
                        <ul className="pb-2">
                          {searchResults.matriculas.map((matricula) => (
                            <li key={`matricula-${matricula.id}`}>
                              <Link
                                href={`/escola/matriculas/${matricula.id}`}
                                className="block px-4 py-2 text-sm hover:bg-slate-50"
                                onClick={handleResultClick}
                              >
                                <div className="font-medium">Matricula #{matricula.id}</div>
                                <div className="text-xs text-slate-500">
                                  Ano {matricula.ano_referencia ?? "-"} -{" "}
                                  {matricula.status ?? "Status indefinido"}
                                </div>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
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
