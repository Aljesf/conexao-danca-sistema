import crypto from "crypto";
import { decodeHtmlEntities } from "@/lib/documentos/renderHtml";

export type CampoConteudoPersistido =
  | "conteudo_resolvido_html"
  | "conteudo_renderizado_md"
  | "conteudo_template_html"
  | "nao_informado";

export type TipoRelacaoDocumental = "ORIGINAL" | "REEMISSAO" | "SUBSTITUICAO" | "DERIVADO";

export type DocumentoEmitidoRecord = {
  id: number;
  matricula_id: number | null;
  contrato_modelo_id?: number | null;
  documento_modelo_id?: number | null;
  status_assinatura?: string | null;
  status?: string | null;
  pdf_url?: string | null;
  conteudo_renderizado_md?: string | null;
  conteudo_resolvido_html?: string | null;
  conteudo_template_html?: string | null;
  header_html?: string | null;
  footer_html?: string | null;
  header_height_px?: number | null;
  footer_height_px?: number | null;
  page_margin_mm?: number | null;
  cabecalho_html?: string | null;
  rodape_html?: string | null;
  editado_manual?: boolean | null;
  variaveis_utilizadas_json?: Record<string, unknown> | null;
  snapshot_financeiro_json?: Record<string, unknown> | null;
  contexto_json?: Record<string, unknown> | null;
  documento_conjunto_id?: number | null;
  documento_grupo_id?: number | null;
  created_by?: string | null;
  hash_conteudo?: string | null;
  operacao_id?: number | null;
  origem_tipo?: string | null;
  origem_id?: string | null;
  documento_origem_id?: number | null;
  motivo_reemissao?: string | null;
  tipo_relacao_documental?: string | null;
  created_at?: string;
  updated_at?: string | null;
};

function decodeMaybeEscapedHtml(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.startsWith("&lt;") || trimmed.includes("&lt;h") ? decodeHtmlEntities(trimmed) : trimmed;
}

export function buildDocumentoEmitidoPdfUrl(documentoEmitidoId: number): string {
  return `/api/documentos/emitidos/${documentoEmitidoId}/pdf`;
}

export function resolveConteudoPersistidoEmitido(documento: DocumentoEmitidoRecord): {
  html: string;
  field: CampoConteudoPersistido;
  usedFallback: boolean;
} {
  const conteudoResolvido = decodeMaybeEscapedHtml(documento.conteudo_resolvido_html);
  if (conteudoResolvido) {
    return {
      html: conteudoResolvido,
      field: "conteudo_resolvido_html",
      usedFallback: false,
    };
  }

  const conteudoRenderizado = decodeMaybeEscapedHtml(documento.conteudo_renderizado_md);
  if (conteudoRenderizado) {
    return {
      html: conteudoRenderizado,
      field: "conteudo_renderizado_md",
      usedFallback: true,
    };
  }

  const conteudoTemplate = decodeMaybeEscapedHtml(documento.conteudo_template_html);
  if (conteudoTemplate) {
    return {
      html: conteudoTemplate,
      field: "conteudo_template_html",
      usedFallback: true,
    };
  }

  return {
    html: "<p>(sem conteudo)</p>",
    field: "nao_informado",
    usedFallback: true,
  };
}

export function resolveHeaderHtmlEmitido(documento: DocumentoEmitidoRecord): string | null {
  return decodeMaybeEscapedHtml(documento.header_html ?? documento.cabecalho_html);
}

export function resolveFooterHtmlEmitido(documento: DocumentoEmitidoRecord): string | null {
  return decodeMaybeEscapedHtml(documento.footer_html ?? documento.rodape_html);
}

export function buildHtmlDocumentoEmitido(documento: DocumentoEmitidoRecord): {
  htmlCompleto: string;
  conteudoBody: string;
  fonteConteudo: CampoConteudoPersistido;
  usouFallback: boolean;
} {
  const conteudo = resolveConteudoPersistidoEmitido(documento);
  const cabecalho = resolveHeaderHtmlEmitido(documento) ?? "";
  const rodape = resolveFooterHtmlEmitido(documento) ?? "";

  const htmlCompleto = [
    "<!doctype html>",
    "<html lang=\"pt-BR\">",
    "<head>",
    "<meta charset=\"utf-8\" />",
    "<style>",
    "body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; }",
    ".doc-shell { padding: 32px 40px; }",
    ".doc-header, .doc-footer { width: 100%; }",
    ".doc-body { margin-top: 24px; margin-bottom: 24px; }",
    "</style>",
    "</head>",
    "<body>",
    "<div class=\"doc-shell\">",
    cabecalho ? `<div class=\"doc-header\">${cabecalho}</div>` : "",
    `<div class=\"doc-body\">${conteudo.html}</div>`,
    rodape ? `<div class=\"doc-footer\">${rodape}</div>` : "",
    "</div>",
    "</body>",
    "</html>",
  ].join("");

  return {
    htmlCompleto,
    conteudoBody: conteudo.html,
    fonteConteudo: conteudo.field,
    usouFallback: conteudo.usedFallback,
  };
}

export function htmlToPlainText(html: string): string {
  return decodeHtmlEntities(html)
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|article|header|footer|li|tr|h1|h2|h3|h4|h5|h6)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function splitTextIntoLines(text: string, maxChars = 96): string[] {
  const lines: string[] = [];
  for (const originalLine of text.split(/\r?\n/)) {
    const line = originalLine.trim();
    if (!line) {
      lines.push("");
      continue;
    }

    let current = "";
    for (const word of line.split(/\s+/)) {
      const next = current ? `${current} ${word}` : word;
      if (next.length > maxChars && current) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    }
    if (current) {
      lines.push(current);
    }
  }
  return lines;
}

export function computeConteudoHash(html: string): string {
  return crypto.createHash("sha256").update(html, "utf8").digest("hex");
}
