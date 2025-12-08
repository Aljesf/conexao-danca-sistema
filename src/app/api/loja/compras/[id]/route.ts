import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ApiResponse<T = any> = {
  ok: boolean;
  error?: string;
  data?: T;
};

type PedidoStatus = "RASCUNHO" | "EM_ANDAMENTO" | "PARCIAL" | "CONCLUIDO" | "CANCELADO";

type PedidoCompraDetalhe = {
  id: number;
  fornecedor_id: number;
  fornecedor_nome?: string | null;
  data_pedido: string;
  status: PedidoStatus;
  valor_estimado_centavos: number;
  conta_pagar_id?: number | null;
  observacoes?: string | null;
  itens: {
    id: number;
    produto_id: number;
    produto_nome?: string | null;
    quantidade_solicitada: number;
    quantidade_recebida: number;
    preco_custo_centavos: number;
    observacoes?: string | null;
  }[];
  recebimentos: {
    id: number;
    item_id: number;
    produto_id: number;
    quantidade_recebida: number;
    preco_custo_centavos: number;
    data_recebimento: string;
    observacao?: string | null;
  }[];
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[/api/loja/compras/[id]] Variaveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao definidas."
  );
}

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

function json<T>(status: number, payload: ApiResponse<T>) {
  return NextResponse.json(payload, { status });
}

// Helpers simples com cache em memoria da funcao
let centroCustoLojaIdCache: number | null = null;
let categoriaCompraIdCache: number | null = null;

async function getCentroCustoLojaId(): Promise<number | null> {
  if (!supabaseAdmin) return null;
  if (centroCustoLojaIdCache) return centroCustoLojaIdCache;
  const { data, error } = await supabaseAdmin
    .from("centros_custo")
    .select("id, codigo")
    .eq("codigo", "LOJA")
    .maybeSingle();
  if (error || !data) {
    console.error("[compras] Centro de custo LOJA não encontrado:", error);
    return null;
  }
  centroCustoLojaIdCache = data.id;
  return data.id;
}

async function getCategoriaCompraMercadoriaId(): Promise<number | null> {
  if (!supabaseAdmin) return null;
  if (categoriaCompraIdCache) return categoriaCompraIdCache;
  // tenta pelo codigo COMPRA_MERCADORIA; se não houver, pega primeira DESPESA
  const { data, error } = await supabaseAdmin
    .from("categorias_financeiras")
    .select("id, codigo, tipo")
    .eq("tipo", "DESPESA")
    .order("codigo", { ascending: true });

  if (error || !data) {
    console.error("[compras] Falha ao buscar categorias financeiras:", error);
    return null;
  }

  const alvo =
    data.find((c) => (c as any).codigo === "COMPRA_MERCADORIA") ??
    data[0];
  if (!alvo) {
    console.error("[compras] Nenhuma categoria financeira encontrada para despesa.");
    return null;
  }
  categoriaCompraIdCache = (alvo as any).id;
  return (alvo as any).id;
}

async function getFornecedorPessoaId(fornecedorId: number): Promise<number | null> {
  if (!supabaseAdmin) return null;
  const { data, error } = await supabaseAdmin
    .from("loja_fornecedores")
    .select("pessoa_id")
    .eq("id", fornecedorId)
    .maybeSingle();
  if (error || !data) {
    console.error("[compras] Fornecedor não encontrado ou sem pessoa_id:", error);
    return null;
  }
  return data.pessoa_id as number;
}

