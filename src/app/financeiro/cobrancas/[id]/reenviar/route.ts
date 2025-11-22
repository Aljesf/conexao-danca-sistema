// src/app/financeiro/cobrancas/[id]/reenviar/route.ts
import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServerSSR";
import { upsertNeofinBilling } from "@/lib/neofinClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: { id: string };
};

export async function POST(_req: Request, context: RouteContext) {
  try {
    const supabase = await getSupabaseServer();
    const id = Number(context.params.id);

    if (!id || Number.isNaN(id)) {
      return NextResponse.json(
        { ok: false, error: "ID da cobrança inválido." },
        { status: 400 }
      );
    }

    // 1) Busca a cobrança com dados da pessoa
    const { data: cobranca, error: eCobranca } = await supabase
      .from("cobrancas")
      .select(
        `
        id,
        pessoa_id,
        descricao,
        valor_centavos,
        moeda,
        vencimento,
        data_pagamento,
        status,
        metodo_pagamento,
        neofin_charge_id,
        link_pagamento,
        created_at,
        updated_at,
        pessoa:pessoas (
          id,
          nome,
          cpf,
          email,
          telefone
        )
      `
      )
      .eq("id", id)
      .single();

    if (eCobranca || !cobranca) {
      return NextResponse.json(
        { ok: false, error: "Cobrança não encontrada." },
        { status: 404 }
      );
    }

    // 2) Regras de negócio básicas
    if (cobranca.status === "PAGA") {
      return NextResponse.json(
        {
          ok: false,
          error: "Cobrança já está marcada como PAGA; não é possível reenviar.",
        },
        { status: 400 }
      );
    }

    if (cobranca.status === "CANCELADA") {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Cobrança CANCELADA não pode ser reenviada. Crie uma nova cobrança.",
        },
        { status: 400 }
      );
    }

    if (!cobranca.pessoa || !cobranca.pessoa.cpf) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "CPF do responsável financeiro não informado. Atualize o cadastro da pessoa antes de reenviar.",
        },
        { status: 400 }
      );
    }

    // 3) Identificador de integração (idempotência)
    const integrationIdentifier =
      cobranca.neofin_charge_id || `cobranca-${cobranca.id}`;

    // 4) Chamada à Neofin
    const neofinResult = await upsertNeofinBilling({
      integrationIdentifier,
      amountCentavos: cobranca.valor_centavos,
      dueDate: cobranca.vencimento,
      description: cobranca.descricao,
      customer: {
        nome: cobranca.pessoa.nome,
        cpf: cobranca.pessoa.cpf,
        email: cobranca.pessoa.email,
        telefone: cobranca.pessoa.telefone,
      },
    });

    // Log no terminal para debug
    console.log("[Reenviar Neofin] resultado:", neofinResult);

    if (!neofinResult.ok) {
      // marca erro de integração localmente
      await supabase
        .from("cobrancas")
        .update({ status: "ERRO_INTEGRACAO" })
        .eq("id", cobranca.id);

      return NextResponse.json(
        {
          ok: false,
          error:
            "Falha ao reenviar cobrança para a Neofin. Status marcado como ERRO_INTEGRACAO.",
          neofin: neofinResult,
        },
        { status: 502 }
      );
    }

    // 5) Atualiza a cobrança com o identificador e status
    const { data: cobrancaAtualizada, error: eUpdate } = await supabase
      .from("cobrancas")
      .update({
        neofin_charge_id: integrationIdentifier,
        status: "PENDENTE",
      })
      .eq("id", cobranca.id)
      .select(
        `
        id,
        pessoa_id,
        descricao,
        valor_centavos,
        moeda,
        vencimento,
        data_pagamento,
        status,
        metodo_pagamento,
        neofin_charge_id,
        link_pagamento,
        created_at,
        updated_at
      `
      )
      .single();

    if (eUpdate || !cobrancaAtualizada) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Cobrança foi reenviada para a Neofin, mas ocorreu um erro ao atualizar os dados locais.",
          neofin: neofinResult,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        data: cobrancaAtualizada,
        neofin: neofinResult,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[Reenviar Neofin] erro inesperado:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Erro inesperado ao reenviar cobrança.",
        details: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}
