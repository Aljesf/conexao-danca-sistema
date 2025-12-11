import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

// GET /api/financeiro/credito-conexao/faturas
// Lista faturas de Crédito Conexão (sem join complexo por enquanto).
export async function GET(req: Request) {
  try {
    const supabase = await getSupabaseServer();
    const { searchParams } = new URL(req.url);

    const contaIdParam = searchParams.get("conta_conexao_id");
    const statusParam = searchParams.get("status"); // ABERTA, PAGA, EM_ATRASO, CANCELADA ou null

    let query = supabase
      .from("credito_conexao_faturas")
      .select(
        `
        id,
        conta_conexao_id,
        periodo_referencia,
        data_fechamento,
        data_vencimento,
        valor_total_centavos,
        valor_taxas_centavos,
        status,
        created_at,
        updated_at
      `,
      )
      .order("created_at", { ascending: false });

    if (contaIdParam) {
      query = query.eq("conta_conexao_id", Number(contaIdParam));
    }

    if (statusParam) {
      query = query.eq("status", statusParam);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erro ao listar faturas Crédito Conexão", error);
      return NextResponse.json(
        { ok: false, error: "erro_listar_faturas_credito_conexao", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, faturas: data ?? [] });
  } catch (err: any) {
    console.error("Erro inesperado em GET /credito-conexao/faturas", err);
    return NextResponse.json(
      { ok: false, error: "erro_interno_listar_faturas" },
      { status: 500 },
    );
  }
}
