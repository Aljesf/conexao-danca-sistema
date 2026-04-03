import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { guardCafeApiRequest } from "@/lib/auth/cafeApiAccess";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

type ProdutoInsert = {
  nome: string;
  categoria?: string;
  categoria_id?: number | null;
  subcategoria_id?: number | null;
  unidade_venda?: string;
  preco_venda_centavos: number;
  preparado?: boolean;
  insumo_direto_id?: number | null;
  ativo?: boolean;
};

type ProdutoListRow = {
  id: number;
  nome: string;
  preco_venda_centavos: number | null;
  unidade_venda: string | null;
  ativo: boolean | null;
  categoria: string | null;
  categoria_id?: number | null;
  subcategoria_id?: number | null;
};

type NamedRow = {
  id: number;
  nome: string;
};

function asIntOrNull(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const n = Math.trunc(value);
  return n > 0 ? n : null;
}

function isMissingCafeCategoriaColumnError(message: string | null | undefined): boolean {
  const msg = (message ?? "").toLowerCase();
  return (
    msg.includes("categoria_id") ||
    msg.includes("subcategoria_id")
  ) && msg.includes("column");
}

export async function GET(req: NextRequest) {
  const denied = await guardCafeApiRequest(req);
  if (denied) return denied as unknown as NextResponse;

  const { searchParams } = new URL(req.url);
  const search = (searchParams.get("search") ?? searchParams.get("q") ?? "").trim();
  const pageRaw = Number(searchParams.get("page") ?? "1");
  const pageSizeRaw = Number(searchParams.get("pageSize") ?? "20");
  const tabelaPrecoRaw = searchParams.get("tabela_preco_id");
  const categoriaRaw = searchParams.get("categoria_id");
  const subcategoriaRaw = searchParams.get("subcategoria_id");
  const idsRaw = searchParams.get("ids");
  const tabelaPrecoId =
    tabelaPrecoRaw && Number.isFinite(Number(tabelaPrecoRaw)) ? Number(tabelaPrecoRaw) : null;
  const categoriaId =
    categoriaRaw && Number.isFinite(Number(categoriaRaw)) ? Math.trunc(Number(categoriaRaw)) : null;
  const subcategoriaId =
    subcategoriaRaw && Number.isFinite(Number(subcategoriaRaw)) ? Math.trunc(Number(subcategoriaRaw)) : null;
  const ids = (idsRaw ?? "")
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0)
    .map((item) => Math.trunc(item));
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.trunc(pageRaw) : 1;
  const pageSize =
    Number.isFinite(pageSizeRaw) && pageSizeRaw > 0
      ? Math.min(Math.trunc(pageSizeRaw), 200)
      : 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = getSupabaseServiceClient();
  const selectModern =
    "id,nome,preco_venda_centavos,unidade_venda,ativo,categoria,categoria_id,subcategoria_id";
  const selectLegacy = "id,nome,preco_venda_centavos,unidade_venda,ativo,categoria";

  let query = supabase
    .from("cafe_produtos")
    .select(selectModern, { count: "exact" })
    .eq("ativo", true)
    .order("nome", { ascending: true })
    .range(from, to);

  if (search) {
    query = query.or(`nome.ilike.%${search}%,categoria.ilike.%${search}%`);
  }
  if (ids.length > 0) {
    query = query.in("id", ids);
  }

  if (categoriaId) {
    query = query.eq("categoria_id", categoriaId);
  }
  if (subcategoriaId) {
    query = query.eq("subcategoria_id", subcategoriaId);
  }

  let { data, error, count } = await query;

  if (error && isMissingCafeCategoriaColumnError(error.message)) {
    let fallbackQuery = supabase
      .from("cafe_produtos")
      .select(selectLegacy, { count: "exact" })
      .eq("ativo", true)
      .order("nome", { ascending: true })
      .range(from, to);

    if (search) {
      fallbackQuery = fallbackQuery.or(`nome.ilike.%${search}%,categoria.ilike.%${search}%`);
    }
    if (ids.length > 0) {
      fallbackQuery = fallbackQuery.in("id", ids);
    }

    const fallback = await fallbackQuery;
    data = fallback.data;
    error = fallback.error;
    count = fallback.count;
  }

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const categoriaIds = Array.from(
    new Set(
      (data ?? [])
        .map((row) => Number((row as ProdutoListRow)?.categoria_id))
        .filter((id) => Number.isFinite(id)),
    ),
  );
  const subcategoriaIds = Array.from(
    new Set(
      (data ?? [])
        .map((row) => Number((row as ProdutoListRow)?.subcategoria_id))
        .filter((id) => Number.isFinite(id)),
    ),
  );

  const { data: categorias } = categoriaIds.length
    ? await supabase
        .from("cafe_categorias")
        .select("id,nome")
        .in("id", categoriaIds)
    : { data: [] as NamedRow[] };

  const { data: subcategorias } = subcategoriaIds.length
    ? await supabase
        .from("cafe_subcategorias")
        .select("id,nome")
        .in("id", subcategoriaIds)
    : { data: [] as NamedRow[] };

  const categoriaNomeById = new Map<number, string>();
  for (const row of categorias ?? []) {
    const named = row as NamedRow;
    categoriaNomeById.set(Number(named.id), String(named.nome ?? ""));
  }

  const subcategoriaNomeById = new Map<number, string>();
  for (const row of subcategorias ?? []) {
    const named = row as NamedRow;
    subcategoriaNomeById.set(Number(named.id), String(named.nome ?? ""));
  }

  let precoMap: Map<number, number> | null = null;
  if (tabelaPrecoId && (data ?? []).length > 0) {
    const produtoIds = (data ?? []).map((row) => row.id);
    const { data: precos, error: precosErr } = await supabase
      .from("cafe_produto_precos")
      .select("produto_id, preco_centavos")
      .eq("tabela_preco_id", tabelaPrecoId)
      .eq("ativo", true)
      .in("produto_id", produtoIds);

    if (precosErr) {
      return NextResponse.json({ ok: false, error: precosErr.message }, { status: 500 });
    }

    precoMap = new Map<number, number>();
    for (const row of precos ?? []) {
      precoMap.set(row.produto_id, Number(row.preco_centavos ?? 0));
    }
  }

  const items =
    (data ?? []).map((rowRaw) => {
      const row = rowRaw as ProdutoListRow;
      const categoriaIdRow = typeof row.categoria_id === "number" ? Number(row.categoria_id) : null;
      const subcategoriaIdRow = typeof row.subcategoria_id === "number" ? Number(row.subcategoria_id) : null;
      return {
      id: row.id,
      nome: row.nome,
      codigo: null,
      preco_venda_centavos: precoMap?.has(row.id)
        ? Number(precoMap.get(row.id) ?? 0)
        : Number(row.preco_venda_centavos ?? 0),
      unidade_venda: row.unidade_venda ?? null,
      ativo: row.ativo ?? true,
      categoria: row.categoria ?? "GERAL",
      categoria_id: categoriaIdRow,
      subcategoria_id: subcategoriaIdRow,
      categoria_nome:
        categoriaNomeById.get(Number(categoriaIdRow)) ??
        row.categoria ??
        "GERAL",
      subcategoria_nome:
        subcategoriaNomeById.get(Number(subcategoriaIdRow)) ?? null,
    };
    }) ?? [];

  return NextResponse.json(
    {
      ok: true,
      data: {
        items,
        pagination: {
          page,
          pageSize,
          total: count ?? 0,
        },
      },
    },
    { status: 200 }
  );
}

