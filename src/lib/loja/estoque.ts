import { type SupabaseClient } from "@supabase/supabase-js";

type RegistrarEntradaEstoqueParams = {
  supabase: SupabaseClient<any, "public", any> | null;
  produtoId: number;
  varianteId: number;
  quantidade: number;
  origem: string;
  referenciaId?: number | null;
  observacao?: string | null;
  createdBy?: string | null;
  custoUnitarioCentavos?: number | null;
};

type RegistrarSaidaEstoqueParams = {
  supabase: SupabaseClient<any, "public", any> | null;
  produtoId: number;
  varianteId: number;
  quantidade: number;
  origem: string;
  referenciaId?: number | null;
  observacao?: string | null;
  createdBy?: string | null;
};

async function obterSaldoAtual(
  supabase: SupabaseClient<any, "public", any>,
  varianteId: number
) {
  const { data: vAtual, error: vErr } = await supabase
    .from("loja_produto_variantes")
    .select("estoque_atual")
    .eq("id", varianteId)
    .maybeSingle();

  if (vErr) {
    throw new Error(`[estoque] Falha ao buscar estoque atual da variante: ${vErr.message}`);
  }

  return Number(vAtual?.estoque_atual ?? 0);
}

export async function registrarEntradaEstoque({
  supabase,
  produtoId,
  varianteId,
  quantidade,
  origem,
  referenciaId,
  observacao,
  createdBy,
  custoUnitarioCentavos,
}: RegistrarEntradaEstoqueParams) {
  if (!supabase) {
    throw new Error("Supabase client nao informado para registrar entrada de estoque.");
  }

  const qtd = Number(quantidade);
  if (!Number.isFinite(qtd) || qtd <= 0) {
    throw new Error("Quantidade invalida para entrada de estoque.");
  }

  const obsFinal = observacao?.trim() || null;

  const saldoAntes = await obterSaldoAtual(supabase, varianteId);
  const saldoDepois = saldoAntes + qtd;

  const { error: updateErr } = await supabase
    .from("loja_produto_variantes")
    .update({ estoque_atual: saldoDepois, updated_at: new Date().toISOString() })
    .eq("id", varianteId);

  if (updateErr) {
    throw new Error(`[estoque] Falha ao atualizar estoque: ${updateErr.message}`);
  }

  const { data: movimento, error: movimentoErr } = await supabase
    .from("loja_estoque_movimentos")
    .insert({
      produto_id: produtoId,
      variante_id: varianteId,
      tipo: "ENTRADA",
      quantidade: qtd,
      origem: origem || "DESCONHECIDA",
      referencia_id: referenciaId ?? null,
      observacao: obsFinal,
      created_by: createdBy ?? null,
      saldo_antes: saldoAntes,
      saldo_depois: saldoDepois,
      custo_unitario_centavos: custoUnitarioCentavos ?? null,
    })
    .select("id")
    .maybeSingle();

  if (movimentoErr) {
    throw new Error(
      `[estoque] Falha ao inserir movimento de entrada: ${movimentoErr.message}`
    );
  }

  return {
    movimentoId: movimento?.id ?? null,
    estoqueAtualizado: saldoDepois,
  };
}

export async function registrarSaidaEstoque({
  supabase,
  produtoId,
  varianteId,
  quantidade,
  origem,
  referenciaId,
  observacao,
  createdBy,
}: RegistrarSaidaEstoqueParams) {
  if (!supabase) {
    throw new Error("Supabase client nao informado para registrar saida de estoque.");
  }

  const qtd = Number(quantidade);
  if (!Number.isFinite(qtd) || qtd <= 0) {
    throw new Error("Quantidade invalida para saida de estoque.");
  }

  const obsFinal = observacao?.trim() || null;

  const saldoAntes = await obterSaldoAtual(supabase, varianteId);
  const saldoDepois = Math.max(saldoAntes - qtd, 0);

  const { error: updateErr } = await supabase
    .from("loja_produto_variantes")
    .update({ estoque_atual: saldoDepois, updated_at: new Date().toISOString() })
    .eq("id", varianteId);

  if (updateErr) {
    throw new Error(`[estoque] Falha ao atualizar estoque (saida): ${updateErr.message}`);
  }

  const { data: movimento, error: movimentoErr } = await supabase
    .from("loja_estoque_movimentos")
    .insert({
      produto_id: produtoId,
      variante_id: varianteId,
      tipo: "SAIDA",
      quantidade: qtd,
      origem: origem || "DESCONHECIDA",
      referencia_id: referenciaId ?? null,
      observacao: obsFinal,
      created_by: createdBy ?? null,
      saldo_antes: saldoAntes,
      saldo_depois: saldoDepois,
      custo_unitario_centavos: null,
    })
    .select("id")
    .maybeSingle();

  if (movimentoErr) {
    throw new Error(
      `[estoque] Falha ao inserir movimento de saida: ${movimentoErr.message}`
    );
  }

  return {
    movimentoId: movimento?.id ?? null,
    estoqueAtualizado: saldoDepois,
  };
}
