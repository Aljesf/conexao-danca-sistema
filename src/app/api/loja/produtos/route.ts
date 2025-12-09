import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ApiResponse = {
  ok: boolean;
  error?: string;
  data?: any;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[/api/loja/produtos] Variaveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao definidas."
  );
}

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

type ProdutoDb = {
  id: number;
  codigo: string | null;
  nome: string;
  descricao?: string | null;
  categoria: string | null;
  categoria_subcategoria_id?: number | null;
  preco_venda_centavos: number;
  unidade: string | null;
  estoque_atual: number;
  ativo: boolean;
  bloqueado_para_venda?: boolean;
  observacoes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  fornecedor_nome?: string | null;
};

// Utilitario para respostas JSON padronizadas
function json(status: number, payload: ApiResponse) {
  return NextResponse.json(payload, { status });
}

// ==============================
// GET /api/loja/produtos
// Lista produtos com filtros simples
// ==============================
export async function GET(req: NextRequest) {
  if (!supabaseAdmin) {
    return json(500, {
      ok: false,
      error:
        "Configuracao do Supabase ausente. Verifique NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
    });
  }

  const {
    search,
    apenasAtivos,
    page = "1",
    pageSize = "50",
    somenteComPreco,
    modo,
  } = Object.fromEntries(req.nextUrl.searchParams);

  const pageNumber = Math.max(parseInt(page || "1", 10) || 1, 1);
  const perPage = Math.min(Math.max(parseInt(pageSize || "50", 10) || 50, 1), 200);
  const from = (pageNumber - 1) * perPage;
  const to = from + perPage - 1;

  const isAdminMode = modo === "admin";

  try {
    let query = supabaseAdmin
      .from("loja_produtos")
      .select(
        `
        id,
        codigo,
        nome,
        descricao,
        categoria,
        preco_venda_centavos,
        unidade,
        estoque_atual,
        ativo,
        bloqueado_para_venda,
        observacoes,
        created_at,
        updated_at
      `,
        { count: "exact" }
      )
      .range(from, to)
      .order("nome", { ascending: true });

    if (!isAdminMode) {
      query = query.eq("ativo", true).is("bloqueado_para_venda", false);
    } else if (apenasAtivos === "true") {
      query = query.eq("ativo", true);
    }

    if (somenteComPreco === "true") {
      query = query.gt("preco_venda_centavos", 0);
    } else if (somenteComPreco === "false") {
      query = query.eq("preco_venda_centavos", 0);
    }

    if (search && search.trim().length > 0) {
      const term = search.trim();
      query = query.or(
        `nome.ilike.%${term}%,codigo.ilike.%${term}%,categoria.ilike.%${term}%`
      );
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[GET /api/loja/produtos] Erro Supabase:", error);
      return json(500, {
        ok: false,
        error: error.message || "Erro ao listar produtos.",
      });
    }

    const items: ProdutoDb[] = (data as ProdutoDb[] | null | undefined)?.map((p) => ({
      ...p,
      fornecedor_nome: (p as any).fornecedor_nome ?? null,
    })) ?? [];

    return json(200, {
      ok: true,
      data: {
        items,
        pagination: {
          page: pageNumber,
          pageSize: perPage,
          total: count ?? 0,
        },
      },
    });
  } catch (e) {
    console.error("[GET /api/loja/produtos] Erro inesperado:", e);
    return json(500, { ok: false, error: "Erro inesperado ao listar produtos." });
  }
}

// ==============================
// POST /api/loja/produtos
// Cria um novo produto
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
    codigo,
    nome,
    descricao,
    categoria,
    categoria_subcategoria_id,
    preco_venda_centavos,
    preco,
    unidade = "UN",
    estoque_atual = 0,
    ativo = true,
    bloqueado_para_venda,
    observacoes,
  } = body ?? {};

  if (!nome || typeof nome !== "string" || nome.trim().length === 0) {
    return json(400, { ok: false, error: "Campo 'nome' e obrigatorio." });
  }

  // Converte preco: pode vir em preco_venda_centavos ou preco (real)
  let precoCentavos: number | null = null;

  if (typeof preco_venda_centavos === "number") {
    precoCentavos = Math.round(preco_venda_centavos);
  } else if (typeof preco_venda_centavos === "string") {
    const v = parseInt(preco_venda_centavos, 10);
    if (!Number.isNaN(v)) precoCentavos = v;
  } else if (typeof preco === "number") {
    precoCentavos = Math.round(preco * 100);
  } else if (typeof preco === "string") {
    const clean = preco.replace(/[^\d.,]/g, "").replace(",", ".");
    const v = parseFloat(clean);
    if (!Number.isNaN(v)) precoCentavos = Math.round(v * 100);
  }

  const precoFinal = Math.max(precoCentavos ?? 0, 0);
  const bloqueado =
    precoFinal <= 0 ? true : Boolean(bloqueado_para_venda);
  const estoque = Number.isFinite(estoque_atual) ? Number(estoque_atual) : 0;
  const catSubId =
    typeof categoria_subcategoria_id === "number" && Number.isFinite(categoria_subcategoria_id)
      ? categoria_subcategoria_id
      : null;

  try {
    const { data, error } = await supabaseAdmin
      .from("loja_produtos")
      .insert({
        codigo: codigo || null,
        nome: nome.trim(),
        descricao: descricao || null,
        categoria: categoria || null,
        categoria_subcategoria_id: catSubId,
        preco_venda_centavos: precoFinal,
        unidade: unidade || "UN",
        estoque_atual: estoque,
        ativo: Boolean(ativo),
        bloqueado_para_venda: bloqueado,
        observacoes: observacoes || null,
      })
      .select("*")
      .single();

    if (error) {
      console.error("[POST /api/loja/produtos] Erro Supabase:", error);
      return json(500, { ok: false, error: "Erro ao criar produto." });
    }

    return json(201, { ok: true, data });
  } catch (e) {
    console.error("[POST /api/loja/produtos] Erro inesperado:", e);
    return json(500, { ok: false, error: "Erro inesperado ao criar produto." });
  }
}

