import type { SupabaseClient } from "@supabase/supabase-js";

type ResultadoTaxas = {
  ok: boolean;
  fatura_id: number;
  dias_atraso: number;
  valor_original_centavos: number;
  multa_centavos: number;
  juros_centavos: number;
  valor_taxas_centavos: number;
  valor_total_atualizado_centavos: number;
  error?: string;
};

/**
 * Calcula multa e juros para uma fatura em atraso, com base nas
 * configurações de credito_conexao_configuracoes para o tipo de conta.
 *
 * Multa: percentual sobre o valor total (ex: 2%)
 * Juros: percentual ao dia sobre o valor total (ex: 0.0333% ao dia)
 */
export async function calcularTaxasFatura(
  supabase: SupabaseClient,
  faturaId: number,
): Promise<ResultadoTaxas> {
  // Buscar fatura com conta
  const { data: fatura, error: faturaErr } = await supabase
    .from("credito_conexao_faturas")
    .select("id,conta_conexao_id,valor_total_centavos,data_vencimento,status,valor_taxas_centavos")
    .eq("id", faturaId)
    .maybeSingle();

  if (faturaErr || !fatura) {
    return {
      ok: false,
      fatura_id: faturaId,
      dias_atraso: 0,
      valor_original_centavos: 0,
      multa_centavos: 0,
      juros_centavos: 0,
      valor_taxas_centavos: 0,
      valor_total_atualizado_centavos: 0,
      error: "fatura_nao_encontrada",
    };
  }

  const valorOriginal = Number((fatura as any).valor_total_centavos ?? 0);
  const dataVencimento = (fatura as any).data_vencimento as string | null;
  const status = ((fatura as any).status ?? "").toUpperCase();

  if (!dataVencimento) {
    return {
      ok: false,
      fatura_id: faturaId,
      dias_atraso: 0,
      valor_original_centavos: valorOriginal,
      multa_centavos: 0,
      juros_centavos: 0,
      valor_taxas_centavos: 0,
      valor_total_atualizado_centavos: valorOriginal,
      error: "fatura_sem_data_vencimento",
    };
  }

  const hoje = new Date();
  const vencimento = new Date(dataVencimento + "T00:00:00");
  const diffMs = hoje.getTime() - vencimento.getTime();
  const diasAtraso = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  if (diasAtraso <= 0) {
    return {
      ok: true,
      fatura_id: faturaId,
      dias_atraso: 0,
      valor_original_centavos: valorOriginal,
      multa_centavos: 0,
      juros_centavos: 0,
      valor_taxas_centavos: 0,
      valor_total_atualizado_centavos: valorOriginal,
    };
  }

  // Buscar tipo de conta
  const { data: conta } = await supabase
    .from("credito_conexao_contas")
    .select("tipo_conta")
    .eq("id", (fatura as any).conta_conexao_id)
    .maybeSingle();

  const tipoConta = ((conta as any)?.tipo_conta ?? "ALUNO").toUpperCase();

  // Buscar configurações de multa e juros
  const { data: config } = await supabase
    .from("credito_conexao_configuracoes")
    .select("multa_percentual,juros_dia_percentual")
    .eq("tipo_conta", tipoConta)
    .maybeSingle();

  const multaPerc = Number((config as any)?.multa_percentual ?? 2);
  const jurosDiaPerc = Number((config as any)?.juros_dia_percentual ?? 0.0333);

  const multaCentavos = Math.round(valorOriginal * multaPerc / 100);
  const jurosCentavos = Math.round(valorOriginal * jurosDiaPerc / 100 * diasAtraso);
  const taxasTotal = multaCentavos + jurosCentavos;

  // Atualizar fatura
  const { error: updateErr } = await supabase
    .from("credito_conexao_faturas")
    .update({
      valor_taxas_centavos: taxasTotal,
      status: "EM_ATRASO",
      updated_at: new Date().toISOString(),
    })
    .eq("id", faturaId);

  if (updateErr) {
    return {
      ok: false,
      fatura_id: faturaId,
      dias_atraso: diasAtraso,
      valor_original_centavos: valorOriginal,
      multa_centavos: multaCentavos,
      juros_centavos: jurosCentavos,
      valor_taxas_centavos: taxasTotal,
      valor_total_atualizado_centavos: valorOriginal + taxasTotal,
      error: `update_fatura: ${updateErr.message}`,
    };
  }

  return {
    ok: true,
    fatura_id: faturaId,
    dias_atraso: diasAtraso,
    valor_original_centavos: valorOriginal,
    multa_centavos: multaCentavos,
    juros_centavos: jurosCentavos,
    valor_taxas_centavos: taxasTotal,
    valor_total_atualizado_centavos: valorOriginal + taxasTotal,
  };
}
