export type NeofinBillingDisplayType = "BOLETO_PIX" | "PIX" | "OUTROS_BANCOS" | "NAO_INFORMADO";

export type NeofinBillingMatchReferences = {
  identifier?: string | null;
  integrationIdentifier?: string | null;
};

export type ExtractedNeofinBillingDetails = {
  billingId: string | null;
  integrationIdentifier: string | null;
  paymentLink: string | null;
  digitableLine: string | null;
  barcode: string | null;
  pixQrCode: string | null;
  pixCopyPaste: string | null;
  remoteStatus: string | null;
  remoteType: string | null;
  displayType: NeofinBillingDisplayType;
  displayLabel: string;
  description: string | null;
  rawBilling: Record<string, unknown> | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function firstNonEmptyString(...values: Array<unknown>): string | null {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }

  return null;
}

export function normalizeNeofinIdentifier(value: unknown): string | null {
  return firstNonEmptyString(value);
}

export function looksLikeNeofinBillingNumber(value: unknown): boolean {
  const normalized = normalizeNeofinIdentifier(value);
  return normalized ? /^[0-9]{8,}$/.test(normalized) : false;
}

function pushCandidate(target: Record<string, unknown>[], value: unknown) {
  const record = asRecord(value);
  if (record) target.push(record);
}

export function extractNeofinBillingCandidates(body: unknown): Record<string, unknown>[] {
  const candidates: Record<string, unknown>[] = [];
  const maybeObj = asRecord(body);

  if (Array.isArray(body)) {
    for (const item of body) pushCandidate(candidates, item);
  }

  const nestedBillings = maybeObj?.billings;
  if (Array.isArray(nestedBillings)) {
    for (const item of nestedBillings) pushCandidate(candidates, item);
  }

  const nestedData = maybeObj?.data;
  if (Array.isArray(nestedData)) {
    for (const item of nestedData) pushCandidate(candidates, item);
  }

  const nestedDataRecord = asRecord(nestedData);
  if (Array.isArray(nestedDataRecord?.billings)) {
    for (const item of nestedDataRecord.billings) pushCandidate(candidates, item);
  }

  if (maybeObj) {
    const hasBillingShape = firstNonEmptyString(
      maybeObj.id,
      maybeObj.billing_id,
      maybeObj.billing_number,
      maybeObj.charge_id,
      maybeObj.integration_identifier,
      maybeObj.integrationIdentifier,
      maybeObj.billing_url,
      maybeObj.payment_link,
      maybeObj.payment_url,
      maybeObj.barcode,
      maybeObj.digitable_line,
    );

    if (hasBillingShape) {
      candidates.push(maybeObj);
    }
  }

  return candidates;
}

function candidateMatches(candidate: Record<string, unknown>, references: NeofinBillingMatchReferences): boolean {
  const identifier = normalizeNeofinIdentifier(references.identifier);
  const integrationIdentifier = normalizeNeofinIdentifier(references.integrationIdentifier);
  const candidateIdentifiers = [
    normalizeNeofinIdentifier(candidate.id),
    normalizeNeofinIdentifier(candidate.billing_id),
    normalizeNeofinIdentifier(candidate.billing_number),
    normalizeNeofinIdentifier(candidate.charge_id),
    normalizeNeofinIdentifier(candidate.integration_identifier),
    normalizeNeofinIdentifier(candidate.integrationIdentifier),
  ].filter((value): value is string => Boolean(value));

  if (identifier && candidateIdentifiers.includes(identifier)) {
    return true;
  }

  if (integrationIdentifier) {
    const candidateIntegration = normalizeNeofinIdentifier(candidate.integration_identifier)
      ?? normalizeNeofinIdentifier(candidate.integrationIdentifier);
    if (candidateIntegration === integrationIdentifier) {
      return true;
    }
  }

  return false;
}

export function findMatchingNeofinBillingCandidate(
  body: unknown,
  references: NeofinBillingMatchReferences = {},
): Record<string, unknown> | null {
  const candidates = extractNeofinBillingCandidates(body);
  if (candidates.length === 0) {
    return asRecord(body);
  }

  for (const candidate of candidates) {
    if (candidateMatches(candidate, references)) {
      return candidate;
    }
  }

  return candidates[0] ?? null;
}

function extractPixPayload(billing: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!billing) return null;

  const pix = asRecord(billing.pix);
  if (pix) return pix;

  const payment = asRecord(billing.payment);
  const paymentPix = asRecord(payment?.pix);
  if (paymentPix) return paymentPix;

  return null;
}

function resolveDisplayType(details: {
  remoteType: string | null;
  paymentLink: string | null;
  digitableLine: string | null;
  pixQrCode: string | null;
  pixCopyPaste: string | null;
}): NeofinBillingDisplayType {
  const normalizedType = details.remoteType?.trim().toUpperCase() ?? "";

  if (normalizedType.includes("BOLETO") || normalizedType.includes("BOLEPIX")) {
    return "BOLETO_PIX";
  }

  if (normalizedType === "PIX") {
    return "PIX";
  }

  if (details.paymentLink || details.digitableLine) {
    return "BOLETO_PIX";
  }

  if (details.pixQrCode || details.pixCopyPaste) {
    return "PIX";
  }

  if (normalizedType === "GENERIC" || normalizedType === "BANK" || normalizedType === "OTHER_BANKS") {
    return "OUTROS_BANCOS";
  }

  return "NAO_INFORMADO";
}

