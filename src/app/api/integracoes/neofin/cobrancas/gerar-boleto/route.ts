import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/supabase/api-auth";
import { upsertNeofinBilling } from "@/lib/neofinClient";
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
  neofin_customer_id?: string | null;
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
  origem_tipo: string | null;
  origem_id: number | null;
  created_at: string;
  updated_at: string;
  pessoa?: Pessoa | null;
};

function sanitizeCpf(rawCpf?: string | null): string | null {
  if (!rawCpf) return null;
  const onlyDigits = rawCpf.replace(/\D/g, "");
  return onlyDigits.length === 11 ? onlyDigits : null;
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
        origem_tipo,
        origem_id,
        created_at,
        updated_at,
        pessoa:pessoas (
          id,
          nome,
          cpf,
          email,
          telefone,
          neofin_customer_id
        )
      `
      )
      .eq("id", cobrancaId)
      .single<Cobranca>();

    if (cobrancaError || !cobranca) {
      console.error("[Neofin gerar boleto] cobranca_nao_encontrada:", cobrancaError);
      return NextResponse.json({ ok: false, error: "Cobranca nao encontrada." }, { status: 404 });
    }

    if (cobranca.status === "PAGA") {
      return NextResponse.json(
        { ok: false, error: "Cobranca ja esta paga; nao e possivel gerar boleto." },
        { status: 400 }
      );
    }

    if (cobranca.status === "CANCELADA") {
      return NextResponse.json(
        { ok: false, error: "Cobranca cancelada nao pode gerar boleto." },
        { status: 400 }
      );
    }

    if (cobranca.neofin_charge_id) {
      return NextResponse.json(
        {
          ok: true,
          data: cobranca,
          message: "Cobranca ja possui neofin_charge_id. Fluxo idempotente.",
        },
        { status: 200 }
      );
    }

    const pessoa = cobranca.pessoa;
    const cpfLimpo = sanitizeCpf(pessoa?.cpf);

    if (!pessoa || !cpfLimpo) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Pessoa responsavel sem CPF valido. Atualize o cadastro (CPF com 11 digitos) antes de gerar o boleto.",
        },
        { status: 400 }
      );
    }

    const integrationIdentifier = `cobranca-${cobranca.id}`;

    const neofinResult = await upsertNeofinBilling({
      integrationIdentifier,
      amountCentavos: cobranca.valor_centavos,
      dueDate: cobranca.vencimento,
      description: cobranca.descricao,
      billingType: "boleto",
      customer: {
        nome: pessoa.nome,
        cpf: cpfLimpo,
        email: pessoa.email,
        telefone: pessoa.telefone,
      },
    });

    if (!neofinResult.ok) {
      console.error("[Neofin gerar boleto] falha ao enviar para Neofin:", neofinResult);
      const erroIntegracaoUpdate: TablesUpdate<"cobrancas"> = { status: "ERRO_INTEGRACAO" };
      await supabase.from("cobrancas").update(erroIntegracaoUpdate).eq("id", cobranca.id);

      return NextResponse.json(
        {
          ok: false,
          error: "Falha ao gerar boleto na Neofin.",
          neofin: neofinResult,
        },
        { status: 502 }
      );
    }

    const billingInfo = extractNeofinBillingDetails(neofinResult.body, {
      identifier: integrationIdentifier,
      integrationIdentifier,
    });

    const cobrancaNeofinUpdate: TablesUpdate<"cobrancas"> = {
      neofin_charge_id: billingInfo.billingId ?? integrationIdentifier,
      link_pagamento: billingInfo.paymentLink ?? cobranca.link_pagamento ?? null,
      linha_digitavel: billingInfo.digitableLine ?? billingInfo.barcode ?? cobranca.linha_digitavel ?? null,
      neofin_payload: neofinResult.body ?? cobranca.neofin_payload ?? null,
      status: cobranca.status === "ERRO_INTEGRACAO" ? "PENDENTE" : cobranca.status,
    };

    const { data: cobrancaAtualizada, error: updateError } = await supabase
      .from("cobrancas")
      .update(cobrancaNeofinUpdate)
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
        origem_tipo,
        origem_id,
        created_at,
        updated_at
      `
      )
      .single<Cobranca>();

    if (updateError || !cobrancaAtualizada) {
      console.error("[Neofin gerar boleto] erro ao atualizar cobranca:", updateError);
      return NextResponse.json(
        {
          ok: false,
          error: "Boleto criado na Neofin, mas falhou ao atualizar cobranca local.",
          neofin: neofinResult,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        data: cobrancaAtualizada,
        billing: billingInfo,
        neofin: neofinResult,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[Neofin gerar boleto] erro inesperado:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Erro inesperado ao gerar boleto via Neofin.",
        details: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}


