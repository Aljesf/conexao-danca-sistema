"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Row = Record<string, unknown>;

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  return (await res.json()) as T;
}

export default function MovimentoDeficitPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    apiGet<{ ok: boolean; data: Row[] }>("/api/admin/movimento/deficit")
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
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Deficit Institucional</h1>
          <p className="text-sm text-muted-foreground">
            Creditos concedidos sem lastro em lote (leitura institucional).
          </p>
        </div>
        <div className="flex gap-2">
          <Link className="px-3 py-2 rounded-md border text-sm" href="/administracao/movimento">
            Voltar ao painel
          </Link>
        </div>
      </div>

      <section className="rounded-xl border p-4">
        {loading ? (
          <div className="text-sm text-muted-foreground">Carregando...</div>
        ) : (
          <pre className="text-xs overflow-auto">{JSON.stringify(items, null, 2)}</pre>
        )}
      </section>
    </div>
  );
}
