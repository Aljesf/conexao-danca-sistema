import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { guardApiByRole } from "@/lib/auth/roleGuard";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[/api/financeiro/contas-financeiras/centros] Variaveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao definidas."
  );
}

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

export async function GET(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Configuracao do Supabase ausente." },
      { status: 500 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("centros_custo")
    .select("id, nome")
    .order("nome", { ascending: true });

  if (error) {
    console.error(
      "[GET /api/financeiro/contas-financeiras/centros] Erro ao listar centros:",
      error
    );
    return NextResponse.json(
      { error: "Erro ao listar centros de custo" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, centros: data ?? [] });
}
