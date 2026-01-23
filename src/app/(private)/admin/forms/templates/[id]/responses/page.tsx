"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Pessoa = { id: number; nome: string | null; telefone?: string | null; email?: string | null };
type Item = {
  id: string;
  status: string;
  submitted_at: string | null;
  created_at: string;
  pessoa_id: number;
  pessoas: Pessoa | null;
};

export default function TemplateResponsesPage() {
  const params = useParams<{ id: string }>();
  const templateId = params.id;

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [q, setQ] = useState<string>("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/forms/templates/${templateId}/responses`)
      .then((r) => r.json())
      .then((json) => {
        if (!alive) return;
        setItems((json?.items ?? []) as Item[]);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [templateId]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return items;
    return items.filter((it) => (it.pessoas?.nome ?? "").toLowerCase().includes(qq));
  }, [items, q]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">Respostas do Formulário</h1>
              <p className="text-sm text-slate-600">
                Veja quem respondeu e acesse cada resposta individual.
              </p>
            </div>

            <div className="flex gap-2">
              <Link
                className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-slate-50"
                href={`/admin/forms/templates/${templateId}/analytics`}
              >
                Ver analytics
              </Link>
              <Link
                className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-slate-50"
                href="/admin/forms/templates"
              >
                Voltar
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-slate-700">
              <span className="font-medium">Total:</span>{" "}
              {loading ? "Carregando..." : filtered.length}
            </div>
            <div className="w-full md:w-80">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nome..."
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left">Pessoa</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Preenchido em</th>
                  <th className="px-3 py-2 text-left">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && !loading && (
                  <tr>
                    <td className="px-3 py-6 text-slate-500" colSpan={4}>
                      Nenhuma resposta encontrada.
                    </td>
                  </tr>
                )}

                {filtered.map((it) => (
                  <tr key={it.id} className="border-b last:border-b-0 hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-900">
                        {it.pessoas?.nome ?? `Pessoa #${it.pessoa_id}`}
                      </div>
                      <div className="text-xs text-slate-500">
                        {it.pessoas?.telefone ?? ""}
                        {it.pessoas?.telefone && it.pessoas?.email ? " • " : ""}
                        {it.pessoas?.email ?? ""}
                      </div>
                    </td>
                    <td className="px-3 py-2">{it.status}</td>
                    <td className="px-3 py-2">
                      {it.submitted_at
                        ? new Date(it.submitted_at).toLocaleString("pt-BR")
                        : "-"}
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        className="text-indigo-600 hover:underline"
                        href={`/admin/forms/submissions/${it.id}`}
                      >
                        Ver resposta
                      </Link>
                    </td>
                  </tr>
                ))}

                {loading && (
                  <tr>
                    <td className="px-3 py-6 text-slate-500" colSpan={4}>
                      Carregando...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
