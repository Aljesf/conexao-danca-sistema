import { getCentroCustoLojaId } from "@/lib/financeiro/centrosCusto";
import { registrarEntradaEstoque } from "@/lib/loja/estoque";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

type ApiResponse<T = any> = {
  ok: boolean;
  error?: string;
  data?: T;
};

type PedidoStatus =
  | "RASCUNHO"
  | "EM_ANDAMENTO"
  | "PARCIAL"
  | "CONCLUIDO"
  | "CANCELADO"
  | "PENDENTE_PAGAMENTO";

type PedidoCompraItemDTO = {
  id: number;
  produto_id: number;
  produto_nome: string;
  quantidade_pedida: number;
  quantidade_recebida: number;
  quantidade_pendente: number;
  preco_custo_centavos: number;
  observacoes?: string | null;
};

type RecebimentoDTO = {
  id: number;
  item_id: number;
  produto_id: number;
  produto_nome: string;
  quantidade: number;
  data_recebimento: string;
  observacao?: string | null;
};

type PedidoCompraDetalhe = {
  id: number;
  numero_pedido: number;
  fornecedor_id: number;
  fornecedor_nome?: string | null;
  data_pedido: string;
  status: PedidoStatus;
  valor_estimado_centavos: number;
  observacoes?: string | null;
  conta_pagar_id?: number | null;
  itens: PedidoCompraItemDTO[];
  recebimentos: RecebimentoDTO[];
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
let categoriaCompraIdCache: number | null = null;

async function getCategoriaCompraMercadoriaId(): Promise<number | null> {
  if (!supabaseAdmin) return null;
  if (categoriaCompraIdCache) return categoriaCompraIdCache;
  const { data, error } = await supabaseAdmin
    .from("categorias_financeiras")
    .select("id, codigo, tipo")
    .eq("tipo", "DESPESA")
    .order("codigo", { ascending: true });

  if (error || !data) {
    console.error("[compras] Falha ao buscar categorias financeiras:", error);
    return null;
  }

  const alvo = data.find((c) => (c as any).codigo === "COMPRA_MERCADORIA") ?? data[0];
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
    console.error("[compras] Fornecedor nao encontrado ou sem pessoa_id:", error);
    return null;
  }
  return data.pessoa_id as number;
}

function normalizarDataRecebimento(raw: any): string {
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }
  return new Date().toISOString().slice(0, 10);
}

async function temColunaQuantidadeRecebimento(): Promise<boolean> {
  if (!supabaseAdmin) return false;
  const { error } = await supabaseAdmin
    .from("loja_pedidos_compra_recebimentos")
    .select("quantidade")
    .limit(1);
  return !error;
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
      quantidade_pedida,
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

  const itensMapeados: PedidoCompraItemDTO[] =
    (itens ?? []).map((it: any) => {
      const pedida = Number(it.quantidade_pedida ?? it.quantidade_solicitada ?? 0) || 0;
      const recebida = Number(it.quantidade_recebida ?? 0) || 0;
      const pendente = Math.max(pedida - recebida, 0);
      return {
        id: it.id,
        produto_id: it.produto_id,
        produto_nome: it.produto?.nome ?? `Produto #${it.produto_id}`,
        quantidade_pedida: pedida,
        quantidade_recebida: recebida,
        quantidade_pendente: pendente,
        preco_custo_centavos: Number(it.preco_custo_centavos ?? 0),
        observacoes: it.observacoes ?? null,
      };
    }) ?? [];

  const { data: recs, error: errRecs } = await supabaseAdmin
    .from("loja_pedidos_compra_recebimentos")
    .select(
      `
      id,
      pedido_id,
      item_id,
      produto_id,
      quantidade,
      quantidade_recebida,
      data_recebimento,
      observacao,
      produto:produto_id ( id, nome )
    `
    )
    .eq("pedido_id", pedidoId)
    .order("data_recebimento", { ascending: false })
    .order("id", { ascending: false });

  if (errRecs) {
    console.error("[GET /api/loja/compras/[id]] Erro ao buscar recebimentos:", errRecs);
    throw errRecs;
  }

  const recebimentosMapeados: RecebimentoDTO[] =
    (recs ?? []).map((r: any) => {
      const quantidade = Number(r.quantidade ?? r.quantidade_recebida ?? 0) || 0;
      const produtoNome =
        r.produto?.nome ||
        itensMapeados.find((it) => it.id === r.item_id)?.produto_nome ||
        `Produto #${r.produto_id}`;
      return {
        id: r.id,
        item_id: r.item_id,
        produto_id: r.produto_id,
        produto_nome: produtoNome,
        quantidade,
        data_recebimento: r.data_recebimento,
        observacao: r.observacao ?? null,
      };
    }) ?? [];

  return {
    id: pedido.id,
    numero_pedido: pedido.id,
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
    itens: itensMapeados,
    recebimentos: recebimentosMapeados,
  };
}

