import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";
import { emitirReciboPorRecebimento } from "@/lib/documentos/recibos/emitir-recibo-por-recebimento";

type BodyPayload = {
  recebimento_id?: number;
};

function toPositiveInt(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json().catch(() => null)) as BodyPayload | null;
  const recebimentoId = toPositiveInt(body?.recebimento_id);

  if (!recebimentoId) {
    return NextResponse.json({ ok: false, error: "recebimento_id_invalido" }, { status: 400 });
  }

  try {
    const result = await emitirReciboPorRecebimento({
      supabase: auth.supabase,
      recebimentoId,
      operadorUserId: auth.userId,
    });

    return NextResponse.json({
      ok: true,
      documento_emitido_id: result.documentoEmitidoId,
      texto_renderizado: result.preview.conteudoResolvido,
      preview_html: result.preview.conteudoResolvido,
      preview_url: `/api/documentos/recibos/recebimento/preview?recebimento_id=${recebimentoId}&render=1`,
      documento_url: `/admin/config/documentos/emitidos/${result.documentoEmitidoId}`,
      modelo_id: result.preview.modelo.id,
      snapshot: result.preview.snapshot,
      variaveis: result.preview.variaveis,
      idempotent: result.idempotent,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "falha_emitir_recibo";
    const status =
      message === "recebimento_nao_encontrado"
        ? 404
        : message === "recebimento_nao_confirmado"
          ? 409
          : message === "matricula_nao_resolvida"
            ? 422
            : message === "modelo_recibo_nao_encontrado"
              ? 404
              : 500;

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status },
    );
  }
}
