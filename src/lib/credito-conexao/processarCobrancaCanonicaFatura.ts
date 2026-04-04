import type { SupabaseClient } from "@supabase/supabase-js";
import { buildDescricaoCobranca } from "@/lib/financeiro/cobranca/descricao";
import { getCobrancaProvider } from "@/lib/financeiro/cobranca/providers";
import type { CobrancaProviderCode } from "@/lib/financeiro/cobranca/providers/types";
import {
  DuplicidadeCobrancaCanonicaError,
  getOrCreateCobrancaCanonicaFatura,
} from "@/lib/credito-conexao/getOrCreateCobrancaCanonicaFatura";
import { extractNeofinBillingDetails, firstNonEmptyString, looksLikeNeofinBillingNumber } from "@/lib/neofinBilling";
import { getNeofinBilling } from "@/lib/neofinClient";

type FaturaRow = {
  id: number;
  status: string;
  valor_total_centavos: number;
};

type ContaRow = {
  pessoa_titular_id: number | null;
};

type ProcessarCobrancaCanonicaFaturaInput = {
  supabase: SupabaseClient;
  fatura: FaturaRow;
  conta: ContaRow;
  competencia: string;
  vencimentoEfetivo: string;
  providerCode: CobrancaProviderCode;
  force: boolean;
};

export type ProcessarCobrancaCanonicaFaturaResult =
  | {
      ok: true;
      data: {
        fatura_id: number;
        status_fatura: string;
        cobranca_id: number;
        neofin_charge_id: string | null;
        neofin_invoice_id: string | null;
        vencimento_iso: string;
        message: string;
      };
    }
  | {
      ok: false;
      status: number;
      body: Record<string, unknown>;
    };

function localTodayIso(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function isStatusCheckError(errorMessage: string | null | undefined): boolean {
  const msg = (errorMessage ?? "").toLowerCase();
  return msg.includes("credito_conexao_faturas_status_chk") || msg.includes("check constraint");
}

async function calcularTotalEItens(
  supabase: SupabaseClient,
  faturaId: number,
  fallbackValorTotal: number,
): Promise<{ totalCentavos: number; itensDescricao: string[] }> {
  const { data: vinculos, error } = await supabase
    .from("credito_conexao_fatura_lancamentos")
    .select("lancamento:credito_conexao_lancamentos(valor_centavos,descricao)")
    .eq("fatura_id", faturaId);

  if (error) {
    throw new Error(error.message);
  }

  const itensDescricao: string[] = [];
  const totalVinculos = (vinculos ?? []).reduce((acc, row) => {
    const lancamento = (row as { lancamento?: { valor_centavos?: number | null; descricao?: string | null } | null }).lancamento;
    const valor = Number(lancamento?.valor_centavos ?? 0);
    const descricao = String(lancamento?.descricao ?? "").trim();
    if (descricao) itensDescricao.push(descricao);
    return acc + (Number.isFinite(valor) ? valor : 0);
  }, 0);

  const valorFallback = Number(fallbackValorTotal);
  const total = totalVinculos > 0 ? Math.trunc(totalVinculos) : Math.max(Math.trunc(valorFallback || 0), 0);

  return { totalCentavos: total, itensDescricao };
}

async function updateFaturaComStatusCompativel(
  supabase: SupabaseClient,
  faturaId: number,
  payload: {
    cobranca_id: number;
    data_fechamento: string;
    data_vencimento: string;
    valor_total_centavos: number;
    neofin_invoice_id: string | null;
    updated_at: string;
  },
  statusDesejado: "FECHADA" | "ABERTA" | "PAGA",
): Promise<{ ok: true; statusAplicado: string } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("credito_conexao_faturas")
    .update({ ...payload, status: statusDesejado })
    .eq("id", faturaId)
    .select("status")
    .single();

  if (!error) {
    return {
      ok: true,
      statusAplicado:
        data &&
        typeof data === "object" &&
        typeof (data as { status?: unknown }).status === "string"
          ? String((data as { status?: unknown }).status)
          : statusDesejado,
    };
  }

  if (statusDesejado === "FECHADA" && isStatusCheckError(error.message)) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("credito_conexao_faturas")
      .update({ ...payload, status: "ABERTA" })
      .eq("id", faturaId)
      .select("status")
      .single();

    if (!fallbackError) {
      return {
        ok: true,
        statusAplicado:
          fallbackData &&
          typeof fallbackData === "object" &&
          typeof (fallbackData as { status?: unknown }).status === "string"
            ? String((fallbackData as { status?: unknown }).status)
            : "ABERTA",
      };
    }

    return { ok: false, error: fallbackError.message };
  }

  return { ok: false, error: error.message };
}

