import type { SupabaseClient } from "@supabase/supabase-js";
import { analisarTicketComIA, buildAnalysisText } from "./analisar-ticket-ia";
import type { SuporteAnaliseIaModo, SuporteTicketAnexo, SuporteTicketTipo } from "./constants";
import { listSupportTicketAttachments } from "./ticket-attachments";

export const SUPPORT_ANALYSIS_SELECT_FIELDS = [
  "id",
  "codigo",
  "tipo",
  "status",
  "prioridade",
  "titulo",
  "descricao",
  "contexto_slug",
  "contexto_nome",
  "rota_path",
  "url_completa",
  "pagina_titulo",
  "origem",
  "screenshot_url",
  "reported_by",
  "responsavel_uuid",
  "created_at",
  "updated_at",
  "resolved_at",
  "erro_mensagem",
  "erro_stack",
  "erro_nome",
  "user_agent",
  "viewport_largura",
  "viewport_altura",
  "dados_contexto_json",
  "dados_tecnicos_json",
  "analise_ia_texto",
  "analise_ia_md",
  "analise_ia_json",
  "analise_ia_solicitada",
  "analise_ia_status",
  "analise_ia_modo",
  "analise_ia_solicitada_em",
  "analise_ia_solicitada_por",
  "analise_ia_concluida_em",
].join(",");

export type SupportTicketAnalysisRow = {
  id: number;
  codigo: string | null;
  tipo: SuporteTicketTipo;
  status: string;
  prioridade: string;
  titulo: string | null;
  descricao: string;
  contexto_slug: string | null;
  contexto_nome: string | null;
  rota_path: string | null;
  url_completa: string | null;
  pagina_titulo: string | null;
  origem: string | null;
  screenshot_url: string | null;
  reported_by: string | null;
  responsavel_uuid: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  erro_mensagem: string | null;
  erro_stack: string | null;
  erro_nome: string | null;
  user_agent: string | null;
  viewport_largura: number | null;
  viewport_altura: number | null;
  dados_contexto_json: Record<string, unknown>;
  dados_tecnicos_json: Record<string, unknown>;
  analise_ia_texto: string | null;
  analise_ia_md: string | null;
  analise_ia_json: Record<string, unknown> | null;
  analise_ia_solicitada: boolean;
  analise_ia_status: string | null;
  analise_ia_modo: SuporteAnaliseIaModo | null;
  analise_ia_solicitada_em: string | null;
  analise_ia_solicitada_por: string | null;
  analise_ia_concluida_em: string | null;
};

type RunSupportTicketAnalysisParams = {
  supabase: SupabaseClient;
  ticket: SupportTicketAnalysisRow;
  modo: SuporteAnaliseIaModo;
  requestedBy: string | null;
  log?: (level: "info" | "warn" | "error", payload: Record<string, unknown>) => void;
};

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function loadSupportTicketForAnalysis(
  supabase: SupabaseClient,
  ticketId: number,
): Promise<SupportTicketAnalysisRow | null> {
  const { data, error } = await supabase
    .from("suporte_tickets")
    .select(SUPPORT_ANALYSIS_SELECT_FIELDS)
    .eq("id", ticketId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    ...data,
    dados_contexto_json: asRecord(data.dados_contexto_json),
    dados_tecnicos_json: asRecord(data.dados_tecnicos_json),
    analise_ia_json: asRecord(data.analise_ia_json),
  } as SupportTicketAnalysisRow;
}

export async function loadSupportTicketAttachments(
  supabase: SupabaseClient,
  ticketId: number,
): Promise<SuporteTicketAnexo[]> {
  const attachmentsByTicketId = await listSupportTicketAttachments(supabase, [ticketId]);
  return attachmentsByTicketId.get(ticketId) ?? [];
}

