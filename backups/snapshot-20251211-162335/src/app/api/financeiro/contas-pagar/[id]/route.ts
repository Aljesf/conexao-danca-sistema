import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ApiResponse<T = any> = { ok: boolean; error?: string; data?: T };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

export async function GET(
  _req: NextRequest,
  context: { params: { id: string } }
) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { ok: false, error: "Configuração do Supabase ausente." },
      { status: 500 }
    );
  }

  const id = Number(context.params?.id);
  if (!id || Number.isNaN(id)) {
    return NextResponse.json(
      { ok: false, error: "ID inválido." },
      { status: 400 }
    );
  }

  try {
    const { data: conta, error: errConta } = await supabaseAdmin
      .from("contas_pagar")
      .select(
        `
        id,
        centro_custo_id,
        categoria_id,
        pessoa_id,
        descricao,
        valor_centavos,
        vencimento,
        data_pagamento,
        status,
        metodo_pagamento,
        observacoes
      `
      )
      .eq("id", id)
      .maybeSingle();

    if (errConta || !conta) {
      return NextResponse.json(
        { ok: false, error: "Conta a pagar não encontrada." },
        { status: 404 }
      );
    }

    const { data: pagamentos, error: errPag } = await supabaseAdmin
      .from("contas_pagar_pagamentos")
      .select(
        `
        id,
        valor_principal_centavos,
        juros_centavos,
        desconto_centavos,
        data_pagamento,
        metodo_pagamento,
        observacoes,
        conta_financeira_id
      `
      )
      .eq("conta_pagar_id", id)
      .order("data_pagamento", { ascending: false });

    if (errPag) {
      return NextResponse.json(
        { ok: false, error: "Erro ao buscar pagamentos." },
        { status: 500 }
      );
    }

    const totalPago =
      pagamentos?.reduce((acc: number, p: any) => {
        return (
          acc +
          Number(p.valor_principal_centavos || 0) +
          Number(p.juros_centavos || 0) -
          Number(p.desconto_centavos || 0)
        );
      }, 0) ?? 0;

    return NextResponse.json({
      ok: true,
      data: {
        ...conta,
        total_pago_centavos: totalPago,
        pagamentos: pagamentos ?? [],
      },
    });
  } catch (err) {
    console.error("[/api/financeiro/contas-pagar/[id]] Erro:", err);
    return NextResponse.json(
      { ok: false, error: "Erro inesperado ao buscar conta." },
      { status: 500 }
    );
  }
}
