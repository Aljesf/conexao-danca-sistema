import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { upsertNeofinBilling, type NeofinResult } from "@/lib/neofinClient";

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

type NeofinBillingInfo = {
  chargeId: string | null;
  paymentLink: string | null;
  digitableLine: string | null;
};

function sanitizeCpf(rawCpf?: string | null): string | null {
  if (!rawCpf) return null;
  const onlyDigits = rawCpf.replace(/\D/g, "");
  return onlyDigits.length === 11 ? onlyDigits : null;
}

function firstNonEmptyString(...values: Array<unknown>): string | null {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return null;
}

function extractBillingInfo(body: NeofinResult["body"], fallbackId?: string): NeofinBillingInfo {
  const candidates: any[] = [];

  if (Array.isArray(body)) {
    candidates.push(...body);
  }

  if (body && typeof body === "object") {
    if (Array.isArray((body as any).billings)) {
      candidates.push(...(body as any).billings);
    }
    if (Array.isArray((body as any).data)) {
      candidates.push(...(body as any).data);
    }
    if (Array.isArray((body as any).data?.billings)) {
      candidates.push(...(body as any).data.billings);
    }
  }

  const billing = candidates.find((b) => b && typeof b === "object") ?? (body && typeof body === "object" ? body : null);

  const chargeId =
    firstNonEmptyString(
      billing?.id,
      billing?.billing_id,
      billing?.charge_id,
      billing?.integration_identifier,
      billing?.integrationIdentifier,
      (body as any)?.billing_id,
      (body as any)?.charge_id,
      (body as any)?.integration_identifier,
      fallbackId
    ) ?? null;

  const paymentLink =
    firstNonEmptyString(
      billing?.payment_link,
      billing?.payment_url,
      billing?.link_pagamento,
      billing?.url,
      billing?.link,
      billing?.billet_url,
      billing?.boleto_url,
      (body as any)?.payment_link,
      (body as any)?.payment_url
    ) ?? null;

  const digitableLine =
    firstNonEmptyString(
      billing?.digitable_line,
      billing?.linha_digitavel,
      billing?.digitableLine,
      billing?.boleto_linha_digitavel,
      billing?.boleto_digitable_line,
      billing?.barcode,
      billing?.bar_code,
      (body as any)?.digitable_line,
      (body as any)?.linha_digitavel
    ) ?? null;

  return { chargeId, paymentLink, digitableLine };
}

export async function POST(req: Request) {
  try {
    const supabase = await getSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Usuario nao autenticado." }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as RequestPayload | null;
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
      customer: {
        nome: pessoa.nome,
        cpf: cpfLimpo,
        email: pessoa.email,
        telefone: pessoa.telefone,
      },
    });

    if (!neofinResult.ok) {
      console.error("[Neofin gerar boleto] falha ao enviar para Neofin:", neofinResult);
      await supabase.from("cobrancas").update({ status: "ERRO_INTEGRACAO" }).eq("id", cobranca.id);

      return NextResponse.json(
        {
          ok: false,
          error: "Falha ao gerar boleto na Neofin.",
          neofin: neofinResult,
        },
        { status: 502 }
      );
    }

    const billingInfo = extractBillingInfo(neofinResult.body, integrationIdentifier);

    const { data: cobrancaAtualizada, error: updateError } = await supabase
      .from("cobrancas")
      .update({
        neofin_charge_id: billingInfo.chargeId ?? integrationIdentifier,
        link_pagamento: billingInfo.paymentLink ?? cobranca.link_pagamento ?? null,
        linha_digitavel: billingInfo.digitableLine ?? cobranca.linha_digitavel ?? null,
        neofin_payload: neofinResult.body ?? cobranca.neofin_payload ?? null,
        status: cobranca.status === "ERRO_INTEGRACAO" ? "PENDENTE" : cobranca.status,
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
