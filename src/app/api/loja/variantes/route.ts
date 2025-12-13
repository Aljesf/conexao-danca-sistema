import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getAdminClient();
    const { searchParams } = new URL(req.url);
    const produtoIdParam = searchParams.get("produto_id");

    let query = supabase.from("loja_produto_variantes").select("*");

    if (produtoIdParam) {
      const produto_id = Number(produtoIdParam);
      if (!Number.isFinite(produto_id) || produto_id <= 0) {
        return NextResponse.json({ ok: false, error: "produto_id_invalido" }, { status: 400 });
      }
      query = query.eq("produto_id", produto_id);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, variantes: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "erro_interno" }, { status: 500 });
  }
}
