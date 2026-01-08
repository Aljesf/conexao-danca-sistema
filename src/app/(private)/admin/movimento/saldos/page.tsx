"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Row = Record<string, unknown>;

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  return (await res.json()) as T;
}

export default function MovimentoSaldosPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    apiGet<{ ok: boolean; data: Row[] }>("/api/admin/movimento/saldos")
      .then((r) => {
        if (!alive) return;
        setItems(r.ok ? r.data : []);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-white px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-lg font-semibold text-slate-800">Saldos</h1>
              <p className="text-sm text-slate-600">Saldo disponivel por competencia/tipo/origem.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <Link className="rounded-md border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50" href="/admin/movimento">
                Voltar ao painel
              </Link>
              <Link className="rounded-md border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50" href="/admin/movimento/lotes">
                Lotes
              </Link>
            </div>
          </div>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          {loading ? (
            <div className="text-sm text-slate-600">Carregando...</div>
          ) : items.length === 0 ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Nenhum saldo encontrado.
            </div>
          ) : (
            <pre className="text-xs overflow-auto">{JSON.stringify(items, null, 2)}</pre>
          )}
        </section>
      </div>
    </div>
  );
}
