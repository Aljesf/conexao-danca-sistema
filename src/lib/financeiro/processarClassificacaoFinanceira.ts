import type { SupabaseClient } from "@supabase/supabase-js";

type CobrancaBase = {
  id: number;
  valor_centavos: number;
  centro_custo_id: number | null;
  origem_tipo?: string | null;
  origem_id?: number | null;
  data_pagamento?: string | null;
};

type ResultadoClassificacao =
  | { ok: true; movimentosCriados: number }
  | { ok: false; error: string; details?: any };

async function getCentroCustoIdPorCodigo(
  supabase: SupabaseClient,
  codigo: string
): Promise<number | null> {
  const { data, error } = await supabase
    .from("centros_custo")
    .select("id")
    .eq("codigo", codigo)
    .eq("ativo", true)
    .maybeSingle();

  if (error) {
    console.error(`[processarClassificacaoFinanceira] erro ao buscar centro ${codigo}:`, error);
    return null;
  }

  return (data as any)?.id ?? null;
}

async function limparRateiosAnteriores(
  supabase: SupabaseClient,
  cobrancaId: number
): Promise<void> {
  const { error } = await supabase
    .from("movimento_financeiro")
    .delete()
    .eq("origem", "RATEIO_COBRANCA")
    .eq("origem_id", cobrancaId);

  if (error) {
    console.warn(
      "[processarClassificacaoFinanceira] falha ao limpar rateios anteriores:",
      error?.message ?? error
    );
  }
}

export async function processarClassificacaoFinanceira(
  supabase: SupabaseClient,
  cobranca: CobrancaBase
): Promise<ResultadoClassificacao> {
  if (!cobranca?.id) {
    return { ok: false, error: "cobranca_invalida" };
  }

  const dataMovimento =
    cobranca.data_pagamento && cobranca.data_pagamento.includes("T")
      ? cobranca.data_pagamento
      : cobranca.data_pagamento
      ? `${cobranca.data_pagamento}T00:00:00`
      : new Date().toISOString();

  const origemTipo = (cobranca.origem_tipo || "").toUpperCase();

  // CREDITO_CONEXAO: no momento apenas registrar saldo, sem rateio final
  if (origemTipo === "CREDITO_CONEXAO_FATURA") {
    return { ok: true, movimentosCriados: 0 };
  }

  // Se nao tem origem, nao ha como classificar
  if (!origemTipo) {
    return { ok: false, error: "origem_nao_definida" };
  }

  await limparRateiosAnteriores(supabase, cobranca.id);

  // Caso ESCOLA ou CAFE: usa centros dedicados (código ESC / CAF)
  if (origemTipo === "ESCOLA") {
    const centroEsc = await getCentroCustoIdPorCodigo(supabase, "ESC");
    if (!centroEsc) return { ok: false, error: "centro_esc_nao_configurado" };

    const { error } = await supabase.from("movimento_financeiro").insert({
      tipo: "RECEITA",
      centro_custo_id: centroEsc,
      valor_centavos: cobranca.valor_centavos,
      data_movimento: dataMovimento,
      origem: "RATEIO_COBRANCA",
      origem_id: cobranca.id,
      descricao: `Rateio cobrança #${cobranca.id} para ESC`,
      usuario_id: null,
    });

    if (error) return { ok: false, error: "erro_inserir_movimento", details: error };
    return { ok: true, movimentosCriados: 1 };
  }

  if (origemTipo === "CAFE") {
    const centroCafe = await getCentroCustoIdPorCodigo(supabase, "CAF");
    if (!centroCafe) return { ok: false, error: "centro_caf_nao_configurado" };

    const { error } = await supabase.from("movimento_financeiro").insert({
      tipo: "RECEITA",
      centro_custo_id: centroCafe,
      valor_centavos: cobranca.valor_centavos,
      data_movimento: dataMovimento,
      origem: "RATEIO_COBRANCA",
      origem_id: cobranca.id,
      descricao: `Rateio cobrança #${cobranca.id} para CAF`,
      usuario_id: null,
    });

    if (error) return { ok: false, error: "erro_inserir_movimento", details: error };
    return { ok: true, movimentosCriados: 1 };
  }

  // Caso LOJA: rateia para centros de custo das subcategorias dos itens da venda
  if (origemTipo === "LOJA_VENDA" && cobranca.origem_id) {
    const vendaId = cobranca.origem_id;

    const { data: itens, error: itensError } = await supabase
      .from("loja_venda_itens")
      .select(
        `
        id,
        total_centavos,
        categoria_subcategoria_id,
        produto:produto_id (
          id,
          categoria_subcategoria_id
        )
      `
      )
      .eq("venda_id", vendaId);

    if (itensError) {
      return { ok: false, error: "erro_buscar_itens_venda", details: itensError };
    }

    const subcatIds = Array.from(
      new Set(
        (itens ?? [])
          .map((it: any) => it.categoria_subcategoria_id ?? it.produto?.categoria_subcategoria_id)
          .filter((id: any) => typeof id === "number")
      )
    );

    const { data: subcats, error: subError } = await supabase
      .from("loja_produto_categoria_subcategoria")
      .select("id, centro_custo_id")
      .in("id", subcatIds.length ? subcatIds : [-1]);

    if (subError) {
      return { ok: false, error: "erro_buscar_subcategorias", details: subError };
    }

    const subcatMap = new Map<number, number | null>();
    (subcats ?? []).forEach((s: any) => subcatMap.set(s.id, s.centro_custo_id ?? null));

    const agrupado = new Map<number, number>();
    for (const it of itens ?? []) {
      const subId = it.categoria_subcategoria_id ?? it.produto?.categoria_subcategoria_id ?? null;
      if (!subId) continue;
      const centroDestino = subcatMap.get(subId);
      if (!centroDestino) continue;
      const valorItem = Number(it.total_centavos ?? 0);
      const atual = agrupado.get(centroDestino) ?? 0;
      agrupado.set(centroDestino, atual + valorItem);
    }

    let criados = 0;
    for (const [centroDestino, valor] of agrupado.entries()) {
      const { error } = await supabase.from("movimento_financeiro").insert({
        tipo: "RECEITA",
        centro_custo_id: centroDestino,
        valor_centavos: valor,
        data_movimento: dataMovimento,
        origem: "RATEIO_COBRANCA",
        origem_id: cobranca.id,
        descricao: `Rateio cobrança #${cobranca.id} (venda #${vendaId})`,
        usuario_id: null,
      });

      if (error) {
        return { ok: false, error: "erro_inserir_movimento", details: error };
      }
      criados += 1;
    }

    return { ok: true, movimentosCriados: criados };
  }

  // Origem desconhecida: nada a fazer
  return { ok: true, movimentosCriados: 0 };
}
