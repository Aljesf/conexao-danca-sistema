"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type TicketStatus = "ABERTO" | "EM_ANALISE" | "EM_ANDAMENTO" | "RESOLVIDO" | "FECHADO";

type Ticket = {
  id: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  created_by_name: string | null;
  app_context: string | null;
  pathname: string | null;
  full_url: string | null;
  page_title: string | null;
  entity_ref: string | null;
  observacao: string;
  user_agent: string | null;
  viewport_json: unknown;
  context_json: unknown;
  status: TicketStatus;
  triagem_notas: string | null;
};

const STATUS_OPTIONS: TicketStatus[] = ["ABERTO", "EM_ANALISE", "EM_ANDAMENTO", "RESOLVIDO", "FECHADO"];

function prettyJson(value: unknown) {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

export default function AdminSuporteDetalhePage() {
  const params = useParams<{ id: string }>();
  const ticketId = useMemo(() => params?.id ?? "", [params]);

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [status, setStatus] = useState<TicketStatus>("ABERTO");
  const [triagemNotas, setTriagemNotas] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!ticketId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/suporte/tickets/${ticketId}`);
      const json = (await response.json().catch(() => null)) as { ticket?: Ticket; error?: string } | null;

      if (!response.ok || !json?.ticket) {
        throw new Error(json?.error ?? `falha_http_${response.status}`);
      }

      setTicket(json.ticket);
      setStatus(json.ticket.status);
      setTriagemNotas(json.ticket.triagem_notas ?? "");
    } catch (e: unknown) {
      setTicket(null);
      setError(e instanceof Error ? e.message : "erro_ao_carregar");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    void load();
  }, [load]);

  const salvar = async () => {
    if (!ticket) return;

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/suporte/tickets/${ticket.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, triagem_notas: triagemNotas }),
      });
      const json = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !json?.ok) {
        throw new Error(json?.error ?? `falha_http_${response.status}`);
      }

      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "erro_ao_salvar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4">
        <div className="mx-auto max-w-6xl rounded-2xl border bg-white p-6 shadow-sm">Carregando...</div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4">
        <div className="mx-auto max-w-6xl space-y-3 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold">Ticket nao encontrado</div>
          <Link href="/administracao/suporte" className="text-sm underline">
            Voltar para listagem
          </Link>
          {error ? <div className="text-sm text-red-700">{error}</div> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">Ticket #{ticket.id}</h1>
              <p className="mt-1 text-sm text-slate-600">
                {ticket.page_title?.trim() || "Relato sem titulo"} | criado em{" "}
                {new Date(ticket.created_at).toLocaleString("pt-BR")}
              </p>
            </div>
            <Link href="/administracao/suporte" className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50">
              Voltar
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Status</label>
              <select
                className="mt-1 w-full rounded-lg border p-2"
                value={status}
                onChange={(e) => setStatus(e.target.value as TicketStatus)}
                disabled={saving}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Autor</label>
              <input
                className="mt-1 w-full rounded-lg border p-2"
                value={ticket.created_by_name ?? ticket.created_by ?? "-"}
                readOnly
              />
            </div>
            <div>
              <label className="text-sm font-medium">Atualizado</label>
              <input
                className="mt-1 w-full rounded-lg border p-2"
                value={new Date(ticket.updated_at).toLocaleString("pt-BR")}
                readOnly
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Observacao</label>
            <pre className="mt-1 whitespace-pre-wrap rounded-lg border bg-slate-50 p-3 text-sm">{ticket.observacao}</pre>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Rota</label>
              <input className="mt-1 w-full rounded-lg border p-2" value={ticket.pathname ?? ""} readOnly />
            </div>
            <div>
              <label className="text-sm font-medium">URL completa</label>
              <input className="mt-1 w-full rounded-lg border p-2" value={ticket.full_url ?? ""} readOnly />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Notas de triagem</label>
            <textarea
              className="mt-1 w-full rounded-lg border p-2"
              rows={5}
              value={triagemNotas}
              onChange={(e) => setTriagemNotas(e.target.value)}
              placeholder="Ex.: reproduzido em producao, abrir tarefa para equipe X..."
            />
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          ) : null}

          <button
            type="button"
            onClick={() => void salvar()}
            disabled={saving}
            className="rounded-lg border bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar triagem"}
          </button>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold">Contexto tecnico</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <div className="text-sm font-medium">User-Agent</div>
              <pre className="mt-1 whitespace-pre-wrap rounded-lg border bg-slate-50 p-3 text-xs">
                {ticket.user_agent ?? "-"}
              </pre>
            </div>
            <div>
              <div className="text-sm font-medium">Viewport JSON</div>
              <pre className="mt-1 whitespace-pre-wrap rounded-lg border bg-slate-50 p-3 text-xs">
                {prettyJson(ticket.viewport_json)}
              </pre>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-sm font-medium">Context JSON</div>
            <pre className="mt-1 whitespace-pre-wrap rounded-lg border bg-slate-50 p-3 text-xs">
              {prettyJson(ticket.context_json)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
