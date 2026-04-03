import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

export type SecretariaPagamentoPayload = {
  fatura_id?: number | string | null;
  lancamento_id?: number | string | null;
  valor_pagamento_centavos?: number | string | null;
  forma_pagamento_id?: number | string | null;
  forma_pagamento_codigo?: string | null;
  forma_pagamento?: string | null;
  conta_financeira_id?: number | string | null;
  data_pagamento?: string | null;
  observacao?: string | null;
};

export type SecretariaCancelamentoPayload = {
  lancamento_id?: number | string | null;
  motivo_cancelamento?: string | null;
};

export function parsePositiveInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = Math.trunc(value);
    return parsed > 0 ? parsed : null;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      const normalized = Math.trunc(parsed);
      return normalized > 0 ? normalized : null;
    }
  }

  return null;
}

export function parseOptionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function normalizePaymentDate(value: unknown): string {
  const text = parseOptionalText(value);
  if (!text) return todayIso();
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? todayIso();
}

export function normalizeFormaPagamentoCodigo(value: string | null): string | null {
  if (!value) return null;
  const normalized = value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();

  return normalized || null;
}

export async function resolveFormaPagamentoCodigo(
  payload: SecretariaPagamentoPayload | null,
): Promise<string | null> {
  const direta =
    normalizeFormaPagamentoCodigo(parseOptionalText(payload?.forma_pagamento_codigo ?? null)) ??
    normalizeFormaPagamentoCodigo(parseOptionalText(payload?.forma_pagamento ?? null));

  if (direta) return direta;

  const formaPagamentoId = parsePositiveInt(payload?.forma_pagamento_id);
  if (!formaPagamentoId) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("formas_pagamento")
    .select("codigo,nome")
    .eq("id", formaPagamentoId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as { codigo?: string | null; nome?: string | null };
  return normalizeFormaPagamentoCodigo(row.codigo ?? row.nome ?? null);
}

export function mapSecretariaErrorStatus(message: string): number {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("nao encontrada") ||
    normalized.includes("nao encontrado") ||
    normalized.includes("conta_interna_nao_encontrada")
  ) {
    return 404;
  }

  if (
    normalized.includes("excede saldo") ||
    normalized.includes("maior que zero") ||
    normalized.includes("obrigatori") ||
    normalized.includes("invalido") ||
    normalized.includes("sem cobranca canonica") ||
    normalized.includes("cobranca canonica vinculada") ||
    normalized.includes("ja cancelado") ||
    normalized.includes("nao pode cancelar")
  ) {
    return 400;
  }

  return 500;
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "erro_desconhecido";
}

export function getSecretariaUserMessage(
  context: "buscar_contas" | "carregar_conta" | "pagamento" | "cancelamento",
  message: string,
): string {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("conta_interna_nao_encontrada") ||
    normalized.includes("nao encontrada") ||
    normalized.includes("nao encontrado")
  ) {
    return context === "buscar_contas"
      ? "Nenhuma conta encontrada para esse termo."
      : "Nao foi possivel localizar a conta interna selecionada.";
  }

  if (normalized.includes("excede saldo")) {
    return "O valor informado nao pode ultrapassar o saldo em aberto.";
  }

  if (normalized.includes("maior que zero")) {
    return "Informe um valor de pagamento maior que zero.";
  }

  if (normalized.includes("forma_pagamento")) {
    return "Selecione uma forma de pagamento valida para continuar.";
  }

  if (normalized.includes("conta_financeira")) {
    return "Selecione a conta financeira que recebera o valor.";
  }

  if (normalized.includes("motivo_cancelamento")) {
    return "Informe o motivo do cancelamento para continuar.";
  }

  if (normalized.includes("ja_cancelado")) {
    return "Esse lancamento ja foi cancelado anteriormente.";
  }

  if (normalized.includes("nao_pode_cancelar") || normalized.includes("ja_recebido")) {
    return "Nao e permitido cancelar um lancamento que ja tenha recebimento registrado.";
  }

  if (
    normalized.includes("column ") ||
    normalized.includes("schema cache") ||
    normalized.includes("relation ") ||
    normalized.includes("syntax error")
  ) {
    return context === "buscar_contas"
      ? "Nao foi possivel carregar a busca da conta interna agora."
      : context === "carregar_conta"
        ? "Nao foi possivel carregar a conta interna agora."
        : context === "cancelamento"
          ? "Nao foi possivel cancelar o lancamento agora."
          : "Nao foi possivel registrar o pagamento agora.";
  }

  if (context === "buscar_contas") {
    return "Nao foi possivel localizar contas internas agora.";
  }

  if (context === "carregar_conta") {
    return "Nao foi possivel carregar a conta interna agora.";
  }

  if (context === "cancelamento") {
    return "Nao foi possivel cancelar o lancamento agora. Tente novamente ou chame a administracao.";
  }

  return "Nao foi possivel registrar o pagamento agora. Tente novamente ou chame a administracao.";
}
