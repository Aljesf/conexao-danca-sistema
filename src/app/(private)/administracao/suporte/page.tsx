"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Ticket = {
  id: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  created_by_name: string | null;
  pathname: string | null;
  page_title: string | null;
  observacao: string;
  status: "ABERTO" | "EM_ANALISE" | "EM_ANDAMENTO" | "RESOLVIDO" | "FECHADO";
  triagem_notas: string | null;
};

const STATUS_OPTIONS = ["ABERTO", "EM_ANALISE", "EM_ANDAMENTO", "RESOLVIDO", "FECHADO"] as const;

function excerpt(text: string, max = 120) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max)}...`;
}

export default function AdminSuportePage() {
  const [items, setItems] = useState<Ticket[]>([]);
  const [status, setStatus] = useState<string>("");
  const [q, setQ] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (status) sp.set("status", status);
    if (q.trim()) sp.set("q", q.trim());
    return sp.toString();
  }, [status, q]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    fetch(`/api/admin/suporte/tickets?${queryString}`)
      .then(async (response) => {
        const json = (await response.json().catch(() => null)) as { items?: Ticket[]; error?: string } | null;
        if (!response.ok) {
          throw new Error(json?.error ?? `falha_http_${response.status}`);
        }
        return json;
      })
      .then((json) => {
        if (!alive) return;
        setItems(Array.isArray(json?.items) ? json.items : []);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setItems([]);
        setError(e instanceof Error ? e.message : "erro_ao_carregar");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [queryString]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Suporte (NASC)</h1>
          <p className="mt-1 text-sm text-slate-600">
            Triagem administrativa dos relatos enviados pelo botao flutuante.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Status</label>
              <select
                className="mt-1 w-full rounded-lg border p-2"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">Todos</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium">Busca (observacao)</label>
              <input
                className="mt-1 w-full rounded-lg border p-2"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Ex.: salvar, erro, matricula, fatura..."
              />
            </div>
          </div>

          {error ? (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          ) : null}

          <div className="mt-4 overflow-x-auto rounded-xl border">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                <tr>
                  <th className="p-3 text-left">ID</th>
                  <th className="p-3 text-left">Observacao</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Rota</th>
                  <th className="p-3 text-left">Autor</th>
                  <th className="p-3 text-left">Criado</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="p-3" colSpan={6}>
                      Carregando...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td className="p-3" colSpan={6}>
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                ) : (
                  items.map((ticket) => (
                    <tr key={ticket.id} className="border-t hover:bg-slate-50">
                      <td className="p-3">{ticket.id}</td>
                      <td className="p-3">
                        <Link className="underline" href={`/administracao/suporte/${ticket.id}`}>
                          {ticket.page_title?.trim() || `Ticket #${ticket.id}`}
                        </Link>
                        <div className="mt-1 text-xs text-slate-500">{excerpt(ticket.observacao)}</div>
                      </td>
                      <td className="p-3">{ticket.status}</td>
                      <td className="p-3">{ticket.pathname ?? "-"}</td>
                      <td className="p-3">{ticket.created_by_name ?? ticket.created_by ?? "-"}</td>
                      <td className="p-3">{new Date(ticket.created_at).toLocaleString("pt-BR")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
