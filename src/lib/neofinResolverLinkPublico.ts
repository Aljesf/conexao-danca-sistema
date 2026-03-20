import {
  extractNeofinBillingDetails,
  findMatchingNeofinBillingCandidate,
  firstNonEmptyString,
  looksLikeNeofinBillingNumber,
  normalizeNeofinIdentifier,
} from "@/lib/neofinBilling";

export type NeofinLinkOrigem =
  | "invoice_oficial_neofin"
  | "billing_oficial_neofin"
  | "parcela_oficial_neofin"
  | "billing_reconstruido_validado"
  | "link_local_validado"
  | "indisponivel";

export type NeofinTipoCorrespondencia =
  | "invoice"
  | "billing"
  | "payment"
  | "installment"
  | "none";

export type NeofinLinkPublicoResolvido = {
  url_publica: string | null;
  origem_url: NeofinLinkOrigem;
  correspondencia_confirmada: boolean;
  tipo_correspondencia: NeofinTipoCorrespondencia;
  payment_number: string | null;
  invoice_id: string | null;
  charge_id: string | null;
  observacao_validacao: string | null;
  segunda_via_disponivel: boolean;
  historico_informativo: boolean;
  status_remoto: string | null;
};

type ResolverLinkPublicoNeofinInput = {
  body: unknown;
  identifier?: string | null;
  integrationIdentifier?: string | null;
  invoiceId?: string | null;
  chargeId?: string | null;
  parcelaNumero?: number | null;
  totalParcelas?: number | null;
  statusLocal?: string | null;
  linkPagamentoLocal?: string | null;
};

type NeofinPaymentCandidate = {
  paymentNumber: string | null;
  installmentNumber: number | null;
  paymentLink: string | null;
  digitableLine: string | null;
  barcode: string | null;
  pixQrCode: string | null;
  pixCopyPaste: string | null;
  remoteStatus: string | null;
  remoteType: string | null;
  rawPayment: Record<string, unknown> | null;
};

const NEOFIN_PUBLIC_PAY_BASE_URL = "https://app.neofin.com.br/pay";
const PAID_STATUSES = new Set([
  "PAID",
  "PAGO",
  "PAGA",
  "RECEBIDO",
  "RECEBIDA",
  "SETTLED",
  "COMPLETED",
  "LIQUIDADO",
  "LIQUIDADA",
]);

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pushRecord(target: Record<string, unknown>[], value: unknown) {
  const record = asRecord(value);
  if (record) target.push(record);
}

function normalizeUpper(value: string | null | undefined): string {
  return String(value ?? "").trim().toUpperCase();
}

function isUrlLike(value: string | null | undefined): boolean {
  const normalized = String(value ?? "").trim();
  return /^https?:\/\//i.test(normalized) || /^data:image\//i.test(normalized);
}

function isLikelyNeoFinPublicUrl(value: string | null | undefined): boolean {
  const normalized = String(value ?? "").trim();
  return /^https?:\/\/(?:app|www)\.neofin\.com\.br\/pay\b/i.test(normalized);
}

function toInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
  }
  return null;
}

function isPaidStatus(value: string | null | undefined): boolean {
  return PAID_STATUSES.has(normalizeUpper(value));
}

function inferPaymentInstallment(paymentNumber: string | null): number | null {
  if (!paymentNumber) return null;
  const match = paymentNumber.match(/[-_/](\d+)$/);
  return match ? Number(match[1]) : null;
}

function extractPixFields(source: Record<string, unknown> | null) {
  return {
    pixQrCode:
      firstNonEmptyString(
        source?.qr_code_url,
        source?.qrcode_url,
        source?.qrCodeUrl,
        source?.pix_qr_code_url,
        source?.pix_qrcode_url,
        source?.qr_code,
        source?.qrcode,
        source?.qrCode,
        source?.pix_qr_code,
        source?.pix_qrcode,
        source?.pix_qr,
      ) ?? null,
    pixCopyPaste:
      firstNonEmptyString(
        source?.copy_paste,
        source?.copyPaste,
        source?.pix_copia_e_cola,
        source?.pix_copy_paste,
        source?.pix_copia_cola,
        source?.pix_code,
      ) ?? null,
  };
}

