import type { SupabaseClient } from "@supabase/supabase-js";
import { calcularTaxasFatura } from "@/lib/credito-conexao/calcularTaxasFatura";

const STATUSS_QUITADOS = new Set([
  "PAGO",
  "PAGA",
  "RECEBIDO",
  "RECEBIDA",
  "LIQUIDADO",
  "LIQUIDADA",
  "QUITADO",
  "QUITADA",
]);

const STATUSS_LANCAMENTO_EXCLUIDOS = new Set(["CANCELADO", "CANCELADA", "INATIVO", "INATIVA"]);

function textOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function upper(value: unknown): string {
  return textOrNull(value)?.toUpperCase() ?? "";
}

function isQuitado(status: string | null | undefined): boolean {
  return STATUSS_QUITADOS.has(upper(status));
}

function addMonth(periodo: string) {
  const [yStr, mStr] = periodo.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return periodo;
  const dt = new Date(Date.UTC(y, m - 1, 1));
  dt.setMonth(dt.getMonth() + 1);
  const ny = dt.getUTCFullYear();
  const nm = dt.getUTCMonth() + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

export function getPeriodoReferencia(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

export async function ensureFaturaAberta(
  supabase: SupabaseClient,
  conta_conexao_id: number,
  periodo: string
): Promise<{ fatura: any; periodo_usado: string }> {
  const buscar = async (p: string) => {
    const { data, error } = await supabase
      .from("credito_conexao_faturas")
      .select(
        `
        id,
        conta_conexao_id,
        periodo_referencia,
        status,
        valor_total_centavos,
        valor_taxas_centavos
      `
      )
      .eq("conta_conexao_id", conta_conexao_id)
      .eq("periodo_referencia", p)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { data, error };
  };

  let periodoAtual = periodo;
  const { data: faturaInicial, error } = await buscar(periodoAtual);
  if (error) {
    throw error;
  }
  let fatura = faturaInicial;

  if (fatura?.status === "PAGA") {
    periodoAtual = addMonth(periodoAtual);
    const busca = await buscar(periodoAtual);
    if (busca.error) throw busca.error;
    fatura = busca.data;
  }

  if (fatura?.id) {
    return { fatura, periodo_usado: periodoAtual };
  }

  const agora = new Date().toISOString();
  const { data: nova, error: createErr } = await supabase
    .from("credito_conexao_faturas")
    .insert({
      conta_conexao_id,
      periodo_referencia: periodoAtual,
      data_fechamento: new Date().toISOString().slice(0, 10),
      data_vencimento: null,
      valor_total_centavos: 0,
      valor_taxas_centavos: 0,
      status: "ABERTA",
      created_at: agora,
      updated_at: agora,
    })
    .select(
      `
      id,
      conta_conexao_id,
      periodo_referencia,
      status,
      valor_total_centavos,
      valor_taxas_centavos
    `
    )
    .single();

  if (createErr || !nova) {
    throw createErr || new Error("Nao foi possivel criar fatura");
  }

  return { fatura: nova, periodo_usado: periodoAtual };
}

export async function vincularLancamentoNaFatura(
  supabase: SupabaseClient,
  fatura_id: number,
  lancamento_id: number
) {
  const { data: existe } = await supabase
    .from("credito_conexao_fatura_lancamentos")
    .select("lancamento_id")
    .eq("fatura_id", fatura_id)
    .eq("lancamento_id", lancamento_id)
    .maybeSingle();

  if (existe?.lancamento_id) {
    return { ok: true, jaVinculado: true };
  }

  const { error } = await supabase
    .from("credito_conexao_fatura_lancamentos")
    .insert({ fatura_id, lancamento_id });

  if (error) {
    return { ok: false, error };
  }

  return { ok: true, jaVinculado: false };
}

export async function recalcularComprasFatura(supabase: SupabaseClient, fatura_id: number) {
  const { data: fatura, error: faturaError } = await supabase
    .from("credito_conexao_faturas")
    .select("id,status,data_vencimento,cobranca_id")
    .eq("id", fatura_id)
    .maybeSingle();

  if (faturaError) {
    throw faturaError;
  }

  const { data, error } = await supabase
    .from("credito_conexao_fatura_lancamentos")
    .select("lancamento:credito_conexao_lancamentos (id,valor_centavos,status,cobranca_id)")
    .eq("fatura_id", fatura_id);

  if (error) {
    throw error;
  }

  const lancamentosValidos = (data ?? [])
    .map((row: any) => row.lancamento ?? null)
    .filter((row: any) => row && !STATUSS_LANCAMENTO_EXCLUIDOS.has(upper(row.status)));

  const comprasCentavos = lancamentosValidos.reduce(
    (sum: number, row: any) => sum + Number(row?.valor_centavos ?? 0),
    0,
  );

  const cobrancaIdsRelacionadas = Array.from(
    new Set(
      lancamentosValidos
        .map((row: any) => Number(row?.cobranca_id ?? 0))
        .filter((value: number) => Number.isFinite(value) && value > 0),
    ),
  );

  const faturaCobrancaId = Number((fatura as any)?.cobranca_id ?? 0);
  const cobrancaIdsLookup = Array.from(
    new Set(
      [...cobrancaIdsRelacionadas, faturaCobrancaId]
        .filter((value) => Number.isFinite(value) && value > 0),
    ),
  );

  const { data: cobrancasRaw, error: cobrancasError } = cobrancaIdsLookup.length > 0
    ? await supabase
      .from("cobrancas")
      .select("id,status")
      .in("id", cobrancaIdsLookup)
    : { data: [], error: null };

  if (cobrancasError) {
    throw cobrancasError;
  }

  const cobrancasById = new Map<number, { id: number; status: string | null }>(
    ((cobrancasRaw ?? []) as Array<Record<string, unknown>>)
      .map((row) => ({
        id: Number(row.id ?? 0),
        status: textOrNull(row.status),
      }))
      .filter((row) => Number.isFinite(row.id) && row.id > 0)
      .map((row) => [row.id, row]),
  );

  let statusFatura = upper((fatura as any)?.status) === "CANCELADA" ? "CANCELADA" : "ABERTA";
  const cobrancaCanonicaQuitada =
    faturaCobrancaId > 0 && isQuitado(cobrancasById.get(faturaCobrancaId)?.status ?? null);
  const todasCobrancasItensQuitadas =
    cobrancaIdsRelacionadas.length > 0 &&
    cobrancaIdsRelacionadas.every((id) => isQuitado(cobrancasById.get(id)?.status ?? null));
  const dataVencimento = textOrNull((fatura as any)?.data_vencimento);
  const hoje = new Date().toISOString().slice(0, 10);

  if (statusFatura !== "CANCELADA") {
    if (comprasCentavos <= 0) {
      statusFatura = "CONCLUIDA";
    } else if (cobrancaCanonicaQuitada || todasCobrancasItensQuitadas) {
      statusFatura = "PAGA";
    } else if (dataVencimento && dataVencimento < hoje) {
      statusFatura = "EM_ATRASO";
    } else {
      statusFatura = "ABERTA";
    }
  }

  const { error: updErr } = await supabase
    .from("credito_conexao_faturas")
    .update({
      valor_total_centavos: comprasCentavos,
      status: statusFatura,
      updated_at: new Date().toISOString(),
    })
    .eq("id", fatura_id);

  if (updErr) {
    throw updErr;
  }

  // A5: Aplicar multa e juros quando fatura muda para EM_ATRASO
  if (statusFatura === "EM_ATRASO") {
    try {
      await calcularTaxasFatura(supabase, fatura_id);
    } catch (taxaErr) {
      console.warn("[recalcularComprasFatura] Erro ao calcular taxas:", taxaErr);
    }
  }

  return comprasCentavos;
}

export async function recalcularFaturasRelacionadasPorCobranca(
  supabase: SupabaseClient,
  cobrancaId: number,
) {
  const faturaIds = new Set<number>();

  const { data: faturasPorCobranca, error: faturasPorCobrancaError } = await supabase
    .from("credito_conexao_faturas")
    .select("id")
    .eq("cobranca_id", cobrancaId);

  if (faturasPorCobrancaError) {
    throw faturasPorCobrancaError;
  }

  for (const row of (faturasPorCobranca ?? []) as Array<Record<string, unknown>>) {
    const faturaId = Number(row.id ?? 0);
    if (Number.isFinite(faturaId) && faturaId > 0) faturaIds.add(faturaId);
  }

  const { data: lancamentos, error: lancamentosError } = await supabase
    .from("credito_conexao_lancamentos")
    .select("id")
    .eq("cobranca_id", cobrancaId);

  if (lancamentosError) {
    throw lancamentosError;
  }

  const lancamentoIds = ((lancamentos ?? []) as Array<Record<string, unknown>>)
    .map((row) => Number(row.id ?? 0))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (lancamentoIds.length > 0) {
    const { data: pivots, error: pivotsError } = await supabase
      .from("credito_conexao_fatura_lancamentos")
      .select("fatura_id")
      .in("lancamento_id", lancamentoIds);

    if (pivotsError) {
      throw pivotsError;
    }

    for (const row of (pivots ?? []) as Array<Record<string, unknown>>) {
      const faturaId = Number(row.fatura_id ?? 0);
      if (Number.isFinite(faturaId) && faturaId > 0) faturaIds.add(faturaId);
    }
  }

  for (const faturaId of faturaIds) {
    await recalcularComprasFatura(supabase, faturaId);
  }

  return Array.from(faturaIds.values());
}
