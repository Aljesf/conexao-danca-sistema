import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import { upsertNeofinBilling } from "@/lib/neofinClient";
import type { ICobrancaProvider, CriarCobrancaInput, CriarCobrancaOutput } from "./types";

type PessoaNeofin = {
  id: number;
  nome: string;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
};

function sanitizeCpf(rawCpf?: string | null): string | null {
  if (!rawCpf) return null;
  const digits = rawCpf.replace(/\D/g, "");
  return digits.length === 11 ? digits : null;
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

function extractBillingInfo(body: unknown, fallbackId?: string) {
  const maybeObj = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  const candidates: Array<Record<string, unknown>> = [];

  if (Array.isArray(body)) {
    for (const item of body) {
      if (item && typeof item === "object") candidates.push(item as Record<string, unknown>);
    }
  }

  const billings = maybeObj?.billings;
  if (Array.isArray(billings)) {
    for (const item of billings) {
      if (item && typeof item === "object") candidates.push(item as Record<string, unknown>);
    }
  }

  const data = maybeObj?.data;
  if (Array.isArray(data)) {
    for (const item of data) {
      if (item && typeof item === "object") candidates.push(item as Record<string, unknown>);
    }
  }

  const billing = candidates[0] ?? maybeObj ?? null;

  const chargeId =
    firstNonEmptyString(
      billing?.id,
      billing?.billing_id,
      billing?.charge_id,
      billing?.integration_identifier,
      billing?.integrationIdentifier,
      maybeObj?.billing_id,
      maybeObj?.charge_id,
      maybeObj?.integration_identifier,
      fallbackId,
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
      maybeObj?.payment_link,
      maybeObj?.payment_url,
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
      maybeObj?.digitable_line,
      maybeObj?.linha_digitavel,
    ) ?? null;

  return { chargeId, paymentLink, digitableLine };
}

export class NeofinProvider implements ICobrancaProvider {
  public code = "NEOFIN" as const;

  public async criarCobranca(input: CriarCobrancaInput): Promise<CriarCobrancaOutput> {
    const supabase = getSupabaseAdmin();

    const { data: pessoa, error: pessoaErr } = await supabase
      .from("pessoas")
      .select("id,nome,cpf,email,telefone")
      .eq("id", input.pessoaId)
      .maybeSingle<PessoaNeofin>();

    if (pessoaErr || !pessoa) {
      throw new Error("pessoa_nao_encontrada_para_neofin");
    }

    const cpfLimpo = sanitizeCpf(pessoa.cpf);
    if (!cpfLimpo) {
      throw new Error("titular_sem_cpf_valido_para_neofin");
    }

    const integrationIdentifier = `fatura-credito-conexao-${input.referenciaInterna.id}`;
    const neofinResult = await upsertNeofinBilling({
      integrationIdentifier,
      amountCentavos: input.valorCentavos,
      dueDate: input.vencimentoISO,
      description: input.descricao,
      customer: {
        nome: pessoa.nome,
        cpf: cpfLimpo,
        email: pessoa.email,
        telefone: pessoa.telefone,
      },
    });

    if (!neofinResult.ok) {
      throw new Error(neofinResult.message ?? "erro_neofin_criar_cobranca");
    }

    const info = extractBillingInfo(neofinResult.body, integrationIdentifier);
    const providerCobrancaId = info.chargeId ?? integrationIdentifier;

    return {
      provider: this.code,
      providerCobrancaId,
      status: "EMITIDA",
      linkPagamento: info.paymentLink ?? null,
      linhaDigitavel: info.digitableLine ?? null,
      payload:
        neofinResult.body && typeof neofinResult.body === "object"
          ? (neofinResult.body as Record<string, unknown>)
          : null,
    };
  }
}
