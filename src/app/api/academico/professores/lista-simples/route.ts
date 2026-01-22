import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";

export async function GET() {
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;
  const { data, error } = await supabase
    .from("vw_professores")
    .select("id, nome")
    .eq("ativo", true)
    .order("nome");

  if (error) {
    console.error("[professores/lista-simples] erro ao buscar", error);
    return NextResponse.json(
      { error: "Erro ao listar professores", details: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ professores: data ?? [] });
}

