import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import {
  inferirPrioridadePorTipo,
  isSuporteAnaliseIaModo,
  isSuporteTicketPrioridade,
  isSuporteTicketResolvido,
  isSuporteTicketStatus,
  isSuporteTicketTipo,
  isSuporteTicketView,
  SUPORTE_TICKET_STATUS,
} from "@/lib/suporte/constants";
import {
  loadSupportTicketForAnalysis,
  runSupportTicketAnalysis,
  SUPPORT_ANALYSIS_SELECT_FIELDS,
} from "@/lib/suporte/processar-analise-ticket-ia";
import { sanitizeSupportPayload } from "@/lib/suporte/sanitizeSupportPayload";
import { listSupportTicketAttachments } from "@/lib/suporte/ticket-attachments";
import { agregarMetricasTickets, enriquecerTicketComTempo } from "@/lib/suporte/tempo";
import {
  normalizeSupportAttachmentsFromFormData,
  persistSupportAttachments,
} from "@/lib/suporte/upload-anexos";

const BASE_SELECT_FIELDS = SUPPORT_ANALYSIS_SELECT_FIELDS;
const METRICS_SELECT_FIELDS = "id,status,prioridade,tipo,created_at,resolved_at";
const RESOLVED_TICKET_STATUS = SUPORTE_TICKET_STATUS.filter((item) => isSuporteTicketResolvido(item));
const OPEN_TICKET_STATUS = SUPORTE_TICKET_STATUS.filter((item) => !isSuporteTicketResolvido(item));

function logSupportTicketCreate(level: "info" | "warn" | "error", payload: Record<string, unknown>) {
  const message = `[SuporteTicketCreate] ${JSON.stringify(payload)}`;
  if (level === "error") {
    console.error(message);
    return;
  }
  if (level === "warn") {
    console.warn(message);
    return;
  }
  console.info(message);
}

function normalizeString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
}

function normalizeInteger(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.trunc(parsed));
}

function normalizeBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return false;

  const normalized = value.trim().toLowerCase();
  return ["1", "true", "on", "sim", "yes"].includes(normalized);
}