async function carregarDetalhe(pedidoId: number): Promise<PedidoCompraDetalhe | null> {
  if (!supabaseAdmin) return null;

  const { data: pedido, error: errPedido } = await supabaseAdmin
    .from("loja_pedidos_compra")
    .select(
      `
      id,
      fornecedor_id,
      conta_pagar_id,
      data_pedido,
      status,
      valor_estimado_centavos,
      observacoes,
      fornecedor:loja_fornecedores!loja_pedidos_compra_fornecedor_id_fkey (
        id,
        pessoas:pessoa_id ( id, nome, nome_fantasia )
      )
    `
    )
    .eq("id", pedidoId)
    .maybeSingle();

  if (errPedido) {
    console.error("[GET /api/loja/compras/[id]] Erro ao buscar cabecalho:", errPedido);
    throw errPedido;
  }

  if (!pedido) {
    return null;
  }

  const { data: itens, error: errItens } = await supabaseAdmin
    .from("loja_pedidos_compra_itens")
    .select(
      `
      id,
      pedido_id,
      produto_id,
      quantidade_solicitada,
      quantidade_recebida,
      preco_custo_centavos,
      observacoes,
      produto:produto_id ( id, nome )
    `
    )
    .eq("pedido_id", pedidoId);

  if (errItens) {
    console.error("[GET /api/loja/compras/[id]] Erro ao buscar itens:", errItens);
    throw errItens;
  }

  const { data: recs, error: errRecs } = await supabaseAdmin
    .from("loja_pedidos_compra_recebimentos")
    .select(
      `
      id,
      pedido_id,
      item_id,
      produto_id,
      quantidade_recebida,
      preco_custo_centavos,
      data_recebimento,
      observacao
    `
    )
    .eq("pedido_id", pedidoId)
    .order("data_recebimento", { ascending: false });

  if (errRecs) {
    console.error("[GET /api/loja/compras/[id]] Erro ao buscar recebimentos:", errRecs);
    throw errRecs;
  }

  return {
    id: pedido.id,
    fornecedor_id: pedido.fornecedor_id,
    fornecedor_nome:
      pedido.fornecedor?.pessoas?.nome_fantasia ||
      pedido.fornecedor?.pessoas?.nome ||
      null,
    data_pedido: pedido.data_pedido,
    conta_pagar_id: pedido.conta_pagar_id ?? null,
    status: pedido.status,
    valor_estimado_centavos: pedido.valor_estimado_centavos,
    observacoes: pedido.observacoes,
    itens:
      (itens ?? []).map((it: any) => ({
        id: it.id,
        produto_id: it.produto_id,
        produto_nome: it.produto?.nome ?? null,
        quantidade_solicitada: it.quantidade_solicitada,
        quantidade_recebida: it.quantidade_recebida,
        preco_custo_centavos: it.preco_custo_centavos,
        observacoes: it.observacoes ?? null,
      })) ?? [],
    recebimentos:
      (recs ?? []).map((r: any) => ({
        id: r.id,
        item_id: r.item_id,
        produto_id: r.produto_id,
        quantidade_recebida: r.quantidade_recebida,
        preco_custo_centavos: r.preco_custo_centavos,
        data_recebimento: r.data_recebimento,
        observacao: r.observacao ?? null,
      })) ?? [],
  };
}

// ==============================
// GET /api/loja/compras/[id]
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

  const pedidoId = Number(context.params?.id);
  if (!pedidoId || Number.isNaN(pedidoId)) {
    return json(400, { ok: false, error: "ID invalido." });
  }

  try {
    const detalhe = await carregarDetalhe(pedidoId);
    if (!detalhe) {
      return json(404, { ok: false, error: "Pedido nao encontrado." });
    }

    return json(200, { ok: true, data: detalhe });
  } catch (err) {
    console.error("[GET /api/loja/compras/[id]] Erro ao carregar pedido:", err);
    return json(500, { ok: false, error: "Erro ao carregar pedido de compra." });
  }
}

