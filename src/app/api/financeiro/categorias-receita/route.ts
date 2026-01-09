import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { guardApiByRole } from "@/lib/auth/roleGuard";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

export async function GET(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  if (!supabaseAdmin) {
    return NextResponse.json(
      { ok: false, error: "Configuracao do Supabase ausente." },
      { status: 500 }
    );
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("categorias_financeiras")
      .select("id, nome, codigo")
      .eq("tipo", "RECEITA")
      .order("nome", { ascending: true });

    if (error) {
      console.error("[GET /api/financeiro/categorias-receita] Erro:", error);
      return NextResponse.json(
        { ok: false, error: "Erro ao listar categorias de receita." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, itens: data ?? [] });
  } catch (err) {
    console.error("[GET /api/financeiro/categorias-receita] Erro inesperado:", err);
    return NextResponse.json(
      { ok: false, error: "Erro inesperado ao listar categorias de receita." },
      { status: 500 }
    );
  }
}
