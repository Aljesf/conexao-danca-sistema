import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getCentroCustoCafeId,
  getCentroCustoEscolaId,
  getCentroCustoIntermediacaoId,
} from "@/lib/financeiro/centrosCusto";

type CobrancaBase = {
  id: number;
  valor_centavos: number;
  centro_custo_id: number | null;
  origem_tipo?: string | null;
  origem_id?: number | null;
  data_pagamento?: string | null;
};

type ResultadoClassificacao =
  | { ok: true; movimentosCriados: number; detalhes?: any }
  | { ok: false; error: string; details?: any };

async function limparRateiosAnteriores(
  supabase: SupabaseClient,
  cobrancaId: number
): Promise<void> {
  const { error } = await supabase
    .from("movimento_financeiro")
    .delete()
    .in("origem", ["RATEIO_COBRANCA", "TAXA_CREDITO_CONEXAO"])
    .eq("origem_id", cobrancaId);

  if (error) {
    console.warn(
      "[processarClassificacaoFinanceira] falha ao limpar rateios anteriores:",
      error?.message ?? error
    );
  }
}

async function buscarRegraParcelamento(
  supabase: SupabaseClient,
  tipoConta: string,
  numeroParcelas: number,
  valorTotal: number
) {
  const { data: regras, error } = await supabase
    .from("credito_conexao_regras_parcelas")
    .select(
      `
      id,
      tipo_conta,
      numero_parcelas_min,
      numero_parcelas_max,
      valor_minimo_centavos,
      taxa_percentual,
      taxa_fixa_centavos,
      centro_custo_id,
      categoria_financeira_id,
      ativo
    `
    )
    .eq("tipo_conta", tipoConta)
    .eq("ativo", true);

  if (error) {
    return { error };
  }

  const candidatas = (regras ?? []).filter((r: any) => {
    const min = Number(r.numero_parcelas_min ?? 0);
    const max = Number(r.numero_parcelas_max ?? 0);
    const vmin = Number(r.valor_minimo_centavos ?? 0);
    return (
      numeroParcelas >= min &&
      numeroParcelas <= max &&
      valorTotal >= vmin
    );
  });

  candidatas.sort((a: any, b: any) => {
    const vminA = Number(a.valor_minimo_centavos ?? 0);
    const vminB = Number(b.valor_minimo_centavos ?? 0);
    if (vminA !== vminB) return vminB - vminA; // maior valor_minimo = mais específico
    const faixaA =
      Number(a.numero_parcelas_max ?? 0) - Number(a.numero_parcelas_min ?? 0);
    const faixaB =
      Number(b.numero_parcelas_max ?? 0) - Number(b.numero_parcelas_min ?? 0);
    if (faixaA !== faixaB) return faixaA - faixaB; // faixa mais estreita primeiro
    return Number(b.numero_parcelas_max ?? 0) - Number(a.numero_parcelas_max ?? 0);
  });

  return { regra: candidatas[0] ?? null };
}

async function carregarItensVendaComCentros(
  supabase: SupabaseClient,
  vendaIds: number[]
) {
  if (!vendaIds.length) return { itens: [], centrosSubcat: new Map<number, number | null>() };

  const { data: itens, error: itensError } = await supabase
    .from("loja_venda_itens")
    .select(
      `
      id,
      venda_id,
      total_centavos,
      categoria_subcategoria_id,
      produto:produto_id (
        categoria_subcategoria_id
      )
    `
    )
    .in("venda_id", vendaIds);

  if (itensError) {
    return { error: itensError, itens: [], centrosSubcat: new Map() };
  }

  const subcatIds = Array.from(
    new Set(
      (itens ?? [])
        .map(
          (it: any) =>
            it.categoria_subcategoria_id ?? it.produto?.categoria_subcategoria_id
        )
        .filter((id: any) => typeof id === "number")
    )
  );

  const { data: subcats, error: subError } = await supabase
    .from("loja_produto_categoria_subcategoria")
    .select("id, centro_custo_id")
    .in("id", subcatIds.length ? subcatIds : [-1]);

  if (subError) {
    return { error: subError, itens: itens ?? [], centrosSubcat: new Map() };
  }

  const centrosSubcat = new Map<number, number | null>();
  (subcats ?? []).forEach((s: any) => centrosSubcat.set(s.id, s.centro_custo_id ?? null));

  return { itens: itens ?? [], centrosSubcat };
}