function resolveDisplayLabel(displayType: NeofinBillingDisplayType): string {
  switch (displayType) {
    case "BOLETO_PIX":
      return "Boleto/Pix";
    case "PIX":
      return "Pix";
    case "OUTROS_BANCOS":
      return "Outros bancos";
    default:
      return "Nao informado";
  }
}

export function extractNeofinBillingDetails(
  body: unknown,
  references: NeofinBillingMatchReferences = {},
): ExtractedNeofinBillingDetails {
  const billing = findMatchingNeofinBillingCandidate(body, references);
  const maybeObj = asRecord(body);
  const pixPayload = extractPixPayload(billing);

  const billingId =
    firstNonEmptyString(
      billing?.billing_number,
      billing?.id,
      billing?.billing_id,
      billing?.charge_id,
      maybeObj?.billing_number,
      maybeObj?.id,
      maybeObj?.billing_id,
      maybeObj?.charge_id,
      references.identifier,
    ) ?? null;

  const integrationIdentifier =
    firstNonEmptyString(
      billing?.integration_identifier,
      billing?.integrationIdentifier,
      maybeObj?.integration_identifier,
      maybeObj?.integrationIdentifier,
      references.integrationIdentifier,
    ) ?? null;

  const paymentLink =
    firstNonEmptyString(
      billing?.billing_url,
      billing?.payment_link,
      billing?.payment_url,
      billing?.link_pagamento,
      billing?.url,
      billing?.link,
      billing?.billet_url,
      billing?.boleto_url,
      maybeObj?.billing_url,
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
      maybeObj?.digitable_line,
      maybeObj?.linha_digitavel,
    ) ?? null;

  const barcode =
    firstNonEmptyString(
      billing?.barcode,
      billing?.bar_code,
      maybeObj?.barcode,
      maybeObj?.bar_code,
    ) ?? null;

  const pixQrCode =
    firstNonEmptyString(
      pixPayload?.qr_code_url,
      pixPayload?.qrcode_url,
      pixPayload?.qrCodeUrl,
      pixPayload?.pix_qr_code_url,
      pixPayload?.pix_qrcode_url,
      pixPayload?.qr_code,
      pixPayload?.qrcode,
      pixPayload?.qrCode,
      pixPayload?.pix_qr_code,
      pixPayload?.pix_qrcode,
      pixPayload?.pix_qr,
      billing?.qr_code,
      billing?.qr_code_url,
      billing?.qrcode,
      billing?.qrcode_url,
      billing?.qrCode,
      billing?.qrCodeUrl,
      billing?.pix_qr_code,
      billing?.pix_qrcode,
      billing?.pix_qr,
      billing?.pix_qr_code_url,
      billing?.pix_qrcode_url,
      maybeObj?.qr_code,
      maybeObj?.qr_code_url,
      maybeObj?.qrcode,
      maybeObj?.qrcode_url,
      maybeObj?.qrCode,
      maybeObj?.qrCodeUrl,
      maybeObj?.pix_qr_code,
      maybeObj?.pix_qrcode,
      maybeObj?.pix_qr,
      maybeObj?.pix_qr_code_url,
      maybeObj?.pix_qrcode_url,
    ) ?? null;

  const pixCopyPaste =
    firstNonEmptyString(
      pixPayload?.copy_paste,
      pixPayload?.copyPaste,
      pixPayload?.pix_copia_e_cola,
      pixPayload?.pix_copy_paste,
      pixPayload?.pix_copia_cola,
      pixPayload?.pix_code,
      billing?.copy_paste,
      billing?.copyPaste,
      billing?.pix_copia_e_cola,
      billing?.pix_copy_paste,
      billing?.pix_copia_cola,
      billing?.pix_code,
      maybeObj?.copy_paste,
      maybeObj?.copyPaste,
      maybeObj?.pix_copia_e_cola,
      maybeObj?.pix_copy_paste,
      maybeObj?.pix_copia_cola,
      maybeObj?.pix_code,
    ) ?? null;

  const remoteStatus =
    firstNonEmptyString(
      billing?.status,
      billing?.billing_status,
      billing?.charge_status,
      maybeObj?.status,
      maybeObj?.billing_status,
      maybeObj?.charge_status,
    ) ?? null;

  const remoteType =
    firstNonEmptyString(
      billing?.type,
      billing?.billing_type,
      billing?.payment_type,
      maybeObj?.type,
      maybeObj?.billing_type,
      maybeObj?.payment_type,
    ) ?? null;

  const displayType = resolveDisplayType({
    remoteType,
    paymentLink,
    digitableLine,
    pixQrCode,
    pixCopyPaste,
  });

  return {
    billingId,
    integrationIdentifier,
    paymentLink,
    digitableLine,
    barcode,
    pixQrCode,
    pixCopyPaste,
    remoteStatus,
    remoteType,
    displayType,
    displayLabel: resolveDisplayLabel(displayType),
    description: firstNonEmptyString(billing?.description, maybeObj?.description) ?? null,
    rawBilling: billing,
  };
}
