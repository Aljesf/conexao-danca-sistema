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

function renderHtmlDocument(params: {
  titulo: string;
  cabecalhoHtml: string | null;
  rodapeHtml: string | null;
  conteudoHtml: string;
}): string {
  const { titulo, cabecalhoHtml, rodapeHtml, conteudoHtml } = params;

  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${titulo}</title>
    <style>
      body { margin: 0; font-family: Arial, sans-serif; background: #f8fafc; color: #0f172a; }
      .page { max-width: 980px; margin: 0 auto; padding: 24px; }
      .slot { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); }
      .slot + .slot { margin-top: 16px; }
    </style>
  </head>
  <body>
    <main class="page">
      ${cabecalhoHtml ? `<section class="slot">${cabecalhoHtml}</section>` : ""}
      <section class="slot">${conteudoHtml}</section>
      ${rodapeHtml ? `<section class="slot">${rodapeHtml}</section>` : ""}
    </main>
  </body>
</html>`;
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
      return new NextResponse(
        renderHtmlDocument({
          titulo: preview.modelo.titulo ?? `Recibo ${preview.snapshot.recibo_numero}`,
          cabecalhoHtml: preview.cabecalhoHtml,
          rodapeHtml: preview.rodapeHtml,
          conteudoHtml: preview.conteudoResolvido,
        }),
        {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        },
      );
    }

    return NextResponse.json({
      ok: true,
      snapshot: preview.snapshot,
      variaveis: preview.variaveis,
      modelo: preview.modelo,
      preview_html: preview.conteudoResolvido,
      cabecalho_html: preview.cabecalhoHtml,
      rodape_html: preview.rodapeHtml,
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
