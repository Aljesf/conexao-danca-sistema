import { type SupabaseClient } from "@supabase/supabase-js";

type RegistrarEntradaEstoqueParams = {
  supabase: SupabaseClient<any, "public", any> | null;
  produtoId: number;
  quantidade: number;
  origem: string;
  referenciaId?: number | null;
  observacao?: string | null;
  createdBy?: string | null;
};

/**
 * Registra um movimento de entrada no estoque e atualiza o saldo atual do produto.
 */
export async function registrarEntradaEstoque({
  supabase,
  produtoId,
  quantidade,
  origem,
  referenciaId,
  observacao,
  createdBy,
}: RegistrarEntradaEstoqueParams) {
  if (!supabase) {
    throw new Error("Supabase client nao informado para registrar entrada de estoque.");
  }

  const qtd = Number(quantidade);
  if (!Number.isFinite(qtd) || qtd <= 0) {
    throw new Error("Quantidade invalida para entrada de estoque.");
  }

  const obsFinal = observacao?.trim() || null;

  const { data: movimento, error: movimentoErr } = await supabase
    .from("loja_estoque_movimentos")
    .insert({
      produto_id: produtoId,
      tipo: "ENTRADA",
      quantidade: qtd,
      origem: origem || "DESCONHECIDA",
      referencia_id: referenciaId ?? null,
      observacao: obsFinal,
      created_by: createdBy ?? null,
    })
    .select("id")
    .maybeSingle();

  if (movimentoErr) {
    throw new Error(
      `[estoque] Falha ao inserir movimento de entrada: ${movimentoErr.message}`
    );
  }

  const { data: prodAtual, error: prodErr } = await supabase
    .from("loja_produtos")
    .select("estoque_atual")
    .eq("id", produtoId)
    .maybeSingle();

  if (prodErr) {
    throw new Error(`[estoque] Falha ao buscar estoque atual: ${prodErr.message}`);
  }

  const estoqueAtual = Number(prodAtual?.estoque_atual ?? 0);
  const novoEstoque = estoqueAtual + qtd;

  const { error: updateErr } = await supabase
    .from("loja_produtos")
    .update({ estoque_atual: novoEstoque, updated_at: new Date().toISOString() })
    .eq("id", produtoId);

  if (updateErr) {
    throw new Error(`[estoque] Falha ao atualizar estoque: ${updateErr.message}`);
  }

  return {
    movimentoId: movimento?.id ?? null,
    estoqueAtualizado: novoEstoque,
  };
}
