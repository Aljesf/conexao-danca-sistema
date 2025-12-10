import { getCentroCustoLojaId } from "@/lib/financeiro/centrosCusto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ApiResponse<T = any> = {
  ok: boolean;
  error?: string;
  data?: T;
};

type VendaTipo = "VENDA" | "CREDIARIO_INTERNO" | "ENTREGA_FIGURINO";
type StatusPagamento = "PENDENTE" | "PAGO" | "PARCIAL";
type StatusVenda = "ATIVA" | "CANCELADA";

type Venda = {
  id: number;
  cliente_pessoa_id: number;
  cliente_nome?: string | null;
  cobranca_id?: number | null;
  tipo_venda: VendaTipo;
  valor_total_centavos: number;
  desconto_centavos: number;
  forma_pagamento: string;
  status_pagamento: StatusPagamento;
  status_venda: StatusVenda;
  data_venda: string;
  data_vencimento?: string | null;
  observacoes?: string | null;
  observacao_vendedor?: string | null;
  vendedor_user_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

/**
 * NOTA DE INTEGRACAO FINANCEIRA (v0)
 *
 * - cobrancas: tabela de contas a receber (campos principais: pessoa_id, descricao,
 *   valor_centavos, vencimento, status, origem_tipo, origem_id, observacoes).
 * - recebimentos: tabela de entradas financeiras (campos principais: cobranca_id,
 *   valor_centavos, data_pagamento, metodo_pagamento, origem_sistema, observacoes).
 *
 * Padrão adotado para Loja v0:
 * - Venda AVISTA: cria cobranca com status PAGO + recebimento imediato ligado à cobranca.
 * - CREDIARIO_INTERNO: cria cobranca PENDENTE com vencimento; recebimento será criado depois.
 * - cancelamento: cancela a cobranca (status CANCELADA) e gera um recebimento de estorno
 *   negativo (origem_sistema = 'LOJA_CANCELAMENTO') para zerar o fluxo financeiro.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[/api/loja/vendas] Variaveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao definidas."
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
// GET /api/loja/vendas
// Lista vendas com filtros basicos
// ==============================
export async function GET(req: NextRequest) {
  if (!supabaseAdmin) {
    return json(500, {
      ok: false,
      error:
        "Configuracao do Supabase ausente. Verifique NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
    });
  }

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const {
    page = "1",
    pageSize = "50",
    tipo_venda,
    status_pagamento,
    status_venda,
    cliente_id,
    q,
    data_ini,
    data_fim,
  } = params;

  const pageNumber = Math.max(parseInt(page || "1", 10) || 1, 1);
  const perPage = Math.min(Math.max(parseInt(pageSize || "50", 10) || 50, 1), 200);
  const from = (pageNumber - 1) * perPage;
  const to = from + perPage - 1;

  try {
    let query = supabaseAdmin
      .from("loja_vendas")
      .select(
        `
        id,
        cliente_pessoa_id,
        tipo_venda,
        valor_total_centavos,
        desconto_centavos,
        forma_pagamento,
        status_pagamento,
        cobranca_id,
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
          cnpj
        )
      `,
        { count: "exact" }
      )
      .order("data_venda", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to);

    if (tipo_venda) query = query.eq("tipo_venda", tipo_venda);
    if (status_pagamento) query = query.eq("status_pagamento", status_pagamento);
    if (status_venda) query = query.eq("status_venda", status_venda);

    if (cliente_id) {
      const idNum = parseInt(cliente_id, 10);
      if (!Number.isNaN(idNum)) query = query.eq("cliente_pessoa_id", idNum);
    }

    if (data_ini) query = query.gte("data_venda", data_ini);
    if (data_fim) query = query.lte("data_venda", data_fim);

    if (q && q.trim()) {
      const term = q.trim();
      query = query.or(
        `id.eq.${term},cliente_pessoa_id.eq.${term},cliente.nome.ilike.%${term}%,cliente.nome_fantasia.ilike.%${term}%`
      );
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[GET /api/loja/vendas] Erro Supabase:", error);
      return json(500, { ok: false, error: "Erro ao listar vendas." });
    }

    const vendas: Venda[] =
      (data as any[] | null | undefined)?.map((v) => ({
        id: v.id,
        cliente_pessoa_id: v.cliente_pessoa_id,
        cliente_nome:
          v.cliente?.nome_fantasia ||
          v.cliente?.nome ||
          v.cliente?.cpf ||
          v.cliente?.cnpj ||
          null,
        tipo_venda: v.tipo_venda,
        valor_total_centavos: v.valor_total_centavos,
        desconto_centavos: v.desconto_centavos,
        forma_pagamento: v.forma_pagamento,
        status_pagamento: v.status_pagamento,
        status_venda: v.status_venda,
        data_venda: v.data_venda,
        data_vencimento: v.data_vencimento,
        observacoes: v.observacoes,
        observacao_vendedor: v.observacao_vendedor,
        vendedor_user_id: v.vendedor_user_id,
        created_at: v.created_at,
        updated_at: v.updated_at,
      })) ?? [];

    return json(200, {
      ok: true,
      data: {
        items: vendas,
        pagination: { page: pageNumber, pageSize: perPage, total: count ?? 0 },
      },
    });
  } catch (err) {
    console.error("[GET /api/loja/vendas] Erro inesperado:", err);
    return json(500, { ok: false, error: "Erro inesperado ao listar vendas." });
  }
}

// ==============================
// POST /api/loja/vendas
// Cria cabeçalho + itens (sem integração financeira por enquanto)
// ==============================
export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return json(500, {
      ok: false,
      error:
        "Configuracao do Supabase ausente. Verifique NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
    });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, error: "Body JSON invalido." });
  }

  const {
    cliente_pessoa_id,
    tipo_venda,
    forma_pagamento,
    status_pagamento,
    desconto_centavos,
    data_vencimento,
    observacoes,
    observacao_vendedor,
    itens,
  } = body ?? {};

  if (!cliente_pessoa_id || typeof cliente_pessoa_id !== "number") {
    return json(400, { ok: false, error: "Campo 'cliente_pessoa_id' e obrigatorio." });
  }

  const tiposValidos: VendaTipo[] = ["VENDA", "CREDIARIO_INTERNO", "ENTREGA_FIGURINO"];
  if (!tipo_venda || !tiposValidos.includes(tipo_venda)) {
    return json(400, {
      ok: false,
      error: "Campo 'tipo_venda' e obrigatorio (VENDA, CREDIARIO_INTERNO, ENTREGA_FIGURINO).",
    });
  }

  if (!forma_pagamento || typeof forma_pagamento !== "string") {
    return json(400, { ok: false, error: "Campo 'forma_pagamento' e obrigatorio." });
  }

  const statusValidos: StatusPagamento[] = ["PENDENTE", "PAGO", "PARCIAL"];
  if (!status_pagamento || !statusValidos.includes(status_pagamento)) {
    return json(400, {
      ok: false,
      error: "Campo 'status_pagamento' e obrigatorio (PENDENTE, PAGO, PARCIAL).",
    });
  }

  if (!Array.isArray(itens) || itens.length === 0) {
    return json(400, { ok: false, error: "Envie pelo menos um item na venda." });
  }

  // Busca produtos para validar preços
  const produtoIds: number[] = Array.from(
    new Set(
      itens
        .map((i: any) => i?.produto_id)
        .filter((id: any) => typeof id === "number")
    )
  );

  const { data: produtos, error: erroProdutos } = await supabaseAdmin
    .from("loja_produtos")
    .select("id, nome, preco_venda_centavos, ativo")
    .in("id", produtoIds);

  if (erroProdutos) {
    console.error("[POST /api/loja/vendas] Erro ao buscar produtos:", erroProdutos);
    return json(500, { ok: false, error: "Erro ao validar produtos da venda." });
  }

  const mapProdutos = new Map<number, any>();
  (produtos ?? []).forEach((p) => mapProdutos.set(p.id, p));

  type ItemCalculado = {
    produto_id: number;
    quantidade: number;
    preco_unitario_centavos: number;
    total_centavos: number;
    beneficiario_pessoa_id?: number;
    observacoes?: string;
  };

  const itensCalculados: ItemCalculado[] = [];
  for (const raw of itens) {
    const { produto_id, quantidade, beneficiario_pessoa_id, observacoes } = raw ?? {};
    if (!produto_id || typeof produto_id !== "number") {
      return json(400, { ok: false, error: "Item sem produto_id valido." });
    }
    const qtd = Number(quantidade);
    if (!Number.isFinite(qtd) || qtd <= 0) {
      return json(400, { ok: false, error: "Quantidade do item deve ser maior que zero." });
    }
    const produto = mapProdutos.get(produto_id);
    if (!produto) {
      return json(404, { ok: false, error: `Produto id ${produto_id} nao encontrado.` });
    }

    let precoUnit = 0;
    if (typeof raw.preco_unitario_centavos === "number") {
      precoUnit = Math.max(Math.round(raw.preco_unitario_centavos), 0);
    } else if (typeof raw.preco_unitario_centavos === "string") {
      const v = parseInt(raw.preco_unitario_centavos, 10);
      if (!Number.isNaN(v)) precoUnit = Math.max(v, 0);
    } else {
      precoUnit = Math.max(Number(produto.preco_venda_centavos) || 0, 0);
    }

    if (tipo_venda !== "ENTREGA_FIGURINO" && precoUnit <= 0) {
      return json(400, {
        ok: false,
        error: `Preco invalido para o produto '${produto.nome}' (id ${produto_id}).`,
      });
    }

    const total = precoUnit * qtd;
    const itemCalc: ItemCalculado = {
      produto_id,
      quantidade: qtd,
      preco_unitario_centavos: precoUnit,
      total_centavos: total,
    };
    if (beneficiario_pessoa_id && typeof beneficiario_pessoa_id === "number") {
      itemCalc.beneficiario_pessoa_id = beneficiario_pessoa_id;
    }
    if (typeof observacoes === "string" && observacoes.trim()) {
      itemCalc.observacoes = observacoes.trim();
    }
    itensCalculados.push(itemCalc);
  }

  const desconto = typeof desconto_centavos === "number" ? Math.max(desconto_centavos, 0) : 0;
  const subtotal = itensCalculados.reduce((sum, i) => sum + i.total_centavos, 0);
  const valorTotalVenda =
    tipo_venda === "ENTREGA_FIGURINO" ? 0 : Math.max(subtotal - desconto, 0);

  let statusPagamento: StatusPagamento =
    forma_pagamento === "CREDIARIO_INTERNO" || tipo_venda === "CREDIARIO_INTERNO"
      ? "PENDENTE"
      : status_pagamento;
  if (tipo_venda === "ENTREGA_FIGURINO") statusPagamento = "PAGO";
  if (forma_pagamento === "AVISTA") statusPagamento = "PAGO";

  const dueDate = data_vencimento && typeof data_vencimento === "string"
    ? data_vencimento
    : null;

  try {
    const { data: venda, error: erroVenda } = await supabaseAdmin
      .from("loja_vendas")
      .insert({
        cliente_pessoa_id,
        tipo_venda,
        valor_total_centavos: valorTotalVenda,
        desconto_centavos: desconto,
        forma_pagamento,
        status_pagamento: statusPagamento,
        status_venda: "ATIVA",
        data_venda: new Date().toISOString(),
        data_vencimento: dueDate,
        observacoes: observacoes || null,
        observacao_vendedor: observacao_vendedor || null,
      })
      .select("*")
      .single();

    if (erroVenda) {
      console.error("[POST /api/loja/vendas] Erro ao criar cabecalho da venda:", erroVenda);
      return json(500, { ok: false, error: "Erro ao criar cabecalho da venda." });
    }

    const itensInsert = itensCalculados.map((item) => ({
      venda_id: venda.id,
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      preco_unitario_centavos: item.preco_unitario_centavos,
      total_centavos: item.total_centavos,
      beneficiario_pessoa_id: item.beneficiario_pessoa_id ?? null,
      observacoes: item.observacoes ?? null,
    }));

    const { data: itensCriados, error: erroItens } = await supabaseAdmin
      .from("loja_venda_itens")
      .insert(itensInsert)
      .select("*");

    if (erroItens) {
      console.error("[POST /api/loja/vendas] Erro ao criar itens:", erroItens);
      return json(500, { ok: false, error: "Erro ao criar itens da venda." });
    }

    // Movimentos de estoque - saida por venda
    for (const item of itensCriados ?? []) {
      const qtd = Number(item.quantidade) || 0;
      if (qtd <= 0) continue;

      await supabaseAdmin.from("loja_estoque_movimentos").insert({
        produto_id: item.produto_id,
        tipo: "SAIDA",
        quantidade: qtd,
        origem: "VENDA",
        referencia_id: venda.id,
        observacao: "Saida automatica por venda no caixa",
        created_by: null,
      });

      const { data: prodRow } = await supabaseAdmin
        .from("loja_produtos")
        .select("estoque_atual")
        .eq("id", item.produto_id)
        .maybeSingle();
      const estoqueAtual = Number(prodRow?.estoque_atual) || 0;
      const novoEstoque = Math.max(estoqueAtual - qtd, 0);
      await supabaseAdmin
        .from("loja_produtos")
        .update({ estoque_atual: novoEstoque })
        .eq("id", item.produto_id);
    }

    // Integracao financeira v0
    let cobrancaCriadaId: number | null = null;
    if (valorTotalVenda > 0) {
      try {
        if (forma_pagamento === "CREDIARIO_INTERNO" || tipo_venda === "CREDIARIO_INTERNO") {
          if (!dueDate) {
            return json(400, {
              ok: false,
              error: "Para crediario interno, envie data_vencimento.",
            });
          }

          const { data: cobranca, error: erroCobranca } = await supabaseAdmin
            .from("cobrancas")
            .insert({
              pessoa_id: cliente_pessoa_id,
              descricao: `Venda Loja v0 #${venda.id}`,
              valor_centavos: valorTotalVenda,
              moeda: "BRL",
              vencimento: dueDate,
              status: "PENDENTE",
              origem_tipo: "LOJA_VENDA",
              origem_id: venda.id,
            })
            .select("*")
            .maybeSingle();

          if (erroCobranca) {
            console.error("[POST /api/loja/vendas] Erro ao criar cobranca:", erroCobranca);
          } else if (cobranca?.id) {
            cobrancaCriadaId = cobranca.id;
            await supabaseAdmin
              .from("loja_vendas")
              .update({ cobranca_id: cobranca.id, status_pagamento: "PENDENTE" })
              .eq("id", venda.id);
          }
        } else if (forma_pagamento === "AVISTA") {
          // cria cobranca paga + recebimento imediato
          const { data: cobranca, error: erroCobranca } = await supabaseAdmin
            .from("cobrancas")
            .insert({
              pessoa_id: cliente_pessoa_id,
              descricao: `Venda Loja v0 #${venda.id}`,
              valor_centavos: valorTotalVenda,
              moeda: "BRL",
              vencimento: new Date().toISOString().slice(0, 10),
              data_pagamento: new Date().toISOString().slice(0, 10),
              status: "PAGO",
              metodo_pagamento: forma_pagamento,
              origem_tipo: "LOJA_VENDA",
              origem_id: venda.id,
            })
            .select("*")
            .maybeSingle();

          if (erroCobranca) {
            console.error("[POST /api/loja/vendas] Erro ao criar cobranca AVISTA:", erroCobranca);
          } else if (cobranca?.id) {
            cobrancaCriadaId = cobranca.id;
            await supabaseAdmin
              .from("loja_vendas")
              .update({ cobranca_id: cobranca.id, status_pagamento: "PAGO" })
              .eq("id", venda.id);

            const { data: recebimento, error: erroRec } = await supabaseAdmin
              .from("recebimentos")
              .insert({
                cobranca_id: cobranca.id,
                valor_centavos: valorTotalVenda,
                data_pagamento: new Date().toISOString(),
                metodo_pagamento: forma_pagamento,
                origem_sistema: "LOJA_VENDA",
                observacoes: `Recebimento automatico venda #${venda.id}`,
              })
              .select("*")
              .maybeSingle();

            if (erroRec) {
              console.error(
                "[POST /api/loja/vendas] Recebimento AVISTA falhou:",
                erroRec
              );
            }

            // NOVO: registrar movimento financeiro da venda AVISTA da loja
            if (recebimento && venda) {
              try {
                let centroCustoId = (cobranca as any)?.centro_custo_id ?? null;

                if (!centroCustoId) {
                  centroCustoId = await getCentroCustoLojaId(supabaseAdmin);
                }

                if (!centroCustoId) {
                  console.error(
                    "Nao foi possivel determinar centro_custo_id para movimento financeiro da venda AVISTA da loja",
                    { vendaId: venda.id }
                  );
                } else {
                  const { error: movimentoError } = await supabaseAdmin
                    .from("movimento_financeiro")
                    .insert({
                      tipo: "RECEITA",
                      centro_custo_id: centroCustoId,
                      valor_centavos: recebimento.valor_centavos,
                      data_movimento:
                        recebimento.data_pagamento ?? new Date().toISOString(),
                      origem: "LOJA_VENDA",
                      origem_id: venda.id,
                      descricao: `Venda Loja #${venda.id} - AVISTA`,
                      usuario_id: null,
                    });

                  if (movimentoError) {
                    console.error(
                      "Erro ao registrar movimento financeiro da venda AVISTA da loja",
                      movimentoError
                    );
                  }
                }
              } catch (err) {
                console.error(
                  "Erro inesperado ao registrar movimento financeiro da venda AVISTA da loja",
                  err
                );
              }
            }
          }
        }
      } catch (finErr) {
        console.error("[POST /api/loja/vendas] Erro integracao financeira:", finErr);
      }
    }

    const vendaComCobranca =
      cobrancaCriadaId != null
        ? { ...venda, cobranca_id: cobrancaCriadaId }
        : venda;

    return json(201, { ok: true, data: { venda: vendaComCobranca, itens: itensCriados ?? [] } });
  } catch (err) {
    console.error("[POST /api/loja/vendas] Erro inesperado:", err);
    return json(500, { ok: false, error: "Erro inesperado ao criar venda." });
  }
}