function extractPaymentCandidates(body: unknown, identifier?: string | null): NeofinPaymentCandidate[] {
  const billing = findMatchingNeofinBillingCandidate(body, {
    identifier,
    integrationIdentifier: identifier,
  });
  const bodyRecord = asRecord(body);
  const candidates: Record<string, unknown>[] = [];

  if (Array.isArray(billing?.payments)) {
    for (const item of billing.payments) pushRecord(candidates, item);
  }

  if (Array.isArray(bodyRecord?.payments)) {
    for (const item of bodyRecord.payments) pushRecord(candidates, item);
  }

  const dataRecord = asRecord(bodyRecord?.data);
  if (Array.isArray(dataRecord?.payments)) {
    for (const item of dataRecord.payments) pushRecord(candidates, item);
  }

  const paymentRecord = asRecord(billing?.payment);
  if (paymentRecord) candidates.push(paymentRecord);

  return candidates.map((payment) => {
    const pixRecord = asRecord(payment.pix) ?? asRecord(payment.payment_pix) ?? null;
    const pix = extractPixFields(pixRecord);
    const paymentNumber =
      firstNonEmptyString(
        payment.payment_number,
        payment.paymentNumber,
        payment.number,
        payment.id,
      ) ?? null;

    return {
      paymentNumber,
      installmentNumber:
        toInteger(payment.installment)
        ?? toInteger(payment.installment_number)
        ?? toInteger(payment.parcela_numero)
        ?? inferPaymentInstallment(paymentNumber),
      paymentLink:
        firstNonEmptyString(
          payment.payment_url,
          payment.payment_link,
          payment.link_pagamento,
          payment.url,
          payment.link,
          payment.billing_url,
        ) ?? null,
      digitableLine:
        firstNonEmptyString(
          payment.digitable_line,
          payment.linha_digitavel,
          payment.digitableLine,
          payment.boleto_linha_digitavel,
        ) ?? null,
      barcode: firstNonEmptyString(payment.barcode, payment.bar_code) ?? null,
      pixQrCode: pix.pixQrCode,
      pixCopyPaste: pix.pixCopyPaste,
      remoteStatus:
        firstNonEmptyString(payment.payment_status, payment.status, payment.billing_status) ?? null,
      remoteType:
        firstNonEmptyString(payment.payment_type, payment.type, payment.paid_method) ?? null,
      rawPayment: payment,
    };
  });
}

function matchPaymentByInstallment(
  payments: NeofinPaymentCandidate[],
  parcelaNumero: number | null | undefined,
): NeofinPaymentCandidate | null {
  if (!Number.isFinite(parcelaNumero)) return null;
  return (
    payments.find((payment) => payment.installmentNumber === parcelaNumero)
    ?? payments.find((payment) => inferPaymentInstallment(payment.paymentNumber) === parcelaNumero)
    ?? null
  );
}

function buildValidatedBillingUrl(billingId: string | null): string | null {
  if (!looksLikeNeofinBillingNumber(billingId)) return null;
  return `${NEOFIN_PUBLIC_PAY_BASE_URL}?billing=${encodeURIComponent(String(billingId))}`;
}

function getRawMatchedBilling(body: unknown, identifier?: string | null, integrationIdentifier?: string | null) {
  return findMatchingNeofinBillingCandidate(body, {
    identifier,
    integrationIdentifier,
  });
}

