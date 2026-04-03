import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { cancelarLancamentoSecretaria } from "@/lib/financeiro/secretaria-caixa-conta-interna";
import { requireUser } from "@/lib/supabase/api-auth";
import {
  getErrorMessage,
  getSecretariaUserMessage,
  mapSecretariaErrorStatus,
  parseOptionalText,
  parsePositiveInt,
  type SecretariaCancelamentoPayload,
} from "../_helpers";

export async function POST(request: NextRequest) {
  const denied = await guardApiByRole(request as Request);
  if (denied) return denied;

  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json().catch(() => null)) as SecretariaCancelamentoPayload | null;
  const lancamentoId = parsePositiveInt(body?.lancamento_id);
  const motivoCancelamento = parseOptionalText(body?.motivo_cancelamento);

  if (!lancamentoId) {
    return NextResponse.json({ ok: false, error: "lancamento_id_obrigatorio" }, { status: 400 });
  }

  if (!motivoCancelamento) {
    return NextResponse.json({ ok: false, error: "motivo_cancelamento_obrigatorio" }, { status: 400 });
  }

  try {
    const resultado = await cancelarLancamentoSecretaria({
      lancamento_id: lancamentoId,
      motivo_cancelamento: motivoCancelamento,
      operador_user_id: auth.userId,
    });

    return NextResponse.json({ ok: true, ...resultado }, { status: 200 });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("[SECRETARIA][CAIXA][CANCELAMENTO_LANCAMENTO][ERRO]", {
      lancamentoId,
      message,
    });

    return NextResponse.json(
      {
        ok: false,
        error: "falha_cancelar_lancamento_secretaria",
        detalhe: getSecretariaUserMessage("cancelamento", message),
      },
      { status: mapSecretariaErrorStatus(message) },
    );
  }
}