// ==============================
// PUT /api/loja/produtos
// Atualiza um produto existente
// ==============================
export async function PUT(req: NextRequest) {
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
    id,
    codigo,
    nome,
    descricao,
    categoria,
    categoria_subcategoria_id,
    preco_venda_centavos,
    preco,
    unidade,
    estoque_atual,
    ativo,
    observacoes,
    bloqueado_para_venda,
  } = body ?? {};

  if (!id || typeof id !== "number") {
    return json(400, { ok: false, error: "Campo 'id' e obrigatorio e deve ser numerico." });
  }

  const updatePayload: Record<string, any> = {};

  if (typeof codigo !== "undefined") updatePayload.codigo = codigo || null;
  if (typeof nome === "string" && nome.trim().length > 0)
    updatePayload.nome = nome.trim();
  if (typeof descricao !== "undefined") updatePayload.descricao = descricao || null;
  if (typeof categoria !== "undefined") updatePayload.categoria = categoria || null;
  if (typeof categoria_subcategoria_id !== "undefined") {
    const val =
      typeof categoria_subcategoria_id === "number" && Number.isFinite(categoria_subcategoria_id)
        ? categoria_subcategoria_id
        : null;
    updatePayload.categoria_subcategoria_id = val;
  }

  // Preco de venda
  let precoCentavos: number | null = null;

  if (typeof preco_venda_centavos === "number") {
    precoCentavos = Math.round(preco_venda_centavos);
  } else if (typeof preco_venda_centavos === "string") {
    const v = parseInt(preco_venda_centavos, 10);
    if (!Number.isNaN(v)) precoCentavos = v;
  } else if (typeof preco === "number") {
    precoCentavos = Math.round(preco * 100);
  } else if (typeof preco === "string") {
    const clean = preco.replace(/[^\d.,]/g, "").replace(",", ".");
    const v = parseFloat(clean);
    if (!Number.isNaN(v)) precoCentavos = Math.round(v * 100);
  }

  if (precoCentavos !== null) {
    const precoFinal = Math.max(precoCentavos, 0);
    updatePayload.preco_venda_centavos = precoFinal;
    if (precoFinal <= 0) {
      updatePayload.bloqueado_para_venda = true;
    } else if (typeof bloqueado_para_venda === "boolean") {
      updatePayload.bloqueado_para_venda = bloqueado_para_venda;
    }
  }

  if (typeof unidade === "string" && unidade.trim().length > 0) {
    updatePayload.unidade = unidade.trim();
  }

  if (typeof estoque_atual !== "undefined") {
    const estoque = Number(estoque_atual);
    if (!Number.isNaN(estoque)) {
      updatePayload.estoque_atual = estoque;
    }
  }

  if (typeof ativo !== "undefined") {
    updatePayload.ativo = Boolean(ativo);
  }

  if (typeof bloqueado_para_venda === "boolean" && precoCentavos === null) {
    updatePayload.bloqueado_para_venda = bloqueado_para_venda;
  }

  if (typeof observacoes !== "undefined") {
    updatePayload.observacoes = observacoes || null;
  }

  if (Object.keys(updatePayload).length === 0) {
    return json(400, {
      ok: false,
      error: "Nenhum campo valido foi enviado para atualizacao.",
    });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("loja_produtos")
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("[PUT /api/loja/produtos] Erro Supabase:", error);
      return json(500, { ok: false, error: "Erro ao atualizar produto." });
    }

    return json(200, { ok: true, data });
  } catch (e) {
    console.error("[PUT /api/loja/produtos] Erro inesperado:", e);
    return json(500, {
      ok: false,
      error: "Erro inesperado ao atualizar produto.",
    });
  }
}
