import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseServiceRole } from "@/lib/supabaseServer";
import { gerarPdfDocumentoEmitido } from "@/lib/documentos/core/gerar-pdf-documento-emitido";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function toPositiveInt(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const denied = await guardApiByRole(req);
  if (denied) return denied;

  const { id } = await context.params;
  const documentoEmitidoId = toPositiveInt(id);

  if (!documentoEmitidoId) {
    return NextResponse.json({ ok: false, error: "documento_emitido_id_invalido" }, { status: 400 });
  }

  try {
    const result = await gerarPdfDocumentoEmitido({
      supabase: getSupabaseServiceRole(),
      documentoEmitidoId,
    });

    return new NextResponse(Buffer.from(result.pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename=\"${result.fileName}\"`,
        "Cache-Control": "no-store",
        "X-Documento-Emitido-Id": String(result.documento.id),
        "X-Pdf-Fonte-Conteudo": result.fonteConteudo,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "falha_gerar_pdf_emitido";
    const status = message === "documento_emitido_nao_encontrado" ? 404 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