export async function processarClassificacaoFinanceira(
  supabase: SupabaseClient,
  cobranca: CobrancaBase
): Promise<ResultadoClassificacao> {
  console.log("[processarClassificacaoFinanceira] iniciado", { cobrancaId: cobranca?.id });

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

  // Se nao tem origem, nao ha como classificar
  if (!origemTipo) {
    return { ok: false, error: "origem_nao_definida" };
  }

  await limparRateiosAnteriores(supabase, cobranca.id);

  // Branch especial para Credito Conexao (fatura)
  if (origemTipo === "CREDITO_CONEXAO_FATURA" && cobranca.origem_id) {
    const { data: fatura, error: faturaError } = await supabase
      .from("credito_conexao_faturas")
      .select(
        `
        id,
        conta_conexao_id,
        valor_total_centavos,
        valor_taxas_centavos,
        conta:credito_conexao_contas (
          tipo_conta
        ),
        lancamentos:credito_conexao_fatura_lancamentos (
          lancamento:credito_conexao_lancamentos (
            id,
            origem_sistema,
            origem_id,
            valor_centavos,
            numero_parcelas
          )
        )
      `
      )
      .eq("id", cobranca.origem_id)
      .maybeSingle();

    if (faturaError || !fatura) {
      return { ok: false, error: "fatura_nao_encontrada", details: faturaError };
    }

    const tipoConta = (fatura as any)?.conta?.tipo_conta;
    if (!tipoConta) {
      return { ok: false, error: "tipo_conta_indefinido" };
    }

    const lancamentosFatura =
      (fatura as any)?.lancamentos?.map((l: any) => l.lancamento).filter(Boolean) ?? [];

    const numeroParcelas = Math.max(
      1,
      ...lancamentosFatura
        .map((l: any) => Number(l.numero_parcelas || 0))
        .filter((n: number) => Number.isFinite(n) && n > 0)
    );

    const valorTotal = Number(fatura.valor_total_centavos ?? cobranca.valor_centavos ?? 0);

    const { regra, error: regraError } = await buscarRegraParcelamento(
      supabase,
      tipoConta,
      numeroParcelas,
      valorTotal
    );

    if (regraError) {
      return { ok: false, error: "erro_buscar_regra_parcelamento", details: regraError };
    }

    const centroFin = await getCentroCustoIntermediacaoId(supabase);

    let movimentosCriados = 0;
    let taxaAplicada = 0;

    if (regra) {
      const taxaPerc = Number(regra.taxa_percentual ?? 0);
      const taxaFixa = Number(regra.taxa_fixa_centavos ?? 0);
      const taxa = Math.max(
        Math.round((cobranca.valor_centavos || 0) * taxaPerc / 100) + taxaFixa,
        0
      );
      taxaAplicada = taxa;

      if (taxa > 0) {
        const centroTaxa = regra.centro_custo_id ?? centroFin;
        if (!centroTaxa) {
          return { ok: false, error: "centro_custo_taxa_indefinido" };
        }

        const { error: taxaError } = await supabase.from("movimento_financeiro").insert({
          tipo: "RECEITA",
          centro_custo_id: centroTaxa,
          valor_centavos: taxa,
          data_movimento: dataMovimento,
          origem: "TAXA_CREDITO_CONEXAO",
          origem_id: cobranca.id,
          descricao: `Taxa parcelamento Credito Conexao (fatura #${cobranca.origem_id} / cobranca #${cobranca.id})`,
          usuario_id: null,
        });

        if (taxaError) {
          return { ok: false, error: "erro_inserir_taxa", details: taxaError };
        }

        movimentosCriados += 1;
      }
    }

    if (!lancamentosFatura.length) {
      return {
        ok: true,
        movimentosCriados,
        detalhes: { aviso: "sem_lancamentos_fatura", taxa_aplicada: taxaAplicada },
      };
    }

    // Rateio por origem/subcategoria
    const vendaIds = Array.from(
      new Set(
        lancamentosFatura
          .filter((l: any) => (l.origem_sistema || "").toUpperCase() === "LOJA")
          .map((l: any) => Number(l.origem_id))
          .filter((id: number) => Number.isFinite(id) && id > 0)
      )
    );

    const { itens: itensVenda, centrosSubcat, error: itensError } =
      await carregarItensVendaComCentros(supabase, vendaIds);

    if (itensError) {
      return { ok: false, error: "erro_buscar_itens_venda", details: itensError };
    }

    const centroEsc = await getCentroCustoEscolaId(supabase);
    const centroCafe = await getCentroCustoCafeId(supabase);

    const agregados = new Map<number, number>();
    let rateioLojaAplicado = false;

    // Helper para acumular valores
    const acumula = (centro: number | null | undefined, valor: number) => {
      if (!centro) return;
      const atual = agregados.get(centro) ?? 0;
      agregados.set(centro, atual + valor);
    };

    // Pré-agrupa valores de venda por centro (subcategoria)
    const valorPorCentroDeVenda = new Map<number, number>();
    for (const it of itensVenda ?? []) {
      const subId =
        it.categoria_subcategoria_id ?? it.produto?.categoria_subcategoria_id ?? null;
      const centroDestino = subId ? centrosSubcat.get(subId) : null;
      if (!centroDestino) continue;
      const valorItem = Number(it.total_centavos ?? 0);
      const atual = valorPorCentroDeVenda.get(centroDestino) ?? 0;
      valorPorCentroDeVenda.set(centroDestino, atual + valorItem);
    }

    for (const l of lancamentosFatura) {
      const origem = (l?.origem_sistema || "").toUpperCase();
      const valor = Number(l?.valor_centavos ?? 0);

      if (origem === "LOJA") {
        if (rateioLojaAplicado) continue;
        rateioLojaAplicado = true;
        // distribui conforme itens da venda (já agregados)
        for (const [centro, valorCentro] of valorPorCentroDeVenda.entries()) {
          // proporcional pelo valor do lançamento vs total da venda? Aqui somamos total da venda; se houver divergência, aceitar integral
          acumula(centro, valorCentro);
        }
      } else if (origem === "CAFE") {
        if (centroCafe) {
          acumula(centroCafe, valor);
        }
      } else if (origem === "ESCOLA") {
        if (centroEsc) {
          acumula(centroEsc, valor);
        }
      }
    }

    for (const [centroDestino, valor] of agregados.entries()) {
      if (!valor || valor === 0) continue;
      const { error: movError } = await supabase.from("movimento_financeiro").insert({
        tipo: "RECEITA",
        centro_custo_id: centroDestino,
        valor_centavos: valor,
        data_movimento: dataMovimento,
        origem: "RATEIO_COBRANCA",
        origem_id: cobranca.id,
        descricao: `Rateio cobrança #${cobranca.id} (fatura Credito Conexao #${cobranca.origem_id})`,
        usuario_id: null,
      });

      if (movError) {
        return { ok: false, error: "erro_inserir_movimento", details: movError };
      }
      movimentosCriados += 1;
    }

    return { ok: true, movimentosCriados, detalhes: { taxa_aplicada: taxaAplicada } };
  }

  // Caso ESCOLA ou CAFE: usa centros dedicados (código ESC / CAF)
  if (origemTipo === "ESCOLA") {
    const centroEsc = await getCentroCustoEscolaId(supabase);
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
    const centroCafe = await getCentroCustoCafeId(supabase);
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
