import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isSuporteUploadOrigem,
  type SuporteTicketAnexo,
} from "./constants";
import { extractScreenContextFromContextJson, SUPORTE_BUCKET } from "./upload-anexos";

type TicketAttachmentSource = {
  id: number;
  screenshot_url?: string | null;
  dados_contexto_json?: Record<string, unknown> | null;
};

type SupportAttachmentRow = {
  id?: unknown;
  ticket_id?: unknown;
  storage_bucket?: unknown;
  storage_path?: unknown;
  public_url?: unknown;
  nome_arquivo?: unknown;
  mime_type?: unknown;
  tamanho_bytes?: unknown;
  largura?: unknown;
  altura?: unknown;
  origem_upload?: unknown;
  screen_context_json?: unknown;
  metadata_json?: unknown;
  created_at?: unknown;
};

function normalizeString(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length ? normalized : null;
}

function normalizeInteger(value: unknown, fallback = 0) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.trunc(value));
}

function normalizeNullableInteger(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const normalized = Math.max(0, Math.trunc(value));
  return normalized > 0 ? normalized : null;
}

function normalizeRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function getLegacySupportScreenshotUrl<T extends TicketAttachmentSource>(ticket: T) {
  return normalizeString(ticket.screenshot_url);
}

function resolveAttachmentUrl(
  supabase: SupabaseClient,
  storageBucket: string,
  storagePath: string | null,
  publicUrl: string | null,
) {
  if (publicUrl) return publicUrl;
  if (!storagePath) return "";
  if (/^https?:\/\//i.test(storagePath)) return storagePath;

  const { data } = supabase.storage.from(storageBucket).getPublicUrl(storagePath);
  return normalizeString(data.publicUrl) ?? storagePath;
}

async function normalizeAttachmentRow(
  supabase: SupabaseClient,
  row: SupportAttachmentRow,
): Promise<SuporteTicketAnexo> {
  const storage_bucket = normalizeString(row.storage_bucket) ?? SUPORTE_BUCKET;
  const storage_path = normalizeString(row.storage_path) ?? "";
  const public_url = resolveAttachmentUrl(
    supabase,
    storage_bucket,
    storage_path,
    normalizeString(row.public_url),
  );

  return {
    id: normalizeInteger(row.id),
    ticket_id: normalizeInteger(row.ticket_id),
    storage_bucket,
    storage_path,
    public_url,
    nome_arquivo: normalizeString(row.nome_arquivo) ?? "anexo-suporte.png",
    mime_type: normalizeString(row.mime_type) ?? "image/png",
    tamanho_bytes: normalizeInteger(row.tamanho_bytes),
    largura: normalizeNullableInteger(row.largura),
    altura: normalizeNullableInteger(row.altura),
    origem_upload: isSuporteUploadOrigem(row.origem_upload) ? row.origem_upload : "file_picker",
    screen_context_json: normalizeRecord(row.screen_context_json),
    metadata_json: normalizeRecord(row.metadata_json),
    created_at: normalizeString(row.created_at) ?? new Date(0).toISOString(),
  };
}

export async function listSupportTicketAttachments(
  supabase: SupabaseClient,
  ticketIds: number[],
): Promise<Map<number, SuporteTicketAnexo[]>> {
  const uniqueIds = Array.from(new Set(ticketIds.filter((value) => Number.isInteger(value) && value > 0)));
  const output = new Map<number, SuporteTicketAnexo[]>();

  if (!uniqueIds.length) return output;

  const { data, error } = await supabase
    .from("suporte_ticket_anexos")
    .select("*")
    .in("ticket_id", uniqueIds)
    .order("created_at", { ascending: true });

  if (error || !Array.isArray(data)) {
    return output;
  }

  const normalizedRows = await Promise.all(
    data.map((row) => normalizeAttachmentRow(supabase, row as SupportAttachmentRow)),
  );

  for (const attachment of normalizedRows) {
    const current = output.get(attachment.ticket_id) ?? [];
    current.push(attachment);
    output.set(attachment.ticket_id, current);
  }

  return output;
}

export function mergeLegacySupportAttachment<T extends TicketAttachmentSource>(
  ticket: T,
  attachments: SuporteTicketAnexo[],
): SuporteTicketAnexo[] {
  const legacyUrl = getLegacySupportScreenshotUrl(ticket) ?? "";
  if (!legacyUrl) return attachments;

  const alreadyPresent = attachments.some((attachment) => attachment.public_url === legacyUrl);
  if (alreadyPresent) return attachments;

  const legacyAttachment: SuporteTicketAnexo = {
    id: -ticket.id,
    ticket_id: ticket.id,
    storage_bucket: SUPORTE_BUCKET,
    storage_path: legacyUrl,
    public_url: legacyUrl,
    nome_arquivo: `screenshot-legado-ticket-${ticket.id}.png`,
    mime_type: "image/png",
    tamanho_bytes: 0,
    largura: null,
    altura: null,
    origem_upload: "legacy",
    screen_context_json: extractScreenContextFromContextJson(ticket.dados_contexto_json),
    metadata_json: { legacy: true },
    created_at: new Date(0).toISOString(),
  };

  return [legacyAttachment, ...attachments];
}

export { getLegacySupportScreenshotUrl };
