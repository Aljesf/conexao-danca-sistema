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
    const titularPessoaIdParam = searchParams.get("titular_pessoa_id");
    const statusParam = searchParams.get("status"); // ABERTA, FECHADA, PAGA, EM_ATRASO, CANCELADA ou null
    const periodoParam = searchParams.get("periodo_referencia"); // YYYY-MM
    const contaId = contaIdParam ? Number(contaIdParam) : null;
    const titularPessoaId = titularPessoaIdParam ? Number(titularPessoaIdParam) : null;

    if (contaIdParam && (!Number.isInteger(contaId) || Number(contaId) <= 0)) {
      return NextResponse.json(
        { ok: false, error: "conta_conexao_id_invalido" },
        { status: 400 },
      );
    }

    if (
      titularPessoaIdParam &&
      (!Number.isInteger(titularPessoaId) || Number(titularPessoaId) <= 0)
    ) {
      return NextResponse.json(
        { ok: false, error: "titular_pessoa_id_invalido" },
        { status: 400 },
      );
    }

    let contaIdsDoTitular: number[] | null = null;
    if (titularPessoaId) {
      const { data: contas, error: contasError } = await supabase
        .from("credito_conexao_contas")
        .select("id")
        .eq("pessoa_titular_id", titularPessoaId)
        .eq("ativo", true);

      if (contasError) {
        console.error("Erro ao listar contas por titular em Crédito Conexão", contasError);
        return NextResponse.json(
          {
            ok: false,
            error: "erro_listar_contas_titular_credito_conexao",
            details: contasError.message,
          },
          { status: 500 },
        );
      }

      contaIdsDoTitular = (contas ?? [])
        .map((row) => Number((row as { id?: number }).id))
        .filter((id) => Number.isInteger(id) && id > 0);

      if (contaIdsDoTitular.length === 0) {
        return NextResponse.json({ ok: true, faturas: [] });
      }
    }

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

    if (contaId) {
      if (contaIdsDoTitular && !contaIdsDoTitular.includes(contaId)) {
        return NextResponse.json({ ok: true, faturas: [] });
      }
      query = query.eq("conta_conexao_id", contaId);
    } else if (contaIdsDoTitular) {
      query = query.in("conta_conexao_id", contaIdsDoTitular);
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

