import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import {
  aplicarPagamentoSecretaria,
  type SecretariaPagamentoInput,
} from "@/lib/financeiro/secretaria-caixa-conta-interna";
import { requireUser } from "@/lib/supabase/api-auth";
import {
  getErrorMessage,
  getSecretariaUserMessage,
  mapSecretariaErrorStatus,
  normalizePaymentDate,
  parseOptionalText,
  parsePositiveInt,
  resolveFormaPagamentoCodigo,
  type SecretariaPagamentoPayload,
} from "../../_helpers";

export async function POST(request: NextRequest) {
  const denied = await guardApiByRole(request as Request);
  if (denied) return denied;

  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json().catch(() => null)) as SecretariaPagamentoPayload | null;
  const lancamentoId = parsePositiveInt(body?.lancamento_id);
  const valorPagamentoCentavos = parsePositiveInt(body?.valor_pagamento_centavos);
  const contaFinanceiraId = parsePositiveInt(body?.conta_financeira_id);
  const formaPagamentoCodigo = await resolveFormaPagamentoCodigo(body);

  if (!lancamentoId) {
    return NextResponse.json({ ok: false, error: "lancamento_id_obrigatorio" }, { status: 400 });
  }

  if (!valorPagamentoCentavos) {
    return NextResponse.json({ ok: false, error: "valor_pagamento_invalido" }, { status: 400 });
  }

  if (!contaFinanceiraId) {
    return NextResponse.json({ ok: false, error: "conta_financeira_id_obrigatorio" }, { status: 400 });
  }

  if (!formaPagamentoCodigo) {
    return NextResponse.json({ ok: false, error: "forma_pagamento_invalida" }, { status: 400 });
  }

  const input: SecretariaPagamentoInput = {
    alvo_tipo: "LANCAMENTO",
    alvo_id: lancamentoId,
    valor_pagamento_centavos: valorPagamentoCentavos,
    forma_pagamento_codigo: formaPagamentoCodigo,
    conta_financeira_id: contaFinanceiraId,
    data_pagamento: normalizePaymentDate(body?.data_pagamento),
    observacao: parseOptionalText(body?.observacao ?? null),
    operador_user_id: auth.userId,
  };

  try {
    const resultado = await aplicarPagamentoSecretaria(input);
    return NextResponse.json({ ok: true, ...resultado }, { status: 200 });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("[SECRETARIA][CAIXA][PAGAMENTO_LANCAMENTO][ERRO]", { lancamentoId, message });
    return NextResponse.json(
      {
        ok: false,
        error: "falha_pagamento_lancamento_secretaria",
        detalhe: getSecretariaUserMessage("pagamento", message),
      },
      { status: mapSecretariaErrorStatus(message) },
    );
  }
}
