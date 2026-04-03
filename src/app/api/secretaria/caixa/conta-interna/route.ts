import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { requireUser } from "@/lib/supabase/api-auth";
import { listarSecretariaContaInternaResumo } from "@/lib/financeiro/secretaria-caixa-conta-interna";
import {
  getErrorMessage,
  getSecretariaUserMessage,
  mapSecretariaErrorStatus,
  parseOptionalText,
  parsePositiveInt,
} from "../_helpers";

export async function GET(request: NextRequest) {
  const denied = await guardApiByRole(request as Request);
  if (denied) return denied;

  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const pessoaId = parsePositiveInt(request.nextUrl.searchParams.get("pessoa_id"));
  const termo =
    parseOptionalText(request.nextUrl.searchParams.get("q")) ??
    parseOptionalText(request.nextUrl.searchParams.get("termo"));

  if (!pessoaId && !termo) {
    return NextResponse.json({ ok: true, itens: [] }, { status: 200 });
  }

  try {
    const itens = await listarSecretariaContaInternaResumo({
      pessoaId,
      termo,
    });

    return NextResponse.json(
      {
        ok: true,
        filtros: {
          pessoa_id: pessoaId,
          termo: termo ?? null,
        },
        itens,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("[SECRETARIA][CAIXA][BUSCA_CONTA][ERRO]", { pessoaId, termo, message });
    return NextResponse.json(
      {
        ok: false,
        error: "falha_listar_contas_internas_secretaria",
        detalhe: getSecretariaUserMessage("buscar_contas", message),
      },
      { status: mapSecretariaErrorStatus(message) },
    );
  }
}
