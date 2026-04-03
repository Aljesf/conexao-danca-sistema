"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Grupo = {
  id: number;
  nome: string;
  categoria: string;
  subcategoria: string | null;
  tipo: "TEMPORARIO" | "DURADOURO";
  descricao: string | null;
  ativo: boolean;
  data_inicio: string | null;
  data_fim: string | null;
};

type ApiResponse<T> = {
  ok: boolean;
  error?: string;
  data?: T;
};

export default function EscolaAlunosGruposPage() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [grupos, setGrupos] = useState<Grupo[]>([]);

  const [form, setForm] = useState({
    nome: "",
    categoria: "",
    subcategoria: "",
    tipo: "DURADOURO" as "TEMPORARIO" | "DURADOURO",
    descricao: "",
  });

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const qs = useMemo(() => {
    const u = new URLSearchParams();
    if (debounced.length >= 2) u.set("search", debounced);
    return u.toString();
  }, [debounced]);

  const loadGrupos = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/escola/alunos/grupos?${qs}`, { method: "GET" });
      const json = (await res.json()) as ApiResponse<Grupo[]>;
      if (!json.ok) throw new Error(json.error ?? "Falha ao carregar nucleos.");
      setGrupos(json.data ?? []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao carregar nucleos.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [qs]);

  useEffect(() => {
    void loadGrupos();
  }, [loadGrupos]);

  async function createGrupo() {
    setSaving(true);
    setError(null);

    try {
      const payload = {
        nome: form.nome.trim(),
        categoria: form.categoria.trim(),
        subcategoria: form.subcategoria.trim() ? form.subcategoria.trim() : null,
        tipo: form.tipo,
        descricao: form.descricao.trim() ? form.descricao.trim() : null,
      };

      const res = await fetch("/api/escola/alunos/grupos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json()) as ApiResponse<Grupo>;
      if (!json.ok) throw new Error(json.error ?? "Falha ao criar nucleo.");

      setForm({ nome: "", categoria: "", subcategoria: "", tipo: "DURADOURO", descricao: "" });
      await loadGrupos();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao criar nucleo.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(244,114,182,0.12),_transparent_30%),linear-gradient(to_bottom,_#fff7fb,_#ffffff)] px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_28px_80px_-48px_rgba(15,23,42,0.35)]">
          <div className="grid gap-6 px-6 py-7 md:grid-cols-[1.2fr_0.8fr] md:px-8">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Escola</div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Nucleos</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Agrupamentos administrativos e estrategicos para companhia, elenco, estagio, beneficios internos e
                outros contextos de organizacao dos alunos.
              </p>
            </div>

            <div className="grid gap-3 rounded-[24px] border border-pink-100 bg-pink-50/60 p-4 text-sm text-slate-600 sm:grid-cols-3 md:grid-cols-1">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Nucleos</div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">{grupos.length}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Busca</div>
                <div className="mt-1">Pesquise por nome, categoria ou subnucleo.</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Modulo</div>
                <div className="mt-1">Listagem institucional com detalhe proprio por nucleo.</div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.35)] md:p-8">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Cadastrar nucleo</h2>
              <p className="text-sm text-slate-600">Preencha os dados basicos para criar um novo agrupamento.</p>
            </div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Cadastro administrativo</div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Nome</span>
              <input
                value={form.nome}
                onChange={(e) => setForm((v) => ({ ...v, nome: e.target.value }))}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
                placeholder="Ex.: Companhia de Danca"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Categoria</span>
              <input
                value={form.categoria}
                onChange={(e) => setForm((v) => ({ ...v, categoria: e.target.value }))}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
                placeholder="Ex.: Companhia"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Subnucleo</span>
              <input
                value={form.subcategoria}
                onChange={(e) => setForm((v) => ({ ...v, subcategoria: e.target.value }))}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
                placeholder="Ex.: Mirim"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Tipo</span>
              <select
                value={form.tipo}
                onChange={(e) => setForm((v) => ({ ...v, tipo: e.target.value as "TEMPORARIO" | "DURADOURO" }))}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
              >
                <option value="DURADOURO">Duradouro</option>
                <option value="TEMPORARIO">Temporario</option>
              </select>
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Descricao</span>
              <textarea
                value={form.descricao}
                onChange={(e) => setForm((v) => ({ ...v, descricao: e.target.value }))}
                className="mt-1 min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
                placeholder="Descreva rapidamente o objetivo deste nucleo."
              />
            </label>
          </div>

          {error ? (
            <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          ) : null}

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={() => void createGrupo()}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Criar nucleo"}
            </button>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.35)] md:p-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Nucleos cadastrados</h2>
              <p className="text-sm text-slate-600">
                {loading ? "Carregando..." : `${grupos.length} nucleo(s) disponivel(is)`}
              </p>
            </div>

            <div className="w-full max-w-md">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Buscar</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nome, categoria ou subnucleo"
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
                />
              </label>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {grupos.map((grupo) => (
              <article
                key={grupo.id}
                className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5 transition hover:border-slate-300 hover:bg-white"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-950">{grupo.nome}</h3>
                      <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {grupo.tipo === "DURADOURO" ? "Duradouro" : "Temporario"}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                      {grupo.categoria ? (
                        <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200">{grupo.categoria}</span>
                      ) : null}
                      {grupo.subcategoria ? (
                        <span className="rounded-full bg-pink-50 px-2.5 py-1 text-pink-700 ring-1 ring-pink-100">
                          {grupo.subcategoria}
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">
                      {grupo.descricao?.trim() || "Sem descricao cadastrada para este nucleo."}
                    </p>
                  </div>

                  <Link
                    href={`/escola/alunos/grupos/${grupo.id}`}
                    className="inline-flex rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    Abrir nucleo
                  </Link>
                </div>
              </article>
            ))}

            {!loading && grupos.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500 lg:col-span-2">
                Nenhum nucleo encontrado para os filtros atuais.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
