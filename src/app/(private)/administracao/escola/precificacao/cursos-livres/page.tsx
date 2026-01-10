"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CursoLivre = { id: number; nome: string };
type Tabela = {
  id: number;
  curso_livre_id: number;
  titulo: string;
  ano_referencia: number | null;
  ativo: boolean;
};

export default function PrecificacaoCursosLivresPage() {
  const [cursos, setCursos] = useState<CursoLivre[]>([]);
  const [tabelas, setTabelas] = useState<Tabela[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cursoLivreId, setCursoLivreId] = useState<number | "">("");
  const [titulo, setTitulo] = useState("");
  const [ano, setAno] = useState("");
  const [ativo, setAtivo] = useState(true);

  const canSubmit = useMemo(() => cursoLivreId !== "" && titulo.trim().length >= 3, [cursoLivreId, titulo]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [r1, r2] = await Promise.all([
          fetch("/api/academico/cursos-livres", { cache: "no-store" }),
          fetch("/api/admin/escola/precificacao/cursos-livres", { cache: "no-store" }),
        ]);

        const j1 = (await r1.json()) as { cursos_livres?: CursoLivre[]; error?: string; message?: string };
        const j2 = (await r2.json()) as { tabelas?: Tabela[]; error?: string; message?: string };

        if (!r1.ok) throw new Error(j1.message ?? j1.error ?? "Falha ao listar cursos livres.");
        if (!r2.ok) throw new Error(j2.message ?? j2.error ?? "Falha ao listar tabelas.");

        setCursos((j1.cursos_livres ?? []).map((c) => ({ id: c.id, nome: c.nome })));
        setTabelas(j2.tabelas ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao carregar.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  async function onCreate() {
    if (!canSubmit) return;
    setError(null);
    try {
      const res = await fetch("/api/admin/escola/precificacao/cursos-livres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          curso_livre_id: cursoLivreId,
          titulo,
          ano_referencia: ano ? Number(ano) : null,
          ativo,
        }),
      });
      const json = (await res.json()) as { id?: number; error?: string; message?: string };
      if (!res.ok) throw new Error(json.message ?? json.error ?? "Falha ao criar tabela.");
      window.location.href = `/administracao/escola/precificacao/cursos-livres/${json.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar tabela.");
    }
  }

  const cursosById = useMemo(() => {
    const map = new Map<number, string>();
    cursos.forEach((c) => map.set(c.id, c.nome));
    return map;
  }, [cursos]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Precificacao - Cursos livres</h1>
          <p className="mt-1 text-sm text-slate-600">
            Defina tabelas de preco e tiers (1, 2, 3 modalidades; combos etc.). Apenas 1 tabela ativa por curso livre.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold">Nova tabela</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Curso livre</label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={cursoLivreId}
                onChange={(e) => setCursoLivreId(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">Selecione...</option>
                {cursos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Titulo</label>
              <input
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex.: Preco oficial - Verao 2026"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Ano de referencia (opcional)</label>
              <input
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={ano}
                onChange={(e) => setAno(e.target.value)}
                placeholder="2026"
              />
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input id="ativo" type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
              <label htmlFor="ativo" className="text-sm">
                Ativa (desativa as outras)
              </label>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-rose-600">{error ?? ""}</div>
            <button
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              disabled={!canSubmit}
              onClick={onCreate}
            >
              Criar
            </button>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold">Tabelas cadastradas</h2>
          {loading ? (
            <p className="mt-3 text-sm text-slate-600">Carregando...</p>
          ) : tabelas.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">Nenhuma tabela cadastrada.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {tabelas.map((t) => (
                <Link
                  key={t.id}
                  className="block rounded-xl border p-4 transition hover:bg-slate-50"
                  href={`/administracao/escola/precificacao/cursos-livres/${t.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{t.titulo}</div>
                      <div className="text-sm text-slate-600">
                        Curso livre: {cursosById.get(t.curso_livre_id) ?? `#${t.curso_livre_id}`} • Ano:{" "}
                        {t.ano_referencia ?? "-"} • {t.ativo ? "ATIVA" : "inativa"}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">ID {t.id}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
