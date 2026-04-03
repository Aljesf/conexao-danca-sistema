"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, Bot, CheckCircle2, Clock3, Copy, FileJson, LifeBuoy, LoaderCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { TicketAttachmentsGrid } from "@/components/suporte/TicketAttachmentsGrid";
import {
  type SuporteAnaliseIa,
  SUPORTE_ANALISE_IA_MODO_LABEL,
  SUPORTE_ANALISE_IA_STATUS_LABEL,
  SUPORTE_BADGE_CLASS,
  SUPORTE_PRIORIDADE_LABEL,
  SUPORTE_STATUS_LABEL,
  SUPORTE_TICKET_PRIORIDADES,
  SUPORTE_TIPO_LABEL,
  type SuporteAnaliseIaModo,
  type SuporteAnaliseIaStatus,
  type SuporteTicketDetalhe,
  type SuporteTicketStatus,
} from "@/lib/suporte/constants";

type ApiResponse = {
  ok: boolean;
  ticket?: SuporteTicketDetalhe;
  error?: string;
};

function Badge({ label, tone }: { label: string; tone: keyof typeof SUPORTE_BADGE_CLASS }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${SUPORTE_BADGE_CLASS[tone]}`}>
      {label}
    </span>
  );
}

function normalizarTexto(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized || null;
}

function normalizarSugestoes(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function markdownToHtmlLegivel(markdown: string) {
  const lines = markdown.trim().split(/\r?\n/);
  const html: string[] = [];
  let listBuffer: string[] = [];
  let paragraphBuffer: string[] = [];

  const flushList = () => {
    if (!listBuffer.length) return;
    html.push(`<ul class="list-disc space-y-2 pl-5">${listBuffer.join("")}</ul>`);
    listBuffer = [];
  };

  const flushParagraph = () => {
    if (!paragraphBuffer.length) return;
    html.push(`<p>${paragraphBuffer.join("<br/>")}</p>`);
    paragraphBuffer = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const escaped = escapeHtml(line.trim());

    if (!line.trim()) {
      flushList();
      flushParagraph();
      continue;
    }

    if (line.startsWith("## ")) {
      flushList();
      flushParagraph();
      html.push(`<h3 class="mt-5 text-sm font-semibold uppercase tracking-wide text-slate-900">${escapeHtml(line.slice(3).trim())}</h3>`);
      continue;
    }

    if (line.startsWith("# ")) {
      flushList();
      flushParagraph();
      html.push(`<h2 class="mt-5 text-base font-semibold text-slate-900">${escapeHtml(line.slice(2).trim())}</h2>`);
      continue;
    }

    if (line.startsWith("- ")) {
      flushParagraph();
      listBuffer.push(`<li>${escapeHtml(line.slice(2).trim())}</li>`);
      continue;
    }

    flushList();
    paragraphBuffer.push(escaped);
  }

  flushList();
  flushParagraph();

  return html.join("") || "<p></p>";
}

type AnaliseAutomaticaView = {
  requested: boolean;
  status: SuporteAnaliseIaStatus;
  mode: SuporteAnaliseIaModo | null;
  markdown: string | null;
  json: SuporteAnaliseIa | null;
  requestedAt: string | null;
  completedAt: string | null;
};

function extrairAnaliseAutomatica(ticket: SuporteTicketDetalhe | null): AnaliseAutomaticaView {
  const emptyState: AnaliseAutomaticaView = {
    requested: false,
    status: "nao_solicitada",
    mode: null,
    markdown: null,
    json: null,
    requestedAt: null,
    completedAt: null,
  };

  if (!ticket) return emptyState;

  const raw =
    ticket.analise_ia_json && typeof ticket.analise_ia_json === "object"
      ? (ticket.analise_ia_json as Record<string, unknown>)
      : null;

  const requested = Boolean(ticket.analise_ia_solicitada);
  const status = (ticket.analise_ia_status ?? (raw ? "concluida" : "nao_solicitada")) as SuporteAnaliseIaStatus;
  const mode = (ticket.analise_ia_modo ??
    (raw?.meta && typeof raw.meta === "object" && typeof (raw.meta as Record<string, unknown>).modo === "string"
      ? ((raw.meta as Record<string, unknown>).modo as SuporteAnaliseIaModo)
      : null)) as SuporteAnaliseIaModo | null;

  if (!raw) {
    return {
      ...emptyState,
      requested,
      status,
      mode,
      markdown: normalizarTexto(ticket.analise_ia_md) ?? normalizarTexto(ticket.analise_ia_texto),
      requestedAt: ticket.analise_ia_solicitada_em ?? null,
      completedAt: ticket.analise_ia_concluida_em ?? null,
    };
  }

  const metaRaw =
    raw.meta && typeof raw.meta === "object" ? (raw.meta as Record<string, unknown>) : {};

  const resumo = normalizarTexto(raw.resumo) ?? normalizarTexto(ticket.analise_ia_texto) ?? "Resumo nao informado.";
  const naturezaProblema =
    normalizarTexto(raw.natureza_problema) ?? normalizarTexto(raw.causaProvavel) ?? "Hipotese tecnica nao informada.";
  const impactoEstimado =
    normalizarTexto(raw.impacto_estimado) ?? normalizarTexto(raw.impacto) ?? "Impacto nao informado.";
  const areaSistema =
    normalizarTexto(raw.area_sistema) ?? normalizarTexto(raw.area) ?? "Analise geral";

  const json: SuporteAnaliseIa = {
    resumo,
    natureza_problema: naturezaProblema,
    impacto_estimado: impactoEstimado,
    area_sistema: areaSistema,
    hipoteses: normalizarSugestoes(raw.hipoteses ?? raw.sugestoes ?? [naturezaProblema]),
    sinais_detectados: normalizarSugestoes(raw.sinais_detectados),
    sugestoes_investigacao: normalizarSugestoes(raw.sugestoes_investigacao ?? raw.sugestoes),
    limitacoes: normalizarSugestoes(raw.limitacoes),
    fontes_utilizadas: normalizarSugestoes(raw.fontes_utilizadas),
    meta: {
      fonte: "OPENAI",
      model: normalizarTexto(metaRaw.model),
      createdAt: normalizarTexto(metaRaw.createdAt) ?? ticket.updated_at,
      modo:
        (normalizarTexto(metaRaw.modo) as SuporteAnaliseIaModo | null) ??
        mode ??
        "contextual",
      status: "concluida",
      attachmentsConsiderados:
        typeof metaRaw.attachmentsConsiderados === "number" ? metaRaw.attachmentsConsiderados : 0,
      imagensConsideradas:
        typeof metaRaw.imagensConsideradas === "number" ? metaRaw.imagensConsideradas : 0,
      leituraTecnicaAprofundada: Boolean(metaRaw.leituraTecnicaAprofundada),
    },
  };

  return {
    requested,
    status,
    mode: mode ?? json.meta.modo,
    markdown:
      normalizarTexto(ticket.analise_ia_md) ??
      normalizarTexto(raw.markdown) ??
      normalizarTexto(ticket.analise_ia_texto),
    json,
    requestedAt: ticket.analise_ia_solicitada_em ?? null,
    completedAt: ticket.analise_ia_concluida_em ?? null,
  };
}

function formatarDataHora(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR");
}

function resumirEstadoTemporal(ticket: SuporteTicketDetalhe) {
  if (ticket.esta_resolvido) {
    return {
      estado: "Resolvido",
      destaque: ticket.tempo_resolucao_formatado ?? "-",
      rotuloDestaque: "Tempo total de resolucao",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  return {
    estado: "Em aberto",
    destaque: ticket.tempo_aberto_formatado ?? "-",
    rotuloDestaque: "Aberto ha",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  };
}

export default function SuporteTicketDetalheClient({ ticketId }: { ticketId: string }) {
  const [ticket, setTicket] = useState<SuporteTicketDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const copyFeedbackTimeoutRef = useRef<number | null>(null);
  const [form, setForm] = useState({
    status: "" as SuporteTicketStatus | "",
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

  useEffect(() => {
    return () => {
      if (copyFeedbackTimeoutRef.current) {
        window.clearTimeout(copyFeedbackTimeoutRef.current);
      }
    };
  }, []);

  async function salvarAlteracoes(payload?: Partial<{ status: string; prioridade: string; responsavel_uuid: string | null }>) {
    setSaving(true);
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch(`/api/suporte/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: payload?.status ?? form.status,
          prioridade: payload?.prioridade ?? form.prioridade,
          responsavel_uuid: (payload?.responsavel_uuid ?? form.responsavel_uuid) || null,
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

  function agendarLimpezaCopyFeedback() {
    if (copyFeedbackTimeoutRef.current) {
      window.clearTimeout(copyFeedbackTimeoutRef.current);
    }

    copyFeedbackTimeoutRef.current = window.setTimeout(() => {
      setCopyFeedback(null);
      copyFeedbackTimeoutRef.current = null;
    }, 1800);
  }

  const contextoLegivel = useMemo(() => {
    if (!ticket) return null;
    const screenContext =
      ticket.dados_contexto_json?.screen_context && typeof ticket.dados_contexto_json.screen_context === "object"
        ? (ticket.dados_contexto_json.screen_context as Record<string, unknown>)
        : {};

    return {
      resumo:
        typeof ticket.dados_contexto_json?.screen_context_summary === "string"
          ? ticket.dados_contexto_json.screen_context_summary
          : typeof screenContext.resumoLegivel === "string"
            ? screenContext.resumoLegivel
            : null,
      entityLabel:
        typeof ticket.dados_contexto_json?.entity_label === "string"
          ? ticket.dados_contexto_json.entity_label
          : typeof screenContext.entityLabel === "string"
            ? screenContext.entityLabel
            : null,
      alunoNome:
        typeof ticket.dados_contexto_json?.aluno_nome === "string"
          ? ticket.dados_contexto_json.aluno_nome
          : typeof screenContext.alunoNome === "string"
            ? screenContext.alunoNome
            : null,
      responsavelNome:
        typeof ticket.dados_contexto_json?.responsavel_nome === "string"
          ? ticket.dados_contexto_json.responsavel_nome
          : typeof screenContext.responsavelNome === "string"
            ? screenContext.responsavelNome
            : null,
      turmaNome:
        typeof ticket.dados_contexto_json?.turma_nome === "string"
          ? ticket.dados_contexto_json.turma_nome
          : typeof screenContext.turmaNome === "string"
            ? screenContext.turmaNome
            : null,
    };
  }, [ticket]);

  const contextoTecnico = useMemo(() => {
    if (!ticket) return null;
    return {
      rota: ticket.rota_path,
      url: ticket.url_completa,
      browser: ticket.user_agent,
      viewport: {
        largura: ticket.viewport_largura,
        altura: ticket.viewport_altura,
      },
      usuario: {
        id: ticket.dados_contexto_json?.usuario_id ?? ticket.reported_by ?? null,
        email: ticket.dados_contexto_json?.usuario_email ?? null,
        nome: ticket.dados_contexto_json?.usuario_nome ?? null,
      },
      dados_tecnicos_json: ticket.dados_tecnicos_json ?? {},
    };
  }, [ticket]);

  const analiseAutomatica = useMemo(() => extrairAnaliseAutomatica(ticket), [ticket]);
  const analiseMarkdownHtml = useMemo(
    () => (analiseAutomatica.markdown ? markdownToHtmlLegivel(analiseAutomatica.markdown) : ""),
    [analiseAutomatica.markdown],
  );

  async function copiarAnaliseMarkdown() {
    if (!analiseAutomatica.markdown) return;

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("clipboard_indisponivel");
      }

      await navigator.clipboard.writeText(analiseAutomatica.markdown);
      setCopyFeedback({ tone: "success", message: "Copiado" });
    } catch {
      setCopyFeedback({ tone: "error", message: "Nao foi possivel copiar" });
    }

    agendarLimpezaCopyFeedback();
  }

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

  const estadoTemporal = resumirEstadoTemporal(ticket);

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
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${estadoTemporal.className}`}>
                  {estadoTemporal.estado}
                </span>
              </div>
            </div>
            <div className="grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Criado em</div>
                <div className="mt-1 font-medium text-slate-900">{formatarDataHora(ticket.created_at)}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Ultima atualizacao</div>
                <div className="mt-1 font-medium text-slate-900">{formatarDataHora(ticket.updated_at)}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Estado temporal</div>
                <div className="mt-1 font-medium text-slate-900">{estadoTemporal.estado}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">{estadoTemporal.rotuloDestaque}</div>
                <div className="mt-1 font-medium text-slate-900">{estadoTemporal.destaque}</div>
              </div>
              {ticket.resolved_at ? (
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Resolvido em</div>
                  <div className="mt-1 font-medium text-slate-900">{formatarDataHora(ticket.resolved_at)}</div>
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
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Analise de IA</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Leitura diagnostica opcional baseada na descricao, no contexto da tela e nos anexos disponiveis.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                    {SUPORTE_ANALISE_IA_STATUS_LABEL[analiseAutomatica.status]}
                  </div>
                  {analiseAutomatica.requested && analiseAutomatica.mode ? (
                    <div className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                      {SUPORTE_ANALISE_IA_MODO_LABEL[analiseAutomatica.mode]}
                    </div>
                  ) : null}
                  {analiseAutomatica.json?.meta.model ? (
                    <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {analiseAutomatica.json.meta.model}
                    </div>
                  ) : null}
                </div>
              </div>

              {!analiseAutomatica.requested ? (
                <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                  Nenhuma analise de IA foi solicitada para este ticket.
                </div>
              ) : analiseAutomatica.status === "solicitada" || analiseAutomatica.status === "processando" ? (
                <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sm text-sky-900">
                  <div className="flex items-center gap-2 font-semibold">
                    <Clock3 className="h-4 w-4" />
                    Analise em andamento
                  </div>
                  <div className="mt-2">
                    A solicitacao foi registrada e o ticket continua normal. Atualize esta tela em instantes para ver o laudo concluido.
                  </div>
                  {analiseAutomatica.requestedAt ? (
                    <div className="mt-3 text-xs text-sky-800/80">
                      Solicitada em {new Date(analiseAutomatica.requestedAt).toLocaleString("pt-BR")}.
                    </div>
                  ) : null}
                </div>
              ) : analiseAutomatica.status === "falhou" && !analiseAutomatica.markdown ? (
                <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="h-4 w-4" />
                    Falha na analise de IA
                  </div>
                  <div className="mt-2">
                    A solicitacao foi registrada, mas a analise nao conseguiu ser concluida. O ticket segue valido e pode ser reprocessado por um admin.
                  </div>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {analiseAutomatica.status === "falhou" ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                      <div className="flex items-center gap-2 font-semibold">
                        <AlertTriangle className="h-4 w-4" />
                        A ultima tentativa de analise falhou
                      </div>
                      <div className="mt-1">
                        O ultimo laudo salvo continua visivel abaixo. Um admin pode solicitar novo reprocessamento.
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <Bot className="h-4 w-4 text-teal-700" />
                        Markdown gerado
                      </div>
                      {analiseAutomatica.markdown ? (
                        <button
                          type="button"
                          onClick={() => void copiarAnaliseMarkdown()}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copiar markdown
                        </button>
                      ) : null}
                    </div>
                    {copyFeedback ? (
                      <div
                        className={`mb-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          copyFeedback.tone === "success"
                            ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border border-amber-200 bg-amber-50 text-amber-700"
                        }`}
                      >
                        {copyFeedback.message}
                      </div>
                    ) : null}
                    <div
                      className="space-y-3 text-sm leading-6 text-slate-700"
                      dangerouslySetInnerHTML={{ __html: analiseMarkdownHtml }}
                    />
                  </div>

                  {analiseAutomatica.completedAt ? (
                    <div className="text-xs text-slate-500">
                      Analise concluida em {new Date(analiseAutomatica.completedAt).toLocaleString("pt-BR")}.
                    </div>
                  ) : null}

                  {analiseAutomatica.json ? (
                    <details className="rounded-2xl border border-slate-200 bg-white p-4">
                      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-slate-900">
                        <FileJson className="h-4 w-4 text-slate-500" />
                        Ver JSON estruturado
                      </summary>
                      <pre className="mt-4 overflow-auto rounded-2xl border border-slate-200 bg-slate-950 p-4 text-xs text-slate-100">
                        {JSON.stringify(analiseAutomatica.json, null, 2)}
                      </pre>
                    </details>
                  ) : null}
                </div>
              )}
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
                  <div className="mt-1 font-medium text-slate-900">{ticket.viewport_largura || "-"} x {ticket.viewport_altura || "-"}</div>
                </div>
              </div>
              {contextoLegivel?.resumo ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  {contextoLegivel.resumo}
                </div>
              ) : null}
              {contextoLegivel?.entityLabel || contextoLegivel?.alunoNome || contextoLegivel?.responsavelNome || contextoLegivel?.turmaNome ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {contextoLegivel.entityLabel ? <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">Entidade: {contextoLegivel.entityLabel}</div> : null}
                  {contextoLegivel.alunoNome ? <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">Aluno: {contextoLegivel.alunoNome}</div> : null}
                  {contextoLegivel.responsavelNome ? <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">Responsavel: {contextoLegivel.responsavelNome}</div> : null}
                  {contextoLegivel.turmaNome ? <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">Turma: {contextoLegivel.turmaNome}</div> : null}
                </div>
              ) : null}
            </div>

            <TicketAttachmentsGrid
              attachments={ticket.attachments ?? []}
              legacyScreenshotUrl={ticket.legacyScreenshotUrl ?? ticket.screenshot_url}
            />

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
          </section>

          <aside className="space-y-6">
            <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Acoes do ticket</h2>
              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Status</label>
                  <select
                    value={form.status}
                    onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as SuporteTicketStatus }))}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-300"
                  >
                    {["ABERTO", "EM_ANALISE", "EM_DESENVOLVIMENTO", "AGUARDANDO_VALIDACAO", "CONCLUIDO", "CANCELADO"].map((option) => (
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
                      <option key={option} value={option}>{SUPORTE_PRIORIDADE_LABEL[option]}</option>
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
              {error ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div> : null}
              <button
                type="button"
                onClick={() => void salvarAlteracoes({ status: "CONCLUIDO" })}
                disabled={saving || ticket.esta_resolvido}
                className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
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
