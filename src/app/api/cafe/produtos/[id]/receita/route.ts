import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

type ReceitaItem = {
  insumo_id: number;
  quantidade: number;
  unidade: string;
  ordem?: number;
  ativo?: boolean;
};

async function ensureProdutoExiste(supabase: ReturnType<typeof getSupabaseServiceClient>, produtoId: number) {
  const { data, error } = await supabase.from("cafe_produtos").select("id").eq("id", produtoId).maybeSingle();
  if (error) return { ok: false as const, error };
  if (!data) return { ok: false as const, notFound: true as const };
  return { ok: true as const };
}

export async function GET(req: Request, ctx: { params: { id: string } }) {
  const denied = await guardApiByRole(req);
  if (denied) return denied as unknown as NextResponse;

  const produtoId = Number(ctx.params.id);
  if (!Number.isFinite(produtoId)) {
    return NextResponse.json({ error: "produto_id_invalido" }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  const produtoCheck = await ensureProdutoExiste(supabase, produtoId);
  if (!produtoCheck.ok) {
    if ("notFound" in produtoCheck) {
      return NextResponse.json({ error: "produto_nao_encontrado" }, { status: 404 });
    }
    return NextResponse.json({ error: produtoCheck.error.message }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("cafe_produto_receitas")
    .select("*")
    .eq("produto_id", produtoId)
    .order("ordem", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 200 });
}

export async function PUT(req: Request, ctx: { params: { id: string } }) {
  const denied = await guardApiByRole(req);
  if (denied) return denied as unknown as NextResponse;

  const produtoId = Number(ctx.params.id);
  if (!Number.isFinite(produtoId)) {
    return NextResponse.json({ error: "produto_id_invalido" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as { itens?: ReceitaItem[] } | null;
  if (!Array.isArray(body?.itens)) {
    return NextResponse.json({ error: "itens_obrigatorio" }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  const produtoCheck = await ensureProdutoExiste(supabase, produtoId);
  if (!produtoCheck.ok) {
    if ("notFound" in produtoCheck) {
      return NextResponse.json({ error: "produto_nao_encontrado" }, { status: 404 });
    }
    return NextResponse.json({ error: produtoCheck.error.message }, { status: 500 });
  }

  for (const item of body.itens) {
    const insumoId = Number(item?.insumo_id);
    const qtd = Number(item?.quantidade);
    const unidade = String(item?.unidade ?? "").trim();
    if (!Number.isFinite(insumoId) || insumoId <= 0) {
      return NextResponse.json({ error: "insumo_id_invalido" }, { status: 400 });
    }
    if (!Number.isFinite(qtd) || qtd <= 0) {
      return NextResponse.json({ error: "quantidade_invalida" }, { status: 400 });
    }
    if (!unidade) {
      return NextResponse.json({ error: "unidade_obrigatoria" }, { status: 400 });
    }
  }

  const { error: delErr } = await supabase.from("cafe_produto_receitas").delete().eq("produto_id", produtoId);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  const payload = body.itens.map((i, idx) => ({
    produto_id: produtoId,
    insumo_id: i.insumo_id,
    quantidade: i.quantidade,
    unidade: i.unidade.trim(),
    ordem: i.ordem ?? idx,
    ativo: i.ativo ?? true,
  }));

  if (payload.length === 0) return NextResponse.json({ data: [] }, { status: 200 });

  const { data, error } = await supabase.from("cafe_produto_receitas").insert(payload).select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data }, { status: 200 });
}
