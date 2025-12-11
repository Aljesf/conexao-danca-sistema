import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ApiResponse<T = any> = {
  ok: boolean;
  error?: string;
  data?: T;
};

type PedidoStatus = "RASCUNHO" | "EM_ANDAMENTO" | "PARCIAL" | "CONCLUIDO" | "CANCELADO";

type PedidoCompraResumo = {
  id: number;
  fornecedor_id: number;
  fornecedor_nome?: string | null;
  data_pedido: string;
  status: PedidoStatus;
  valor_estimado_centavos: number;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[/api/loja/compras] Variaveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao definidas."
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
// GET /api/loja/compras
// Lista pedidos de compra
// ==============================
export async function GET(req: NextRequest) {
  if (!supabaseAdmin) {
    return json(500, {
      ok: false,
      error:
        "Configuracao do Supabase ausente. Verifique NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
    });
  }

  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();
    const status = (searchParams.get("status") ?? "").trim();

    let query = supabaseAdmin
      .from("loja_pedidos_compra")
      .select(
        `
        id,
        fornecedor_id,
        data_pedido,
        status,
        valor_estimado_centavos,
        fornecedor:loja_fornecedores!loja_pedidos_compra_fornecedor_id_fkey (
          id,
          pessoas:pessoa_id (
            id,
            nome,
            nome_fantasia
          )
        )
      `
      )
      .order("data_pedido", { ascending: false })
      .order("id", { ascending: false });

    if (status) query = query.eq("status", status);

    if (q) {
      const like = `%${q}%`;
      query = query.or(
        [
          `id.ilike.${like}`,
          `fornecedor.pessoas.nome.ilike.${like}`,
          `fornecedor.pessoas.nome_fantasia.ilike.${like}`,
        ].join(",")
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("[GET /api/loja/compras] Erro Supabase:", error);
      return json(500, { ok: false, error: "Erro ao listar pedidos de compra." });
    }

    const pedidos: PedidoCompraResumo[] =
      (data as any[] | null | undefined)?.map((p) => ({
        id: p.id,
        fornecedor_id: p.fornecedor_id,
        fornecedor_nome:
          p.fornecedor?.pessoas?.nome_fantasia ||
          p.fornecedor?.pessoas?.nome ||
          null,
        data_pedido: p.data_pedido,
        status: p.status,
        valor_estimado_centavos: p.valor_estimado_centavos,
      })) ?? [];

    return json(200, { ok: true, data: pedidos });
  } catch (err) {
    console.error("[GET /api/loja/compras] Erro inesperado:", err);
    return json(500, { ok: false, error: "Erro inesperado ao listar compras." });
  }
}

// ==============================
// POST /api/loja/compras
// Cria pedido de compra (cabecalho + itens)
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

  const { fornecedor_id, observacoes, itens } = body ?? {};

  if (!fornecedor_id || typeof fornecedor_id !== "number") {
    return json(400, { ok: false, error: "Campo 'fornecedor_id' e obrigatorio." });
  }
  if (!Array.isArray(itens) || itens.length === 0) {
    return json(400, { ok: false, error: "Envie pelo menos um item no pedido." });
  }

  for (const it of itens) {
    if (!it?.produto_id || typeof it.produto_id !== "number") {
      return json(400, { ok: false, error: "Item sem produto_id valido." });
    }
    if (!it?.quantidade_solicitada || it.quantidade_solicitada <= 0) {
      return json(400, {
        ok: false,
        error: "Quantidade solicitada deve ser maior que zero.",
      });
    }
    if (
      typeof it.preco_custo_centavos !== "number" ||
      Number.isNaN(it.preco_custo_centavos) ||
      it.preco_custo_centavos < 0
    ) {
      return json(400, { ok: false, error: "Preco de custo invalido." });
    }
  }

  const valorEstimadoCentavos = itens.reduce(
    (acc: number, it: any) => acc + it.quantidade_solicitada * it.preco_custo_centavos,
    0
  );

  try {
    const { data: pedido, error: erroPedido } = await supabaseAdmin
      .from("loja_pedidos_compra")
      .insert({
        fornecedor_id,
        status: "EM_ANDAMENTO",
        valor_estimado_centavos: valorEstimadoCentavos,
        observacoes: observacoes || null,
      })
      .select("*")
      .single();

    if (erroPedido) {
      console.error("[POST /api/loja/compras] Erro ao criar pedido:", erroPedido);
      return json(500, { ok: false, error: "Erro ao criar pedido de compra." });
    }

    const itensInsert = itens.map((it: any) => ({
      pedido_id: pedido.id,
      produto_id: it.produto_id,
      quantidade_solicitada: it.quantidade_solicitada,
      quantidade_pedida: it.quantidade_solicitada,
      quantidade_recebida: 0,
      preco_custo_centavos: it.preco_custo_centavos,
      observacoes: it.observacoes ?? null,
    }));

    const { error: erroItens } = await supabaseAdmin
      .from("loja_pedidos_compra_itens")
      .insert(itensInsert);

    if (erroItens) {
      console.error("[POST /api/loja/compras] Erro ao inserir itens:", erroItens);
      return json(500, { ok: false, error: "Pedido criado, mas itens falharam." });
    }

    return json(201, { ok: true, data: pedido });
  } catch (err) {
    console.error("[POST /api/loja/compras] Erro inesperado:", err);
    return json(500, { ok: false, error: "Erro inesperado ao criar pedido." });
  }
}