// ==============================
// POST /api/loja/compras/[id]
// Registrar recebimentos basicos (sem estoque/financeiro neste passo)
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

  const pedidoId = Number(context.params?.id);
  if (!pedidoId || Number.isNaN(pedidoId)) {
    return json(400, { ok: false, error: "ID invalido." });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, error: "Body JSON invalido." });
  }

  const { acao, recebimentos } = body ?? {};
  if (acao !== "RECEBER") {
    return json(400, { ok: false, error: "Acao invalida." });
  }

  if (!Array.isArray(recebimentos) || recebimentos.length === 0) {
    return json(400, { ok: false, error: "Envie ao menos um recebimento." });
  }

  try {
    // Busca info do pedido (fornecedor) para integrações
    const { data: pedidoCab, error: errPedidoCab } = await supabaseAdmin
      .from("loja_pedidos_compra")
      .select("id, fornecedor_id")
      .eq("id", pedidoId)
      .maybeSingle();
    if (errPedidoCab || !pedidoCab) {
      return json(404, { ok: false, error: "Pedido nao encontrado." });
    }

    // Busca itens atuais para validar saldo
    const { data: itens, error: errItens } = await supabaseAdmin
      .from("loja_pedidos_compra_itens")
      .select("id, quantidade_solicitada, quantidade_recebida")
      .eq("pedido_id", pedidoId);

    if (errItens) {
      console.error(
        "[POST /api/loja/compras/[id]] Erro ao buscar itens do pedido:",
        errItens
      );
      return json(500, { ok: false, error: "Erro ao buscar itens do pedido." });
    }

    const itensMap = new Map<number, { solicitada: number; recebida: number }>();
    (itens ?? []).forEach((it: any) => {
      itensMap.set(it.id, {
        solicitada: Number(it.quantidade_solicitada) || 0,
        recebida: Number(it.quantidade_recebida) || 0,
      });
    });

    // validação de saldo
    for (const r of recebimentos) {
      const info = itensMap.get(r.item_id);
      if (!info) {
        return json(400, { ok: false, error: `Item ${r.item_id} nao encontrado no pedido.` });
      }
      const saldo = info.solicitada - info.recebida;
      if (!r.quantidade_recebida || r.quantidade_recebida <= 0) {
        return json(400, { ok: false, error: "Quantidade recebida deve ser maior que zero." });
      }
      if (r.quantidade_recebida > saldo) {
        return json(400, {
          ok: false,
          error: `Quantidade recebida maior que o saldo para o item ${r.item_id}.`,
        });
      }
      if (
        typeof r.preco_custo_centavos !== "number" ||
        Number.isNaN(r.preco_custo_centavos) ||
        r.preco_custo_centavos < 0
      ) {
        return json(400, { ok: false, error: "Preco de custo invalido." });
      }
    }

    // insere recebimentos
    const inserts = recebimentos.map((r: any) => ({
      pedido_id: pedidoId,
      item_id: r.item_id,
      produto_id: r.produto_id,
      quantidade_recebida: r.quantidade_recebida,
      preco_custo_centavos: r.preco_custo_centavos,
      observacao: r.observacao ?? null,
    }));

    const { error: errRec } = await supabaseAdmin
      .from("loja_pedidos_compra_recebimentos")
      .insert(inserts);

    if (errRec) {
      console.error("[POST /api/loja/compras/[id]] Erro ao inserir recebimentos:", errRec);
      return json(500, { ok: false, error: "Erro ao registrar recebimentos." });
    }

    // atualiza quantidade_recebida em itens
    for (const r of recebimentos) {
      const info = itensMap.get(r.item_id);
      if (!info) continue;
      const novaQtd = info.recebida + r.quantidade_recebida;
      await supabaseAdmin
        .from("loja_pedidos_compra_itens")
        .update({ quantidade_recebida: novaQtd })
        .eq("id", r.item_id);

      // Integração ESTOQUE v0: movimento de entrada + atualiza saldo
      try {
        await supabaseAdmin.from("loja_estoque_movimentos").insert({
          produto_id: r.produto_id,
          tipo: "ENTRADA",
          quantidade: r.quantidade_recebida,
          origem: "COMPRA",
          referencia_id: pedidoId,
          observacao:
            r.observacao ||
            `Entrada por recebimento de compra #${pedidoId}`,
          created_by: null,
        });

        // Atualiza estoque_atual (fallback em duas etapas)
        const { data: prodAtual } = await supabaseAdmin
          .from("loja_produtos")
          .select("estoque_atual")
          .eq("id", r.produto_id)
          .maybeSingle();

        const estoqueAtual = Number(prodAtual?.estoque_atual || 0);
        const novoEstoque = estoqueAtual + Number(r.quantidade_recebida || 0);

        await supabaseAdmin
          .from("loja_produtos")
          .update({ estoque_atual: novoEstoque })
          .eq("id", r.produto_id);
      } catch (estoqueErr) {
        console.error(
          "[POST /api/loja/compras/[id]] Falha ao registrar estoque:",
          estoqueErr
        );
      }

      // Opcional: registrar custo do fornecedor/produto
      try {
        await supabaseAdmin.from("loja_fornecedor_precos").insert({
          fornecedor_id: pedidoCab.fornecedor_id,
          produto_id: r.produto_id,
          preco_custo_centavos: r.preco_custo_centavos,
          data_referencia: new Date().toISOString().slice(0, 10),
          observacoes: r.observacao || `Recebimento pedido #${pedidoId}`,
        });
      } catch (custoErr) {
        console.error(
          "[POST /api/loja/compras/[id]] Falha ao registrar preco de custo:",
          custoErr
        );
      }
    }

    // recalcula status do pedido
    const { data: itensAtualizados } = await supabaseAdmin
      .from("loja_pedidos_compra_itens")
      .select("quantidade_solicitada, quantidade_recebida")
      .eq("pedido_id", pedidoId);

    let status: PedidoStatus = "EM_ANDAMENTO";
    if (itensAtualizados && itensAtualizados.length > 0) {
      const todosFechados = itensAtualizados.every(
        (it: any) =>
          Number(it.quantidade_recebida || 0) >= Number(it.quantidade_solicitada || 0)
      );
      const algumRecebido = itensAtualizados.some(
        (it: any) => Number(it.quantidade_recebida || 0) > 0
      );
      if (todosFechados) status = "CONCLUIDO";
      else if (algumRecebido) status = "PARCIAL";
    }

    await supabaseAdmin
      .from("loja_pedidos_compra")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", pedidoId);

    // Integração CONTAS A PAGAR v0 (apenas cria/atualiza conta pendente)
    try {
      const valorLoteCentavos = recebimentos.reduce(
        (acc: number, rec: any) =>
          acc +
          Number(rec.quantidade_recebida || 0) *
            Number(rec.preco_custo_centavos || 0),
        0
      );

      if (valorLoteCentavos > 0) {
        const centroId = await getCentroCustoLojaId();
        const categoriaId = await getCategoriaCompraMercadoriaId();
        const fornecedorPessoaId = await getFornecedorPessoaId(
          pedidoCab.fornecedor_id
        );

        let contaPagarId: number | null = null;

        if (centroId && categoriaId && fornecedorPessoaId) {
          const descricaoBase = `Compra Loja — Pedido #${pedidoId}`;
          const { data: contaExistente } = await supabaseAdmin
            .from("contas_pagar")
            .select("id, valor_centavos")
            .eq("centro_custo_id", centroId)
            .eq("pessoa_id", fornecedorPessoaId)
            .eq("descricao", descricaoBase)
            .maybeSingle();

          if (!contaExistente) {
            const { data: contaNova } = await supabaseAdmin.from("contas_pagar").insert({
              centro_custo_id: centroId,
              categoria_id: categoriaId,
              pessoa_id: fornecedorPessoaId,
              descricao: descricaoBase,
              valor_centavos: valorLoteCentavos,
              vencimento: new Date().toISOString().slice(0, 10),
              status: "PENDENTE",
              metodo_pagamento: null,
              observacoes: `Criado automaticamente a partir do recebimento do pedido de compra #${pedidoId}.`,
            }).select("id").maybeSingle();
            contaPagarId = contaNova?.id ?? null;
          } else {
            const novoValor =
              Number(contaExistente.valor_centavos || 0) + valorLoteCentavos;
            await supabaseAdmin
              .from("contas_pagar")
              .update({
                valor_centavos: novoValor,
                updated_at: new Date().toISOString(),
              })
              .eq("id", contaExistente.id);
            contaPagarId = contaExistente.id;
          }

          // grava conta_pagar_id no pedido se ainda não estiver preenchido
          if (contaPagarId) {
            await supabaseAdmin
              .from("loja_pedidos_compra")
              .update({ conta_pagar_id: contaPagarId })
              .eq("id", pedidoId)
              .is("conta_pagar_id", null);
          }
        } else {
          console.error(
            "[POST /api/loja/compras/[id]] Centro/categoria/pessoa do fornecedor não encontrados; pulando contas_pagar."
          );
        }
      }
      // NOTA LOJA v0:
      // - Este passo cria/atualiza uma CONTA A PAGAR (PENDENTE) para o fornecedor,
      //   centro de custo LOJA, com categoria de COMPRA DE MERCADORIA.
      // - Pagamento/baixa e movimento_financeiro serão tratados em passo futuro (3B).
    } catch (finErr) {
      console.error(
        "[POST /api/loja/compras/[id]] Erro ao integrar com contas_pagar:",
        finErr
      );
      // não falha a operação principal
    }

    const detalhe = await carregarDetalhe(pedidoId);
    if (!detalhe) {
      return json(200, { ok: true, data: { id: pedidoId, status } });
    }

    return json(200, { ok: true, data: detalhe });
  } catch (err) {
    console.error("[POST /api/loja/compras/[id]] Erro inesperado:", err);
    return json(500, { ok: false, error: "Erro inesperado ao registrar recebimento." });
  }
}
