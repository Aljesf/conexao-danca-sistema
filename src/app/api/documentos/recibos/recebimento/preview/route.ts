import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";
import { gerarPreviewReciboPorRecebimento } from "@/lib/documentos/recibos/emitir-recibo-por-recebimento";

type BodyPayload = {
  recebimento_id?: number;
};

function toPositiveInt(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

async function resolverRecebimentoId(req: NextRequest): Promise<number | null> {
  const { searchParams } = new URL(req.url);
  const queryId = toPositiveInt(searchParams.get("recebimento_id"));
  if (queryId) return queryId;

  if (req.method === "POST") {
    const body = (await req.json().catch(() => null)) as BodyPayload | null;
    return toPositiveInt(body?.recebimento_id);
  }

  return null;
}

async function handlePreview(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const recebimentoId = await resolverRecebimentoId(req);
  if (!recebimentoId) {
    return NextResponse.json({ ok: false, error: "recebimento_id_invalido" }, { status: 400 });
  }

  try {
    const preview = await gerarPreviewReciboPorRecebimento({
      supabase: auth.supabase,
      recebimentoId,
      operadorUserId: auth.userId,
    });

    const renderRaw = new URL(req.url).searchParams.get("render") === "1";
    if (renderRaw) {
      return new NextResponse(preview.htmlPreview, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return NextResponse.json({
      ok: true,
      operacao: preview.operacao,
      snapshot: preview.snapshot,
      variaveis: preview.variaveis,
      variaveis_agrupadas: preview.variaveisAgrupadas,
      modelo: preview.modelo,
      htmlPreview: preview.htmlPreview,
      html_preview: preview.htmlPreview,
      preview_html: preview.conteudoResolvido,
      cabecalho_html: preview.cabecalhoHtml,
      rodape_html: preview.rodapeHtml,
      metadadosRenderizacao: preview.metadadosRenderizacao,
      metadados_renderizacao: preview.metadadosRenderizacao,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "falha_preview_recibo";
    const status =
      message === "recebimento_nao_encontrado"
        ? 404
        : message === "recebimento_nao_confirmado"
          ? 409
          : message === "modelo_recibo_nao_encontrado"
            ? 404
            : 500;

    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function GET(req: NextRequest) {
  return handlePreview(req);
}

export async function POST(req: NextRequest) {
  return handlePreview(req);
}
