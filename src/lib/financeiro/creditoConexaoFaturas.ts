import type { SupabaseClient } from "@supabase/supabase-js";

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
  let { data: fatura, error } = await buscar(periodoAtual);
  if (error) {
    throw error;
  }

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
  const { data, error } = await supabase
    .from("credito_conexao_fatura_lancamentos")
    .select("lancamento:credito_conexao_lancamentos (valor_centavos)")
    .eq("fatura_id", fatura_id);

  if (error) {
    throw error;
  }

  const comprasCentavos =
    data?.reduce((sum: number, row: any) => sum + Number(row.lancamento?.valor_centavos ?? 0), 0) ??
    0;

  const { error: updErr } = await supabase
    .from("credito_conexao_faturas")
    .update({
      valor_total_centavos: comprasCentavos,
      updated_at: new Date().toISOString(),
    })
    .eq("id", fatura_id);

  if (updErr) {
    throw updErr;
  }

  return comprasCentavos;
}
