import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isSuporteUploadOrigem,
  type SuporteContextoTela,
  type SuporteTicketAnexo,
  type SuporteUploadOrigem,
} from "./constants";
import { sanitizeSupportPayload } from "./sanitizeSupportPayload";

export const SUPORTE_BUCKET = "suporte";
export const SUPORTE_MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
export const SUPORTE_MAX_ATTACHMENT_COUNT = 6;
export const SUPORTE_ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

const MIME_EXTENSION: Record<(typeof SUPORTE_ALLOWED_MIME_TYPES)[number], string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

type AttachmentManifestInput = {
  clientId?: string | null;
  source?: string | null;
  width?: number | null;
  height?: number | null;
  fingerprint?: string | null;
  originalName?: string | null;
  lastModified?: number | null;
};

export type SupportAttachmentStage =
  | "validate_infra"
  | "received"
  | "upload_storage"
  | "url_resolvida"
  | "insert_db";

export type SupportAttachmentFailure = {
  clientId: string;
  nome_arquivo: string;
  stage: SupportAttachmentStage;
  error: string;
  failureReason: string;
};

export type NormalizedSupportAttachment = {
  clientId: string;
  file: File;
  nome_arquivo: string;
  mime_type: (typeof SUPORTE_ALLOWED_MIME_TYPES)[number];
  tamanho_bytes: number;
  largura: number | null;
  altura: number | null;
  origem_upload: SuporteUploadOrigem;
  fingerprint: string | null;
  last_modified: number | null;
};

export type ParsedSupportMultipartPayload = {
  fields: Map<string, string>;
  attachments: NormalizedSupportAttachment[];
  screenContext: Record<string, unknown>;
};

type PersistSupportAttachmentsParams = {
  supabase: SupabaseClient;
  ticketId: number;
  attachments: NormalizedSupportAttachment[];
  screenContext: Record<string, unknown>;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function normalizeText(value: string | null | undefined) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length ? normalized : null;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string" && error.trim()) return error.trim();
  return "falha_ao_salvar_anexo";
}

function buildFailureReason(stage: SupportAttachmentStage, error: unknown) {
  const message = getErrorMessage(error).toLowerCase();

  if (
    message.includes("suporte_ticket_anexos") &&
    (message.includes("does not exist") || message.includes("not found"))
  ) {
    return "tabela de anexos nao encontrada no banco";
  }

  if (message.includes("bucket") && message.includes("not found")) {
    return "bucket de anexos nao encontrado";
  }

  if (message.includes("permission") || message.includes("not authorized") || message.includes("unauthorized")) {
    return "sem permissao para salvar o anexo";
  }

  if (stage === "upload_storage") return "falha no upload do storage";
  if (stage === "insert_db") return "erro ao gravar metadados do anexo";
  if (stage === "validate_infra") return "infraestrutura de anexos indisponivel";
  return "falha ao salvar o anexo";
}

function logSupportAttachment(level: "info" | "warn" | "error", payload: Record<string, unknown>) {
  const message = `[SuporteUpload] ${JSON.stringify(payload)}`;
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

function buildPrintFileName(date: Date, index: number, mimeType: string) {
  const normalizedMime =
    mimeType === "image/jpeg" || mimeType === "image/webp" || mimeType === "image/png"
      ? mimeType
      : "image/png";
  const extension = MIME_EXTENSION[normalizedMime];
  return [
    "print",
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
    String(index + 1).padStart(3, "0"),
  ].join("-") + `.${extension}`;
}

function ensureAllowedMimeType(mimeType: string) {
  return SUPORTE_ALLOWED_MIME_TYPES.includes(mimeType as (typeof SUPORTE_ALLOWED_MIME_TYPES)[number]);
}

function safeFileName(fileName: string | null, mimeType: string, index: number) {
  const sanitized = normalizeText(fileName)?.replace(/[^\w.\-]+/g, "-");
  if (sanitized) return sanitized;
  return buildPrintFileName(new Date(), index, mimeType);
}

function parseManifest(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string" || !raw.trim()) return [] as AttachmentManifestInput[];

  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as AttachmentManifestInput[]) : [];
  } catch {
    return [];
  }
}

