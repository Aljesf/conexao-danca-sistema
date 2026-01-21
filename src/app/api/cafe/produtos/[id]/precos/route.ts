import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

type PrecoIn = { tabela_preco_id: number; preco_centavos: number; ativo?: boolean };

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
    return NextResponse.json({ ok: false, error: "produto_id_invalido" }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  const produtoCheck = await ensureProdutoExiste(supabase, produtoId);
  if (!produtoCheck.ok) {
    if ("notFound" in produtoCheck) {
      return NextResponse.json({ ok: false, error: "produto_nao_encontrado" }, { status: 404 });
    }
    return NextResponse.json({ ok: false, error: produtoCheck.error.message }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("cafe_produto_precos")
    .select("*")
    .eq("produto_id", produtoId);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

export async function PUT(req: Request, ctx: { params: { id: string } }) {
  const denied = await guardApiByRole(req);
  if (denied) return denied as unknown as NextResponse;

  const produtoId = Number(ctx.params.id);
  if (!Number.isFinite(produtoId)) {
    return NextResponse.json({ ok: false, error: "produto_id_invalido" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as { precos?: PrecoIn[] } | null;
  if (!Array.isArray(body?.precos)) {
    return NextResponse.json({ ok: false, error: "precos_obrigatorio" }, { status: 400 });
  }

  const payload = body.precos.map((p) => ({
    produto_id: produtoId,
    tabela_preco_id: Number(p.tabela_preco_id),
    preco_centavos: Number(p.preco_centavos),
    ativo: p.ativo ?? true,
  }));

  if (payload.some((p) => !Number.isFinite(p.tabela_preco_id) || !Number.isFinite(p.preco_centavos))) {
    return NextResponse.json({ ok: false, error: "preco_invalido" }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  const produtoCheck = await ensureProdutoExiste(supabase, produtoId);
  if (!produtoCheck.ok) {
    if ("notFound" in produtoCheck) {
      return NextResponse.json({ ok: false, error: "produto_nao_encontrado" }, { status: 404 });
    }
    return NextResponse.json({ ok: false, error: produtoCheck.error.message }, { status: 500 });
  }

  const { error: delErr } = await supabase.from("cafe_produto_precos").delete().eq("produto_id", produtoId);
  if (delErr) return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 });

  if (payload.length === 0) return NextResponse.json({ ok: true, data: [] });

  const { data, error } = await supabase.from("cafe_produto_precos").insert(payload).select("*");
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, data });
}
