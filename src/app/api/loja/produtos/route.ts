import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { guardApiByRole } from "@/lib/auth/roleGuard";

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
  categoria_nome?: string | null;
  subcategoria_nome?: string | null;
  preco_venda_centavos: number;
  unidade: string | null;
  estoque_atual: number;
  ativo: boolean;
  bloqueado_para_venda?: boolean;
  observacoes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  fornecedor_principal_id?: number | null;
  fornecedor_nome?: string | null;
};

type CategoriaRow = { id: number; nome: string };
type SubcategoriaRow = { id: number; categoria_id: number; nome: string };

// Utilitario para respostas JSON padronizadas
function json(status: number, payload: ApiResponse) {
  return NextResponse.json(payload, { status });
}

function normalizeNullableNumber(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function normalizeCategoriaSubId(value: any): number | null {
  return normalizeNullableNumber(value);
}

async function resolveCategoriaTexto(
  supabase: NonNullable<typeof supabaseAdmin>,
  categoriaSubId: number | null
): Promise<{ categoriaTexto: string | null; categoriaNome: string | null; subcategoriaNome: string | null }> {
  if (!categoriaSubId) {
    return { categoriaTexto: null, categoriaNome: null, subcategoriaNome: null };
  }

  const { data: sub, error: subErr } = await supabase
    .from("loja_produto_categoria_subcategoria")
    .select("id,categoria_id,nome")
    .eq("id", categoriaSubId)
    .single();

  if (subErr || !sub) {
    return { categoriaTexto: null, categoriaNome: null, subcategoriaNome: null };
  }

  const subcat = sub as SubcategoriaRow;

  const { data: cat, error: catErr } = await supabase
    .from("loja_produto_categoria")
    .select("id,nome")
    .eq("id", subcat.categoria_id)
    .single();

  if (catErr || !cat) {
    return { categoriaTexto: subcat.nome, categoriaNome: null, subcategoriaNome: subcat.nome };
  }

  const categoria = cat as CategoriaRow;
  const categoriaTexto = `${categoria.nome} / ${subcat.nome}`;

  return { categoriaTexto, categoriaNome: categoria.nome, subcategoriaNome: subcat.nome };
}

// ==============================
// GET /api/loja/produtos
// Lista produtos com filtros simples
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
        categoria_subcategoria_id,
        preco_venda_centavos,
        unidade,
        estoque_atual,
        ativo,
        bloqueado_para_venda,
        observacoes,
        fornecedor_principal_id,
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

    const itemsRaw: ProdutoDb[] =
      (data as ProdutoDb[] | null | undefined)?.map((p) => ({
        ...p,
        categoria_subcategoria_id: p.categoria_subcategoria_id ?? null,
        fornecedor_principal_id: (p as any).fornecedor_principal_id ?? null,
        fornecedor_nome: (p as any).fornecedor_nome ?? null,
      })) ?? [];

    const subMap = new Map<number, SubcategoriaRow>();
    const catMap = new Map<number, CategoriaRow>();

    const subIds = Array.from(
      new Set(
        itemsRaw
          .map((p) => p.categoria_subcategoria_id)
          .filter((id): id is number => typeof id === "number" && id > 0)
      )
    );

    if (subIds.length > 0) {
      const { data: subData, error: subError } = await supabaseAdmin
        .from("loja_produto_categoria_subcategoria")
        .select("id,categoria_id,nome")
        .in("id", subIds);

      if (subError) {
        console.error("[GET /api/loja/produtos] Erro ao buscar subcategorias:", subError);
      } else {
        const subRows = (subData ?? []) as SubcategoriaRow[];
        subRows.forEach((row) => {
          subMap.set(row.id, row);
        });

        const catIds = Array.from(
          new Set(
            subRows
              .map((row) => row.categoria_id)
              .filter((id): id is number => typeof id === "number" && id > 0)
          )
        );

        if (catIds.length > 0) {
          const { data: catData, error: catError } = await supabaseAdmin
            .from("loja_produto_categoria")
            .select("id,nome")
            .in("id", catIds);

          if (catError) {
            console.error("[GET /api/loja/produtos] Erro ao buscar categorias:", catError);
          } else {
            (catData ?? []).forEach((row) => {
              const cat = row as CategoriaRow;
              catMap.set(cat.id, cat);
            });
          }
        }
      }
    }

    // Estoque pela view de variantes
    const estoqueMap = new Map<number, number>();
    if (itemsRaw.length > 0) {
      const ids = itemsRaw.map((p) => p.id);
      const { data: estoqueData, error: estoqueError } = await supabaseAdmin
        .from("v_loja_produtos_estoque")
        .select("produto_id, estoque_total")
        .in("produto_id", ids);

      if (estoqueError) {
        console.error("[GET /api/loja/produtos] Erro ao buscar estoque na view:", estoqueError);
      } else {
        (estoqueData || []).forEach((row: any) => {
          estoqueMap.set(Number(row.produto_id), Number(row.estoque_total) || 0);
        });
      }
    }

    const items: ProdutoDb[] = itemsRaw.map((p) => {
      const sub = p.categoria_subcategoria_id ? subMap.get(p.categoria_subcategoria_id) : null;
      const cat = sub ? catMap.get(sub.categoria_id) : null;
      const categoriaNome = cat?.nome ?? null;
      const subcategoriaNome = sub?.nome ?? null;
      const categoriaTexto =
        p.categoria ?? (categoriaNome && subcategoriaNome ? `${categoriaNome} / ${subcategoriaNome}` : null);

      return {
        ...p,
        categoria: categoriaTexto,
        categoria_nome: categoriaNome,
        subcategoria_nome: subcategoriaNome,
        estoque_atual: estoqueMap.get(p.id) ?? 0,
      };
    });

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

  const {
    codigo,
    nome,
    descricao,
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
  const catSubId = normalizeCategoriaSubId(categoria_subcategoria_id);
  const fornecedorPrincipalId = normalizeNullableNumber(body?.fornecedor_principal_id);
  const resolvedCategoria = await resolveCategoriaTexto(supabaseAdmin, catSubId);

  try {
    const { data, error } = await supabaseAdmin
      .from("loja_produtos")
      .insert({
        codigo: codigo || null,
        nome: nome.trim(),
        descricao: descricao || null,
        categoria: resolvedCategoria.categoriaTexto,
        categoria_subcategoria_id: catSubId,
        preco_venda_centavos: precoFinal,
        unidade: unidade || "UN",
        estoque_atual: estoque,
        ativo: Boolean(ativo),
        bloqueado_para_venda: bloqueado,
        fornecedor_principal_id: fornecedorPrincipalId,
        observacoes: observacoes || null,
      })
      .select("*")
      .single();

    if (error) {
      console.error("[POST /api/loja/produtos] Erro Supabase:", error);
      return json(500, { ok: false, error: "Erro ao criar produto." });
    }

    const responseData: ProdutoDb = {
      ...(data as ProdutoDb),
      categoria: resolvedCategoria.categoriaTexto ?? (data as ProdutoDb).categoria ?? null,
      categoria_nome: resolvedCategoria.categoriaNome,
      subcategoria_nome: resolvedCategoria.subcategoriaNome,
    };

    return json(201, { ok: true, data: responseData });
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

  const {
    id,
    codigo,
    nome,
    descricao,
    categoria_subcategoria_id,
    preco_venda_centavos,
    preco,
    unidade,
    estoque_atual,
    ativo,
    observacoes,
    bloqueado_para_venda,
    fornecedor_principal_id,
  } = body ?? {};

  if (!id || typeof id !== "number") {
    return json(400, { ok: false, error: "Campo 'id' e obrigatorio e deve ser numerico." });
  }

  const updatePayload: Record<string, any> = {};
  let resolvedCategoria: {
    categoriaTexto: string | null;
    categoriaNome: string | null;
    subcategoriaNome: string | null;
  } | null = null;

  if (typeof codigo !== "undefined") updatePayload.codigo = codigo || null;
  if (typeof nome === "string" && nome.trim().length > 0)
    updatePayload.nome = nome.trim();
  if (typeof descricao !== "undefined") updatePayload.descricao = descricao || null;

  if (typeof categoria_subcategoria_id !== "undefined") {
    const catSubId = normalizeCategoriaSubId(categoria_subcategoria_id);
    updatePayload.categoria_subcategoria_id = catSubId;
    resolvedCategoria = await resolveCategoriaTexto(supabaseAdmin, catSubId);
    updatePayload.categoria = resolvedCategoria.categoriaTexto;
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

  if (typeof fornecedor_principal_id !== "undefined") {
    updatePayload.fornecedor_principal_id = normalizeNullableNumber(fornecedor_principal_id);
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

    const responseData: ProdutoDb = resolvedCategoria
      ? {
          ...(data as ProdutoDb),
          categoria: resolvedCategoria.categoriaTexto ?? (data as ProdutoDb).categoria ?? null,
          categoria_nome: resolvedCategoria.categoriaNome,
          subcategoria_nome: resolvedCategoria.subcategoriaNome,
        }
      : (data as ProdutoDb);

    return json(200, { ok: true, data: responseData });
  } catch (e) {
    console.error("[PUT /api/loja/produtos] Erro inesperado:", e);
    return json(500, {
      ok: false,
      error: "Erro inesperado ao atualizar produto.",
    });
  }
}
