import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { requireUser } from "@/lib/supabase/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { calcularTaxasFatura } from "@/lib/credito-conexao/calcularTaxasFatura";

/**
 * POST /api/financeiro/credito-conexao/faturas/reprocessar-taxas
 * Recalcula multa e juros para todas as faturas EM_ATRASO.
 * Body opcional: { fatura_ids: number[] } para limitar a faturas específicas.
 */
export async function POST(req: NextRequest) {
  const denied = await guardApiByRole(req as never);
  if (denied) return denied as never;

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => ({}));
  const faturaIdsInput = Array.isArray((body as any)?.fatura_ids)
    ? (body as any).fatura_ids.filter((id: any) => typeof id === "number" && id > 0)
    : null;

  const supabase = createAdminClient();

  // Buscar faturas EM_ATRASO
  let query = supabase
    .from("credito_conexao_faturas")
    .select("id,data_vencimento,valor_total_centavos,valor_taxas_centavos,status")
    .eq("status", "EM_ATRASO");

  if (faturaIdsInput && faturaIdsInput.length > 0) {
    query = query.in("id", faturaIdsInput);
  }

  const { data: faturas, error: queryErr } = await query.order("id");

  if (queryErr) {
    return NextResponse.json(
      { ok: false, error: "query_failed", detail: queryErr.message },
      { status: 500 },
    );
  }

  const resultados: Array<{
    fatura_id: number;
    dias_atraso: number;
    multa_centavos: number;
    juros_centavos: number;
    valor_taxas_centavos: number;
    ok: boolean;
    error?: string;
  }> = [];

  for (const fatura of faturas ?? []) {
    const resultado = await calcularTaxasFatura(supabase, fatura.id);
    resultados.push({
      fatura_id: resultado.fatura_id,
      dias_atraso: resultado.dias_atraso,
      multa_centavos: resultado.multa_centavos,
      juros_centavos: resultado.juros_centavos,
      valor_taxas_centavos: resultado.valor_taxas_centavos,
      ok: resultado.ok,
      error: resultado.error,
    });
  }

  return NextResponse.json({
    ok: true,
    total: resultados.length,
    resultados,
  });
}