async function syncExistingNeofinDetails(
  identifier: string,
  integrationIdentifier: string,
) {
  const remote = await getNeofinBilling({ identifier });
  if (!remote.ok) {
    return {
      ok: false as const,
      neofinPayload: null,
      neofinChargeId: identifier,
      neofinInvoiceId: null,
      linkPagamento: null,
      linhaDigitavel: null,
    };
  }

  const details = extractNeofinBillingDetails(remote.body, {
    identifier,
    integrationIdentifier,
  });

  const neofinChargeId = firstNonEmptyString(details.billingId, identifier) ?? identifier;
  const neofinInvoiceId = looksLikeNeofinBillingNumber(details.billingId) ? details.billingId : null;

  return {
    ok: true as const,
    neofinPayload:
      remote.body && typeof remote.body === "object"
        ? (remote.body as Record<string, unknown>)
        : null,
    neofinChargeId,
    neofinInvoiceId,
    linkPagamento: details.paymentLink ?? null,
    linhaDigitavel: details.digitableLine ?? details.barcode ?? null,
  };
}

export async function processarCobrancaCanonicaFatura(
  input: ProcessarCobrancaCanonicaFaturaInput,
): Promise<ProcessarCobrancaCanonicaFaturaResult> {
  const totalEItens = await calcularTotalEItens(
    input.supabase,
    input.fatura.id,
    input.fatura.valor_total_centavos,
  );

  if (totalEItens.totalCentavos <= 0) {
    return {
      ok: false,
      status: 400,
      body: { ok: false, error: "fatura_sem_valor_para_cobranca" },
    };
  }

  const descricao = buildDescricaoCobranca({
    contexto: "FATURA_CREDITO_CONEXAO",
    faturaId: input.fatura.id,
    periodo: input.competencia,
    itensDescricao: totalEItens.itensDescricao,
  });

  const pessoaTitularId = Number(input.conta.pessoa_titular_id);
  let cobrancaAtual;
  try {
    const resultadoCobranca = await getOrCreateCobrancaCanonicaFatura({
      supabase: input.supabase,
      faturaId: input.fatura.id,
      pessoaId: pessoaTitularId,
      descricao,
      valorCentavos: totalEItens.totalCentavos,
      vencimentoIso: input.vencimentoEfetivo,
    });
    cobrancaAtual = resultadoCobranca.cobranca;
  } catch (error) {
    if (error instanceof DuplicidadeCobrancaCanonicaError) {
      return {
        ok: false,
        status: 409,
        body: {
          ok: false,
          error: "duplicidade_cobranca_canonica",
          detail: error.message,
          cobranca_ids: error.cobrancaIds,
          fatura_id: error.faturaId,
        },
      };
    }

    return {
      ok: false,
      status: 500,
      body: {
        ok: false,
        error: "erro_upsert_cobranca",
        detail: error instanceof Error ? error.message : null,
      },
    };
  }

  const integrationIdentifierBase = `fatura-credito-conexao-${input.fatura.id}`;
  let neofinChargeId = cobrancaAtual.neofin_charge_id;
  let neofinInvoiceId: string | null = null;
  let linkPagamento = cobrancaAtual.link_pagamento ?? null;
  let linhaDigitavel = cobrancaAtual.linha_digitavel ?? null;
  let neofinPayload = cobrancaAtual.neofin_payload ?? null;
  let message = "Cobranca gerada com sucesso";

  if (cobrancaAtual.neofin_charge_id && !input.force) {
    const existingSync = await syncExistingNeofinDetails(
      cobrancaAtual.neofin_charge_id,
      integrationIdentifierBase,
    );

    neofinChargeId = existingSync.neofinChargeId;
    neofinInvoiceId = existingSync.neofinInvoiceId;
    linkPagamento = existingSync.linkPagamento ?? linkPagamento;
    linhaDigitavel = existingSync.linhaDigitavel ?? linhaDigitavel;
    neofinPayload = existingSync.neofinPayload ?? neofinPayload;
    message = "Cobranca ja existe";
  } else {
    try {
      const provider = getCobrancaProvider(input.providerCode);
      const out = await provider.criarCobranca({
        pessoaId: pessoaTitularId,
        descricao,
        valorCentavos: totalEItens.totalCentavos,
        vencimentoISO: input.vencimentoEfetivo,
        referenciaInterna: { tipo: "FATURA_CREDITO_CONEXAO", id: input.fatura.id },
      });

      const providerDetails = extractNeofinBillingDetails(out.payload ?? null, {
        identifier: out.providerCobrancaId,
        integrationIdentifier: integrationIdentifierBase,
      });

      neofinChargeId = firstNonEmptyString(providerDetails.billingId, out.providerCobrancaId) ?? out.providerCobrancaId;
      neofinInvoiceId = looksLikeNeofinBillingNumber(providerDetails.billingId) ? providerDetails.billingId : null;
      linkPagamento = providerDetails.paymentLink ?? out.linkPagamento ?? null;
      linhaDigitavel = providerDetails.digitableLine ?? providerDetails.barcode ?? out.linhaDigitavel ?? null;
      neofinPayload =
        out.payload && typeof out.payload === "object"
          ? (out.payload as Record<string, unknown>)
          : null;
    } catch (error) {
      return {
        ok: false,
        status: 502,
        body: {
          ok: false,
          error: "erro_criar_cobranca_provider",
          detail: error instanceof Error ? error.message : "erro_provider_desconhecido",
        },
      };
    }
  }

  const { error: updateChargeError } = await input.supabase
    .from("cobrancas")
    .update({
      descricao,
      valor_centavos: totalEItens.totalCentavos,
      vencimento: input.vencimentoEfetivo,
      metodo_pagamento: "BOLETO",
      origem_subtipo: "CARTAO_CONEXAO",
      neofin_charge_id: neofinChargeId,
      neofin_payload: neofinPayload,
      link_pagamento: linkPagamento,
      linha_digitavel: linhaDigitavel,
      updated_at: new Date().toISOString(),
    })
    .eq("id", cobrancaAtual.id);

  if (updateChargeError) {
    return {
      ok: false,
      status: 500,
      body: {
        ok: false,
        error: "erro_salvar_cobranca_provider",
        detail: updateChargeError.message,
      },
    };
  }

  const statusFatura = await updateFaturaComStatusCompativel(
    input.supabase,
    input.fatura.id,
    {
      cobranca_id: cobrancaAtual.id,
      data_fechamento: localTodayIso(),
      data_vencimento: input.vencimentoEfetivo,
      valor_total_centavos: totalEItens.totalCentavos,
      neofin_invoice_id: neofinInvoiceId,
      updated_at: new Date().toISOString(),
    },
    input.fatura.status === "PAGA" ? "PAGA" : "FECHADA",
  );

  if (!statusFatura.ok) {
    return {
      ok: false,
      status: 500,
      body: {
        ok: false,
        error: "erro_atualizar_fatura",
        detail: statusFatura.error,
      },
    };
  }

  return {
    ok: true,
    data: {
      fatura_id: input.fatura.id,
      status_fatura: statusFatura.statusAplicado,
      cobranca_id: cobrancaAtual.id,
      neofin_charge_id: neofinChargeId ?? null,
      neofin_invoice_id: neofinInvoiceId,
      vencimento_iso: input.vencimentoEfetivo,
      message,
    },
  };
}