export async function runSupportTicketAnalysis({
  supabase,
  ticket,
  modo,
  requestedBy,
  log,
}: RunSupportTicketAnalysisParams): Promise<SupportTicketAnalysisRow> {
  const now = new Date().toISOString();

  const { data: processingTicket, error: processingError } = await supabase
    .from("suporte_tickets")
    .update({
      analise_ia_solicitada: true,
      analise_ia_status: "processando",
      analise_ia_modo: modo,
      analise_ia_solicitada_em: ticket.analise_ia_solicitada_em ?? now,
      analise_ia_solicitada_por: ticket.analise_ia_solicitada_por ?? requestedBy,
    })
    .eq("id", ticket.id)
    .select(SUPPORT_ANALYSIS_SELECT_FIELDS)
    .single();

  if (processingError || !processingTicket) {
    throw new Error(processingError?.message ?? "falha_ao_marcar_analise_como_processando");
  }

  const hydratedTicket = {
    ...(processingTicket as SupportTicketAnalysisRow),
    dados_contexto_json: asRecord(processingTicket.dados_contexto_json),
    dados_tecnicos_json: asRecord(processingTicket.dados_tecnicos_json),
    analise_ia_json: asRecord(processingTicket.analise_ia_json),
  };

  const attachments = await loadSupportTicketAttachments(supabase, ticket.id);

  try {
    const analysis = await analisarTicketComIA({
      ticket: {
        id: hydratedTicket.id,
        codigo: hydratedTicket.codigo,
        tipo: hydratedTicket.tipo,
        titulo: hydratedTicket.titulo,
        descricao: hydratedTicket.descricao,
        contexto_slug: hydratedTicket.contexto_slug,
        contexto_nome: hydratedTicket.contexto_nome,
        rota_path: hydratedTicket.rota_path,
        url_completa: hydratedTicket.url_completa,
        pagina_titulo: hydratedTicket.pagina_titulo,
        erro_mensagem: hydratedTicket.erro_mensagem,
        erro_stack: hydratedTicket.erro_stack,
        dados_contexto_json: hydratedTicket.dados_contexto_json,
        dados_tecnicos_json: hydratedTicket.dados_tecnicos_json,
      },
      attachments,
      modo,
    });

    const { data: updatedTicket, error: updateError } = await supabase
      .from("suporte_tickets")
      .update({
        analise_ia_texto: buildAnalysisText(analysis),
        analise_ia_md: analysis.markdown,
        analise_ia_json: analysis.json,
        analise_ia_solicitada: true,
        analise_ia_status: "concluida",
        analise_ia_modo: modo,
        analise_ia_solicitada_em: hydratedTicket.analise_ia_solicitada_em ?? now,
        analise_ia_solicitada_por: hydratedTicket.analise_ia_solicitada_por ?? requestedBy,
        analise_ia_concluida_em: new Date().toISOString(),
      })
      .eq("id", ticket.id)
      .select(SUPPORT_ANALYSIS_SELECT_FIELDS)
      .single();

    if (updateError || !updatedTicket) {
      throw new Error(updateError?.message ?? "falha_ao_salvar_analise_ia");
    }

    log?.("info", {
      stage: "analysis_saved",
      ticket_id: ticket.id,
      model: analysis.json.meta.model,
      modo,
      attachments_considered: analysis.json.meta.attachmentsConsiderados,
    });

    return {
      ...(updatedTicket as SupportTicketAnalysisRow),
      dados_contexto_json: asRecord(updatedTicket.dados_contexto_json),
      dados_tecnicos_json: asRecord(updatedTicket.dados_tecnicos_json),
      analise_ia_json: asRecord(updatedTicket.analise_ia_json),
    };
  } catch (error) {
    const failureMessage = error instanceof Error ? error.message : "falha_analise_ia";

    await supabase
      .from("suporte_tickets")
      .update({
        analise_ia_solicitada: true,
        analise_ia_status: "falhou",
        analise_ia_modo: modo,
        analise_ia_solicitada_em: hydratedTicket.analise_ia_solicitada_em ?? now,
        analise_ia_solicitada_por: hydratedTicket.analise_ia_solicitada_por ?? requestedBy,
      })
      .eq("id", ticket.id);

    log?.("warn", {
      stage: "analysis_failed",
      ticket_id: ticket.id,
      modo,
      error: failureMessage,
    });

    throw error instanceof Error ? error : new Error(failureMessage);
  }
}

