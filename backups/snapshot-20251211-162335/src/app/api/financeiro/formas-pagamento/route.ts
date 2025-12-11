import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type FormaPagamentoContextoPayload = {
  id?: number;
  centro_custo_id: number;
  forma_pagamento_codigo: string;
  descricao_exibicao: string;
  ativo?: boolean;
  ordem_exibicao?: number;
  conta_financeira_id?: number | null;
  cartao_maquina_id?: number | null;
  carteira_tipo?: string | null;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[/api/financeiro/formas-pagamento] Variaveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao definidas."
  );
}

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

// GET /api/financeiro/formas-pagamento?centro_custo_id=...
export async function GET(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { ok: false, error: "Configuracao do Supabase ausente." },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const centroCustoIdParam = searchParams.get("centro_custo_id");
  const centroCustoId = centroCustoIdParam ? Number(centroCustoIdParam) : null;

  let query = supabaseAdmin
    .from("formas_pagamento_contexto")
    .select(
      `
      id,
      centro_custo_id,
      forma_pagamento_codigo,
      descricao_exibicao,
      ativo,
      ordem_exibicao,
      conta_financeira_id,
      cartao_maquina_id,
      carteira_tipo,
      formas_pagamento:forma_pagamento_codigo (
        id,
        nome,
        tipo_base,
        codigo,
        ativo
      ),
      contas_financeiras:conta_financeira_id (
        id,
        codigo,
        nome
      ),
      cartao_maquinas:cartao_maquina_id (
        id,
        nome
      )
    `
    )
    .order("ordem_exibicao", { ascending: true });

  if (centroCustoId) {
    query = query.eq("centro_custo_id", centroCustoId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao listar formas_pagamento_contexto", error);
    return NextResponse.json(
      { ok: false, error: "Erro ao listar formas de pagamento por contexto." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, formas: data ?? [] });
}

// POST /api/financeiro/formas-pagamento
// Body: FormaPagamentoContextoPayload (criar/atualizar linha de contexto)
export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { ok: false, error: "Configuracao do Supabase ausente." },
      { status: 500 }
    );
  }

  let body: Partial<FormaPagamentoContextoPayload>;
  try {
    body = (await req.json()) as Partial<FormaPagamentoContextoPayload>;
  } catch {
    return NextResponse.json({ ok: false, error: "Body JSON invalido." }, { status: 400 });
  }

  const {
    id,
    centro_custo_id,
    forma_pagamento_codigo,
    descricao_exibicao,
    ativo,
    ordem_exibicao,
    conta_financeira_id,
    cartao_maquina_id,
    carteira_tipo,
  } = body;

  if (!centro_custo_id || !forma_pagamento_codigo || !descricao_exibicao) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "centro_custo_id, forma_pagamento_codigo e descricao_exibicao sao obrigatorios.",
      },
      { status: 400 }
    );
  }

  const payload = {
    centro_custo_id,
    forma_pagamento_codigo,
    descricao_exibicao,
    ativo: typeof ativo === "boolean" ? ativo : true,
    ordem_exibicao: typeof ordem_exibicao === "number" ? ordem_exibicao : 0,
    conta_financeira_id: conta_financeira_id ?? null,
    cartao_maquina_id: cartao_maquina_id ?? null,
    carteira_tipo: carteira_tipo ?? null,
  };

  if (id) {
    const { data, error } = await supabaseAdmin
      .from("formas_pagamento_contexto")
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Erro ao atualizar formas_pagamento_contexto", error);
      return NextResponse.json(
        { ok: false, error: "Erro ao atualizar forma de pagamento do contexto." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, forma: data });
  }

  const { data, error } = await supabaseAdmin
    .from("formas_pagamento_contexto")
    .insert(payload)
    .select()
    .maybeSingle();

  if (error) {
    console.error("Erro ao criar formas_pagamento_contexto", error);
    return NextResponse.json(
      { ok: false, error: "Erro ao criar forma de pagamento para o contexto." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, forma: data });
}
