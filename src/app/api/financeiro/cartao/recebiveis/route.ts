import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[/api/financeiro/cartao/recebiveis] Variaveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao definidas."
  );
}

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

function nowLocalISOString(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString();
}

export async function GET(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { ok: false, error: "Configuracao do Supabase ausente." },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "PREVISTO";
  const dataInicio = searchParams.get("data_inicio");
  const dataFim = searchParams.get("data_fim");

  let query = supabaseAdmin
    .from("cartao_recebiveis")
    .select(
      `
      id,
      venda_id,
      maquina_id,
      bandeira_id,
      conta_financeira_id,
      valor_bruto_centavos,
      taxa_operadora_centavos,
      valor_liquido_centavos,
      numero_parcelas,
      data_prevista_pagamento,
      status,
      data_pagamento_real,
      cartao_maquinas:maquina_id ( nome, operadora, centro_custo_id ),
      cartao_bandeiras:bandeira_id ( nome )
    `
    )
    .eq("status", status)
    .order("data_prevista_pagamento", { ascending: true })
    .order("id", { ascending: true });

  if (dataInicio) {
    query = query.gte("data_prevista_pagamento", dataInicio);
  }

  if (dataFim) {
    query = query.lte("data_prevista_pagamento", dataFim);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[GET /api/financeiro/cartao/recebiveis] Erro ao buscar recebiveis:", error);
    return NextResponse.json(
      { ok: false, error: "Erro ao buscar recebiveis de cartao." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, recebiveis: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { ok: false, error: "Configuracao do Supabase ausente." },
      { status: 500 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body JSON invalido." }, { status: 400 });
  }

  const recebivelId = Number(body?.recebivel_id);
  const dataPagamento =
    typeof body?.data_pagamento === "string" && body.data_pagamento
      ? body.data_pagamento
      : new Date().toISOString().slice(0, 10);
  const valorLiquidoOverride = Number(body?.valor_liquido_centavos);

  if (!Number.isFinite(recebivelId) || recebivelId <= 0) {
    return NextResponse.json(
      { ok: false, error: "recebivel_id e obrigatorio e deve ser numerico." },
      { status: 400 }
    );
  }

  const { data: recebivel, error: recebivelError } = await supabaseAdmin
    .from("cartao_recebiveis")
    .select("*")
    .eq("id", recebivelId)
    .maybeSingle();

  if (recebivelError || !recebivel) {
    console.error(
      "[POST /api/financeiro/cartao/recebiveis] Recebivel de cartao nao encontrado:",
      recebivelError
    );
    return NextResponse.json(
      { ok: false, error: "Recebivel de cartao nao encontrado." },
      { status: 404 }
    );
  }

  if (recebivel.status === "PAGO") {
    return NextResponse.json(
      { ok: false, error: "Recebivel ja esta marcado como PAGO." },
      { status: 400 }
    );
  }

  if (recebivel.status === "CANCELADO") {
    return NextResponse.json(
      { ok: false, error: "Recebivel cancelado nao pode ser baixado." },
      { status: 400 }
    );
  }

  const valorLiquidoCentavos =
    Number.isFinite(valorLiquidoOverride) && valorLiquidoOverride > 0
      ? valorLiquidoOverride
      : Number(recebivel.valor_liquido_centavos || 0);

  const { data: maquina, error: maquinaError } = await supabaseAdmin
    .from("cartao_maquinas")
    .select("id, centro_custo_id")
    .eq("id", recebivel.maquina_id)
    .maybeSingle();

  if (maquinaError || !maquina) {
    console.error(
      "[POST /api/financeiro/cartao/recebiveis] Erro ao buscar maquininha do recebivel:",
      maquinaError
    );
    return NextResponse.json(
      {
        ok: false,
        error:
          "Repasse registrado parcialmente. Nao foi possivel identificar o centro de custo da maquininha.",
      },
      { status: 500 }
    );
  }

  const { data: recebimento, error: recebimentoError } = await supabaseAdmin
    .from("recebimentos")
    .insert({
      cobranca_id: null,
      centro_custo_id: maquina.centro_custo_id,
      valor_centavos: valorLiquidoCentavos,
      data_pagamento: `${dataPagamento}T00:00:00`,
      metodo_pagamento: "CREDITO_OPERADORA",
      origem_sistema: "CARTAO_REPASSE",
      observacoes: `Repasse cartao - recebivel #${recebivelId}`,
    })
    .select("*")
    .maybeSingle();

  if (recebimentoError) {
    console.error(
      "[POST /api/financeiro/cartao/recebiveis] Erro ao registrar recebimento do repasse:",
      recebimentoError
    );
    return NextResponse.json(
      { ok: false, error: "Erro ao registrar recebimento do repasse." },
      { status: 500 }
    );
  }

  const { error: movimentoError } = await supabaseAdmin.from("movimento_financeiro").insert({
    tipo: "RECEITA",
    centro_custo_id: maquina.centro_custo_id,
    valor_centavos: valorLiquidoCentavos,
    data_movimento: nowLocalISOString(),
    origem: "CARTAO_REPASSE",
    origem_id: recebivelId,
    descricao: `Repasse cartao - Venda #${recebivel.venda_id}`,
    usuario_id: null,
  });

  if (movimentoError) {
    console.error(
      "[POST /api/financeiro/cartao/recebiveis] Erro ao registrar movimento financeiro:",
      movimentoError
    );
    return NextResponse.json(
      {
        ok: false,
        error: "Repasse registrado mas houve erro ao gravar movimento financeiro.",
      },
      { status: 500 }
    );
  }

  const { error: updateError } = await supabaseAdmin
    .from("cartao_recebiveis")
    .update({
      status: "PAGO",
      data_pagamento_real: dataPagamento,
      valor_liquido_centavos: valorLiquidoCentavos,
      updated_at: new Date().toISOString(),
    })
    .eq("id", recebivelId);

  if (updateError) {
    console.error(
      "[POST /api/financeiro/cartao/recebiveis] Erro ao atualizar recebivel:",
      updateError
    );
    return NextResponse.json(
      {
        ok: false,
        error: "Repasse registrado mas houve erro ao atualizar o recebivel.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, recebimento });
}
