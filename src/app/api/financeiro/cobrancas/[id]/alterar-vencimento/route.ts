import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import {
  alterarVencimentoCobranca,
  CobrancaOperacionalError,
  getCobrancasPgPool,
  isDateInput,
} from "@/lib/financeiro/cobrancas-operacionais";
import { requireUser } from "@/lib/supabase/api-auth";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseCobrancaId(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function summarizeError(error: unknown): { message: string; stack: string | null } {
  if (!(error instanceof Error)) {
    return { message: "erro_desconhecido", stack: null };
  }

  return {
    message: error.message,
    stack: error.stack
      ? error.stack
          .split("\n")
          .slice(0, 4)
          .map((line) => line.trim())
          .join(" | ")
      : null,
  };
}

function logRouteError(stage: string, cobrancaId: number | null, error: unknown) {
  const summary = summarizeError(error);
  console.error("[/api/financeiro/cobrancas/[id]/alterar-vencimento]", {
    route: "/api/financeiro/cobrancas/[id]/alterar-vencimento",
    stage,
    cobrancaId,
    message: summary.message,
    stack: summary.stack,
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const denied = await guardApiByRole(request);
  if (denied) return denied;

  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const cobrancaId = parseCobrancaId(id);
  if (!cobrancaId) {
    return NextResponse.json({ ok: false, error: "cobranca_id_invalido" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as
    | { novoVencimento?: unknown; motivo?: unknown }
    | null;
  const novoVencimento = typeof body?.novoVencimento === "string" ? body.novoVencimento.trim() : "";
  const motivo = typeof body?.motivo === "string" ? body.motivo.trim() : "";

  if (!isDateInput(novoVencimento)) {
    return NextResponse.json({ ok: false, error: "novo_vencimento_invalido" }, { status: 400 });
  }
  if (!motivo) {
    return NextResponse.json({ ok: false, error: "motivo_obrigatorio" }, { status: 400 });
  }

  const pool = getCobrancasPgPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await alterarVencimentoCobranca({
      client,
      cobrancaId,
      novoVencimento,
      motivo,
      userId: auth.userId,
    });
    await client.query("COMMIT");

    const ultimoEvento = result.historico[0] ?? null;
    return NextResponse.json({
      ok: true,
      data: {
        ...result.cobranca,
        vencimentoOriginal: result.cobranca.vencimento_original,
        vencimentoAjustadoEm: result.cobranca.vencimento_ajustado_em,
        vencimentoAjustadoPor: result.cobranca.vencimento_ajustado_por,
        vencimentoAjusteMotivo: result.cobranca.vencimento_ajuste_motivo,
        canceladaEm: result.cobranca.cancelada_em,
        canceladaPor: result.cobranca.cancelada_por,
        cancelamentoMotivo: result.cobranca.cancelamento_motivo,
        cancelamentoTipo: result.cobranca.cancelamento_tipo,
      },
      historico_resumido: ultimoEvento
        ? {
            id: ultimoEvento.id,
            tipo_evento: ultimoEvento.tipo_evento,
            observacao: ultimoEvento.observacao,
            created_at: ultimoEvento.created_at,
            created_by: ultimoEvento.created_by,
          }
        : null,
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // noop
    }

    if (error instanceof CobrancaOperacionalError) {
      return NextResponse.json({ ok: false, error: error.code, message: error.message }, { status: error.status });
    }

    logRouteError("alterar_vencimento", cobrancaId, error);
    return NextResponse.json({ ok: false, error: "falha_alterar_vencimento" }, { status: 500 });
  } finally {
    client.release();
  }
}
