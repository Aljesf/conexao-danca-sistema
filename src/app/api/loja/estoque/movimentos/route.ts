import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

export async function GET(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { ok: false, error: "supabase_config_ausente" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);

    const produtoIdStr =
      searchParams.get("produto_id") ??
      searchParams.get("produtoId") ??
      searchParams.get("produto");

    const produtoId = Number(produtoIdStr);

    if (!Number.isFinite(produtoId) || produtoId <= 0) {
      return NextResponse.json(
        { ok: false, error: "produto_id_invalido" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("loja_estoque_movimentos")
      .select(
        "id, produto_id, tipo, origem, referencia_id, quantidade, saldo_antes, saldo_depois, custo_unitario_centavos, observacao, created_at, created_by"
      )
      .eq("produto_id", produtoId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      const msg = String((error as any)?.message ?? "");
      console.error("[GET /api/loja/estoque/movimentos] erro:", error);

      if (msg.toLowerCase().includes("does not exist") || msg.toLowerCase().includes("relation")) {
        return NextResponse.json({
          ok: true,
          movimentos: [],
          warning: "tabela_loja_estoque_movimentos_inexistente",
        });
      }

      return NextResponse.json(
        { ok: false, error: "erro_listar_movimentos" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, movimentos: data ?? [] });
  } catch (err) {
    console.error("[GET /api/loja/estoque/movimentos] exception:", err);
    return NextResponse.json(
      { ok: false, error: "erro_listar_movimentos" },
      { status: 500 }
    );
  }
}
