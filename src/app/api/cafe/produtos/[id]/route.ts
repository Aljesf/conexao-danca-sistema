import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

type ProdutoUpdate = {
  nome?: string;
  categoria?: string;
  categoria_id?: number | null;
  subcategoria_id?: number | null;
  unidade_venda?: string;
  preco_venda_centavos?: number;
  preparado?: boolean;
  insumo_direto_id?: number | null;
  ativo?: boolean;
};

function asIntOrNull(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const n = Math.trunc(value);
  return n > 0 ? n : null;
}

function isMissingCafeCategoriaColumnError(message: string | null | undefined): boolean {
  const msg = (message ?? "").toLowerCase();
  return (msg.includes("categoria_id") || msg.includes("subcategoria_id")) && msg.includes("column");
}

export async function GET(req: Request, ctx: { params: { id: string } }) {
  const denied = await guardApiByRole(req);
  if (denied) return denied as unknown as NextResponse;

  const produtoId = Number(ctx.params.id);
  if (!Number.isFinite(produtoId)) {
    return NextResponse.json({ error: "produto_id_invalido" }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.from("cafe_produtos").select("*").eq("id", produtoId).maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "produto_nao_encontrado" }, { status: 404 });
  return NextResponse.json({ data }, { status: 200 });
}

export async function PUT(req: Request, ctx: { params: { id: string } }) {
  const denied = await guardApiByRole(req);
  if (denied) return denied as unknown as NextResponse;

  const produtoId = Number(ctx.params.id);
  if (!Number.isFinite(produtoId)) {
    return NextResponse.json({ error: "produto_id_invalido" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as ProdutoUpdate | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "payload_invalido" }, { status: 400 });
  }

  if (body.nome !== undefined && !body.nome.trim()) {
    return NextResponse.json({ error: "nome_invalido" }, { status: 400 });
  }
  if (body.preco_venda_centavos !== undefined && !Number.isFinite(body.preco_venda_centavos)) {
    return NextResponse.json({ error: "preco_invalido" }, { status: 400 });
  }

  const payload: Record<string, unknown> = {};

  if (body.nome !== undefined) payload.nome = body.nome.trim();
  if (body.categoria !== undefined) payload.categoria = body.categoria.trim() || "GERAL";
  if (body.unidade_venda !== undefined) payload.unidade_venda = body.unidade_venda.trim() || "un";
  if (body.preco_venda_centavos !== undefined) payload.preco_venda_centavos = body.preco_venda_centavos;
  if (body.preparado !== undefined) payload.preparado = body.preparado;
  if (body.ativo !== undefined) payload.ativo = body.ativo;
  if (body.insumo_direto_id !== undefined) {
    const insumoDiretoId = body.insumo_direto_id === null ? null : Number(body.insumo_direto_id);
    if (insumoDiretoId !== null && !Number.isFinite(insumoDiretoId)) {
      return NextResponse.json({ error: "insumo_direto_invalido" }, { status: 400 });
    }
    payload.insumo_direto_id = insumoDiretoId;
  }

  const supabase = getSupabaseServiceClient();

  const categoriaId = body.categoria_id === null ? null : asIntOrNull(body.categoria_id);
  if (body.categoria_id !== undefined) {
    if (body.categoria_id !== null && !categoriaId) {
      return NextResponse.json({ error: "categoria_id_invalido" }, { status: 400 });
    }
    if (categoriaId) {
      const { data: categoria, error: catErr } = await supabase
        .from("cafe_categorias")
        .select("id,nome")
        .eq("id", categoriaId)
        .maybeSingle();

      if (catErr) {
        return NextResponse.json({ error: "erro_validar_categoria", detail: catErr.message }, { status: 500 });
      }
      if (!categoria) {
        return NextResponse.json({ error: "categoria_id_invalido" }, { status: 400 });
      }

      payload.categoria_id = categoriaId;
      payload.categoria = String((categoria as { nome?: string | null }).nome ?? "GERAL");
    } else {
      payload.categoria_id = null;
    }
  }

  const subcategoriaId = body.subcategoria_id === null ? null : asIntOrNull(body.subcategoria_id);
  if (body.subcategoria_id !== undefined) {
    if (body.subcategoria_id !== null && !subcategoriaId) {
      return NextResponse.json({ error: "subcategoria_id_invalido" }, { status: 400 });
    }

    if (subcategoriaId) {
      const { data: sub, error: subErr } = await supabase
        .from("cafe_subcategorias")
        .select("id,categoria_id")
        .eq("id", subcategoriaId)
        .maybeSingle();

      if (subErr) {
        return NextResponse.json({ error: "erro_validar_subcategoria", detail: subErr.message }, { status: 500 });
      }
      if (!sub) {
        return NextResponse.json({ error: "subcategoria_id_invalido" }, { status: 400 });
      }

      const categoriaIdEfetiva = (payload.categoria_id as number | null | undefined) ?? categoriaId;
      if (
        categoriaIdEfetiva &&
        Number((sub as { categoria_id?: number | null }).categoria_id) !== categoriaIdEfetiva
      ) {
        return NextResponse.json({ error: "subcategoria_nao_pertence_categoria" }, { status: 400 });
      }

      payload.subcategoria_id = subcategoriaId;
    } else {
      payload.subcategoria_id = null;
    }
  }

  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: "nada_para_atualizar" }, { status: 400 });
  }

  let { data, error } = await supabase
    .from("cafe_produtos")
    .update(payload)
    .eq("id", produtoId)
    .select("*")
    .maybeSingle();

  if (error && isMissingCafeCategoriaColumnError(error.message)) {
    delete payload.categoria_id;
    delete payload.subcategoria_id;
    const fallback = await supabase
      .from("cafe_produtos")
      .update(payload)
      .eq("id", produtoId)
      .select("*")
      .maybeSingle();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "produto_nao_encontrado" }, { status: 404 });
  return NextResponse.json({ data }, { status: 200 });
}
