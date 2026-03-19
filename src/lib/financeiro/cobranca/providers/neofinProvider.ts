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

function sanitizeCpf(rawCpf?: string | null): string | null {
  if (!rawCpf) return null;
  const digits = rawCpf.replace(/\D/g, "");
  return digits.length === 11 ? digits : null;
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
      billingType: "boleto",
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

    const neofinLookup = await getNeofinBilling({ identifier: integrationIdentifier });
    const resolvedBody = neofinLookup.ok ? neofinLookup.body : neofinResult.body;
    const billing = extractNeofinBillingDetails(resolvedBody, {
      identifier: integrationIdentifier,
      integrationIdentifier,
    });
    const providerCobrancaId =
      firstNonEmptyString(billing.billingId, billing.integrationIdentifier, integrationIdentifier) ?? integrationIdentifier;

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
