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
    "[/api/loja/categorias] Variaveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao definidas."
  );
}

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

const SUB_OFFSET = 1_000_000;

function json<T>(status: number, payload: ApiResponse<T>) {
  return NextResponse.json(payload, { status });
}

function mapCategoriaRow(row: any) {
  return {
    id: row.id,
    nome: row.nome,
    codigo: row.codigo ?? null,
    descricao: null,
    ativo: row.ativo ?? true,
    ordem: null,
    parent_id: null,
    centro_custo_id: null,
    receita_categoria_id: null,
    despesa_categoria_id: null,
  };
}

function mapSubcategoriaRow(row: any) {
  return {
    id: SUB_OFFSET + row.id,
    nome: row.nome,
    codigo: row.codigo ?? null,
    descricao: null,
    ativo: row.ativo ?? true,
    ordem: null,
    parent_id: row.categoria_id,
    centro_custo_id: row.centro_custo_id ?? null,
    receita_categoria_id: row.receita_categoria_id ?? null,
    despesa_categoria_id: row.despesa_categoria_id ?? null,
  };
}

// GET /api/loja/categorias
export async function GET() {
  if (!supabaseAdmin) {
    return json(500, {
      ok: false,
      error:
        "Configuracao do Supabase ausente. Verifique NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
    });
  }

  try {
    const { data: categorias, error: catError } = await supabaseAdmin
      .from("loja_produto_categoria")
      .select("*")
      .order("nome", { ascending: true });

    if (catError) {
      console.error("Erro ao carregar loja_produto_categoria", catError);
      return json(500, { ok: false, error: "erro_carregar_categorias" });
    }

    const { data: subcategorias, error: subError } = await supabaseAdmin
      .from("loja_produto_categoria_subcategoria")
      .select("*")
      .order("nome", { ascending: true });

    if (subError) {
      console.error("Erro ao carregar loja_produto_categoria_subcategoria", subError);
      return json(500, { ok: false, error: "erro_carregar_subcategorias" });
    }

    const resultado = [
      ...(categorias ?? []).map(mapCategoriaRow),
      ...(subcategorias ?? []).map(mapSubcategoriaRow),
    ];

    return json(200, { ok: true, data: resultado });
  } catch (e: any) {
    console.error("Erro inesperado em GET /api/loja/categorias", e);
    return json(500, { ok: false, error: "erro_interno_categorias" });
  }
}

// POST /api/loja/categorias
export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return json(500, {
      ok: false,
      error:
        "Configuracao do Supabase ausente. Verifique NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
    });
  }

  try {
    const body = await request.json();

    const nome = (body?.nome ?? "").trim();
    const codigo = (body?.codigo ?? null) as string | null;
    const ativo = body?.ativo ?? true;
    const parent_id = body?.parent_id ?? null;

    const centro_custo_id =
      body?.centro_custo_id === null || body?.centro_custo_id === ""
        ? null
        : Number(body.centro_custo_id);

    const receita_categoria_id =
      body?.receita_categoria_id === null || body?.receita_categoria_id === ""
        ? null
        : Number(body.receita_categoria_id);

    const despesa_categoria_id =
      body?.despesa_categoria_id === null || body?.despesa_categoria_id === ""
        ? null
        : Number(body.despesa_categoria_id);

    if (!nome) {
      return json(400, { ok: false, error: "nome_obrigatorio" });
    }

    // Categoria de topo
    if (parent_id === null) {
      const { data, error } = await supabaseAdmin
        .from("loja_produto_categoria")
        .insert({
          nome,
          codigo: codigo || null,
          ativo: !!ativo,
        })
        .select("*")
        .single();

      if (error) {
        console.error("Erro ao inserir categoria da loja", error);
        return json(500, { ok: false, error: "erro_criar_categoria" });
      }

      const mapped = mapCategoriaRow(data);
      return json(201, { ok: true, data: mapped });
    }

    // Validar categoria pai
    const { data: categoriaPai, error: catPaiError } = await supabaseAdmin
      .from("loja_produto_categoria")
      .select("id")
      .eq("id", parent_id)
      .maybeSingle();

    if (catPaiError) {
      console.error("Erro ao validar categoria pai", catPaiError);
      return json(500, { ok: false, error: "erro_validar_categoria_pai" });
    }

    if (!categoriaPai) {
      return json(400, { ok: false, error: "categoria_pai_nao_encontrada" });
    }

    const { data: sub, error: subError } = await supabaseAdmin
      .from("loja_produto_categoria_subcategoria")
      .insert({
        categoria_id: parent_id,
        nome,
        codigo: codigo || null,
        ativo: !!ativo,
        centro_custo_id,
        receita_categoria_id,
        despesa_categoria_id,
      })
      .select("*")
      .single();

    if (subError) {
      console.error("Erro ao inserir subcategoria da loja", subError);
      return json(500, { ok: false, error: "erro_criar_subcategoria" });
    }

    const mapped = mapSubcategoriaRow(sub);
    return json(201, { ok: true, data: mapped });
  } catch (e: any) {
    console.error("Erro inesperado em POST /api/loja/categorias", e);
    return json(500, { ok: false, error: "erro_interno_criar_categoria" });
  }
}
