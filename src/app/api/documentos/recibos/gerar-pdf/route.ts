import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseServiceRole } from "@/lib/supabaseServer";
import { gerarPdfDocumentoEmitido } from "@/lib/documentos/core/gerar-pdf-documento-emitido";

function appendIfPresent(params: URLSearchParams, key: string, value: unknown) {
  if (value === null || value === undefined) return;
  const s = String(value).trim();
  if (!s) return;
  params.set(key, s);
}

function toPositiveInt(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Espera os mesmos params do preview.
 * Regra: so gera PDF se pagamento_confirmado=true.
 * Nesta etapa, retorna HTML enquanto o renderer PDF oficial nao e plugado.
 */
export async function POST(req: NextRequest) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;

  const incomingUrl = new URL(req.url);
  const query = new URLSearchParams(incomingUrl.search);
  const body = await req.json().catch(() => ({} as Record<string, unknown>));

  // Fallback: permite receber params no body JSON tambem.
  if (!query.get("tipo")) {
    appendIfPresent(query, "tipo", body.tipo);
    appendIfPresent(query, "competencia", body.competencia);
    appendIfPresent(query, "responsavel_pessoa_id", body.responsavel_pessoa_id);
    appendIfPresent(query, "cobranca_avulsa_id", body.cobranca_avulsa_id);
  }

  const documentoEmitidoId =
    toPositiveInt(query.get("documento_emitido_id")) ?? toPositiveInt(body.documento_emitido_id);

  if (documentoEmitidoId) {
    try {
      const result = await gerarPdfDocumentoEmitido({
        supabase: getSupabaseServiceRole(),
        documentoEmitidoId,
      });

      return NextResponse.json({
        ok: true,
        pdf: result.pdfUrl,
        pdf_url: result.pdfUrl,
        pdfDisponivel: true,
        pdf_disponivel: true,
        documentoEmitidoId: result.documento.id,
        documento_emitido_id: result.documento.id,
        fonte_conteudo: result.fonteConteudo,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "falha_gerar_pdf";
      return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
  }

  if (!query.get("tipo")) {
    return NextResponse.json({ ok: false, error: "tipo_obrigatorio" }, { status: 400 });
  }

  const previewUrl = new URL(req.url);
  previewUrl.pathname = "/api/documentos/recibos/preview";
  previewUrl.search = query.toString();

  const previewRes = await fetch(previewUrl.toString(), {
    method: "GET",
    cache: "no-store",
    headers: {
      cookie: req.headers.get("cookie") ?? "",
    },
  });
  const previewJson = (await previewRes.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    pagamento_confirmado?: boolean;
    motivo_bloqueio?: string | null;
    html_preview?: string;
  };

  if (!previewRes.ok || !previewJson?.ok) {
    return NextResponse.json(
      { ok: false, error: "preview_falhou", detail: previewJson?.error ?? null },
      { status: previewRes.ok ? 500 : previewRes.status },
    );
  }

  if (!previewJson.pagamento_confirmado) {
    return NextResponse.json(
      {
        ok: false,
        error: "pagamento_nao_confirmado",
        motivo: previewJson.motivo_bloqueio ?? null,
      },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true, pdf: null, html: previewJson.html_preview ?? "" });
}
