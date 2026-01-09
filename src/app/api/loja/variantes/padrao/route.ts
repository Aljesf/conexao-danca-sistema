import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { guardApiByRole } from "@/lib/auth/roleGuard";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
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

    const { data: existente, error: findErr } = await supabase
      .from("loja_produto_variantes")
      .select("*")
      .eq("produto_id", produto_id)
      .is("cor_id", null)
      .is("numeracao_id", null)
      .is("tamanho_id", null)
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (findErr) return NextResponse.json({ ok: false, error: findErr.message }, { status: 500 });
    if (existente) return NextResponse.json({ ok: true, variante: existente });

    const sku = `PADRAO-${produto_id}`;
    const payload = {
      produto_id,
      sku,
      cor_id: null,
      numeracao_id: null,
      tamanho_id: null,
      estoque_atual: 0,
      preco_venda_centavos: null,
      ativo: true,
      observacoes: "Variante padrao criada automaticamente (Admin).",
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from("loja_produto_variantes").insert(payload).select("*").single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, variante: data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "erro_interno" }, { status: 500 });
  }
}
