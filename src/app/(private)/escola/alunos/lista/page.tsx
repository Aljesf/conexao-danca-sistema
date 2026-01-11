"use client";

import { useEffect, useMemo, useState } from "react";

type AlunoRow = {
  pessoa_id: number;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  ativo: boolean | null;
};

type ApiResponse<T> = {
  ok: boolean;
  error?: string;
  meta?: { limit: number; offset: number; count: number };
  data?: T;
};

export default function EscolaAlunosListaPage() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<AlunoRow[]>([]);
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const queryString = useMemo(() => {
    const u = new URLSearchParams();
    if (debounced.length >= 2) u.set("search", debounced);
    u.set("limit", String(limit));
    u.set("offset", String(offset));
    return u.toString();
  }, [debounced, limit, offset]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/escola/alunos/lista?${queryString}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        const json = (await res.json()) as ApiResponse<AlunoRow[]>;
        if (!json.ok) throw new Error(json.error ?? "Falha ao carregar alunos.");

        if (!cancelled) {
          setRows(json.data ?? []);
          setCount(json.meta?.count ?? 0);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Erro inesperado ao carregar alunos.";
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [queryString]);

  const canPrev = offset > 0;
  const canNext = offset + limit < count;

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-sm text-slate-500">ALUNOS</div>
          <h1 className="text-2xl font-semibold">Lista de alunos</h1>
          <p className="mt-1 text-sm text-slate-600">
            Exibe somente pessoas com vinculo de aluno (role ALUNO). Cadastro de aluno e feito via matricula.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Buscar</label>
              <input
                value={search}
                onChange={(e) => {
                  setOffset(0);
                  setSearch(e.target.value);
                }}
                placeholder="Digite nome, e-mail ou telefone (min. 2 caracteres)"
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setOffset(0);
                }}
                className="w-full rounded-xl border px-3 py-2 text-sm hover:bg-slate-50"
              >
                Limpar
              </button>
            </div>
          </div>

          {error ? (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Resultados</h2>
              <p className="text-sm text-slate-600">{loading ? "Carregando..." : `${count} encontrado(s)`}</p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={!canPrev || loading}
                onClick={() => setOffset((v) => Math.max(v - limit, 0))}
                className="rounded-xl border px-3 py-2 text-sm disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={!canNext || loading}
                onClick={() => setOffset((v) => v + limit)}
                className="rounded-xl border px-3 py-2 text-sm disabled:opacity-50"
              >
                Proxima
              </button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr className="border-b">
                  <th className="py-2 text-left">Nome</th>
                  <th className="py-2 text-left">E-mail</th>
                  <th className="py-2 text-left">Telefone</th>
                  <th className="py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {(rows ?? []).map((r) => (
                  <tr key={r.pessoa_id} className="border-b hover:bg-slate-50">
                    <td className="py-2">{r.nome ?? "-"}</td>
                    <td className="py-2">{r.email ?? "-"}</td>
                    <td className="py-2">{r.telefone ?? "-"}</td>
                    <td className="py-2 text-right">{r.ativo ? "Ativo" : "Inativo"}</td>
                  </tr>
                ))}

                {!loading && rows.length === 0 ? (
                  <tr>
                    <td className="py-6 text-center text-slate-500" colSpan={4}>
                      Nenhum aluno encontrado.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 text-sm text-slate-600 shadow-sm">
          <p className="font-medium text-slate-700">Nota</p>
          <p className="mt-1">Novo aluno foi removido: aluno nasce por matricula. Esta tela e leitura e busca operacional.</p>
        </div>
      </div>
    </div>
  );
}
