import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

export async function GET(_req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { ok: false, error: "Configuracao do Supabase ausente." },
      { status: 500 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("centros_custo")
    .select("id, nome, codigo")
    .order("nome", { ascending: true });

  if (error) {
    console.error("[GET /api/financeiro/centros-custo] Erro:", error);
    return NextResponse.json(
      { ok: false, error: "Erro ao listar centros de custo." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, data: data ?? [], itens: data ?? [] });
}