export async function POST(req: Request) {
  const denied = await guardApiByRole(req);
  if (denied) return denied as unknown as NextResponse;

  const body = (await req.json().catch(() => null)) as ProdutoInsert | null;
  if (!body?.nome?.trim()) {
    return NextResponse.json({ error: "nome_obrigatorio" }, { status: 400 });
  }
  if (!Number.isFinite(body?.preco_venda_centavos)) {
    return NextResponse.json({ error: "preco_invalido" }, { status: 400 });
  }

  const insumoDiretoId =
    body.insumo_direto_id !== undefined && body.insumo_direto_id !== null
      ? Number(body.insumo_direto_id)
      : null;
  const categoriaId = asIntOrNull(body.categoria_id);
  const subcategoriaId = asIntOrNull(body.subcategoria_id);

  if (insumoDiretoId !== null && !Number.isFinite(insumoDiretoId)) {
    return NextResponse.json({ error: "insumo_direto_invalido" }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();

  let categoriaNomeLegacy = body.categoria?.trim() || "GERAL";
  if (categoriaId) {
    const { data: categoriaRow, error: catErr } = await supabase
      .from("cafe_categorias")
      .select("id,nome")
      .eq("id", categoriaId)
      .maybeSingle();

    if (catErr) {
      return NextResponse.json({ error: "erro_validar_categoria", detail: catErr.message }, { status: 500 });
    }
    if (!categoriaRow) {
      return NextResponse.json({ error: "categoria_id_invalido" }, { status: 400 });
    }
    categoriaNomeLegacy = String((categoriaRow as { nome?: string | null }).nome ?? categoriaNomeLegacy);
  }

  if (subcategoriaId) {
    const { data: subRow, error: subErr } = await supabase
      .from("cafe_subcategorias")
      .select("id,categoria_id")
      .eq("id", subcategoriaId)
      .maybeSingle();

    if (subErr) {
      return NextResponse.json({ error: "erro_validar_subcategoria", detail: subErr.message }, { status: 500 });
    }
    if (!subRow) {
      return NextResponse.json({ error: "subcategoria_id_invalido" }, { status: 400 });
    }
    if (categoriaId && Number((subRow as { categoria_id?: number | null }).categoria_id) !== categoriaId) {
      return NextResponse.json({ error: "subcategoria_nao_pertence_categoria" }, { status: 400 });
    }
  }

  const payload: Record<string, unknown> = {
    nome: body.nome.trim(),
    categoria: categoriaNomeLegacy,
    categoria_id: categoriaId,
    subcategoria_id: subcategoriaId,
    unidade_venda: body.unidade_venda?.trim() || "un",
    preco_venda_centavos: body.preco_venda_centavos,
    preparado: body.preparado ?? true,
    insumo_direto_id: insumoDiretoId,
    ativo: body.ativo ?? true,
  };

  let { data, error } = await supabase.from("cafe_produtos").insert(payload).select("*").single();
  if (error && isMissingCafeCategoriaColumnError(error.message)) {
    delete payload.categoria_id;
    delete payload.subcategoria_id;
    const fallback = await supabase.from("cafe_produtos").insert(payload).select("*").single();
    data = fallback.data;
    error = fallback.error;
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data }, { status: 201 });
}
