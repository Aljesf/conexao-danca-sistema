import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/supabase/api-auth";
import { getNeofinBilling, upsertNeofinBilling } from "@/lib/neofinClient";
import { extractNeofinBillingDetails } from "@/lib/neofinBilling";
import type { Database, TablesUpdate } from "@/types/supabase.generated";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RequestPayload = {
  cobranca_id?: number;
};

type Pessoa = {
  id: number;
  nome: string;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
};

type Cobranca = {
  id: number;
  pessoa_id: number;
  descricao: string;
  valor_centavos: number;
  moeda: string;
  vencimento: string;
  data_pagamento: string | null;
  status: string;
  metodo_pagamento: string | null;
  neofin_charge_id: string | null;
  link_pagamento: string | null;
  linha_digitavel: string | null;
  neofin_payload?: any;
  created_at: string;
  updated_at: string;
  pessoa?: Pessoa | null;
};

function resolveLookupIdentifier(cobranca: Cobranca): string | null {
  const extracted = extractNeofinBillingDetails(cobranca.neofin_payload, {
    identifier: cobranca.neofin_charge_id ?? undefined,
    integrationIdentifier: cobranca.neofin_charge_id ?? undefined,
  });
  return extracted.billingId ?? cobranca.neofin_charge_id ?? null;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = auth.supabase as unknown as SupabaseClient<Database>;

    const body = (await request.json().catch(() => null)) as RequestPayload | null;
    const cobrancaId = body?.cobranca_id ? Number(body.cobranca_id) : NaN;

    if (!cobrancaId || Number.isNaN(cobrancaId)) {
      return NextResponse.json(
        { ok: false, error: "cobranca_id eh obrigatorio e deve ser numerico." },
        { status: 400 }
      );
    }

    const { data: cobranca, error: cobrancaError } = await supabase
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
        linha_digitavel,
        neofin_payload,
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
      .eq("id", cobrancaId)
      .single<Cobranca>();

    if (cobrancaError || !cobranca) {
      console.error("[Neofin sync boleto] cobranca_nao_encontrada:", cobrancaError);
      return NextResponse.json({ ok: false, error: "Cobranca nao encontrada." }, { status: 404 });
    }

    if (cobranca.status === "CANCELADA") {
      return NextResponse.json(
        { ok: false, error: "Cobranca cancelada nao permite sync de boleto." },
        { status: 400 }
      );
    }

    let identifier = resolveLookupIdentifier(cobranca);
    if (!identifier) {
      const cpf = (cobranca.pessoa?.cpf || "").replace(/\D/g, "");
      if (!cpf) {
        return NextResponse.json(
          { ok: false, error: "cpf_invalido_para_criar_boleto" },
          { status: 400 }
        );
      }

      const integrationIdentifier = `cobranca-${cobranca.id}`;
      const neofinCreate = await upsertNeofinBilling({
        integrationIdentifier,
        amountCentavos: cobranca.valor_centavos,
        dueDate: cobranca.vencimento,
        description: cobranca.descricao,
        billingType: "boleto",
        customer: {
          nome: cobranca.pessoa?.nome ?? `Pessoa #${cobranca.pessoa_id}`,
          cpf,
          email: cobranca.pessoa?.email ?? undefined,
          telefone: cobranca.pessoa?.telefone ?? undefined,
        },
      });

      if (!neofinCreate.ok) {
        console.error("[Neofin sync boleto] falha ao criar charge:", neofinCreate);
        return NextResponse.json(
          { ok: false, error: "erro_criar_neofin_boleto", neofin: neofinCreate },
          { status: 502 }
        );
      }

      const infoCriacao = extractNeofinBillingDetails(neofinCreate.body, {
        identifier: integrationIdentifier,
        integrationIdentifier,
      });
      identifier = infoCriacao.billingId ?? integrationIdentifier;

      const cobrancaCriadaUpdate: TablesUpdate<"cobrancas"> = {
        neofin_charge_id: identifier,
        link_pagamento: infoCriacao.paymentLink ?? cobranca.link_pagamento ?? null,
        linha_digitavel:
          infoCriacao.digitableLine ?? infoCriacao.barcode ?? cobranca.linha_digitavel ?? null,
        neofin_payload: neofinCreate.body ?? cobranca.neofin_payload ?? null,
      };

      await supabase
        .from("cobrancas")
        .update(cobrancaCriadaUpdate)
        .eq("id", cobranca.id);
    }

    if (!identifier) {
      return NextResponse.json(
        { ok: false, error: "identificador_neofin_ausente" },
        { status: 400 }
      );
    }

    const neofinResult = await getNeofinBilling({ identifier });

    if (!neofinResult.ok) {
      console.error("[Neofin sync boleto] erro ao consultar cobranca:", neofinResult);
      return NextResponse.json(
        { ok: false, error: "erro_consultar_neofin", neofin: neofinResult },
        { status: neofinResult.status === 404 ? 404 : 502 }
      );
    }

    const billingInfo = extractNeofinBillingDetails(neofinResult.body, {
      identifier,
      integrationIdentifier: cobranca.neofin_charge_id ?? identifier,
    });

    const cobrancaSyncUpdate: TablesUpdate<"cobrancas"> = {
      neofin_charge_id: billingInfo.billingId ?? cobranca.neofin_charge_id ?? identifier,
      link_pagamento: billingInfo.paymentLink ?? cobranca.link_pagamento ?? null,
      linha_digitavel:
        billingInfo.digitableLine ?? billingInfo.barcode ?? cobranca.linha_digitavel ?? null,
      neofin_payload: neofinResult.body ?? cobranca.neofin_payload ?? null,
    };

    const { data: cobrancaAtualizada, error: updateError } = await supabase
      .from("cobrancas")
      .update(cobrancaSyncUpdate)
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
        linha_digitavel,
        neofin_payload,
        created_at,
        updated_at
      `
      )
      .single<Cobranca>();

    if (updateError || !cobrancaAtualizada) {
      console.error("[Neofin sync boleto] erro ao atualizar cobranca:", updateError);
      return NextResponse.json(
        {
          ok: false,
          error: "Sync bem-sucedido na Neofin, mas falhou ao atualizar cobranca local.",
          neofin: neofinResult,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        cobranca_id: cobrancaAtualizada.id,
        neofin_charge_id: cobrancaAtualizada.neofin_charge_id,
        link_pagamento: cobrancaAtualizada.link_pagamento,
        linha_digitavel: cobrancaAtualizada.linha_digitavel,
        data: cobrancaAtualizada,
        neofin: neofinResult,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[Neofin sync boleto] erro inesperado:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Erro inesperado ao sincronizar boleto na Neofin.",
        details: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}


