import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildDocumentoEmitidoPdfUrl,
  buildHtmlDocumentoEmitido,
  htmlToPlainText,
  splitTextIntoLines,
  type CampoConteudoPersistido,
  type DocumentoEmitidoRecord,
} from "@/lib/documentos/core/documento-emitido-utils";

export type PdfDocumentoEmitidoGerado = {
  documento: DocumentoEmitidoRecord;
  pdfBytes: Uint8Array;
  fileName: string;
  pdfUrl: string;
  fonteConteudo: CampoConteudoPersistido;
  usouFallback: boolean;
};

function sanitizeFileName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function resolveNomeArquivo(documento: DocumentoEmitidoRecord): string {
  return sanitizeFileName(`documento-emitido-${documento.id || "novo"}`) || "documento-emitido";
}

async function loadDocumentoEmitido(
  supabase: SupabaseClient,
  documentoEmitidoId: number,
): Promise<DocumentoEmitidoRecord> {
  const { data, error } = await supabase
    .from("documentos_emitidos")
    .select("*")
    .eq("id", documentoEmitidoId)
    .single();

  if (error || !data) {
    throw new Error("documento_emitido_nao_encontrado");
  }

  return data as DocumentoEmitidoRecord;
}

export async function gerarPdfDocumentoEmitido(params: {
  supabase: SupabaseClient;
  documentoEmitidoId: number;
}): Promise<PdfDocumentoEmitidoGerado> {
  const documento = await loadDocumentoEmitido(params.supabase, params.documentoEmitidoId);
  const htmlDocumento = buildHtmlDocumentoEmitido(documento);
  const texto = htmlToPlainText(htmlDocumento.htmlCompleto);
  const linhas = splitTextIntoLines(texto || "Documento emitido sem conteudo.", 96);

  const pdf = await PDFDocument.create();
  const pageSize = { width: 595.28, height: 841.89 };
  const marginX = 40;
  const marginTop = 48;
  const marginBottom = 48;
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([pageSize.width, pageSize.height]);
  let cursorY = pageSize.height - marginTop;

  const drawHeader = () => {
    page.drawText(`Documento emitido #${documento.id}`, {
      x: marginX,
      y: cursorY,
      size: 16,
      font: fontBold,
      color: rgb(0.06, 0.09, 0.16),
    });
    cursorY -= 18;
    page.drawText(`Fonte do PDF: ${htmlDocumento.fonteConteudo}`, {
      x: marginX,
      y: cursorY,
      size: 9,
      font,
      color: rgb(0.39, 0.45, 0.55),
    });
    cursorY -= 22;
  };

  const ensureSpace = (linesNeeded = 1) => {
    const lineHeight = 14;
    if (cursorY - lineHeight * linesNeeded <= marginBottom) {
      page = pdf.addPage([pageSize.width, pageSize.height]);
      cursorY = pageSize.height - marginTop;
      drawHeader();
    }
  };

  drawHeader();

  for (const line of linhas) {
    ensureSpace(1);
    page.drawText(line || " ", {
      x: marginX,
      y: cursorY,
      size: 11,
      font,
      color: rgb(0.06, 0.09, 0.16),
      maxWidth: pageSize.width - marginX * 2,
      lineHeight: 14,
    });
    cursorY -= 14;
  }

  const pdfBytes = await pdf.save();
  const pdfUrl = documento.pdf_url?.trim() || buildDocumentoEmitidoPdfUrl(documento.id);

  if (documento.pdf_url !== pdfUrl) {
    await params.supabase
      .from("documentos_emitidos")
      .update({
        pdf_url: pdfUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", documento.id);
  }

  return {
    documento: {
      ...documento,
      pdf_url: pdfUrl,
    },
    pdfBytes,
    fileName: `${resolveNomeArquivo(documento)}.pdf`,
    pdfUrl,
    fonteConteudo: htmlDocumento.fonteConteudo,
    usouFallback: htmlDocumento.usouFallback,
  };
}
