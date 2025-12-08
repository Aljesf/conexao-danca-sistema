import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ApiResponse<T = any> = {
  ok: boolean;
  error?: string;
  data?: T;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[/api/loja/vendas/[id]] Variaveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao definidas."
  );
}

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

function json<T>(status: number, payload: ApiResponse<T>) {
  return NextResponse.json(payload, { status });
}

// ==============================
// GET /api/loja/vendas/[id]
// Detalhe da venda com itens
// ==============================
export async function GET(
  _req: NextRequest,
  context: { params: { id: string } }
) {
  if (!supabaseAdmin) {
    return json(500, {
      ok: false,
      error:
        "Configuracao do Supabase ausente. Verifique NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
    });
  }

  const vendaId = Number(context.params?.id);
  if (!vendaId || Number.isNaN(vendaId) || vendaId <= 0) {
    return json(400, { ok: false, error: "ID de venda invalido." });
  }

  try {
    const { data: venda, error: erroVenda } = await supabaseAdmin
      .from("loja_vendas")
      .select(
        `
        id,
        cliente_pessoa_id,
        cobranca_id,
        tipo_venda,
        valor_total_centavos,
        desconto_centavos,
        forma_pagamento,
        status_pagamento,
        status_venda,
        data_venda,
        data_vencimento,
        observacoes,
        observacao_vendedor,
        vendedor_user_id,
        cancelada_em,
        cancelada_por_user_id,
        motivo_cancelamento,
        created_at,
        updated_at,
        cliente:pessoas!loja_vendas_cliente_pessoa_id_fkey (
          id,
          nome,
          nome_fantasia,
          cpf,
          cnpj,
          telefone,
          telefone_secundario,
          email
        )
      `
      )
      .eq("id", vendaId)
      .maybeSingle();

    if (erroVenda) {
      console.error("[GET /api/loja/vendas/[id]] Erro ao buscar venda:", erroVenda);
      return json(500, { ok: false, error: "Erro ao buscar venda." });
    }

    if (!venda) {
      return json(404, { ok: false, error: "Venda nao encontrada." });
    }

    const { data: itens, error: erroItens } = await supabaseAdmin
      .from("loja_venda_itens")
      .select(
        `
        id,
        venda_id,
        produto_id,
        quantidade,
        preco_unitario_centavos,
        total_centavos,
        beneficiario_pessoa_id,
        observacoes,
        produto:produto_id (
          id,
          nome,
          codigo,
          categoria,
          unidade
        ),
        beneficiario:beneficiario_pessoa_id (
          id,
          nome,
          nome_fantasia,
          cpf,
          cnpj
        )
      `
      )
      .eq("venda_id", vendaId);

    if (erroItens) {
      console.error("[GET /api/loja/vendas/[id]] Erro ao buscar itens:", erroItens);
      return json(500, { ok: false, error: "Erro ao buscar itens da venda." });
    }

    let cobranca = null;
    let recebimentos = null;
    if (venda?.cobranca_id) {
      const { data: cob, error: errC } = await supabaseAdmin
        .from("cobrancas")
        .select("id, valor_centavos, vencimento, data_pagamento, status, metodo_pagamento")
        .eq("id", venda.cobranca_id)
        .maybeSingle();
      if (!errC) cobranca = cob;

      const { data: recs, error: errR } = await supabaseAdmin
        .from("recebimentos")
        .select("id, valor_centavos, data_pagamento, metodo_pagamento, origem_sistema, observacoes")
        .eq("cobranca_id", venda.cobranca_id);
      if (!errR) recebimentos = recs;
    }

    return json(200, {
      ok: true,
      data: {
        venda,
        itens: itens ?? [],
        cobranca,
        recebimentos,
      },
    });
  } catch (err) {
    console.error("[GET /api/loja/vendas/[id]] Erro inesperado:", err);
    return json(500, { ok: false, error: "Erro inesperado ao buscar venda." });
  }
}

