"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Template = {
  id: string;
  nome: string;
  status: string;
  versao: number | null;
  updated_at: string | null;
};

export default function FormsResultsHubPage() {
  const [items, setItems] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);

    fetch("/api/admin/forms/templates")
      .then((r) => r.json())
      .then((json) => {
        if (!alive) return;
        setItems((json?.data ?? []) as Template[]);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return items;
    return items.filter((t) => (t.nome ?? "").toLowerCase().includes(qq));
  }, [items, q]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Resultados (Formularios)</h1>
          <p className="text-sm text-slate-600">
            Acesse rapidamente quem respondeu e os analytics de cada formulario.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-slate-700">
              <span className="font-medium">Total:</span>{" "}
              {loading ? "Carregando..." : filtered.length}
            </div>
            <div className="w-full md:w-96">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar formulario..."
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left">Nome</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Versao</th>
                  <th className="px-3 py-2 text-left">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td className="px-3 py-6 text-slate-500" colSpan={4}>
                      Nenhum formulario encontrado.
                    </td>
                  </tr>
                )}

                {filtered.map((t) => (
                  <tr key={t.id} className="border-b last:border-b-0 hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-900">{t.nome}</div>
                    </td>
                    <td className="px-3 py-2">{t.status}</td>
                    <td className="px-3 py-2">{t.versao ?? "-"}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-3">
                        <Link className="text-indigo-600 hover:underline" href={`/admin/forms/templates/${t.id}/responses`}>
                          Respostas
                        </Link>
                        <Link className="text-indigo-600 hover:underline" href={`/admin/forms/templates/${t.id}/analytics`}>
                          Analytics
                        </Link>
                        <Link className="text-slate-600 hover:underline" href={`/admin/forms/templates/${t.id}`}>
                          Abrir
                        </Link>
                      </div>
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

          <p className="text-xs text-slate-500">
            Observacao: esta tela e um hub de leitura. A criacao/edicao permanece em
            &quot;Formularios (Templates)&quot;.
          </p>
        </div>
      </div>
    </div>
  );
}
