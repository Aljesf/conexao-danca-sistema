import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ApiResponse<T = any> = { ok: boolean; error?: string; data?: T };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { ok: false, error: "Configuração do Supabase ausente." },
      { status: 500 }
    );
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("contas_financeiras")
      .select("id, nome, codigo, tipo, centro_custo_id, ativo")
      .order("nome", { ascending: true });

    if (error) {
      console.error("[financeiro/contas-financeiras] Erro:", error);
      return NextResponse.json(
        { ok: false, error: "Erro ao listar contas financeiras." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data: data ?? [] });
  } catch (err) {
    console.error("[financeiro/contas-financeiras] Erro inesperado:", err);
    return NextResponse.json(
      { ok: false, error: "Erro inesperado ao listar contas financeiras." },
      { status: 500 }
    );
  }
}
