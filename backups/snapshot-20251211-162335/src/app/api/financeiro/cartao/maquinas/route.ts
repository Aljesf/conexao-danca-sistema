import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[/api/financeiro/cartao/maquinas] Variaveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao definidas."
  );
}

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Configuracao do Supabase ausente." },
      { status: 500 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("cartao_maquinas")
    .select(
      `
      id,
      nome,
      operadora,
      conta_financeira_id,
      centro_custo_id,
      ativo,
      observacoes,
      created_at,
      updated_at,
      contas_financeiras:conta_financeira_id ( id, codigo, nome ),
      centros_custo:centro_custo_id ( id, nome )
    `
    )
    .order("ativo", { ascending: false })
    .order("nome", { ascending: true });

  if (error) {
    console.error("[GET /api/financeiro/cartao/maquinas] Erro ao listar cartao_maquinas:", error);
    return NextResponse.json(
      { error: "Erro ao listar maquininhas de cartao" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, maquinas: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Configuracao do Supabase ausente." },
      { status: 500 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalido." }, { status: 400 });
  }

  const {
    id,
    nome,
    operadora,
    conta_financeira_id,
    centro_custo_id,
    ativo,
    observacoes,
  } = body ?? {};

  if (!nome || !conta_financeira_id || !centro_custo_id) {
    return NextResponse.json(
      { error: "Nome, conta financeira e centro de custo sao obrigatorios." },
      { status: 400 }
    );
  }

  const contaIdNum = Number(conta_financeira_id);
  const centroIdNum = Number(centro_custo_id);

  const payloadBase = {
    nome: String(nome).trim(),
    operadora: operadora ? String(operadora).trim() : null,
    conta_financeira_id: Number.isFinite(contaIdNum) ? contaIdNum : null,
    centro_custo_id: Number.isFinite(centroIdNum) ? centroIdNum : null,
    ativo: typeof ativo === "boolean" ? ativo : true,
    observacoes: observacoes ? String(observacoes).trim() : null,
  };

  const idNum = Number(id);
  if (Number.isFinite(idNum) && idNum > 0) {
    const payload = { ...payloadBase, updated_at: new Date().toISOString() };
    const { data, error } = await supabaseAdmin
      .from("cartao_maquinas")
      .update(payload)
      .eq("id", idNum)
      .select()
      .maybeSingle();

    if (error) {
      console.error("[POST /api/financeiro/cartao/maquinas] Erro ao atualizar maquininha:", error);
      return NextResponse.json(
        { error: "Erro ao atualizar maquininha de cartao" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, maquina: data });
  }

  const { data, error } = await supabaseAdmin
    .from("cartao_maquinas")
    .insert(payloadBase)
    .select()
    .maybeSingle();

  if (error) {
    console.error("[POST /api/financeiro/cartao/maquinas] Erro ao criar maquininha:", error);
    return NextResponse.json(
      { error: "Erro ao criar maquininha de cartao" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, maquina: data });
}
