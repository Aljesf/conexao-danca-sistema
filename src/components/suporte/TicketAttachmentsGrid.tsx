"use client";

import NextImage from "next/image";
import { ExternalLink, ImageIcon } from "lucide-react";
import type { SuporteTicketAnexo } from "@/lib/suporte/constants";

type TicketAttachmentsGridProps = {
  attachments: SuporteTicketAnexo[];
  legacyScreenshotUrl?: string | null;
};

function formatarBytes(value: number) {
  if (value <= 0) return "n/d";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function formatarOrigem(origem: string) {
  switch (origem) {
    case "clipboard":
      return "Ctrl+V";
    case "drag_drop":
      return "Arrastar e soltar";
    case "auto_capture":
      return "Captura de tela";
    case "legacy":
      return "Screenshot legado";
    default:
      return "Seletor de arquivos";
  }
}

function buildLegacyFallbackAttachment(url: string): SuporteTicketAnexo {
  return {
    id: -1,
    ticket_id: 0,
    storage_bucket: "suporte",
    storage_path: url,
    public_url: url,
    nome_arquivo: "screenshot-legado.png",
    mime_type: "image/png",
    tamanho_bytes: 0,
    largura: null,
    altura: null,
    origem_upload: "legacy",
    screen_context_json: {},
    metadata_json: { legacy: true },
    created_at: new Date(0).toISOString(),
  };
}

function isImageAttachment(attachment: SuporteTicketAnexo) {
  return attachment.mime_type.startsWith("image/");
}

function resolveAttachmentHref(attachment: SuporteTicketAnexo) {
  return attachment.public_url || attachment.storage_path || null;
}

function extractReadableSummary(attachment: SuporteTicketAnexo) {
  const summary = attachment.screen_context_json?.resumoLegivel;
  return typeof summary === "string" && summary.trim() ? summary.trim() : null;
}

export function TicketAttachmentsGrid({
  attachments,
  legacyScreenshotUrl = null,
}: TicketAttachmentsGridProps) {
  const normalizedAttachments =
    attachments.length > 0
      ? attachments
      : legacyScreenshotUrl
        ? [buildLegacyFallbackAttachment(legacyScreenshotUrl)]
        : [];

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Anexos do ticket</h2>
          <p className="mt-1 text-sm text-slate-500">
            Prints e imagens salvos no chamado ficam visiveis aqui.
          </p>
        </div>
        <div className="text-sm text-slate-500">{normalizedAttachments.length} item(ns)</div>
      </div>

      {normalizedAttachments.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
          Este ticket nao possui anexos salvos.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {normalizedAttachments.map((attachment) => {
            const href = resolveAttachmentHref(attachment);
            const summary = extractReadableSummary(attachment);
            const canPreviewImage = Boolean(href) && isImageAttachment(attachment);

            return (
              <article
                key={`${attachment.ticket_id}-${attachment.id}-${attachment.storage_path}`}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50"
              >
                <div className="relative aspect-[4/3] bg-slate-100">
                  {canPreviewImage && href ? (
                    <a href={href} target="_blank" rel="noreferrer" className="block h-full w-full">
                      <NextImage
                        src={href}
                        alt={attachment.nome_arquivo}
                        fill
                        unoptimized
                        sizes="(min-width: 1280px) 20rem, (min-width: 640px) 18rem, 100vw"
                        className="object-cover"
                      />
                    </a>
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-400">
                      <ImageIcon className="h-10 w-10" />
                    </div>
                  )}
                </div>

                <div className="space-y-2 px-4 py-4 text-xs text-slate-600">
                  <div className="truncate font-semibold text-slate-900">{attachment.nome_arquivo}</div>
                  <div>Origem: {formatarOrigem(attachment.origem_upload)}</div>
                  <div>Tamanho: {formatarBytes(attachment.tamanho_bytes)}</div>
                  <div>
                    Dimensoes:{" "}
                    {attachment.largura && attachment.altura
                      ? `${attachment.largura} x ${attachment.altura}`
                      : "n/d"}
                  </div>
                  {summary ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-2 text-[11px] leading-5 text-slate-600">
                      {summary}
                    </div>
                  ) : null}
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-teal-700 hover:text-teal-800"
                    >
                      Abrir imagem
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