// ==============================
// POST /api/loja/vendas/[id]
// Acao de cancelamento simples
// ==============================
export async function POST(
  req: NextRequest,
  context: { params: { id: string } }
) {
  if (!supabaseAdmin) {
    return json(500, {
      ok: false,
      error:
        "Configuracao do Supabase ausente. Verifique NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
    });
  }

  const vendaId = Number(context.params?.id);
  if (!vendaId || Number.isNaN(vendaId) || vendaId <= 0) {
    return json(400, { ok: false, error: "ID de venda invalido." });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const { acao, motivo_cancelamento, cancelada_por_user_id } = body ?? {};
  if (acao !== "cancelar") {
    return json(400, { ok: false, error: "Acao invalida." });
  }

  try {
    const { data: vendaAtual, error: erroBuscaVenda } = await supabaseAdmin
      .from("loja_vendas")
      .select("id, cobranca_id")
      .eq("id", vendaId)
      .maybeSingle();

    if (erroBuscaVenda) {
      console.error(
        "[POST /api/loja/vendas/[id]] Erro ao buscar venda antes de cancelar:",
        erroBuscaVenda
      );
      return json(500, { ok: false, error: "Erro ao cancelar venda." });
    }

    const { error } = await supabaseAdmin
      .from("loja_vendas")
      .update({
        status_venda: "CANCELADA",
        cancelada_em: new Date().toISOString(),
        cancelada_por_user_id: cancelada_por_user_id || null,
        motivo_cancelamento: motivo_cancelamento || null,
      })
      .eq("id", vendaId);

    if (error) {
      console.error("[POST /api/loja/vendas/[id]] Erro ao cancelar:", error);
      return json(500, { ok: false, error: "Erro ao cancelar venda." });
    }

    // Busca itens para devolver estoque
    const { data: itensVenda, error: erroItensVenda } = await supabaseAdmin
      .from("loja_venda_itens")
      .select("id, produto_id, quantidade")
      .eq("venda_id", vendaId);

    if (erroItensVenda) {
      console.error("[POST /api/loja/vendas/[id]] Erro ao buscar itens para cancelamento:", erroItensVenda);
    } else {
      for (const item of itensVenda ?? []) {
        const qtd = Number(item.quantidade) || 0;
        if (qtd <= 0) continue;

        await supabaseAdmin.from("loja_estoque_movimentos").insert({
          produto_id: item.produto_id,
          tipo: "ENTRADA",
          quantidade: qtd,
          origem: "CANCELAMENTO_VENDA",
          referencia_id: vendaId,
          observacao: "Entrada automatica por cancelamento de venda",
          created_by: null,
        });

        const { data: prodRow } = await supabaseAdmin
          .from("loja_produtos")
          .select("estoque_atual")
          .eq("id", item.produto_id)
          .maybeSingle();
        const estoqueAtual = Number(prodRow?.estoque_atual) || 0;
        const novoEstoque = estoqueAtual + qtd;
        await supabaseAdmin
          .from("loja_produtos")
          .update({ estoque_atual: novoEstoque })
          .eq("id", item.produto_id);
      }
    }

    // Cancela cobranca e gera estorno financeiro (quando existir)
    if (vendaAtual?.cobranca_id) {
      await supabaseAdmin
        .from("cobrancas")
        .update({
          status: "CANCELADA",
          observacoes: "Cancelada automaticamente pelo cancelamento da venda Loja v0",
        })
        .eq("id", vendaAtual.cobranca_id);

      const { data: recs } = await supabaseAdmin
        .from("recebimentos")
        .select("valor_centavos")
        .eq("cobranca_id", vendaAtual.cobranca_id);

      const totalRecebido =
        recs?.reduce((sum, r: any) => sum + Number(r.valor_centavos || 0), 0) ?? 0;

      if (totalRecebido !== 0) {
        const { error: erroEstorno } = await supabaseAdmin.from("recebimentos").insert({
          cobranca_id: vendaAtual.cobranca_id,
          valor_centavos: -totalRecebido,
          data_pagamento: new Date().toISOString(),
          metodo_pagamento: "ESTORNO_LOJA",
          origem_sistema: "LOJA_CANCELAMENTO",
          observacoes: `Estorno automatico da venda ${vendaId}`,
        });
        if (erroEstorno) {
          console.error(
            "[POST /api/loja/vendas/[id]] Falha ao registrar estorno financeiro:",
            erroEstorno
          );
        }
      }
    }

    return json(200, { ok: true, data: { id: vendaId, status_venda: "CANCELADA" } });
  } catch (err) {
    console.error("[POST /api/loja/vendas/[id]] Erro inesperado ao cancelar:", err);
    return json(500, { ok: false, error: "Erro inesperado ao cancelar venda." });
  }
}