function parseLimit(value: string | null, fallback = 100) {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(200, Math.trunc(parsed)));
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function parseJsonString(value: string | null | undefined) {
  if (!value) return {};

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function mergeSupportContextData(base: Record<string, unknown>, screenContext: Record<string, unknown>) {
  const nestedBase = asRecord(base.screen_context);
  const mergedScreenContext = {
    ...nestedBase,
    ...screenContext,
  };

  return {
    ...base,
    screen_context: mergedScreenContext,
    screen_context_summary:
      normalizeString(String(mergedScreenContext.resumoLegivel ?? ""), 1200) ??
      normalizeString(String(base.screen_context_summary ?? ""), 1200),
    screen_context_labels: {
      entity_label: normalizeString(String(mergedScreenContext.entityLabel ?? ""), 240),
      aluno_nome: normalizeString(String(mergedScreenContext.alunoNome ?? ""), 240),
      responsavel_nome: normalizeString(String(mergedScreenContext.responsavelNome ?? ""), 240),
      turma_nome: normalizeString(String(mergedScreenContext.turmaNome ?? ""), 240),
    },
  };
}

async function parseCreateTicketRequest(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.includes("multipart/form-data")) {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    return {
      body,
      attachments: [],
      screenContext: {},
    };
  }

  const formData = await request.formData();
  const parsed = await normalizeSupportAttachmentsFromFormData(formData);
  const body = {
    tipo: parsed.fields.get("tipo"),
    prioridade: parsed.fields.get("prioridade") ?? undefined,
    titulo: parsed.fields.get("titulo"),
    descricao: parsed.fields.get("descricao"),
    contexto_slug: parsed.fields.get("contexto_slug"),
    contexto_nome: parsed.fields.get("contexto_nome"),
    rota_path: parsed.fields.get("rota_path"),
    url_completa: parsed.fields.get("url_completa"),
    pagina_titulo: parsed.fields.get("pagina_titulo"),
    screenshot_url: parsed.fields.get("screenshot_url"),
    dados_contexto_json: parseJsonString(parsed.fields.get("dados_contexto_json")),
    dados_tecnicos_json: parseJsonString(parsed.fields.get("dados_tecnicos_json")),
    erro_mensagem: parsed.fields.get("erro_mensagem"),
    erro_stack: parsed.fields.get("erro_stack"),
    erro_nome: parsed.fields.get("erro_nome"),
    user_agent: parsed.fields.get("user_agent"),
    viewport_largura: parsed.fields.get("viewport_largura"),
    viewport_altura: parsed.fields.get("viewport_altura"),
    solicitarAnaliseIA: parsed.fields.get("solicitarAnaliseIA"),
    modoAnaliseIA: parsed.fields.get("modoAnaliseIA"),
  } satisfies Record<string, unknown>;

  return {
    body,
    attachments: parsed.attachments,
    screenContext: parsed.screenContext,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const supabase = getSupabaseServiceClient();
  const { searchParams } = new URL(request.url);
  const limit = parseLimit(searchParams.get("limit"), 100);
  const tipo = searchParams.get("tipo");
  const status = searchParams.get("status");
  const prioridade = searchParams.get("prioridade");
  const requestedView = searchParams.get("view");
  const view = isSuporteTicketView(requestedView) ? requestedView : "todos";
  const contextoSlug = normalizeString(searchParams.get("contexto_slug"), 120);
  const includeTechnical = searchParams.get("include_tecnicos") === "1";
  const selectFields = includeTechnical
    ? `${BASE_SELECT_FIELDS},dados_tecnicos_json`
    : BASE_SELECT_FIELDS;

  let query = supabase
    .from("suporte_tickets")
    .select(selectFields)
    .limit(limit);
  let metricsQuery = supabase
    .from("suporte_tickets")
    .select(METRICS_SELECT_FIELDS);

  if (view === "abertos") {
    query = query.in("status", OPEN_TICKET_STATUS).order("created_at", { ascending: true });
    metricsQuery = metricsQuery.in("status", OPEN_TICKET_STATUS);
  } else if (view === "resolvidos") {
    query = query
      .in("status", RESOLVED_TICKET_STATUS)
      .order("resolved_at", { ascending: false })
      .order("created_at", { ascending: false });
    metricsQuery = metricsQuery.in("status", RESOLVED_TICKET_STATUS);
  } else {
    query = query.order("created_at", { ascending: false });
  }

  if (isSuporteTicketTipo(tipo)) {
    query = query.eq("tipo", tipo);
    metricsQuery = metricsQuery.eq("tipo", tipo);
  }
  if (isSuporteTicketStatus(status)) {
    query = query.eq("status", status);
    metricsQuery = metricsQuery.eq("status", status);
  }
  if (isSuporteTicketPrioridade(prioridade)) {
    query = query.eq("prioridade", prioridade);
    metricsQuery = metricsQuery.eq("prioridade", prioridade);
  }
  if (contextoSlug) {
    query = query.eq("contexto_slug", contextoSlug);
    metricsQuery = metricsQuery.eq("contexto_slug", contextoSlug);
  }

  const [{ data, error }, { data: metricRows, error: metricsError }] = await Promise.all([
    query,
    metricsQuery,
  ]);

  if (error || metricsError) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? metricsError?.message ?? "falha_listar_tickets" },
      { status: 500 },
    );
  }

  const items = Array.isArray(data) ? data : [];
  const attachmentsByTicketId = await listSupportTicketAttachments(
    supabase,
    items
      .map((item) => Number(item.id))
      .filter((value) => Number.isInteger(value) && value > 0),
  );
  const now = new Date();

  const hydratedItems = items
    .map((item) => ({
      ...item,
      attachments_count: attachmentsByTicketId.get(Number(item.id))?.length ?? (item.screenshot_url ? 1 : 0),
    }))
    .map((item) => enriquecerTicketComTempo(item, now));

  const metrics = agregarMetricasTickets(Array.isArray(metricRows) ? metricRows : [], now);

  return NextResponse.json({ ok: true, items: hydratedItems, metrics });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const parsedRequest = await parseCreateTicketRequest(request).catch((error) => {
    return error instanceof Error ? error : new Error("payload_invalido");
  });

  if (parsedRequest instanceof Error) {
    return NextResponse.json({ ok: false, error: parsedRequest.message }, { status: 400 });
  }

  const { body, attachments, screenContext } = parsedRequest;
  if (!body) {
    return NextResponse.json({ ok: false, error: "payload_invalido" }, { status: 400 });
  }

  logSupportTicketCreate("info", {
    stage: "request_received",
    attachments_requested: attachments.length,
    solicitar_analise_ia: normalizeBoolean(body.solicitarAnaliseIA),
    modo_analise_ia: body.modoAnaliseIA,
    attachment_files: attachments.map((attachment) => ({
      nome_arquivo: attachment.nome_arquivo,
      mime_type: attachment.mime_type,
      tamanho_bytes: attachment.tamanho_bytes,
      origem_upload: attachment.origem_upload,
    })),
  });

  const tipo = body.tipo;
  if (!isSuporteTicketTipo(tipo)) {
    return NextResponse.json({ ok: false, error: "tipo_invalido" }, { status: 400 });
  }

  if ("prioridade" in body && body.prioridade !== undefined && !isSuporteTicketPrioridade(body.prioridade)) {
    return NextResponse.json({ ok: false, error: "prioridade_invalida" }, { status: 400 });
  }

  const descricao = normalizeString(body.descricao, 4000);
  if (!descricao) {
    return NextResponse.json({ ok: false, error: "descricao_obrigatoria" }, { status: 400 });
  }

  const solicitarAnaliseIA = normalizeBoolean(body.solicitarAnaliseIA);
  const modoAnaliseIA = isSuporteAnaliseIaModo(body.modoAnaliseIA) ? body.modoAnaliseIA : "contextual";
  if (solicitarAnaliseIA && body.modoAnaliseIA !== undefined && body.modoAnaliseIA !== null && !isSuporteAnaliseIaModo(body.modoAnaliseIA)) {
    return NextResponse.json({ ok: false, error: "modo_analise_ia_invalido" }, { status: 400 });
  }

  const dadosContextoBase = mergeSupportContextData(asRecord(body.dados_contexto_json), screenContext);
  const dadosTecnicosBase = {
    ...asRecord(body.dados_tecnicos_json),
    attachments_requested: attachments.length,
    support_input_mode: attachments.length > 0 ? "multipart" : "json",
  };

  const dadosContexto = sanitizeSupportPayload(dadosContextoBase, {
    maxDepth: 4,
    maxStringLength: 700,
    maxSerializedLength: 10000,
  });
  const dadosTecnicos = sanitizeSupportPayload(dadosTecnicosBase, {
    maxDepth: 5,
    maxStringLength: 1500,
    maxSerializedLength: 12000,
  });

  const payload = {
    tipo,
    prioridade: isSuporteTicketPrioridade(body.prioridade)
      ? body.prioridade
      : inferirPrioridadePorTipo(tipo),
    titulo: normalizeString(body.titulo, 160),
    descricao,
    contexto_slug: normalizeString(body.contexto_slug, 120),
    contexto_nome: normalizeString(body.contexto_nome, 160),
    rota_path: normalizeString(body.rota_path, 500),
    url_completa: normalizeString(body.url_completa, 2048),
    pagina_titulo: normalizeString(body.pagina_titulo, 220),
    origem: "BOTAO_FLUTUANTE",
    screenshot_url: normalizeString(body.screenshot_url, 2048),
    dados_contexto_json: dadosContexto.sanitized,
    dados_tecnicos_json: dadosTecnicos.sanitized,
    erro_mensagem: normalizeString(body.erro_mensagem, 1000),
    erro_stack: normalizeString(body.erro_stack, 12000),
    erro_nome: normalizeString(body.erro_nome, 200),
    user_agent: normalizeString(body.user_agent, 1200),
    viewport_largura: normalizeInteger(body.viewport_largura),
    viewport_altura: normalizeInteger(body.viewport_altura),
    reported_by: auth.userId,
    analise_ia_solicitada: solicitarAnaliseIA,
    analise_ia_status: solicitarAnaliseIA ? "solicitada" : "nao_solicitada",
    analise_ia_modo: solicitarAnaliseIA ? modoAnaliseIA : null,
    analise_ia_solicitada_em: solicitarAnaliseIA ? new Date().toISOString() : null,
    analise_ia_solicitada_por: solicitarAnaliseIA ? auth.userId : null,
    analise_ia_concluida_em: null,
    analise_ia_md: null,
    analise_ia_json: null,
    analise_ia_texto: null,
  };

  const supabase = getSupabaseServiceClient();
  const { data: insertedTicket, error: insertError } = await supabase
    .from("suporte_tickets")
    .insert(payload)
    .select(BASE_SELECT_FIELDS)
    .single();

  if (insertError) {
    logSupportTicketCreate("error", {
      stage: "ticket_insert",
      error: insertError.message,
      attachments_requested: attachments.length,
    });
    return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
  }

  logSupportTicketCreate("info", {
    stage: "ticket_created",
    ticket_id: insertedTicket.id,
    codigo: insertedTicket.codigo,
    attachments_requested: attachments.length,
    solicitar_analise_ia: solicitarAnaliseIA,
    modo_analise_ia: solicitarAnaliseIA ? modoAnaliseIA : null,
  });

  let ticket = insertedTicket;
  let savedAttachments = [] as Awaited<ReturnType<typeof persistSupportAttachments>>["saved"];
  let failedAttachments = [] as Awaited<ReturnType<typeof persistSupportAttachments>>["failed"];

  if (attachments.length > 0) {
    try {
      const persisted = await persistSupportAttachments({
        supabase,
        ticketId: ticket.id,
        attachments,
        screenContext,
      });

      savedAttachments = persisted.saved;
      failedAttachments = persisted.failed;
    } catch (error) {
      const message = error instanceof Error ? error.message : "falha_inesperada_no_upload";
      failedAttachments = attachments.map((attachment) => ({
        clientId: attachment.clientId,
        nome_arquivo: attachment.nome_arquivo,
        stage: "validate_infra" as const,
        error: message,
        failureReason: "infraestrutura de anexos indisponivel",
      }));
      logSupportTicketCreate("error", {
        stage: "attachments_persist_unhandled",
        ticket_id: ticket.id,
        error: message,
      });
    }

    logSupportTicketCreate(failedAttachments.length > 0 ? "warn" : "info", {
      stage: "attachments_finished",
      ticket_id: ticket.id,
      requested_count: attachments.length,
      saved_count: savedAttachments.length,
      failed_count: failedAttachments.length,
      failed_items: failedAttachments.map((item) => ({
        nome_arquivo: item.nome_arquivo,
        stage: item.stage,
        failure_reason: item.failureReason,
        error: item.error,
      })),
    });

    if (savedAttachments.length > 0 && !ticket.screenshot_url) {
      const { data: updatedTicket } = await supabase
        .from("suporte_tickets")
        .update({ screenshot_url: savedAttachments[0].public_url })
        .eq("id", ticket.id)
        .select(BASE_SELECT_FIELDS)
        .single();

      if (updatedTicket) {
        ticket = updatedTicket;
      }
    }
  }

  if (solicitarAnaliseIA) {
    try {
      const hydratedTicket = await loadSupportTicketForAnalysis(supabase, ticket.id);
      if (!hydratedTicket) {
        throw new Error("ticket_nao_encontrado_para_analise");
      }

      ticket = await runSupportTicketAnalysis({
        supabase,
        ticket: hydratedTicket,
        modo: modoAnaliseIA,
        requestedBy: auth.userId,
        log: logSupportTicketCreate,
      });
    } catch (error) {
      const fallbackTicket = await loadSupportTicketForAnalysis(supabase, ticket.id);
      if (fallbackTicket) {
        ticket = fallbackTicket;
      }

      logSupportTicketCreate("warn", {
        stage: "analysis_request_failed",
        ticket_id: ticket.id,
        modo: modoAnaliseIA,
        error: error instanceof Error ? error.message : "falha_analise_ia",
      });
    }
  }

  return NextResponse.json(
    {
      ok: true,
      ticket,
      attachments: savedAttachments,
      analysis: {
        requested: Boolean(ticket.analise_ia_solicitada),
        status: ticket.analise_ia_status ?? "nao_solicitada",
        mode: ticket.analise_ia_modo ?? null,
      },
      upload_summary: {
        requested_count: attachments.length,
        saved_count: savedAttachments.length,
        failed_count: failedAttachments.length,
        failed_items: failedAttachments,
      },
    },
    { status: 201 },
  );
}
