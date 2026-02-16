import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";
import { guardApiByRole } from "@/lib/auth/roleGuard";

// GET /api/financeiro/credito-conexao/faturas
// Lista faturas de Crédito Conexão (sem join complexo por enquanto).
export async function GET(req: NextRequest) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  try {
    const auth = await requireUser(req);
    if (auth instanceof NextResponse) return auth;

    const { supabase } = auth;
    const { searchParams } = new URL(req.url);

    const contaIdParam = searchParams.get("conta_conexao_id");
    const statusParam = searchParams.get("status"); // ABERTA, FECHADA, PAGA, EM_ATRASO, CANCELADA ou null
    const periodoParam = searchParams.get("periodo_referencia"); // YYYY-MM

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
        conta:credito_conexao_contas (
          id,
          descricao_exibicao,
          tipo_conta,
          pessoa_titular_id,
          titular:pessoas (
            id,
            nome,
            cpf
          )
        ),
        created_at,
        updated_at
      `,
      )
      .order("periodo_referencia", { ascending: false })
      .order("id", { ascending: false });

    if (contaIdParam) {
      query = query.eq("conta_conexao_id", Number(contaIdParam));
    }

    if (periodoParam) {
      query = query.eq("periodo_referencia", periodoParam);
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

