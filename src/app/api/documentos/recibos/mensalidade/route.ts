import { NextResponse, type NextRequest } from "next/server";
import { requireUser, type ApiAuthContext } from "@/lib/supabase/api-auth";
import { emitirReciboPorRecebimento } from "@/lib/documentos/recibos/emitir-recibo-por-recebimento";

type BodyPayload = {
  cobranca_id?: number;
  recebimento_id?: number;
};

function toPositiveInt(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

async function resolverRecebimentoId(params: {
  supabase: ApiAuthContext["supabase"];
  recebimentoId: number | null;
  cobrancaId: number | null;
}): Promise<number> {
  const { supabase, recebimentoId, cobrancaId } = params;

  if (recebimentoId) return recebimentoId;
  if (!cobrancaId) {
    throw new Error("informe_cobranca_ou_recebimento");
  }

  const { data: recebimento, error } = await supabase
    .from("recebimentos")
    .select("id")
    .eq("cobranca_id", cobrancaId)
    .not("data_pagamento", "is", null)
    .order("data_pagamento", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !recebimento?.id) {
    throw new Error("recebimento_confirmado_nao_encontrado");
  }

  return Number(recebimento.id);
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json().catch(() => null)) as BodyPayload | null;
  const cobrancaId = toPositiveInt(body?.cobranca_id);
  const recebimentoId = toPositiveInt(body?.recebimento_id);

  try {
    const resolvedRecebimentoId = await resolverRecebimentoId({
      supabase: auth.supabase,
      recebimentoId,
      cobrancaId,
    });

    const result = await emitirReciboPorRecebimento({
      supabase: auth.supabase,
      recebimentoId: resolvedRecebimentoId,
      operadorUserId: auth.userId,
    });

    return NextResponse.json({
      ok: true,
      documento_emitido_id: result.documentoEmitidoId,
      texto_renderizado: result.preview.conteudoResolvido,
      recebimento_id: resolvedRecebimentoId,
      cobranca_id: result.preview.snapshot.cobranca_id,
      idempotent: result.idempotent,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "falha_emitir_recibo";
    const status =
      message === "informe_cobranca_ou_recebimento"
        ? 400
        : message === "recebimento_confirmado_nao_encontrado"
          ? 404
          : message === "recebimento_nao_confirmado"
            ? 409
            : message === "matricula_nao_resolvida"
              ? 422
              : 500;

    return NextResponse.json(
      {
        error: message,
      },
      { status },
    );
  }
}