// ==============================
// GET /api/loja/compras/[id]
// ==============================
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!supabaseAdmin) {
    return json(500, {
      ok: false,
      error:
        "Configuracao do Supabase ausente. Verifique NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
    });
  }

  const { id } = await context.params;
  const pedidoId = Number(id);
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
// Registrar recebimento parcial
// ==============================
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!supabaseAdmin) {
    return json(500, {
      ok: false,
      error:
        "Configuracao do Supabase ausente. Verifique NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
    });
  }

  const { id } = await context.params;
  const pedidoId = Number(id);
  if (!Number.isFinite(pedidoId)) {
    return json(400, { ok: false, error: "ID invalido." });
  }

  const body = await req.json().catch(() => null);

  const { action, vencimento, valor_centavos } = body ?? {};

  if (!body || !action) {
    return json(400, { ok: false, error: "Acao nao suportada." });
  }

  if (action === "vincular_conta_pagar") {
    const contaPagarId = Number(body.conta_pagar_id);
    if (!Number.isFinite(contaPagarId)) {
      return json(400, { ok: false, error: "conta_pagar_id invalido" });
    }

    const { error } = await supabaseAdmin
      .from("loja_pedidos_compra")
      .update({ conta_pagar_id: contaPagarId })
      .eq("id", pedidoId);

    if (error) {
      console.error("Erro ao vincular conta_pagar a compra:", error);
      return json(500, { ok: false, error: "Erro ao vincular conta a pagar." });
    }

    return json(200, { ok: true });
  }

  if (action === "criar_conta_pagar") {
    try {
      const { data: pedido, error: pedidoErr } = await supabaseAdmin
        .from("loja_pedidos_compra")
        .select("id, fornecedor_id, valor_estimado_centavos, conta_pagar_id")
        .eq("id", pedidoId)
        .maybeSingle();

      if (pedidoErr || !pedido) {
        return json(404, { ok: false, error: "Pedido nao encontrado." });
      }

      if (pedido.conta_pagar_id) {
        return json(200, { ok: true, conta_pagar_id: pedido.conta_pagar_id });
      }

      let valorCalculado = Number(pedido.valor_estimado_centavos || 0);
      if (!valorCalculado || valorCalculado <= 0) {
        const { data: itensPedido } = await supabaseAdmin
          .from("loja_pedidos_compra_itens")
          .select("quantidade_pedida, quantidade_solicitada, preco_custo_centavos")
          .eq("pedido_id", pedidoId);

        if (itensPedido && itensPedido.length > 0) {
          valorCalculado = itensPedido.reduce((acc: number, it: any) => {
            const qty = Number(it.quantidade_pedida ?? it.quantidade_solicitada ?? 0) || 0;
            const custo = Number(it.preco_custo_centavos ?? 0) || 0;
            return acc + qty * custo;
          }, 0);
        }
      }

      const valorTotalCentavos =
        typeof valor_centavos === "number" && valor_centavos > 0
          ? valor_centavos
          : valorCalculado;

      const centroId = await getCentroCustoLojaId(supabaseAdmin);
      const categoriaId = await getCategoriaCompraMercadoriaId();
      const fornecedorPessoaId = pedido.fornecedor_id
        ? await getFornecedorPessoaId(pedido.fornecedor_id)
        : null;

      const descricao = `Compra Loja - Pedido #${pedidoId}`;
      const dataVencimento =
        typeof vencimento === "string" && vencimento.length > 0
          ? vencimento
          : new Date().toISOString().slice(0, 10);

      const payloadConta: Record<string, any> = {
        descricao,
        valor_centavos: valorTotalCentavos,
        status: "PENDENTE",
        vencimento: dataVencimento,
        metodo_pagamento: null,
        observacoes: `Criada a partir da compra #${pedidoId}`,
      };
      if (centroId) payloadConta.centro_custo_id = centroId;
      if (categoriaId) payloadConta.categoria_id = categoriaId;
      if (fornecedorPessoaId) payloadConta.pessoa_id = fornecedorPessoaId;

      const { data: conta, error: contaErr } = await supabaseAdmin
        .from("contas_pagar")
        .insert(payloadConta)
        .select("id")
        .maybeSingle();

      if (contaErr || !conta) {
        console.error("[POST /api/loja/compras/[id]] Erro ao criar conta a pagar:", contaErr);
        return json(500, { ok: false, error: "Erro ao criar conta a pagar." });
      }

      await supabaseAdmin
        .from("loja_pedidos_compra")
        .update({ conta_pagar_id: conta.id })
        .eq("id", pedidoId);

      return json(200, { ok: true, conta_pagar_id: conta.id });
    } catch (err) {
      console.error("[POST /api/loja/compras/[id]] Erro ao criar conta a pagar:", err);
      return json(500, { ok: false, error: "Erro ao criar conta a pagar." });
    }
  }

  if (action !== "registrar_recebimento") {
    return json(400, { ok: false, error: "Acao nao suportada." });
  }

  const itensPayloadRaw: { itemId?: number; quantidade?: number }[] = body.itens ?? [];
  if (!Array.isArray(itensPayloadRaw) || itensPayloadRaw.length === 0) {
    return json(400, { ok: false, error: "Envie ao menos um item para receber." });
  }

  const itensPayload = itensPayloadRaw.map((it) => ({
    itemId: Number(it?.itemId),
    quantidade: Number(it?.quantidade),
  }));

  for (const it of itensPayload) {
    if (!Number.isFinite(it.itemId) || it.itemId <= 0) {
      return json(400, { ok: false, error: "ItemId invalido no payload." });
    }
    if (!Number.isFinite(it.quantidade) || it.quantidade <= 0) {
      return json(400, {
        ok: false,
        error: "Quantidade a receber deve ser maior que zero.",
      });
    }
  }

  const dataRecebimento = normalizarDataRecebimento(body.dataRecebimento);
  const observacao =
    typeof body.observacao === "string" && body.observacao.trim()
      ? body.observacao.trim()
      : null;

  try {
    const { data: pedidoCab, error: errPedidoCab } = await supabaseAdmin
      .from("loja_pedidos_compra")
      .select("id, fornecedor_id, conta_pagar_id")
      .eq("id", pedidoId)
      .maybeSingle();

    if (errPedidoCab) {
      console.error("[POST /api/loja/compras/[id]] Erro ao buscar pedido:", errPedidoCab);
      return json(500, { ok: false, error: "Erro ao buscar pedido de compra." });
    }

    if (!pedidoCab) {
      return json(404, { ok: false, error: "Pedido nao encontrado." });
    }

    const { data: itensPedido, error: errItens } = await supabaseAdmin
      .from("loja_pedidos_compra_itens")
      .select(
        "id, produto_id, quantidade_pedida, quantidade_solicitada, quantidade_recebida, preco_custo_centavos"
      )
      .eq("pedido_id", pedidoId);

    if (errItens) {
      console.error(
        "[POST /api/loja/compras/[id]] Erro ao buscar itens do pedido:",
        errItens
      );
      return json(500, { ok: false, error: "Erro ao buscar itens do pedido." });
    }

    if (!itensPedido || itensPedido.length === 0) {
      return json(400, { ok: false, error: "Nenhum item encontrado neste pedido." });
    }

    const itensMap = new Map<
      number,
      { produto_id: number; pedida: number; solicitada: number; recebida: number; preco_custo_centavos: number }
    >();
    (itensPedido ?? []).forEach((it: any) => {
      const solicitada = Number(it.quantidade_solicitada ?? 0) || 0;
      const pedidaRaw = Number(it.quantidade_pedida ?? it.quantidade_solicitada ?? 0) || 0;
      const pedidaFinal = pedidaRaw || solicitada;
      itensMap.set(it.id, {
        produto_id: it.produto_id,
        pedida: pedidaFinal,
        solicitada,
        recebida: Number(it.quantidade_recebida ?? 0) || 0,
        preco_custo_centavos: Number(it.preco_custo_centavos ?? 0),
      });
    });

    let movimentoWarning = false;

    for (const rec of itensPayload) {
      const info = itensMap.get(rec.itemId);
      if (!info) {
        return json(400, {
          ok: false,
          error: `Item ${rec.itemId} nao pertence a este pedido.`,
        });
      }
      const pendente = Math.max(info.pedida - info.recebida, 0);
      if (rec.quantidade > pendente) {
        return json(400, {
          ok: false,
          error: `Quantidade maior que o pendente para o item ${rec.itemId}.`,
        });
      }
    }

    const recebimentosInsert = itensPayload.map((rec) => {
      const produtoInfo = itensMap.get(rec.itemId)!;
      const precoCusto = Number(produtoInfo?.preco_custo_centavos ?? 0) || 0;
      return {
        pedido_id: pedidoId,
        item_id: rec.itemId,
        produto_id: produtoInfo.produto_id,
        quantidade: rec.quantidade,
        quantidade_recebida: rec.quantidade,
        preco_custo_centavos: precoCusto,
        data_recebimento: dataRecebimento,
        observacao,
        created_by: null,
      };
    });

    const { error: errRec } = await supabaseAdmin
      .from("loja_pedidos_compra_recebimentos")
      .insert(recebimentosInsert);

    if (errRec) {
      console.error("[POST /api/loja/compras/[id]] Erro ao inserir recebimentos:", errRec);
      return json(500, { ok: false, error: "Erro ao registrar recebimentos." });
    }

    for (const rec of itensPayload) {
      const info = itensMap.get(rec.itemId);
      if (!info) continue;

      const pedidaFinal = info.pedida || info.solicitada || 0;
      const novaQtdRecebida = info.recebida + rec.quantidade;

      const { error: errUpdateItem } = await supabaseAdmin
        .from("loja_pedidos_compra_itens")
        .update({
          quantidade_recebida: novaQtdRecebida,
          quantidade_pedida: pedidaFinal,
        })
        .eq("id", rec.itemId);

      if (errUpdateItem) {
        console.error(
          "[POST /api/loja/compras/[id]] Erro ao atualizar item:",
          errUpdateItem
        );
        return json(500, { ok: false, error: "Erro ao atualizar itens do pedido." });
      }

      try {
        await registrarEntradaEstoque({
          supabase: supabaseAdmin,
          produtoId: info.produto_id,
          quantidade: rec.quantidade,
          origem: "COMPRA",
          referenciaId: pedidoId,
          observacao:
            observacao ||
            `Recebimento do pedido de compra #${pedidoId} (item ${rec.itemId})`,
          createdBy: null,
          custoUnitarioCentavos: info.preco_custo_centavos ?? 0,
        });
      } catch (estoqueErr) {
        console.error("[POST /api/loja/compras/[id]] Falha ao registrar estoque:", estoqueErr);
        movimentoWarning = true;
      }

      if (pedidoCab.fornecedor_id && info.preco_custo_centavos > 0) {
        try {
          await supabaseAdmin.from("loja_fornecedor_precos").insert({
            fornecedor_id: pedidoCab.fornecedor_id,
            produto_id: info.produto_id,
            preco_custo_centavos: info.preco_custo_centavos,
            data_referencia: dataRecebimento,
            observacoes: observacao || `Recebimento pedido #${pedidoId}`,
          });
        } catch (custoErr) {
          console.error(
            "[POST /api/loja/compras/[id]] Falha ao registrar preco de custo:",
            custoErr
          );
        }
      }
    }

    const { data: itensAtualizados, error: errItensAtualizados } = await supabaseAdmin
      .from("loja_pedidos_compra_itens")
      .select("quantidade_pedida, quantidade_solicitada, quantidade_recebida")
      .eq("pedido_id", pedidoId);

    if (errItensAtualizados) {
      console.error(
        "[POST /api/loja/compras/[id]] Erro ao recalcular status:",
        errItensAtualizados
      );
      return json(500, { ok: false, error: "Erro ao recalcular status do pedido." });
    }

    let status: PedidoStatus = "EM_ANDAMENTO";
    let pendenteTotal = 0;
    let algumRecebido = false;

    if (itensAtualizados && itensAtualizados.length > 0) {
      itensAtualizados.forEach((it: any) => {
        const pedida = Number(it.quantidade_pedida ?? it.quantidade_solicitada ?? 0) || 0;
        const recebida = Number(it.quantidade_recebida ?? 0) || 0;
        pendenteTotal += Math.max(pedida - recebida, 0);
        if (recebida > 0) algumRecebido = true;
      });

      if (pendenteTotal > 0) {
        status = algumRecebido ? "PARCIAL" : "EM_ANDAMENTO";
      } else {
        // Sem pendências de recebimento: depende do pagamento
        let contaStatus: string | null = null;
        if (pedidoCab.conta_pagar_id) {
          const { data: contaPagarRow } = await supabaseAdmin
            .from("contas_pagar")
            .select("status")
            .eq("id", pedidoCab.conta_pagar_id)
            .maybeSingle();
          contaStatus = (contaPagarRow as any)?.status ?? null;
        }

        if (!pedidoCab.conta_pagar_id) {
          status = "PENDENTE_PAGAMENTO";
        } else if (contaStatus === "PAGO") {
          status = "CONCLUIDO";
        } else {
          status = "PENDENTE_PAGAMENTO";
        }
      }
    }

    await supabaseAdmin
      .from("loja_pedidos_compra")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", pedidoId);

    try {
      const valorLoteCentavos = itensPayload.reduce((acc, rec) => {
        const info = itensMap.get(rec.itemId);
        if (!info) return acc;
        return acc + Number(info.preco_custo_centavos || 0) * rec.quantidade;
      }, 0);

      if (valorLoteCentavos > 0) {
        const centroId = await getCentroCustoLojaId(supabaseAdmin);
        const categoriaId = await getCategoriaCompraMercadoriaId();
        const fornecedorPessoaId = await getFornecedorPessoaId(pedidoCab.fornecedor_id);

        let contaPagarId: number | null = pedidoCab.conta_pagar_id ?? null;

        if (centroId && categoriaId && fornecedorPessoaId) {
          const descricaoBase = `Compra Loja - Pedido #${pedidoId}`;
          const { data: contaExistente } = await supabaseAdmin
            .from("contas_pagar")
            .select("id, valor_centavos")
            .eq("centro_custo_id", centroId)
            .eq("pessoa_id", fornecedorPessoaId)
            .eq("descricao", descricaoBase)
            .maybeSingle();

          if (!contaExistente) {
            const { data: contaNova } = await supabaseAdmin
              .from("contas_pagar")
              .insert({
                centro_custo_id: centroId,
                categoria_id: categoriaId,
                pessoa_id: fornecedorPessoaId,
                descricao: descricaoBase,
                valor_centavos: valorLoteCentavos,
                vencimento: new Date().toISOString().slice(0, 10),
                status: "PENDENTE",
                metodo_pagamento: null,
                observacoes: `Criado automaticamente a partir do recebimento do pedido de compra #${pedidoId}.`,
              })
              .select("id")
              .maybeSingle();
            contaPagarId = contaNova?.id ?? contaPagarId;
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

          if (contaPagarId && !pedidoCab.conta_pagar_id) {
            await supabaseAdmin
              .from("loja_pedidos_compra")
              .update({ conta_pagar_id: contaPagarId })
              .eq("id", pedidoId)
              .is("conta_pagar_id", null);
          }
        } else {
          console.error(
            "[POST /api/loja/compras/[id]] Centro/categoria/pessoa do fornecedor nao encontrados; pulando contas_pagar."
          );
        }
      }
    } catch (finErr) {
      console.error(
        "[POST /api/loja/compras/[id]] Erro ao integrar com contas_pagar:",
        finErr
      );
    }

    const detalhe = await carregarDetalhe(pedidoId);
    if (!detalhe) {
      return json(200, {
        ok: true,
        data: { id: pedidoId, status },
        warning: movimentoWarning ? "movimento_estoque_falhou" : undefined,
      });
    }

    return json(200, {
      ok: true,
      data: detalhe,
      warning: movimentoWarning ? "movimento_estoque_falhou" : undefined,
    });
  } catch (err) {
    console.error("[POST /api/loja/compras/[id]] Erro inesperado:", err);
    return json(500, { ok: false, error: "Erro inesperado ao registrar recebimento." });
  }
}
