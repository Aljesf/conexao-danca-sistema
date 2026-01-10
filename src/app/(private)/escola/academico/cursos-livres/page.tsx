"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CursoLivre = {
  id: number;
  nome: string;
  classificacao: string;
  status: string;
  data_inicio: string | null;
  data_fim: string | null;
  idade_minima: number | null;
  idade_maxima: number | null;
};

function formatFaixaEtaria(min: number | null, max: number | null): string {
  if (min == null && max == null) return "Sem faixa definida";
  if (min != null && max == null) return `A partir de ${min} anos`;
  if (min != null && max != null) return `De ${min} a ${max} anos`;
  return "Sem faixa definida";
}

export default function CursosLivresPage() {
  const [items, setItems] = useState<CursoLivre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [classificacao, setClassificacao] = useState("WORKSHOP");

  const canSubmit = useMemo(() => nome.trim().length >= 3, [nome]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/academico/cursos-livres", { cache: "no-store" });
        const json = (await res.json()) as {
          cursos_livres?: CursoLivre[];
          error?: string;
          message?: string;
        };
        if (!res.ok) {
          throw new Error(json.message ?? json.error ?? "Falha ao listar cursos livres.");
        }
        setItems(json.cursos_livres ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao listar cursos livres.");
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
      const res = await fetch("/api/academico/cursos-livres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, classificacao }),
      });
      const json = (await res.json()) as { id?: number; error?: string; message?: string };
      if (!res.ok) {
        throw new Error(json.message ?? json.error ?? "Falha ao criar curso livre.");
      }
      window.location.href = `/escola/academico/cursos-livres/${json.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar curso livre.");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Cursos livres</h1>
          <p className="mt-1 text-sm text-slate-600">
            Cadastre cursos pontuais (workshops, intensivos, oficinas). As modalidades sao turmas do tipo CURSO_LIVRE.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold">Novo curso livre</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Nome</label>
              <input
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Curso de Verao 2026"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Classificacao</label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={classificacao}
                onChange={(e) => setClassificacao(e.target.value)}
              >
                <option value="WORKSHOP">Workshop</option>
                <option value="INTENSIVO">Intensivo</option>
                <option value="OFICINA">Oficina</option>
                <option value="MASTERCLASS">Masterclass</option>
                <option value="COLONIA">Colonia</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-rose-600">{error ?? ""}</div>
            <button
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              onClick={onCreate}
              disabled={!canSubmit}
            >
              Criar
            </button>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold">Lista</h2>
          {loading ? (
            <p className="mt-3 text-sm text-slate-600">Carregando...</p>
          ) : items.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">Nenhum curso livre cadastrado.</p>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {items.map((c) => (
                <Link
                  key={c.id}
                  href={`/escola/academico/cursos-livres/${c.id}`}
                  className="rounded-xl border p-4 transition hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{c.nome}</div>
                      <div className="text-sm text-slate-600">
                        {c.classificacao} - {c.status}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        {formatFaixaEtaria(c.idade_minima, c.idade_maxima)}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">ID {c.id}</div>
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
