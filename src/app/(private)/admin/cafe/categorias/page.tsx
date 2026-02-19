"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CafeCategoriaComSub } from "@/types/cafeCategorias";

type FormState = {
  nome: string;
  ordem: number;
};

type CategoriaPatch = Partial<{
  nome: string;
  ordem: number;
  ativo: boolean;
}>;

export default function AdminCafeCategoriasPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categorias, setCategorias] = useState<CafeCategoriaComSub[]>([]);
  const [novo, setNovo] = useState<FormState>({ nome: "", ordem: 0 });

  const [moverFromId, setMoverFromId] = useState<number | null>(null);
  const [moverToId, setMoverToId] = useState<number | null>(null);
  const [busyMove, setBusyMove] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cafe/categorias?include_inativas=1", {
        method: "GET",
      });
      const json = (await res.json().catch(() => ({}))) as {
        categorias?: CafeCategoriaComSub[];
        error?: string;
      };
      if (!res.ok) throw new Error(json?.error ?? "falha_ao_carregar");
      setCategorias(Array.isArray(json.categorias) ? json.categorias : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "erro_desconhecido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const categoriasAtivas = useMemo(
    () => categorias.filter((c) => c.ativo),
    [categorias],
  );

  async function criarCategoria() {
    if (novo.nome.trim().length < 2) return;
    const res = await fetch("/api/cafe/categorias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: novo.nome.trim(),
        ordem: Number(novo.ordem) || 0,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(json?.error ?? "falha_ao_criar");
      return;
    }
    setNovo({ nome: "", ordem: 0 });
    await reload();
  }

  async function salvarCategoria(id: number, patch: CategoriaPatch) {
    const res = await fetch("/api/cafe/categorias", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(json?.error ?? "falha_ao_salvar");
      return;
    }
    await reload();
  }

  async function moverProdutos() {
    if (moverFromId === null || moverToId === null) return;
    setBusyMove(true);
    setError(null);
    try {
      const res = await fetch(`/api/cafe/categorias/${moverFromId}/mover-produtos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_categoria_id: moverToId }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json?.error ?? "falha_ao_mover");
      setMoverFromId(null);
      setMoverToId(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "erro_desconhecido");
    } finally {
      setBusyMove(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="text-lg font-semibold">Categorias do Cafe</div>
        <div className="text-sm text-slate-600">
          Crie, edite, desative e mova produtos entre categorias sem perder vinculo.
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-3 text-sm font-semibold">Nova categoria</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input
            value={novo.nome}
            onChange={(e) => setNovo((s) => ({ ...s, nome: e.target.value }))}
            className="rounded-xl border px-3 py-2 text-sm"
            placeholder="Ex.: Bebidas"
          />
          <input
            value={String(novo.ordem)}
            onChange={(e) =>
              setNovo((s) => ({ ...s, ordem: Number(e.target.value) || 0 }))
            }
            className="rounded-xl border px-3 py-2 text-sm"
            placeholder="Ordem"
          />
          <button
            type="button"
            onClick={() => void criarCategoria()}
            className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Criar
          </button>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-2 text-sm font-semibold">Mover produtos entre categorias</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <select
            className="rounded-xl border px-3 py-2 text-sm"
            value={moverFromId ?? ""}
            onChange={(e) =>
              setMoverFromId(e.target.value ? Number(e.target.value) : null)
            }
          >
            <option value="">Categoria origem</option>
            {categoriasAtivas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl border px-3 py-2 text-sm"
            value={moverToId ?? ""}
            onChange={(e) => setMoverToId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Categoria destino</option>
            {categoriasAtivas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={busyMove || moverFromId === null || moverToId === null}
            onClick={() => void moverProdutos()}
            className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busyMove ? "Movendo..." : "Mover produtos"}
          </button>
        </div>

        <div className="mt-2 text-xs text-slate-500">
          Depois de mover, desative a categoria incorreta.
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold">Lista</div>
          <button
            type="button"
            onClick={() => void reload()}
            className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50"
          >
            Recarregar
          </button>
        </div>

        {loading ? (
          <div className="text-sm text-slate-500">Carregando...</div>
        ) : (
          <div className="space-y-3">
            {categorias.map((c) => (
              <div key={c.id} className="rounded-2xl border p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold">
                      {c.nome}{" "}
                      {!c.ativo ? (
                        <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          inativa
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-slate-500">
                      slug: {c.slug} | ordem: {c.ordem}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const nome = window.prompt("Novo nome da categoria:", c.nome);
                        if (nome && nome.trim().length >= 2) {
                          void salvarCategoria(c.id, { nome: nome.trim() });
                        }
                      }}
                      className="rounded-xl border px-3 py-2 text-xs hover:bg-slate-50"
                    >
                      Renomear
                    </button>
                    <button
                      type="button"
                      onClick={() => void salvarCategoria(c.id, { ativo: !c.ativo })}
                      className="rounded-xl border px-3 py-2 text-xs hover:bg-slate-50"
                    >
                      {c.ativo ? "Desativar" : "Reativar"}
                    </button>
                  </div>
                </div>

                {c.subcategorias?.length ? (
                  <div className="mt-2 text-xs text-slate-600">
                    Subcategorias: {c.subcategorias.map((s) => s.nome).join(", ")}
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-slate-400">Sem subcategorias.</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
