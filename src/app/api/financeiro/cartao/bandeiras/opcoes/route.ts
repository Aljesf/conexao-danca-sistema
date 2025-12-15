import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Variaveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao definidas." },
      { status: 500 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("cartao_bandeiras")
    .select("id, nome, codigo")
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (error) {
    console.error("[GET /api/financeiro/cartao/bandeiras/opcoes] Erro ao listar bandeiras:", error);
    return NextResponse.json({ ok: false, error: "Erro ao listar bandeiras" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, bandeiras: data ?? [] });
}
