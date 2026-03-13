"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  LifeBuoy,
  LoaderCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  SUPORTE_BADGE_CLASS,
  SUPORTE_PRIORIDADE_LABEL,
  SUPORTE_STATUS_LABEL,
  SUPORTE_TICKET_PRIORIDADES,
  SUPORTE_TICKET_STATUS,
  SUPORTE_TIPO_LABEL,
  type SuporteTicketDetalhe,
} from "@/lib/suporte/constants";

type ApiResponse = {
  ok: boolean;
  ticket?: SuporteTicketDetalhe;
  error?: string;
};

function Badge({
  label,
  tone,
}: {
  label: string;
  tone: keyof typeof SUPORTE_BADGE_CLASS;
}) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${SUPORTE_BADGE_CLASS[tone]}`}>
      {label}
    </span>
  );
}

export default function SuporteTicketDetalheClient({ ticketId }: { ticketId: string }) {
  const [ticket, setTicket] = useState<SuporteTicketDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState({
    status: "",
    prioridade: "",
    responsavel_uuid: "",
  });

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    fetch(`/api/suporte/tickets/${ticketId}`)
      .then(async (response) => {
        const json = (await response.json().catch(() => null)) as ApiResponse | null;
        if (!response.ok || !json?.ok || !json.ticket) {
          throw new Error(json?.error ?? "falha_carregar_ticket");
        }
        return json.ticket;
      })
      .then((data) => {
        if (!active) return;
        setTicket(data);
        setForm({
          status: data.status,
          prioridade: data.prioridade,
          responsavel_uuid: data.responsavel_uuid ?? "",
        });
      })
      .catch((fetchError) => {
        if (!active) return;
        setError(fetchError instanceof Error ? fetchError.message : "falha_carregar_ticket");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [ticketId]);

  async function salvarAlteracoes() {
    setSaving(true);
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch(`/api/suporte/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: form.status,
          prioridade: form.prioridade,
          responsavel_uuid: form.responsavel_uuid || null,
        }),
      });

      const json = (await response.json().catch(() => null)) as ApiResponse | null;
      if (!response.ok || !json?.ok || !json.ticket) {
        throw new Error(json?.error ?? "falha_salvar_ticket");
      }

      setTicket(json.ticket);
      setForm({
        status: json.ticket.status,
        prioridade: json.ticket.prioridade,
        responsavel_uuid: json.ticket.responsavel_uuid ?? "",
      });
      setFeedback("Ticket atualizado com sucesso.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "falha_salvar_ticket");
    } finally {
      setSaving(false);
    }
  }

  async function marcarComoResolvido() {
    setSaving(true);
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch(`/api/suporte/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "CONCLUIDO",
          resolved_at: new Date().toISOString(),
        }),
      });

      const json = (await response.json().catch(() => null)) as ApiResponse | null;
      if (!response.ok || !json?.ok || !json.ticket) {
        throw new Error(json?.error ?? "falha_concluir_ticket");
      }

      setTicket(json.ticket);
      setForm((prev) => ({ ...prev, status: json.ticket!.status }));
      setFeedback("Ticket marcado como resolvido.");
    } catch (resolveError) {
      setError(resolveError instanceof Error ? resolveError.message : "falha_concluir_ticket");
    } finally {
      setSaving(false);
    }
  }

  const contextoTecnico = useMemo(() => {
    if (!ticket) return null;
    return {
      rota: ticket.rota_path,
      url: ticket.url_completa,
      browser: ticket.user_agent,
      usuario: {
        id: ticket.dados_contexto_json?.usuario_id ?? ticket.reported_by ?? null,
        email: ticket.dados_contexto_json?.usuario_email ?? null,
        nome: ticket.dados_contexto_json?.usuario_nome ?? null,
      },
      dados_tecnicos_json: ticket.dados_tecnicos_json ?? {},
    };
  }, [ticket]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Carregando ticket...
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700">{error ?? "Ticket nao encontrado."}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.14),_transparent_35%),linear-gradient(180deg,#f8fffe_0%,#ffffff_100%)] px-4 py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <Link href="/suporte-usuario" className="inline-flex items-center gap-2 text-sm font-medium text-teal-700 hover:text-teal-800">
              <ArrowLeft className="h-4 w-4" />
              Voltar para a listagem
            </Link>
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
              <LifeBuoy className="h-3.5 w-3.5" />
              Ticket de suporte
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Codigo: {ticket.codigo || `Ticket #${ticket.id}`}
              </div>
              <h1 className="text-3xl font-semibold text-slate-900">{ticket.titulo || SUPORTE_TIPO_LABEL[ticket.tipo]}</h1>
              <div className="flex flex-wrap gap-2">
                <Badge label={SUPORTE_TIPO_LABEL[ticket.tipo]} tone={ticket.tipo === "ERRO_SISTEMA" ? "CRITICA" : "MEDIA"} />
                <Badge label={SUPORTE_STATUS_LABEL[ticket.status]} tone={ticket.status} />
                <Badge label={SUPORTE_PRIORIDADE_LABEL[ticket.prioridade]} tone={ticket.prioridade} />
              </div>
              <div className="grid gap-3 pt-2 text-sm text-slate-600 sm:grid-cols-2">
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Contexto</div>
                  <div className="mt-1 font-medium text-slate-900">{ticket.contexto_nome || "-"}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Criado em</div>
                  <div className="mt-1 font-medium text-slate-900">{new Date(ticket.created_at).toLocaleString("pt-BR")}</div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Criado em</div>
                <div className="mt-1 font-medium text-slate-900">{new Date(ticket.created_at).toLocaleString("pt-BR")}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Ultima atualizacao</div>
                <div className="mt-1 font-medium text-slate-900">{new Date(ticket.updated_at).toLocaleString("pt-BR")}</div>
              </div>
              {ticket.resolved_at ? (
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Resolvido em</div>
                  <div className="mt-1 font-medium text-slate-900">{new Date(ticket.resolved_at).toLocaleString("pt-BR")}</div>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Descricao</h2>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">{ticket.descricao}</p>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Contexto da tela</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Contexto</div>
                  <div className="mt-1 font-medium text-slate-900">{ticket.contexto_nome || "-"}</div>
                  <div className="text-xs text-slate-500">{ticket.contexto_slug || "-"}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Rota</div>
                  <div className="mt-1 break-all font-medium text-slate-900">{ticket.rota_path || "-"}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-500">URL completa</div>
                  <div className="mt-1 break-all font-medium text-slate-900">{ticket.url_completa || "-"}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Viewport</div>
                  <div className="mt-1 font-medium text-slate-900">
                    {ticket.viewport_largura || "-"} x {ticket.viewport_altura || "-"}
                  </div>
                </div>
              </div>
            </div>

            {ticket.screenshot_url ? (
              <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h2 className="text-lg font-semibold text-slate-900">Screenshot</h2>
                  <a
                    href={ticket.screenshot_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-teal-700 hover:text-teal-800"
                  >
                    Abrir imagem
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
                <img
                  src={ticket.screenshot_url}
                  alt={`Screenshot do ${ticket.codigo || `ticket ${ticket.id}`}`}
                  className="w-full rounded-3xl border border-slate-200"
                />
              </div>
            ) : null}

            <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Contexto tecnico</h2>
              {ticket.erro_mensagem ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <div className="font-semibold">Resumo do erro</div>
                  <div className="mt-1">{ticket.erro_mensagem}</div>
                </div>
              ) : null}
              <pre className="mt-4 overflow-auto rounded-3xl border border-slate-200 bg-slate-950 p-4 text-xs text-slate-100">
                {JSON.stringify(contextoTecnico, null, 2)}
              </pre>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Historico basico</h2>
              <div className="mt-5 space-y-4">
                <div className="flex gap-4">
                  <div className="mt-1 h-3 w-3 rounded-full bg-teal-600" />
                  <div>
                    <div className="font-medium text-slate-900">Ticket criado</div>
                    <div className="text-sm text-slate-600">{new Date(ticket.created_at).toLocaleString("pt-BR")}</div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="mt-1 h-3 w-3 rounded-full bg-sky-500" />
                  <div>
                    <div className="font-medium text-slate-900">Ultima atualizacao</div>
                    <div className="text-sm text-slate-600">{new Date(ticket.updated_at).toLocaleString("pt-BR")}</div>
                  </div>
                </div>
                {ticket.resolved_at ? (
                  <div className="flex gap-4">
                    <div className="mt-1 h-3 w-3 rounded-full bg-emerald-500" />
                    <div>
                      <div className="font-medium text-slate-900">Encerramento</div>
                      <div className="text-sm text-slate-600">{new Date(ticket.resolved_at).toLocaleString("pt-BR")}</div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Acoes do ticket</h2>
              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Status</label>
                  <select
                    value={form.status}
                    onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-300"
                  >
                    {[
                      "ABERTO",
                      "EM_ANALISE",
                      "EM_DESENVOLVIMENTO",
                      "AGUARDANDO_VALIDACAO",
                      "CONCLUIDO",
                      "CANCELADO",
                    ].map((option) => (
                      <option key={option} value={option}>
                        {SUPORTE_STATUS_LABEL[option as keyof typeof SUPORTE_STATUS_LABEL]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Prioridade</label>
                  <select
                    value={form.prioridade}
                    onChange={(event) => setForm((prev) => ({ ...prev, prioridade: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-300"
                  >
                    {SUPORTE_TICKET_PRIORIDADES.map((option) => (
                      <option key={option} value={option}>
                        {SUPORTE_PRIORIDADE_LABEL[option]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Responsavel</label>
                  <input
                    value={form.responsavel_uuid}
                    onChange={(event) => setForm((prev) => ({ ...prev, responsavel_uuid: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-300"
                    placeholder="Opcional"
                  />
                </div>
              </div>

              {feedback ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-4 w-4" />
                    {feedback}
                  </div>
                </div>
              ) : null}

              {error ? (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>
              ) : null}

              <button
                type="button"
                onClick={() => void marcarComoResolvido()}
                disabled={saving || ticket.status === "CONCLUIDO"}
                className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving && form.status === "CONCLUIDO" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Marcar como resolvido
              </button>

              <button
                type="button"
                onClick={() => void salvarAlteracoes()}
                disabled={saving}
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                {saving ? "Salvando..." : "Salvar alteracoes"}
              </button>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