function getRawBillingIdentifiers(body: unknown, identifier?: string | null, integrationIdentifier?: string | null) {
  const billing = getRawMatchedBilling(body, identifier, integrationIdentifier);
  const bodyRecord = asRecord(body);

  return {
    billingId:
      firstNonEmptyString(
        billing?.billing_number,
        billing?.id,
        billing?.billing_id,
        billing?.charge_id,
        bodyRecord?.billing_number,
        bodyRecord?.id,
        bodyRecord?.billing_id,
        bodyRecord?.charge_id,
      ) ?? null,
    integrationIdentifier:
      firstNonEmptyString(
        billing?.integration_identifier,
        billing?.integrationIdentifier,
        bodyRecord?.integration_identifier,
        bodyRecord?.integrationIdentifier,
      ) ?? null,
  };
}

function hasExactBillingMatch(params: {
  billingId: string | null;
  integrationIdentifier: string | null;
  invoiceId: string | null;
  chargeId: string | null;
  identifier: string | null;
  explicitIntegrationIdentifier: string | null;
}) {
  const billingId = normalizeNeofinIdentifier(params.billingId);
  const integrationIdentifier = normalizeNeofinIdentifier(params.integrationIdentifier);
  const invoiceId = normalizeNeofinIdentifier(params.invoiceId);
  const chargeId = normalizeNeofinIdentifier(params.chargeId);
  const identifier = normalizeNeofinIdentifier(params.identifier);
  const explicitIntegrationIdentifier = normalizeNeofinIdentifier(params.explicitIntegrationIdentifier);

  const invoiceMatch = Boolean(invoiceId && billingId === invoiceId);
  const billingIdMatch = Boolean(identifier && billingId === identifier);
  const chargeMatch = Boolean(
    chargeId && [billingId, integrationIdentifier].filter((value): value is string => Boolean(value)).includes(chargeId),
  );
  const integrationMatch = Boolean(
    explicitIntegrationIdentifier && integrationIdentifier === explicitIntegrationIdentifier,
  );

  return {
    invoiceMatch,
    billingIdMatch,
    chargeMatch,
    integrationMatch,
    confirmed: invoiceMatch || billingIdMatch || chargeMatch || integrationMatch,
  };
}

