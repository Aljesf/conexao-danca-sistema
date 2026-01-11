"use client";

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
      if (!json.ok) throw new Error(json.error ?? "Falha ao carregar grupos.");
      setGrupos(json.data ?? []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao carregar grupos.";
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
      if (!json.ok) throw new Error(json.error ?? "Falha ao criar grupo.");

      setForm({ nome: "", categoria: "", subcategoria: "", tipo: "DURADOURO", descricao: "" });
      await loadGrupos();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao criar grupo.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-sm text-slate-500">ALUNOS</div>
          <h1 className="text-2xl font-semibold">Grupos de alunos</h1>
          <p className="mt-1 text-sm text-slate-600">
            Grupos administrativos manuais (nao pedagogicos). Use para Companhia, Estagio, Filhos de colaborador, etc.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold">Criar grupo</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">Nome</label>
              <input
                value={form.nome}
                onChange={(e) => setForm((v) => ({ ...v, nome: e.target.value }))}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2"
                placeholder="Ex.: Companhia de Danca"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Categoria</label>
              <input
                value={form.categoria}
                onChange={(e) => setForm((v) => ({ ...v, categoria: e.target.value }))}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2"
                placeholder="Ex.: Companhia"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Subcategoria</label>
              <input
                value={form.subcategoria}
                onChange={(e) => setForm((v) => ({ ...v, subcategoria: e.target.value }))}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2"
                placeholder="Ex.: Mirim (opcional)"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm((v) => ({ ...v, tipo: e.target.value as "TEMPORARIO" | "DURADOURO" }))}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2"
              >
                <option value="DURADOURO">Duradouro</option>
                <option value="TEMPORARIO">Temporario</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Descricao</label>
              <input
                value={form.descricao}
                onChange={(e) => setForm((v) => ({ ...v, descricao: e.target.value }))}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2"
                placeholder="Uso interno (opcional)"
              />
            </div>
          </div>

          {error ? (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={() => void createGrupo()}
              className="rounded-xl border px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Criar grupo"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Grupos cadastrados</h2>
              <p className="text-sm text-slate-600">{loading ? "Carregando..." : `${grupos.length} grupo(s)`}</p>
            </div>

            <div className="w-full max-w-md">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome/categoria/subcategoria"
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2"
              />
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr className="border-b">
                  <th className="py-2 text-left">Grupo</th>
                  <th className="py-2 text-left">Categoria</th>
                  <th className="py-2 text-left">Subcategoria</th>
                  <th className="py-2 text-left">Tipo</th>
                  <th className="py-2 text-right">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {grupos.map((g) => (
                  <tr key={g.id} className="border-b hover:bg-slate-50">
                    <td className="py-2">
                      <div className="font-medium">{g.nome}</div>
                      <div className="text-xs text-slate-500">ID: {g.id}</div>
                    </td>
                    <td className="py-2">{g.categoria}</td>
                    <td className="py-2">{g.subcategoria ?? "-"}</td>
                    <td className="py-2">{g.tipo === "DURADOURO" ? "Duradouro" : "Temporario"}</td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50"
                        onClick={() => alert("Gestao de membros (UI) entra na proxima iteracao.")}
                      >
                        Membros
                      </button>
                    </td>
                  </tr>
                ))}

                {!loading && grupos.length === 0 ? (
                  <tr>
                    <td className="py-6 text-center text-slate-500" colSpan={5}>
                      Nenhum grupo encontrado.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 text-sm text-slate-600 shadow-sm">
          <p className="font-medium text-slate-700">Proxima iteracao</p>
          <p className="mt-1">
            Implementar gestao de membros do grupo (buscar pessoa e adicionar/remover), usando as rotas de API ja criadas.
          </p>
        </div>
      </div>
    </div>
  );
}