function parseScreenContext(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string" || !raw.trim()) return {};

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function uniqueFiles(files: File[]) {
  const seen = new Set<string>();
  const output: File[] = [];

  for (const file of files) {
    const key = [file.name, file.type, file.size, file.lastModified].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(file);
  }

  return output;
}

function mapManifestByClientId(manifest: AttachmentManifestInput[]) {
  const map = new Map<string, AttachmentManifestInput>();

  for (const entry of manifest) {
    const clientId = normalizeText(entry.clientId);
    if (!clientId) continue;
    map.set(clientId, entry);
  }

  return map;
}

function normalizeAttachmentSource(value: unknown, fallback: SuporteUploadOrigem = "file_picker") {
  return isSuporteUploadOrigem(value) ? value : fallback;
}

function normalizeDimension(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const normalized = Math.max(0, Math.trunc(value));
  return normalized > 0 ? normalized : null;
}

function collectFiles(formData: FormData) {
  return uniqueFiles(
    ["files", "files[]", "file", "blob"]
      .flatMap((fieldName) => formData.getAll(fieldName))
      .filter((entry): entry is File => entry instanceof File),
  );
}

export async function ensureSupportBucket(supabase: SupabaseClient) {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw listError;

  const exists = (buckets ?? []).some((bucket) => bucket.name === SUPORTE_BUCKET);
  if (exists) return;

  const { error } = await supabase.storage.createBucket(SUPORTE_BUCKET, {
    public: true,
    fileSizeLimit: SUPORTE_MAX_ATTACHMENT_BYTES,
  });

  if (error && !error.message.toLowerCase().includes("already exists")) {
    throw error;
  }
}

async function ensureSupportAttachmentsTable(supabase: SupabaseClient) {
  const { error } = await supabase
    .from("suporte_ticket_anexos")
    .select("id", { head: true, count: "exact" });

  if (!error) return;

  const message = getErrorMessage(error);
  if (
    message.toLowerCase().includes("suporte_ticket_anexos") &&
    (message.toLowerCase().includes("does not exist") ||
      message.toLowerCase().includes("not found") ||
      message.toLowerCase().includes("could not find the table"))
  ) {
    throw new Error("Tabela public.suporte_ticket_anexos nao encontrada no banco.");
  }

  throw new Error(`Falha ao validar a tabela de anexos: ${message}`);
}

export async function normalizeSupportAttachmentsFromFormData(
  formData: FormData,
): Promise<ParsedSupportMultipartPayload> {
  const files = collectFiles(formData);
  if (files.length > SUPORTE_MAX_ATTACHMENT_COUNT) {
    throw new Error(`Voce pode enviar ate ${SUPORTE_MAX_ATTACHMENT_COUNT} imagens por atendimento.`);
  }

  const manifest = mapManifestByClientId(parseManifest(formData.get("attachments_manifest")));
  const screenContextSanitized = sanitizeSupportPayload(parseScreenContext(formData.get("screen_context")), {
    maxDepth: 4,
    maxStringLength: 700,
    maxSerializedLength: 10000,
  }).sanitized;

  const attachments = files.map((file, index) => {
    const clientId = normalizeText(formData.get(`file_client_id_${index}`)?.toString() ?? null) ?? crypto.randomUUID();
    const manifestEntry = manifest.get(clientId);
    const mimeType = normalizeText(file.type) ?? "image/png";

    if (!ensureAllowedMimeType(mimeType)) {
      throw new Error("Formatos permitidos: PNG, JPG/JPEG e WEBP.");
    }

    if (file.size <= 0 || file.size > SUPORTE_MAX_ATTACHMENT_BYTES) {
      throw new Error(`Cada imagem pode ter no maximo ${Math.round(SUPORTE_MAX_ATTACHMENT_BYTES / 1024 / 1024)} MB.`);
    }

    return {
      clientId,
      file,
      nome_arquivo: safeFileName(
        manifestEntry?.originalName ?? normalizeText(file.name),
        mimeType,
        index,
      ),
      mime_type: mimeType as (typeof SUPORTE_ALLOWED_MIME_TYPES)[number],
      tamanho_bytes: file.size,
      largura: normalizeDimension(manifestEntry?.width),
      altura: normalizeDimension(manifestEntry?.height),
      origem_upload: normalizeAttachmentSource(manifestEntry?.source),
      fingerprint: normalizeText(manifestEntry?.fingerprint),
      last_modified:
        typeof manifestEntry?.lastModified === "number" && Number.isFinite(manifestEntry.lastModified)
          ? Math.trunc(manifestEntry.lastModified)
          : Number.isFinite(file.lastModified)
            ? Math.trunc(file.lastModified)
            : null,
    } satisfies NormalizedSupportAttachment;
  });

  const fields = new Map<string, string>();
  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string") continue;
    fields.set(key, value);
  }

  return {
    fields,
    attachments,
    screenContext: screenContextSanitized,
  };
}