export function resolverLinkPublicoNeofin(
  input: ResolverLinkPublicoNeofinInput,
): NeofinLinkPublicoResolvido {
  const rawBillingIdentifiers = getRawBillingIdentifiers(
    input.body,
    input.identifier ?? input.chargeId ?? input.invoiceId ?? null,
    input.integrationIdentifier ?? null,
  );
  const details = extractNeofinBillingDetails(input.body, {
    identifier: input.identifier ?? input.chargeId ?? input.invoiceId ?? null,
    integrationIdentifier: input.integrationIdentifier ?? null,
  });

  const payments = extractPaymentCandidates(input.body, input.integrationIdentifier ?? input.identifier ?? null);
  const matchedPayment = matchPaymentByInstallment(payments, input.parcelaNumero);
  const matches = hasExactBillingMatch({
    billingId: rawBillingIdentifiers.billingId,
    integrationIdentifier: rawBillingIdentifiers.integrationIdentifier,
    invoiceId: input.invoiceId ?? null,
    chargeId: input.chargeId ?? null,
    identifier: input.identifier ?? null,
    explicitIntegrationIdentifier: input.integrationIdentifier ?? null,
  });

  const paymentUrl = matchedPayment?.paymentLink ?? null;
  const billingUrl = details.paymentLink ?? null;
  const reconstructedUrl = buildValidatedBillingUrl(details.billingId);
  const localLink = isLikelyNeoFinPublicUrl(input.linkPagamentoLocal) ? input.linkPagamentoLocal : null;

  let urlPublica: string | null = null;
  let origemUrl: NeofinLinkOrigem = "indisponivel";
  let tipoCorrespondencia: NeofinTipoCorrespondencia = "none";
  let observacaoValidacao: string | null = null;
  let correspondenciaConfirmada = false;

  if (matchedPayment) {
    correspondenciaConfirmada = true;
    tipoCorrespondencia = paymentUrl ? "payment" : "installment";
    if (paymentUrl && isUrlLike(paymentUrl)) {
      urlPublica = paymentUrl;
      origemUrl = "parcela_oficial_neofin";
      observacaoValidacao = `Parcela ${matchedPayment.installmentNumber ?? input.parcelaNumero ?? "?"} validada na NeoFin com URL publica especifica.`;
    } else if (billingUrl && isUrlLike(billingUrl)) {
      urlPublica = billingUrl;
      origemUrl = matches.invoiceMatch ? "invoice_oficial_neofin" : "billing_oficial_neofin";
      observacaoValidacao = `Parcela ${matchedPayment.installmentNumber ?? input.parcelaNumero ?? "?"} validada; a NeoFin expoe a URL publica no billing principal.`;
    } else if (reconstructedUrl) {
      urlPublica = reconstructedUrl;
      origemUrl = "billing_reconstruido_validado";
      observacaoValidacao = `Parcela ${matchedPayment.installmentNumber ?? input.parcelaNumero ?? "?"} validada; URL publica reconstruida a partir do billing confirmado.`;
    }
  } else if (matches.confirmed) {
    correspondenciaConfirmada = true;
    tipoCorrespondencia = matches.invoiceMatch ? "invoice" : "billing";
    if (billingUrl && isUrlLike(billingUrl)) {
      urlPublica = billingUrl;
      origemUrl = matches.invoiceMatch ? "invoice_oficial_neofin" : "billing_oficial_neofin";
      observacaoValidacao = matches.invoiceMatch
        ? "Invoice/billing confirmado na NeoFin e URL publica oficial localizada."
        : "Billing confirmado na NeoFin e URL publica oficial localizada.";
    } else if (reconstructedUrl) {
      urlPublica = reconstructedUrl;
      origemUrl = "billing_reconstruido_validado";
      observacaoValidacao = "Billing confirmado na NeoFin; URL publica reconstruida a partir do identificador oficial.";
    } else if (localLink && isUrlLike(localLink)) {
      urlPublica = localLink;
      origemUrl = "link_local_validado";
      observacaoValidacao = "Billing confirmado na NeoFin; link publico local reutilizado de forma validada.";
    } else {
      observacaoValidacao = "Billing confirmado, mas a NeoFin nao retornou URL publica utilizavel.";
    }
  } else {
    observacaoValidacao = "A URL publica nao foi liberada porque a correspondencia exata com a cobranca exibida nao foi confirmada.";
  }

  const statusRemoto =
    matchedPayment?.remoteStatus
    ?? details.remoteStatus
    ?? firstNonEmptyString(input.statusLocal) ?? null;
  const historicoInformativo = Boolean(urlPublica && correspondenciaConfirmada && isPaidStatus(statusRemoto));

  return {
    url_publica: correspondenciaConfirmada && urlPublica ? urlPublica : null,
    origem_url: correspondenciaConfirmada && urlPublica ? origemUrl : "indisponivel",
    correspondencia_confirmada: correspondenciaConfirmada,
    tipo_correspondencia: correspondenciaConfirmada ? tipoCorrespondencia : "none",
    payment_number: matchedPayment?.paymentNumber ?? null,
    invoice_id:
      firstNonEmptyString(
        looksLikeNeofinBillingNumber(input.invoiceId) ? input.invoiceId : null,
        looksLikeNeofinBillingNumber(rawBillingIdentifiers.billingId) ? rawBillingIdentifiers.billingId : null,
      ) ?? null,
    charge_id:
      firstNonEmptyString(
        looksLikeNeofinBillingNumber(rawBillingIdentifiers.billingId) ? rawBillingIdentifiers.billingId : null,
        input.chargeId,
        input.integrationIdentifier,
        input.identifier,
      ) ?? null,
    observacao_validacao: observacaoValidacao,
    segunda_via_disponivel: Boolean(urlPublica && correspondenciaConfirmada && !historicoInformativo),
    historico_informativo: historicoInformativo,
    status_remoto: statusRemoto,
  };
}
