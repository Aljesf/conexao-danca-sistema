import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";
import { markNeofinBillingAsPaid } from "@/lib/neofinClient";
import { processarClassificacaoFinanceira } from "@/lib/financeiro/processarClassificacaoFinanceira";
import { recalcularFaturasRelacionadasPorCobranca } from "@/lib/financeiro/creditoConexaoFaturas";
import type { SupabaseClient } from "@supabase/supabase-js";
import { guardApiByRole } from "@/lib/auth/roleGuard";

type RequestPayload = {
  cobranca_id?: number;
  data_pagamento?: string;
  metodo_pagamento?: "PIX" | "DINHEIRO";
  observacao?: string | null;
  centro_custo_id?: number | null;
};

type Cobranca = {
  id: number;
  pessoa_id: number;
  valor_centavos: number;
  status: string;
  centro_custo_id: number | null;
  neofin_charge_id: string | null;
  vencimento: string;
  data_pagamento?: string | null;
  origem_tipo?: string | null;
  origem_id?: number | null;
};

function isCobrancaFaturaCreditoConexao(origemTipo: string | null | undefined): boolean {
  const normalized = (origemTipo ?? "").toUpperCase();
  return normalized === "CREDITO_CONEXAO_FATURA" || normalized === "FATURA_CREDITO_CONEXAO";
}

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
    console.error(`[Registrar pagamento presencial] erro ao buscar centro ${codigo}:`, error);
    return null;
  }

  return (data as any)?.id ?? null;
}

async function contarLancamentosDaFatura(
  supabase: SupabaseClient,
  faturaId: number
): Promise<number> {
  const { count, error } = await supabase
    .from("credito_conexao_fatura_lancamentos")
    .select("lancamento_id", { count: "exact", head: true })
    .eq("fatura_id", faturaId);

  if (error) {
    console.error("[Registrar pagamento presencial] erro ao contar lancamentos da fatura:", error);
    return -1;
  }

  return count ?? 0;
}

async function marcarLancamentosDaFaturaComoPagos(
  supabase: SupabaseClient,
  faturaId: number
): Promise<{ ok: boolean; error?: string }> {
  const { data: faturaLancamentos, error: vinculosError } = await supabase
    .from("credito_conexao_fatura_lancamentos")
    .select("lancamento_id")
    .eq("fatura_id", faturaId);

  if (vinculosError) {
    console.error(
      "[Registrar pagamento presencial] erro ao buscar lancamentos da fatura:",
      vinculosError
    );
    return { ok: false, error: "erro_buscar_lancamentos_fatura" };
  }

  const lancamentoIds = (faturaLancamentos ?? [])
    .map((item: any) => Number(item?.lancamento_id ?? 0))
    .filter((id: number) => Number.isFinite(id) && id > 0);

  if (lancamentoIds.length === 0) {
    return { ok: true };
  }

  const { error: lancamentosError } = await supabase
    .from("credito_conexao_lancamentos")
    .update({ status: "PAGO", updated_at: new Date().toISOString() })
    .in("id", lancamentoIds)
    .eq("status", "FATURADO");

  if (lancamentosError) {
    console.error(
      "[Registrar pagamento presencial] erro ao atualizar lancamentos da fatura:",
      lancamentosError
    );
    return { ok: false, error: "erro_atualizar_lancamentos_fatura" };
  }

  return { ok: true };
}

