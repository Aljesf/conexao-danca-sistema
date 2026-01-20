import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

type ProdutoUpdate = {
  nome?: string;
  categoria?: string;
  unidade_venda?: string;
  preco_venda_centavos?: number;
  preparado?: boolean;
  insumo_direto_id?: number | null;
  ativo?: boolean;
};

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

  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: "nada_para_atualizar" }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("cafe_produtos")
    .update(payload)
    .eq("id", produtoId)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "produto_nao_encontrado" }, { status: 404 });
  return NextResponse.json({ data }, { status: 200 });
}
