import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSecretariaContaInternaDetalhe } from "@/lib/financeiro/secretaria-caixa-conta-interna";
import { requireUser } from "@/lib/supabase/api-auth";
import {
  getErrorMessage,
  getSecretariaUserMessage,
  mapSecretariaErrorStatus,
  parsePositiveInt,
} from "../../_helpers";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ contaId: string }> },
) {
  const denied = await guardApiByRole(request as Request);
  if (denied) return denied;

  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const { contaId: rawContaId } = await context.params;
  const contaId = parsePositiveInt(rawContaId);

  if (!contaId) {
    return NextResponse.json({ ok: false, error: "conta_id_invalido" }, { status: 400 });
  }

  try {
    const conta = await getSecretariaContaInternaDetalhe(contaId);
    return NextResponse.json({ ok: true, conta }, { status: 200 });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("[SECRETARIA][CAIXA][DETALHE_CONTA][ERRO]", { contaId, message });
    return NextResponse.json(
      {
        ok: false,
        error: "falha_carregar_conta_interna_secretaria",
        detalhe: getSecretariaUserMessage("carregar_conta", message),
      },
      { status: mapSecretariaErrorStatus(message) },
    );
  }
}
