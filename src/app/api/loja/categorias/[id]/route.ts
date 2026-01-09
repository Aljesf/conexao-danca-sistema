import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { guardApiByRole } from "@/lib/auth/roleGuard";

type ApiResponse<T = any> = {
  ok: boolean;
  error?: string;
  data?: T;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[/api/loja/categorias/[id]] Variaveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao definidas."
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

// PUT /api/loja/categorias/[id]
export async function PUT(request: NextRequest, context: { params: { id: string } }) {
  const denied = await guardApiByRole(request as any);
  if (denied) return denied as any;
  if (!supabaseAdmin) {
    return json(500, {
      ok: false,
      error:
        "Configuracao do Supabase ausente. Verifique NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
    });
  }

  try {
    const rawId = Number(context.params.id);
    if (!Number.isFinite(rawId) || rawId <= 0) {
      return json(400, { ok: false, error: "id_invalido" });
    }

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

    const isSubcategoria = rawId >= SUB_OFFSET;
    const dbId = isSubcategoria ? rawId - SUB_OFFSET : rawId;

    if (!isSubcategoria) {
      // categoria de topo
      const { data, error } = await supabaseAdmin
        .from("loja_produto_categoria")
        .update({
          nome,
          codigo: codigo || null,
          ativo: !!ativo,
        })
        .eq("id", dbId)
        .select("*")
        .single();

      if (error) {
        console.error("Erro ao atualizar categoria da loja", error);
        return json(500, { ok: false, error: "erro_atualizar_categoria" });
      }

      const mapped = {
        id: data.id,
        nome: data.nome,
        codigo: data.codigo ?? null,
        descricao: null,
        ativo: data.ativo ?? true,
        ordem: null,
        parent_id: null,
        centro_custo_id: null,
        receita_categoria_id: null,
        despesa_categoria_id: null,
      };

      return json(200, { ok: true, data: mapped });
    }

    // subcategoria
    const newCategoriaId = parent_id ?? null;

    const { data, error } = await supabaseAdmin
      .from("loja_produto_categoria_subcategoria")
      .update({
        categoria_id: newCategoriaId,
        nome,
        codigo: codigo || null,
        ativo: !!ativo,
        centro_custo_id,
        receita_categoria_id,
        despesa_categoria_id,
      })
      .eq("id", dbId)
      .select("*")
      .single();

    if (error) {
      console.error("Erro ao atualizar subcategoria da loja", error);
      return json(500, { ok: false, error: "erro_atualizar_subcategoria" });
    }

    const mapped = {
      id: SUB_OFFSET + data.id,
      nome: data.nome,
      codigo: data.codigo ?? null,
      descricao: null,
      ativo: data.ativo ?? true,
      ordem: null,
      parent_id: data.categoria_id,
      centro_custo_id: data.centro_custo_id ?? null,
      receita_categoria_id: data.receita_categoria_id ?? null,
      despesa_categoria_id: data.despesa_categoria_id ?? null,
    };

    return json(200, { ok: true, data: mapped });
  } catch (e: any) {
    console.error("Erro inesperado em PUT /api/loja/categorias/[id]", e);
    return json(500, { ok: false, error: "erro_interno_atualizar_categoria" });
  }
}
