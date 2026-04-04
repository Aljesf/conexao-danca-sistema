import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import { getNeofinBilling, upsertNeofinBilling } from "@/lib/neofinClient";
import type { ICobrancaProvider, CriarCobrancaInput, CriarCobrancaOutput } from "./types";
import { extractNeofinBillingDetails, firstNonEmptyString } from "@/lib/neofinBilling";

type PessoaNeofin = {
  id: number;
  nome: string;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
  endereco_id: number | null;
};

type EnderecoNeofin = {
  id: number;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
};

const CANCELLED_STATUSES = new Set([
  "CANCELED", "CANCELLED", "CANCELADO", "CANCELADA", "VOID", "EXPIRED",
]);
const FALLBACK_ADDRESS = {
  city: "Salinópolis",
  street: "Nao informado",
  number: "S/N",
  complement: "",
  neighborhood: "Centro",
  state: "PA",
  zipCode: "68721000",
} as const;

function sanitizeCpf(rawCpf?: string | null): string | null {
  if (!rawCpf) return null;
  const digits = rawCpf.replace(/\D/g, "");
  return digits.length === 11 ? digits : null;
}

function sanitizeText(value?: string | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function sanitizeZipCode(value?: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits || null;
}

function formatPhoneWithCountryCode(rawPhone?: string | null): string {
  const digits = typeof rawPhone === "string" ? rawPhone.replace(/\D/g, "") : "";
  if (!digits) return "";
  if (digits.startsWith("55") && digits.length >= 12) return `+${digits}`;
  return `+55${digits}`;
}

function isBillingCancelled(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const status = String((body as Record<string, unknown>).status ?? "").toUpperCase();
  return CANCELLED_STATUSES.has(status);
}

export class NeofinProvider implements ICobrancaProvider {
  public code = "NEOFIN" as const;

  public async criarCobranca(input: CriarCobrancaInput): Promise<CriarCobrancaOutput> {
    const supabase = getSupabaseAdmin();

    const { data: pessoa, error: pessoaErr } = await supabase
      .from("pessoas")
      .select("id,nome,cpf,email,telefone,endereco_id")
      .eq("id", input.pessoaId)
      .maybeSingle<PessoaNeofin>();

    if (pessoaErr || !pessoa) {
      throw new Error("pessoa_nao_encontrada_para_neofin");
    }

    const cpfLimpo = sanitizeCpf(pessoa.cpf);
    if (!cpfLimpo) {
      throw new Error("titular_sem_cpf_valido_para_neofin");
    }

    let endereco: EnderecoNeofin | null = null;
    if (pessoa.endereco_id) {
      const { data: enderecoRow, error: enderecoErr } = await supabase
        .from("enderecos")
        .select("id,logradouro,numero,complemento,bairro,cidade,uf,cep")
        .eq("id", pessoa.endereco_id)
        .maybeSingle<EnderecoNeofin>();

      if (enderecoErr) {
        throw new Error(`endereco_nao_encontrado_para_neofin:${enderecoErr.message}`);
      }

      endereco = enderecoRow ?? null;
    }

    // Identifier base e detecção de billing cancelled
    let integrationIdentifier = `fatura-credito-conexao-${input.referenciaInterna.id}`;

    // Verificar se billing existente está cancelled na Neofim
    const existingLookup = await getNeofinBilling({ identifier: integrationIdentifier });
    if (existingLookup.ok && isBillingCancelled(existingLookup.body)) {
      // Billing cancelled — usar sufixo com timestamp para criar novo
      const suffix = Math.floor(Date.now() / 1000);
      integrationIdentifier = `fatura-credito-conexao-${input.referenciaInterna.id}-r${suffix}`;
      console.info(
        `[NeofinProvider] Billing anterior cancelled para fatura ${input.referenciaInterna.id}. Novo identifier: ${integrationIdentifier}`,
      );
    }

    // Log detalhado do payload antes do envio
    const customerPayload = {
      nome: pessoa.nome,
      cpf: cpfLimpo,
      email: pessoa.email,
      telefone: formatPhoneWithCountryCode(pessoa.telefone),
    };
    const addressPayload = {
      city: sanitizeText(endereco?.cidade) ?? FALLBACK_ADDRESS.city,
      street: sanitizeText(endereco?.logradouro) ?? FALLBACK_ADDRESS.street,
      number: sanitizeText(endereco?.numero) ?? FALLBACK_ADDRESS.number,
      complement: sanitizeText(endereco?.complemento) ?? FALLBACK_ADDRESS.complement,
      neighborhood: sanitizeText(endereco?.bairro) ?? FALLBACK_ADDRESS.neighborhood,
      state: sanitizeText(endereco?.uf)?.toUpperCase() ?? FALLBACK_ADDRESS.state,
      zipCode: sanitizeZipCode(endereco?.cep) ?? FALLBACK_ADDRESS.zipCode,
    };
    console.info("[NeofinProvider] Enviando billing para Neofim:", {
      integrationIdentifier,
      amountCentavos: input.valorCentavos,
      dueDate: input.vencimentoISO,
      description: input.descricao,
      address: addressPayload,
      billingType: "bolepix",
      fees: 0.0333,
      fine: 2,
      installments: 1,
      installmentType: "monthly",
      customer: { ...customerPayload, cpf: `${cpfLimpo.slice(0, 3)}...${cpfLimpo.slice(-2)}` },
    });

    const neofinResult = await upsertNeofinBilling({
      integrationIdentifier,
      amountCentavos: input.valorCentavos,
      dueDate: input.vencimentoISO,
      description: input.descricao,
      billingType: "bolepix",
      address: addressPayload,
      discountBeforePayment: 0,
      discountBeforePaymentDueDate: 0,
      fees: 0.0333,
      fine: 2,
      installments: 1,
      installmentType: "monthly",
      customer: customerPayload,
    });

    if (!neofinResult.ok) {
      console.error("[NeofinProvider] Falha ao criar billing:", {
        integrationIdentifier,
        status: neofinResult.status,
        message: neofinResult.message,
        body: neofinResult.body,
      });
      throw new Error(neofinResult.message ?? "erro_neofin_criar_cobranca");
    }

    console.info("[NeofinProvider] Resposta da Neofim:", {
      integrationIdentifier,
      status: neofinResult.status,
      message: neofinResult.message,
    });

    const neofinLookup = await getNeofinBilling({ identifier: integrationIdentifier });
    const resolvedBody = neofinLookup.ok ? neofinLookup.body : neofinResult.body;
    const billing = extractNeofinBillingDetails(resolvedBody, {
      identifier: integrationIdentifier,
      integrationIdentifier,
    });
    const providerCobrancaId =
      firstNonEmptyString(billing.billingId, billing.integrationIdentifier, integrationIdentifier) ?? integrationIdentifier;

    if (!neofinLookup.ok) {
      console.warn("[NeofinProvider] Billing enfileirado mas nao materializado ainda:", {
        integrationIdentifier,
        lookupStatus: neofinLookup.status,
        lookupMessage: neofinLookup.message,
      });
    }

    return {
      provider: this.code,
      providerCobrancaId,
      status: "EMITIDA",
      linkPagamento: billing.paymentLink ?? null,
      linhaDigitavel: billing.digitableLine ?? billing.barcode ?? null,
      payload:
        resolvedBody && typeof resolvedBody === "object"
          ? (resolvedBody as Record<string, unknown>)
          : null,
    };
  }
}
