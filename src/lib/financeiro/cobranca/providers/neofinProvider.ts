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
};

const CANCELLED_STATUSES = new Set([
  "CANCELED", "CANCELLED", "CANCELADO", "CANCELADA", "VOID", "EXPIRED",
]);

function sanitizeCpf(rawCpf?: string | null): string | null {
  if (!rawCpf) return null;
  const digits = rawCpf.replace(/\D/g, "");
  return digits.length === 11 ? digits : null;
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
      telefone: pessoa.telefone,
    };
    console.info("[NeofinProvider] Enviando billing para Neofim:", {
      integrationIdentifier,
      amountCentavos: input.valorCentavos,
      dueDate: input.vencimentoISO,
      description: input.descricao,
      customer: { ...customerPayload, cpf: `${cpfLimpo.slice(0, 3)}...${cpfLimpo.slice(-2)}` },
    });

    const neofinResult = await upsertNeofinBilling({
      integrationIdentifier,
      amountCentavos: input.valorCentavos,
      dueDate: input.vencimentoISO,
      description: input.descricao,
      billingType: "boleto",
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
