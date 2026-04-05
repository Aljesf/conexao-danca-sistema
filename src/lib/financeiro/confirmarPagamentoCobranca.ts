import type { SupabaseClient } from "@supabase/supabase-js";
import { processarClassificacaoFinanceira } from "@/lib/financeiro/processarClassificacaoFinanceira";

type ConfirmacaoPagamentoInput = {
  supabase: SupabaseClient;
  cobrancaId: number;
  dataPagamento?: string;
  origemSistema?: string;
  observacoes?: string;
};

type ConfirmacaoPagamentoResult = {
  ok: boolean;
  action: "payment_processed" | "already_paid" | "error";
  cobranca_id: number;
  fatura_id: number | null;
  errors: string[];
};

function isCobrancaFaturaCreditoConexao(origemTipo: string | null | undefined): boolean {
  const normalized = (origemTipo ?? "").toUpperCase();
  return normalized === "CREDITO_CONEXAO_FATURA" || normalized === "FATURA_CREDITO_CONEXAO";
}

/**
 * Confirma o pagamento de uma cobrança executando a sequência completa:
 * 1. cobrancas.status = RECEBIDO
 * 2. credito_conexao_faturas.status = PAGA (se aplicável)
 * 3. Lançamentos da fatura → PAGO
 * 4. Criar recebimento
 * 5. Gerar movimento_financeiro
 * 6. processarClassificacaoFinanceira
 *
 * Idempotente: se a cobrança já estiver RECEBIDO/PAGO, retorna already_paid.
 */
export async function confirmarPagamentoCobranca(
  input: ConfirmacaoPagamentoInput,
): Promise<ConfirmacaoPagamentoResult> {
  const { supabase, cobrancaId } = input;
  const dataPagamento = input.dataPagamento ?? new Date().toISOString().slice(0, 10);
  const origemSistema = input.origemSistema ?? "SISTEMA";
  const observacoes = input.observacoes ?? null;
  const errors: string[] = [];
  let faturaId: number | null = null;

  // Buscar cobrança
  const { data: cobranca, error: cobrancaErr } = await supabase
    .from("cobrancas")
    .select("id,status,valor_centavos,pessoa_id,origem_tipo,origem_id,centro_custo_id")
    .eq("id", cobrancaId)
    .maybeSingle();

  if (cobrancaErr || !cobranca) {
    return {
      ok: false,
      action: "error",
      cobranca_id: cobrancaId,
      fatura_id: null,
      errors: [cobrancaErr?.message ?? "cobranca_nao_encontrada"],
    };
  }

  // Idempotência: já paga
  const statusAtual = (cobranca.status ?? "").toUpperCase();
  if (["PAGO", "PAGA", "RECEBIDO", "RECEBIDA"].includes(statusAtual)) {
    return {
      ok: true,
      action: "already_paid",
      cobranca_id: cobranca.id,
      fatura_id: null,
      errors: [],
    };
  }

  // 1. Atualizar cobranca para RECEBIDO
  const { error: updateCobrancaErr } = await supabase
    .from("cobrancas")
    .update({
      status: "RECEBIDO",
      data_pagamento: dataPagamento,
      updated_at: new Date().toISOString(),
    })
    .eq("id", cobranca.id);

  if (updateCobrancaErr) {
    errors.push(`cobranca_update: ${updateCobrancaErr.message}`);
  }

  // 2. Se for fatura da conta interna, atualizar fatura e lançamentos
  if (isCobrancaFaturaCreditoConexao(cobranca.origem_tipo) && cobranca.origem_id) {
    faturaId = cobranca.origem_id;

    const { error: updateFaturaErr } = await supabase
      .from("credito_conexao_faturas")
      .update({
        status: "PAGA",
        updated_at: new Date().toISOString(),
      })
      .eq("id", faturaId);

    if (updateFaturaErr) {
      errors.push(`fatura_update: ${updateFaturaErr.message}`);
    }

    // Atualizar lancamentos da fatura para PAGO
    const { data: faturaLancs } = await supabase
      .from("credito_conexao_fatura_lancamentos")
      .select("lancamento_id")
      .eq("fatura_id", faturaId);

    if (faturaLancs?.length) {
      const lancIds = faturaLancs.map((fl: any) => fl.lancamento_id).filter(Boolean);
      if (lancIds.length > 0) {
        const { error: lancUpdateErr } = await supabase
          .from("credito_conexao_lancamentos")
          .update({ status: "PAGO", updated_at: new Date().toISOString() })
          .in("id", lancIds)
          .eq("status", "FATURADO");

        if (lancUpdateErr) {
          errors.push(`lancamentos_update: ${lancUpdateErr.message}`);
        }
      }
    }
  }

  // 3. Criar recebimento
  const { error: recebimentoErr } = await supabase
    .from("recebimentos")
    .insert({
      cobranca_id: cobranca.id,
      valor_centavos: cobranca.valor_centavos,
      data_pagamento: dataPagamento,
      metodo_pagamento: "BOLETO",
      centro_custo_id: cobranca.centro_custo_id,
      origem_sistema: origemSistema,
      observacoes: observacoes ?? `Pagamento confirmado (cobrança #${cobranca.id})`,
    });

  if (recebimentoErr) {
    errors.push(`recebimento_insert: ${recebimentoErr.message}`);
  }

  // 4. Gerar movimento_financeiro
  const { error: movimentoErr } = await supabase
    .from("movimento_financeiro")
    .insert({
      tipo: "RECEITA",
      centro_custo_id: cobranca.centro_custo_id,
      valor_centavos: cobranca.valor_centavos,
      data_movimento: dataPagamento,
      origem: "RECEBIMENTO",
      origem_id: cobranca.id,
      descricao: `Recebimento cobrança #${cobranca.id}`,
      usuario_id: null,
    });

  if (movimentoErr) {
    errors.push(`movimento_insert: ${movimentoErr.message}`);
  }

  // 5. Classificação financeira (rateio por centro de custo)
  const classificacao = await processarClassificacaoFinanceira(supabase, {
    id: cobranca.id,
    valor_centavos: cobranca.valor_centavos,
    centro_custo_id: cobranca.centro_custo_id,
    origem_tipo: cobranca.origem_tipo,
    origem_id: cobranca.origem_id,
    data_pagamento: dataPagamento,
  });

  if (!classificacao.ok) {
    errors.push(`classificacao: ${classificacao.error}`);
  }

  return {
    ok: errors.length === 0,
    action: "payment_processed",
    cobranca_id: cobranca.id,
    fatura_id: faturaId,
    errors,
  };
}
