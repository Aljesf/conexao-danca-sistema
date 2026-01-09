import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { guardApiByRole } from "@/lib/auth/roleGuard";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(req: NextRequest) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  try {
    const supabase = getAdminClient();
    const { searchParams } = new URL(req.url);
    const produtoId = searchParams.get("produto_id");

    if (!produtoId) {
      return NextResponse.json({ ok: false, error: "produto_id_obrigatorio" }, { status: 400 });
    }

    const produto_id = Number(produtoId);
    if (!Number.isFinite(produto_id) || produto_id <= 0) {
      return NextResponse.json({ ok: false, error: "produto_id_invalido" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("loja_produto_variantes")
      .select("*")
      .eq("produto_id", produto_id)
      .order("id", { ascending: true });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, variantes: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "erro_interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  try {
    const supabase = getAdminClient();
    const body = await req.json().catch(() => ({}));

    const produto_id = Number(body?.produto_id);
    if (!Number.isFinite(produto_id) || produto_id <= 0) {
      return NextResponse.json({ ok: false, error: "produto_id_invalido" }, { status: 400 });
    }

    const cor_id = body?.cor_id === null || body?.cor_id === undefined ? null : Number(body.cor_id);
    const numeracao_id = body?.numeracao_id === null || body?.numeracao_id === undefined ? null : Number(body.numeracao_id);
    const tamanho_id = body?.tamanho_id === null || body?.tamanho_id === undefined ? null : Number(body.tamanho_id);

    const preco_raw = body?.preco_venda_centavos;
    const preco_venda_centavos =
      preco_raw === null || preco_raw === undefined
        ? null
        : Number.isFinite(Number(preco_raw))
        ? Number(preco_raw)
        : null;

    const sku = `VAR-${produto_id}-${Date.now()}`;

    const payload = {
      produto_id,
      sku,
      cor_id,
      numeracao_id,
      tamanho_id,
      estoque_atual: 0, // variante nasce com estoque zero; movimentos ajustam o saldo
      preco_venda_centavos,
      ativo: body?.ativo === undefined ? true : !!body.ativo,
      observacoes: body?.observacoes ? String(body.observacoes) : null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from("loja_produto_variantes").insert(payload).select("*").single();
    if (error) {
      const msg = error.message || "Erro ao criar variante.";
      return NextResponse.json({ ok: false, error: msg }, { status: 400 });
    }

    return NextResponse.json({ ok: true, variante: data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "erro_interno" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  try {
    const supabase = getAdminClient();
    const body = await req.json().catch(() => ({}));

    const id = Number(body?.id);
    const produto_id = Number(body?.produto_id);
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ ok: false, error: "id_invalido" }, { status: 400 });
    }
    if (!Number.isFinite(produto_id) || produto_id <= 0) {
      return NextResponse.json({ ok: false, error: "produto_id_invalido" }, { status: 400 });
    }

    const cor_id = body?.cor_id === null || body?.cor_id === undefined ? null : Number(body.cor_id);
    const numeracao_id = body?.numeracao_id === null || body?.numeracao_id === undefined ? null : Number(body.numeracao_id);
    const tamanho_id = body?.tamanho_id === null || body?.tamanho_id === undefined ? null : Number(body.tamanho_id);

    const estoque_raw = body?.estoque_atual;
    const estoque_atual =
      estoque_raw === undefined ? undefined : Number.isFinite(Number(estoque_raw)) ? Number(estoque_raw) : 0;

    const preco_raw = body?.preco_venda_centavos;
    const preco_venda_centavos =
      preco_raw === null || preco_raw === undefined
        ? null
        : Number.isFinite(Number(preco_raw))
        ? Number(preco_raw)
        : null;

    const payload: Record<string, any> = {
      produto_id,
      cor_id,
      numeracao_id,
      tamanho_id,
      preco_venda_centavos,
      ativo: body?.ativo === undefined ? true : !!body.ativo,
      observacoes: body?.observacoes ? String(body.observacoes) : null,
      updated_at: new Date().toISOString(),
    };

    if (estoque_atual !== undefined) payload.estoque_atual = estoque_atual;

    const { data, error } = await supabase
      .from("loja_produto_variantes")
      .update(payload)
      .eq("id", id)
      .eq("produto_id", produto_id)
      .select("*")
      .single();

    if (error) {
      const isUnique = (error as any)?.code === "23505";
      const msg = isUnique
        ? "Já existe uma variante com essa combinação (cor/numeração/tamanho) para este produto."
        : error.message || "Erro ao atualizar variante.";
      return NextResponse.json({ ok: false, error: msg }, { status: isUnique ? 409 : 400 });
    }

    return NextResponse.json({ ok: true, variante: data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "erro_interno" }, { status: 500 });
  }
}
