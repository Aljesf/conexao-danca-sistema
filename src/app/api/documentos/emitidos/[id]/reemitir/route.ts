import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { requireUser } from "@/lib/supabase/api-auth";
import { getSupabaseServiceRole } from "@/lib/supabaseServer";
import { reemitirDocumento } from "@/lib/documentos/core/reemitir-documento";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type BodyPayload = {
  motivoReemissao?: string;
  motivo_reemissao?: string;
  tipoRelacaoDocumental?: string;
  tipo_relacao_documental?: string;
};

function toPositiveInt(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeTipoRelacao(value: unknown): "REEMISSAO" | "SUBSTITUICAO" | null {
  const normalized = String(value ?? "").trim().toUpperCase();
  return normalized === "REEMISSAO" || normalized === "SUBSTITUICAO" ? normalized : null;
}

export async function POST(req: NextRequest, context: RouteContext) {
  const denied = await guardApiByRole(req);
  if (denied) return denied;

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const documentoEmitidoId = toPositiveInt(id);
  if (!documentoEmitidoId) {
    return NextResponse.json({ ok: false, error: "documento_emitido_id_invalido" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as BodyPayload | null;
  const motivoReemissao = String(body?.motivoReemissao ?? body?.motivo_reemissao ?? "").trim();
  const tipoRelacaoDocumental = normalizeTipoRelacao(
    body?.tipoRelacaoDocumental ?? body?.tipo_relacao_documental,
  );

  if (!motivoReemissao) {
    return NextResponse.json({ ok: false, error: "motivo_reemissao_obrigatorio" }, { status: 400 });
  }

  if (!tipoRelacaoDocumental) {
    return NextResponse.json({ ok: false, error: "tipo_relacao_documental_invalido" }, { status: 400 });
  }

  try {
    const result = await reemitirDocumento({
      supabase: getSupabaseServiceRole(),
      documentoEmitidoId,
      motivoReemissao,
      tipoRelacaoDocumental,
      usuarioResponsavelId: auth.userId,
    });

    return NextResponse.json({
      ok: true,
      documentoEmitidoIdOriginal: result.documentoEmitidoIdOriginal,
      documento_emitido_id_original: result.documentoEmitidoIdOriginal,
      novoDocumentoEmitidoId: result.novoDocumentoEmitidoId,
      novo_documento_emitido_id: result.novoDocumentoEmitidoId,
      tipoRelacaoDocumental: result.tipoRelacaoDocumental,
      tipo_relacao_documental: result.tipoRelacaoDocumental,
      motivoReemissao: result.motivoReemissao,
      motivo_reemissao: result.motivoReemissao,
      pdfDisponivel: result.pdfDisponivel,
      pdf_disponivel: result.pdfDisponivel,
      documentoUrl: result.documentoUrl,
      documento_url: result.documentoUrl,
      pdfUrl: result.pdfUrl,
      pdf_url: result.pdfUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "falha_reemitir_documento";
    const status =
      message === "documento_emitido_nao_encontrado"
        ? 404
        : message === "motivo_reemissao_obrigatorio" ||
            message === "modelo_documental_nao_encontrado" ||
            message === "matricula_documental_nao_encontrada"
          ? 422
          : 500;

    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
