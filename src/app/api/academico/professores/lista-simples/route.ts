import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  const supabase = await getSupabaseServer();
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
