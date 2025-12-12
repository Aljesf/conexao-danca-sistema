import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { markNeofinBillingAsPaid } from "@/lib/neofinClient";
import { processarClassificacaoFinanceira } from "@/lib/financeiro/processarClassificacaoFinanceira";
import type { SupabaseClient } from "@supabase/supabase-js";

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
  origem_tipo?: string | null;
  origem_id?: number | null;
};

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

export async function POST(req: Request) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "usuario_nao_autenticado" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as RequestPayload | null;
  const cobrancaId = body?.cobranca_id ? Number(body.cobranca_id) : NaN;
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

  if (cobranca.status === "PAGO") {
    return NextResponse.json(
      { ok: true, cobranca_id: cobranca.id, status: "PAGO", idempotent: true },
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

  // Se a cobranca veio de uma fatura de Credito Conexao, atualiza status da fatura
  if (
    cobrancaAtualizada.origem_tipo === "CREDITO_CONEXAO_FATURA" &&
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