export async function POST(request: NextRequest) {
  const denied = await guardApiByRole(request as any);
  if (denied) return denied as any;
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;

  const body = (await request.json().catch(() => null)) as RequestPayload | null;
  const cobrancaId = body?.cobranca_id ? Number(body.cobranca_id) : NaN;
  const forceRateio = new URL(request.url).searchParams.get("force_rateio") === "true";
  const dataPagamento =
    typeof body?.data_pagamento === "string" && body.data_pagamento
      ? body.data_pagamento
      : new Date().toISOString().slice(0, 10);
  const metodoPagamento = body?.metodo_pagamento;
  const observacao =
    typeof body?.observacao === "string" && body.observacao.trim()
      ? body.observacao.trim()
      : null;

  if (!cobrancaId || Number.isNaN(cobrancaId)) {
    return NextResponse.json(
      { ok: false, error: "cobranca_id_obrigatorio" },
      { status: 400 }
    );
  }

  if (!metodoPagamento || (metodoPagamento !== "PIX" && metodoPagamento !== "DINHEIRO")) {
    return NextResponse.json(
      { ok: false, error: "metodo_pagamento_invalido" },
      { status: 400 }
    );
  }

  const { data: cobranca, error: cobrancaError } = await supabase
    .from("cobrancas")
    .select(
      `
      id,
      pessoa_id,
      valor_centavos,
      status,
      centro_custo_id,
      neofin_charge_id,
      vencimento,
      data_pagamento,
      origem_tipo,
      origem_id
    `
    )
    .eq("id", cobrancaId)
    .single<Cobranca>();

  if (cobrancaError || !cobranca) {
    console.error("[Registrar pagamento presencial] cobranca_nao_encontrada:", cobrancaError);
    return NextResponse.json({ ok: false, error: "cobranca_nao_encontrada" }, { status: 404 });
  }

  let lancamentosFaturaCount: number | null = null;
  if (isCobrancaFaturaCreditoConexao(cobranca.origem_tipo) && cobranca.origem_id) {
    lancamentosFaturaCount = await contarLancamentosDaFatura(supabase, cobranca.origem_id);
    if (lancamentosFaturaCount === -1) {
      return NextResponse.json(
        { ok: false, error: "erro_contar_lancamentos_fatura" },
        { status: 500 }
      );
    }
    if (lancamentosFaturaCount === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "fatura_sem_lancamentos",
          message: "Nao e possivel pagar uma fatura da conta interna sem lancamentos consolidados.",
        },
        { status: 400 }
      );
    }
  }

  if (cobranca.status === "PAGO") {
    if (
      isCobrancaFaturaCreditoConexao(cobranca.origem_tipo) &&
      cobranca.origem_id &&
      lancamentosFaturaCount !== 0
    ) {
      if (lancamentosFaturaCount === null) {
        lancamentosFaturaCount = await contarLancamentosDaFatura(supabase, cobranca.origem_id);
      }
      if (lancamentosFaturaCount === 0) {
        return NextResponse.json(
          {
            ok: false,
            error: "fatura_sem_lancamentos",
            message: "Adicione lancamentos (loja, cafe ou escola) antes de pagar esta fatura.",
          },
          { status: 400 }
        );
      }
    }

    const { data: movimentosClassificacao, error: movClassError } = await supabase
      .from("movimento_financeiro")
      .select("id")
      .eq("origem_id", cobranca.id)
      .in("origem", ["RATEIO_COBRANCA", "TAXA_CREDITO_CONEXAO"]);

    const jaClassificado = !movClassError && (movimentosClassificacao?.length ?? 0) > 0;

    if (jaClassificado && !forceRateio) {
      return NextResponse.json(
        {
          ok: true,
          cobranca_id: cobranca.id,
          status: "PAGO",
          idempotent: true,
          rateio_ok: true,
          rateio: { info: "classificacao_ja_existente" },
        },
        { status: 200 }
      );
    }

    let rateio_ok = true;
    let rateio_details: any = null;

    try {
      console.log("[registrar-pagamento-presencial] reprocessando classificacao PAGO", {
        cobrancaId: cobranca.id,
        origem: cobranca.origem_tipo,
        origemId: cobranca.origem_id,
        forceRateio,
      });

      const classificacao = await processarClassificacaoFinanceira(supabase, {
        ...cobranca,
        data_pagamento: cobranca.data_pagamento ?? dataPagamento,
      });
      if (!classificacao.ok) {
        rateio_ok = false;
        rateio_details = classificacao;
      } else if (classificacao.detalhes) {
        rateio_details = classificacao.detalhes;
      }
    } catch (err: any) {
      console.error("[Registrar pagamento presencial] erro ao classificar rateio (PAGO):", err);
      rateio_ok = false;
      rateio_details = { error: err?.message ?? String(err) };
    }

    return NextResponse.json(
      {
        ok: true,
        cobranca_id: cobranca.id,
        status: "PAGO",
        idempotent: true,
        rateio_ok,
        rateio: rateio_details,
      },
      { status: 200 }
    );
  }

  const centroCustoIdBody =
    typeof body?.centro_custo_id === "number" ? body.centro_custo_id : null;
  let centroCustoId = cobranca.centro_custo_id ?? centroCustoIdBody ?? null;

  if (!centroCustoId) {
    centroCustoId = await getCentroCustoIdPorCodigo(supabase, "FIN");
  }

  if (!centroCustoId) {
    return NextResponse.json({ ok: false, error: "centro_fin_nao_configurado" }, { status: 500 });
  }

  const dataPagamentoISO = dataPagamento.includes("T")
    ? dataPagamento
    : `${dataPagamento}T00:00:00`;

  const { data: cobrancaAtualizada, error: updateError } = await supabase
    .from("cobrancas")
    .update({
      status: "PAGO",
      data_pagamento: dataPagamentoISO,
      metodo_pagamento: metodoPagamento,
    })
    .eq("id", cobranca.id)
    .select(
      `
      id,
      pessoa_id,
      valor_centavos,
      status,
      centro_custo_id,
      neofin_charge_id,
      vencimento,
      origem_tipo,
      origem_id,
      data_pagamento,
      metodo_pagamento
    `
    )
    .single<Cobranca>();

  if (updateError || !cobrancaAtualizada) {
    console.error("[Registrar pagamento presencial] erro ao atualizar cobranca:", updateError);
    return NextResponse.json(
      { ok: false, error: "erro_atualizar_cobranca" },
      { status: 500 }
    );
  }

  const { data: recebimento, error: recebimentoError } = await supabase
    .from("recebimentos")
    .insert({
      cobranca_id: cobranca.id,
      centro_custo_id: centroCustoId,
      valor_centavos: cobranca.valor_centavos,
      data_pagamento: dataPagamentoISO,
      metodo_pagamento: metodoPagamento,
      origem_sistema: "PAGAMENTO_PRESENCIAL",
      observacoes: observacao,
    })
    .select("*")
    .single();

  if (recebimentoError || !recebimento) {
    console.error("[Registrar pagamento presencial] erro ao criar recebimento:", recebimentoError);
    return NextResponse.json(
      { ok: false, error: "erro_criar_recebimento" },
      { status: 500 }
    );
  }

  const { error: movimentoError } = await supabase.from("movimento_financeiro").insert({
    tipo: "RECEITA",
    centro_custo_id: centroCustoId,
    valor_centavos: cobranca.valor_centavos,
    data_movimento: dataPagamentoISO,
    origem: "RECEBIMENTO",
    origem_id: recebimento.id,
    descricao: `Pagamento presencial cobranca #${cobranca.id}`,
    usuario_id: user.id ?? null,
  });

  if (movimentoError) {
    console.error(
      "[Registrar pagamento presencial] erro ao registrar movimento financeiro:",
      movimentoError
    );
    return NextResponse.json(
      { ok: false, error: "erro_criar_movimento_financeiro" },
      { status: 500 }
    );
  }

  // Se a cobranca veio de uma fatura da conta interna, atualiza status da fatura
  if (
    isCobrancaFaturaCreditoConexao(cobrancaAtualizada.origem_tipo) &&
    cobrancaAtualizada.origem_id
  ) {
    const { error: faturaError } = await supabase
      .from("credito_conexao_faturas")
      .update({ status: "PAGA" })
      .eq("id", cobrancaAtualizada.origem_id);

    if (faturaError) {
      console.warn(
        "[Registrar pagamento presencial] falha ao atualizar status da fatura:",
        faturaError
      );
    }

    const syncLancamentos = await marcarLancamentosDaFaturaComoPagos(
      supabase,
      cobrancaAtualizada.origem_id
    );
    if (!syncLancamentos.ok) {
      console.warn(
        "[Registrar pagamento presencial] falha ao atualizar lancamentos pagos:",
        syncLancamentos.error
      );
    }
  }

  try {
    await recalcularFaturasRelacionadasPorCobranca(supabase as any, cobranca.id);
  } catch (faturaRelacionadaError) {
    console.warn(
      "[Registrar pagamento presencial] falha ao recalcular faturas relacionadas:",
      faturaRelacionadaError
    );
  }

  let neofin_ok = true;
  let neofin_details: any = null;
  let rateio_ok = true;
  let rateio_details: any = null;

  if (cobranca.neofin_charge_id) {
    const neofinResult = await markNeofinBillingAsPaid({
      integrationIdentifier: cobranca.neofin_charge_id,
      paidAt: dataPagamentoISO,
      paidAmountCentavos: cobranca.valor_centavos,
      paymentMethod: metodoPagamento,
      note: observacao ?? undefined,
    });

    if (!neofinResult.ok) {
      neofin_ok = false;
      neofin_details = neofinResult;
    } else {
      neofin_details = neofinResult.data;
    }
  }

  try {
    console.log("[registrar-pagamento-presencial] chamando processarClassificacaoFinanceira", {
      cobrancaId: cobrancaAtualizada.id,
      origem: cobrancaAtualizada.origem_tipo,
      origemId: cobrancaAtualizada.origem_id,
    });

    const classificacao = await processarClassificacaoFinanceira(supabase, {
      ...cobrancaAtualizada,
      data_pagamento: dataPagamentoISO,
    });
    if (!classificacao.ok) {
      rateio_ok = false;
      rateio_details = classificacao;
    } else if (classificacao.detalhes) {
      rateio_details = classificacao.detalhes;
    }
  } catch (err: any) {
    console.error("[Registrar pagamento presencial] erro ao classificar rateio:", err);
    rateio_ok = false;
    rateio_details = { error: err?.message ?? String(err) };
  }

  return NextResponse.json(
    {
      ok: true,
      cobranca: cobrancaAtualizada,
      recebimento,
      neofin_ok,
      neofin: neofin_details,
      rateio_ok,
      rateio: rateio_details,
    },
    { status: 200 }
  );
}


