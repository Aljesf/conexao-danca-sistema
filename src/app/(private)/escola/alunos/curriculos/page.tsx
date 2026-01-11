"use client";

import { useEffect, useMemo, useState } from "react";

type CurriculoRow = {
  pessoa_id: number;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  ativo: boolean | null;
  is_aluno: boolean;
  curriculo_institucional_habilitado: boolean;
  tipo_curriculo_institucional: string | null;
  tem_curriculo: boolean;
};

type ApiResponse<T> = {
  ok: boolean;
  error?: string;
  meta?: { limit: number; offset: number; count: number };
  data?: T;
};

export default function EscolaAlunosCurriculosPage() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [somenteAlunos, setSomenteAlunos] = useState(false);
  const [somenteInstitucional, setSomenteInstitucional] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<CurriculoRow[]>([]);
  const [limit] = useState(30);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const queryString = useMemo(() => {
    const u = new URLSearchParams();
    if (debounced.length >= 2) u.set("search", debounced);
    u.set("limit", String(limit));
    u.set("offset", String(offset));
    if (somenteAlunos) u.set("somenteAlunos", "true");
    if (somenteInstitucional) u.set("somenteInstitucional", "true");
    return u.toString();
  }, [debounced, limit, offset, somenteAlunos, somenteInstitucional]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/escola/alunos/curriculos/busca?${queryString}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        const json = (await res.json()) as ApiResponse<CurriculoRow[]>;
        if (!json.ok) throw new Error(json.error ?? "Falha ao carregar curriculos.");

        if (!cancelled) setRows(json.data ?? []);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Erro inesperado ao carregar curriculos.";
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
  const canNext = rows.length === limit;

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-sm text-slate-500">ALUNOS</div>
          <h1 className="text-2xl font-semibold">Curriculos</h1>
          <p className="mt-1 text-sm text-slate-600">
            Busque curriculos sem grade de cards. Curriculo existe para alunos e para pessoas com curriculo institucional
            habilitado.
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

            <div className="flex flex-col justify-end gap-2">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={somenteAlunos}
                  onChange={(e) => {
                    setOffset(0);
                    setSomenteAlunos(e.target.checked);
                    if (e.target.checked) setSomenteInstitucional(false);
                  }}
                />
                Somente alunos
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={somenteInstitucional}
                  onChange={(e) => {
                    setOffset(0);
                    setSomenteInstitucional(e.target.checked);
                    if (e.target.checked) setSomenteAlunos(false);
                  }}
                />
                Somente institucional
              </label>
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
              <p className="text-sm text-slate-600">
                {loading ? "Carregando..." : `${rows.length} item(ns) nesta pagina`}
              </p>
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
                  <th className="py-2 text-left">Pessoa</th>
                  <th className="py-2 text-left">Tipo</th>
                  <th className="py-2 text-left">Contato</th>
                  <th className="py-2 text-right">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {(rows ?? []).map((r) => {
                  const tipo = r.is_aluno
                    ? "Aluno (academico)"
                    : r.curriculo_institucional_habilitado
                      ? "Institucional"
                      : "Sem curriculo";

                  return (
                    <tr key={r.pessoa_id} className="border-b hover:bg-slate-50">
                      <td className="py-2">
                        <div className="font-medium">{r.nome ?? "-"}</div>
                        <div className="text-xs text-slate-500">ID: {r.pessoa_id}</div>
                      </td>
                      <td className="py-2">{tipo}</td>
                      <td className="py-2">
                        <div>{r.email ?? "-"}</div>
                        <div className="text-xs text-slate-500">{r.telefone ?? "-"}</div>
                      </td>
                      <td className="py-2 text-right">
                    <button
                      type="button"
                      className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50"
                      onClick={() => {
                        window.location.href = `/pessoas/${r.pessoa_id}/curriculo`;
                      }}
                    >
                      Abrir
                    </button>
                      </td>
                    </tr>
                  );
                })}

                {!loading && rows.length === 0 ? (
                  <tr>
                    <td className="py-6 text-center text-slate-500" colSpan={4}>
                      Nenhum curriculo encontrado com os filtros atuais.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 text-sm text-slate-600 shadow-sm">
          <p className="font-medium text-slate-700">Nota</p>
          <p className="mt-1">
            A pagina de detalhe do curriculo sera a proxima iteracao (abrir por pessoa_id). Nesta fase, priorizamos escala
            e busca.
          </p>
        </div>
      </div>
    </div>
  );
}
