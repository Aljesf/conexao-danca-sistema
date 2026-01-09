import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { guardApiByRole } from "@/lib/auth/roleGuard";

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

type VarianteCompraInfo = {
  id: number;
  produto_id: number;
  ativo: boolean | null;
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

async function garantirVariantePadrao(produtoId: number) {
  if (!supabaseAdmin) return null;
  const { data, error } = await supabaseAdmin
    .from("loja_produto_variantes")
    .select("id, produto_id, ativo")
    .eq("produto_id", produtoId)
    .is("cor_id", null)
    .is("numeracao_id", null)
    .is("tamanho_id", null)
    .order("id", { ascending: true })
    .maybeSingle();

  if (error) {
    console.error("[/api/loja/compras] erro ao buscar variante padrao:", error);
    return null;
  }

  if (data) return data;

  const sku = `PADRAO-${produtoId}`;
  const ins = await supabaseAdmin
    .from("loja_produto_variantes")
    .insert({
      produto_id: produtoId,
      sku,
      cor_id: null,
      numeracao_id: null,
      tamanho_id: null,
      estoque_atual: 0,
      preco_venda_centavos: null,
      ativo: true,
      observacoes: "Variante padrao criada automaticamente (compra).",
    })
    .select("id, produto_id, ativo")
    .maybeSingle();

  if (ins.error) {
    console.error("[/api/loja/compras] erro ao criar variante padrao:", ins.error);
    return null;
  }

  return ins.data;
}

async function mapearVariantesDosProdutos(produtoIds: number[]) {
  const map = new Map<number, { id: number }[]>();
  if (!supabaseAdmin || produtoIds.length === 0) return map;

  const { data, error } = await supabaseAdmin
    .from("loja_produto_variantes")
    .select("id, produto_id, ativo")
    .in("produto_id", produtoIds);

  if (error) {
    console.error("[/api/loja/compras] erro ao buscar variantes:", error);
    return map;
  }

  (data || []).forEach((v: any) => {
    if (v.ativo === false) return;
    const arr = map.get(v.produto_id) ?? [];
    arr.push({ id: v.id });
    map.set(v.produto_id, arr);
  });

  for (const pid of produtoIds) {
    const jaTem = map.get(pid);
    if (!jaTem || jaTem.length === 0) {
      const criado = await garantirVariantePadrao(pid);
      if (criado?.id) {
        map.set(pid, [{ id: criado.id }]);
      }
    }
  }

  return map;
}

// ==============================
// GET /api/loja/compras
// Lista pedidos de compra
// ==============================
export async function GET(req: NextRequest) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
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

    if (q.length > 0) {
      const like = `%${q}%`;
      const qNumber = Number(q);

      const filters = [`status.ilike.${like}`, `observacoes.ilike.${like}`];
      if (Number.isFinite(qNumber)) {
        filters.push(`id.eq.${qNumber}`);
      }

      query = query.or(filters.join(","));
    }

    const { data, error } = await query;

    if (error) {
      console.error("[GET /api/loja/compras] Erro Supabase:", error, { q, status });
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
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
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
    if (!it?.variante_id || typeof it.variante_id !== "number") {
      return json(400, {
        ok: false,
        error: "Item sem variante_id. Compra deve ser registrada por variante.",
      });
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

  // Valida variantes pertencem ao produto e estao ativas
  const varianteIds = Array.from(
    new Set(
      itens
        .map((it: any) => Number(it.variante_id))
        .filter((id: any) => Number.isFinite(id) && id > 0)
    )
  );

  if (varianteIds.length === 0) {
    return json(400, {
      ok: false,
      error: "Item sem variante_id. Compra deve ser registrada por variante.",
    });
  }

  const variantesMap = new Map<number, VarianteCompraInfo>();
  if (supabaseAdmin) {
    const { data: variantes, error: variantesErr } = await supabaseAdmin
      .from("loja_produto_variantes")
      .select("id, produto_id, ativo")
      .in("id", varianteIds);

    if (variantesErr) {
      console.error("[POST /api/loja/compras] Falha ao validar variantes:", variantesErr);
      return json(500, { ok: false, error: "Erro ao validar variantes." });
    }

    (variantes || []).forEach((v: any) => variantesMap.set(Number(v.id), v as VarianteCompraInfo));
  }

  for (const it of itens) {
    const varianteInfo = variantesMap.get(Number(it.variante_id));
    if (!varianteInfo) {
      return json(400, {
        ok: false,
        error: `Variante ${it.variante_id} nao encontrada.`,
      });
    }
    if (Number(varianteInfo.produto_id) !== Number(it.produto_id)) {
      return json(400, {
        ok: false,
        error: `Variante ${it.variante_id} nao pertence ao produto ${it.produto_id}.`,
      });
    }
    if (varianteInfo.ativo === false) {
      return json(400, {
        ok: false,
        error: `Variante ${it.variante_id} esta inativa.`,
      });
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
      variante_id: it.variante_id,
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