export async function persistSupportAttachments({
  supabase,
  ticketId,
  attachments,
  screenContext,
}: PersistSupportAttachmentsParams): Promise<{
  saved: SuporteTicketAnexo[];
  failed: SupportAttachmentFailure[];
}> {
  const saved: SuporteTicketAnexo[] = [];
  const failed: SupportAttachmentFailure[] = [];
  const now = new Date();
  const year = String(now.getFullYear());
  const month = pad(now.getMonth() + 1);

  try {
    await ensureSupportBucket(supabase);
    await ensureSupportAttachmentsTable(supabase);
    logSupportAttachment("info", {
      stage: "validate_infra",
      ticket_id: ticketId,
      attachments_requested: attachments.length,
      infra_ok: true,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    const failureReason = buildFailureReason("validate_infra", error);
    logSupportAttachment("error", {
      stage: "validate_infra",
      ticket_id: ticketId,
      attachments_requested: attachments.length,
      error: message,
      failure_reason: failureReason,
    });

    return {
      saved,
      failed: attachments.map((attachment) => ({
        clientId: attachment.clientId,
        nome_arquivo: attachment.nome_arquivo,
        stage: "validate_infra",
        error: message,
        failureReason,
      })),
    };
  }

  for (const attachment of attachments) {
    const extension = MIME_EXTENSION[attachment.mime_type];
    const path = `tickets/${year}/${month}/ticket-${ticketId}/${crypto.randomUUID()}.${extension}`;
    let currentStage: SupportAttachmentStage = "received";

    try {
      logSupportAttachment("info", {
        stage: currentStage,
        ticket_id: ticketId,
        nome_arquivo: attachment.nome_arquivo,
        mime_type: attachment.mime_type,
        tamanho_bytes: attachment.tamanho_bytes,
        origem_upload: attachment.origem_upload,
      });

      const bytes = new Uint8Array(await attachment.file.arrayBuffer());
      currentStage = "upload_storage";
      const { error: uploadError } = await supabase.storage.from(SUPORTE_BUCKET).upload(path, bytes, {
        contentType: attachment.mime_type,
        upsert: false,
      });

      if (uploadError) throw uploadError;

      currentStage = "url_resolvida";
      const { data } = supabase.storage.from(SUPORTE_BUCKET).getPublicUrl(path);
      const resolvedPublicUrl = normalizeText(data.publicUrl) ?? path;
      if (!normalizeText(data.publicUrl)) {
        logSupportAttachment("warn", {
          stage: currentStage,
          ticket_id: ticketId,
          nome_arquivo: attachment.nome_arquivo,
          storage_path: path,
          warning: "public_url indisponivel; usando storage_path como fallback",
        });
      }

      const screenContextPayload = sanitizeSupportPayload(screenContext, {
        maxDepth: 4,
        maxStringLength: 700,
        maxSerializedLength: 10000,
      }).sanitized;
      const metadataPayload = sanitizeSupportPayload(
        {
          client_id: attachment.clientId,
          fingerprint: attachment.fingerprint,
          last_modified: attachment.last_modified,
        },
        {
          maxDepth: 3,
          maxStringLength: 200,
          maxSerializedLength: 2000,
        },
      ).sanitized;

      currentStage = "insert_db";
      const { data: inserted, error: insertError } = await supabase
        .from("suporte_ticket_anexos")
        .insert({
          ticket_id: ticketId,
          storage_bucket: SUPORTE_BUCKET,
          storage_path: path,
          public_url: resolvedPublicUrl,
          nome_arquivo: attachment.nome_arquivo,
          mime_type: attachment.mime_type,
          tamanho_bytes: attachment.tamanho_bytes,
          largura: attachment.largura,
          altura: attachment.altura,
          origem_upload: attachment.origem_upload,
          screen_context_json: screenContextPayload,
          metadata_json: metadataPayload,
        })
        .select("*")
        .single();

      if (insertError) throw insertError;

      saved.push(inserted as SuporteTicketAnexo);
      logSupportAttachment("info", {
        stage: currentStage,
        ticket_id: ticketId,
        nome_arquivo: attachment.nome_arquivo,
        storage_path: path,
        public_url: resolvedPublicUrl,
        attachment_id: inserted.id,
        status: "saved",
      });
    } catch (error) {
      const message = getErrorMessage(error);
      const failureReason = buildFailureReason(currentStage, error);
      failed.push({
        clientId: attachment.clientId,
        nome_arquivo: attachment.nome_arquivo,
        stage: currentStage,
        error: message,
        failureReason,
      });
      logSupportAttachment("error", {
        stage: currentStage,
        ticket_id: ticketId,
        nome_arquivo: attachment.nome_arquivo,
        mime_type: attachment.mime_type,
        tamanho_bytes: attachment.tamanho_bytes,
        storage_path: path,
        error: message,
        failure_reason: failureReason,
      });
    }
  }

  return { saved, failed };
}

export function extractScreenContextFromContextJson(
  dadosContexto: Record<string, unknown> | null | undefined,
) {
  const nested =
    dadosContexto && typeof dadosContexto.screen_context === "object" && dadosContexto.screen_context
      ? (dadosContexto.screen_context as Record<string, unknown>)
      : {};

  return sanitizeSupportPayload(nested as SuporteContextoTela | Record<string, unknown>, {
    maxDepth: 4,
    maxStringLength: 700,
    maxSerializedLength: 10000,
  }).sanitized;
}
