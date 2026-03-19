import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import {
  CobrancaOperacionalError,
  getCobrancasPgPool,
  loadCobrancaHistorico,
  loadCobrancaOperacional,
} from "@/lib/financeiro/cobrancas-operacionais";

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
  console.error("[/api/financeiro/cobrancas/[id]]", {
    route: "/api/financeiro/cobrancas/[id]",
    stage,
    cobrancaId,
    message: summary.message,
    stack: summary.stack,
  });
}

export async function GET(request: NextRequest, context: RouteContext) {
  const denied = await guardApiByRole(request);
  if (denied) return denied;

  const { id } = await context.params;
  const cobrancaId = parseCobrancaId(id);
  if (!cobrancaId) {
    return NextResponse.json({ ok: false, error: "cobranca_id_invalido" }, { status: 400 });
  }

  const pool = getCobrancasPgPool();
  const client = await pool.connect();
  try {
    const cobranca = await loadCobrancaOperacional(client, cobrancaId);
    if (!cobranca) {
      return NextResponse.json({ ok: false, error: "cobranca_nao_encontrada" }, { status: 404 });
    }

    const historico = await loadCobrancaHistorico(client, cobrancaId);

    return NextResponse.json({
      ok: true,
      data: {
        ...cobranca,
        vencimentoOriginal: cobranca.vencimento_original,
        vencimentoAjustadoEm: cobranca.vencimento_ajustado_em,
        vencimentoAjustadoPor: cobranca.vencimento_ajustado_por,
        vencimentoAjusteMotivo: cobranca.vencimento_ajuste_motivo,
        canceladaEm: cobranca.cancelada_em,
        canceladaPor: cobranca.cancelada_por,
        cancelamentoMotivo: cobranca.cancelamento_motivo,
        cancelamentoTipo: cobranca.cancelamento_tipo,
        matriculaStatus: cobranca.matricula_status,
        matriculaCancelamentoTipo: cobranca.matricula_cancelamento_tipo,
      },
      historico,
    });
  } catch (error) {
    if (error instanceof CobrancaOperacionalError) {
      return NextResponse.json({ ok: false, error: error.code, message: error.message }, { status: error.status });
    }

    logRouteError("carregar_detalhe", cobrancaId, error);
    return NextResponse.json({ ok: false, error: "erro_carregar_cobranca" }, { status: 500 });
  } finally {
    client.release();
  }
}
