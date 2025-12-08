import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[/api/loja/debug/criar-venda-teste] Variaveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao definidas."
  );
}

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Configuracao do Supabase ausente. Verifique NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 500 }
    );
  }

  try {
    // IDs de teste - ajuste para registros reais do ambiente
    const cliente_pessoa_id = 1;
    const beneficiario_pessoa_id = 1;
    const produto_id = 1;

    const quantidade = 1;
    const preco_unitario_centavos = 1000;
    const total_centavos = quantidade * preco_unitario_centavos;

    // 1) Cabeçalho da venda
    const vendaInsert = await supabaseAdmin
      .from("loja_vendas")
      .insert({
        cliente_pessoa_id,
        tipo_venda: "VENDA",
        valor_total_centavos: total_centavos,
        desconto_centavos: 0,
        forma_pagamento: "AVISTA",
        status_pagamento: "PAGO",
        status_venda: "ATIVA",
        observacoes:
          "Venda de teste criada via /api/loja/debug/criar-venda-teste",
      })
      .select("*")
      .single();

    if (vendaInsert.error) {
      console.error(
        "[/api/loja/debug/criar-venda-teste] Erro ao criar venda:",
        vendaInsert.error
      );
      return NextResponse.json(
        { ok: false, error: vendaInsert.error.message },
        { status: 500 }
      );
    }

    const venda = vendaInsert.data;

    // 2) Item
    const itemInsert = await supabaseAdmin
      .from("loja_venda_itens")
      .insert({
        venda_id: venda.id,
        produto_id,
        quantidade,
        preco_unitario_centavos,
        total_centavos,
        beneficiario_pessoa_id,
        observacoes: "Item de teste",
      })
      .select("*")
      .single();

    if (itemInsert.error) {
      console.error(
        "[/api/loja/debug/criar-venda-teste] Erro ao criar item:",
        itemInsert.error
      );
      return NextResponse.json(
        { ok: false, error: itemInsert.error.message },
        { status: 500 }
      );
    }

    const item = itemInsert.data;

    return NextResponse.json({
      ok: true,
      data: {
        venda,
        itens: [item],
      },
    });
  } catch (err: any) {
    console.error(
      "Erro inesperado em /api/loja/debug/criar-venda-teste:",
      err
    );
    return NextResponse.json(
      { ok: false, error: "Erro inesperado ao criar venda de teste." },
      { status: 500 }
    );
  }
}
