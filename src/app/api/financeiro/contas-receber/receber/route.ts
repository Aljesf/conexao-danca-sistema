import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

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

  const {
    cobranca_id,
    valor_centavos,
    data_pagamento,
    metodo_pagamento,
    forma_pagamento_codigo,
    cartao_maquina_id,
    cartao_bandeira_id,
    cartao_numero_parcelas,
    centro_custo_id,
    observacoes,
  } = body ?? {};

  if (!cobranca_id || typeof cobranca_id !== "number") {
    return NextResponse.json(
      { ok: false, error: "cobranca_id obrigatorio e numerico." },
      { status: 400 }
    );
  }

  const valor = Number(valor_centavos || 0);
  if (!Number.isFinite(valor) || valor <= 0) {
    return NextResponse.json(
      { ok: false, error: "valor_centavos deve ser numerico e maior que zero." },
      { status: 400 }
    );
  }

  const dataPgto = (data_pagamento || new Date().toISOString().slice(0, 10)) as string;
  const metodo = forma_pagamento_codigo || metodo_pagamento || "OUTRO";

  try {
    const { data: cobranca, error: errCob } = await supabaseAdmin
      .from("cobrancas")
      .select("id, valor_centavos, status, descricao, centro_custo_id, pessoa_id")
      .eq("id", cobranca_id)
      .maybeSingle();

    if (errCob || !cobranca) {
      return NextResponse.json({ ok: false, error: "Cobranca nao encontrada." }, { status: 404 });
    }

    if (cobranca.status === "RECEBIDO") {
      return NextResponse.json({ ok: false, error: "Cobranca já recebida." }, { status: 400 });
    }

    const { data: recebimentosExist, error: errRecExist } = await supabaseAdmin
      .from("recebimentos")
      .select("valor_centavos")
      .eq("cobranca_id", cobranca.id);

    if (errRecExist) {
      return NextResponse.json({ ok: false, error: "Erro ao consultar recebimentos." }, { status: 500 });
    }

    const totalAnterior =
      recebimentosExist?.reduce((acc: number, r: any) => acc + Number(r.valor_centavos || 0), 0) ?? 0;
    const totalApos = totalAnterior + valor;
    const valorCobranca = Number(cobranca.valor_centavos || 0);
    const statusFinal = totalApos >= valorCobranca ? ("RECEBIDO" as const) : cobranca.status;

    const { data: recebimento, error: errInsert } = await supabaseAdmin
      .from("recebimentos")
      .insert({
        cobranca_id: cobranca.id,
        centro_custo_id: centro_custo_id ?? cobranca.centro_custo_id ?? null,
        valor_centavos: valor,
        data_pagamento: `${dataPgto}T00:00:00Z`,
        metodo_pagamento: metodo,
        forma_pagamento_codigo: forma_pagamento_codigo ?? null,
        cartao_maquina_id: cartao_maquina_id ?? null,
        cartao_bandeira_id: cartao_bandeira_id ?? null,
        cartao_numero_parcelas: cartao_numero_parcelas ?? null,
        origem_sistema: "ADMIN_FINANCEIRO",
        observacoes: observacoes ?? null,
      })
      .select("*")
      .maybeSingle();

    if (errInsert || !recebimento) {
      console.error("[/api/financeiro/contas-receber/receber] Falha ao inserir recebimento:", errInsert);
      return NextResponse.json(
        { ok: false, error: "Erro ao registrar recebimento." },
        { status: 500 }
      );
    }

    const { error: errMov } = await supabaseAdmin.from("movimento_financeiro").insert({
      tipo: "ENTRADA",
      centro_custo_id: centro_custo_id ?? cobranca.centro_custo_id ?? null,
      valor_centavos: valor,
      data_movimento: `${dataPgto}T00:00:00Z`,
      origem: "COBRANCA",
      origem_id: cobranca.id,
      descricao: cobranca.descricao || `Recebimento cobrança #${cobranca.id}`,
      usuario_id: null,
    });

    if (errMov) {
      console.warn(
        "[/api/financeiro/contas-receber/receber] Falha ao registrar movimento_financeiro:",
        errMov
      );
    }

    const total_recebido_centavos = totalApos;
    const saldo_centavos = Math.max(valorCobranca - totalApos, 0);

    await supabaseAdmin
      .from("cobrancas")
      .update({
        status: statusFinal,
        data_pagamento: statusFinal === "RECEBIDO" ? dataPgto : cobranca.data_pagamento ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cobranca.id);

    return NextResponse.json({
      ok: true,
      cobranca: { ...cobranca, status: statusFinal },
      recebimento,
      total_recebido_centavos,
      saldo_centavos,
    });
  } catch (err) {
    console.error("[/api/financeiro/contas-receber/receber] Erro:", err);
    return NextResponse.json({ ok: false, error: "Erro inesperado ao registrar recebimento." }, { status: 500 });
  }
}
