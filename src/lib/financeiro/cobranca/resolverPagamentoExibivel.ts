import { extractNeofinBillingDetails, firstNonEmptyString, looksLikeNeofinBillingNumber } from "@/lib/neofinBilling";
import { getNeofinBilling } from "@/lib/neofinClient";

type CobrancaPagamentoBase = {
  id: number;
  origem_tipo: string | null;
  origem_id: number | null;
  metodo_pagamento: string | null;
  status: string | null;
  neofin_charge_id: string | null;
  link_pagamento: string | null;
  linha_digitavel: string | null;
  neofin_payload: Record<string, unknown> | null;
};

export type PagamentoExibivel = {
  tipo_exibicao: string;
  tipo_remoto: string | null;
  status_sincronizado: string | null;
  invoice_id: string | null;
  neofin_charge_id: string | null;
  integration_identifier: string | null;
  link_pagamento: string | null;
  linha_digitavel: string | null;
  codigo_barras: string | null;
  pix_copia_cola: string | null;
  qr_code_url: string | null;
  qr_code_bruto: string | null;
  origem_dos_dados: "remoto" | "local" | "legado";
  invoice_valida: boolean;
  segunda_via_disponivel: boolean;
  charge_id_textual_legado: boolean;
};

type ResolverPagamentoExibivelInput = {
  cobranca: CobrancaPagamentoBase | null;
  neofinInvoiceId?: string | null;
  integrationIdentifier?: string | null;
};

function normalizeUpper(value: string | null | undefined): string {
  return String(value ?? "").trim().toUpperCase();
}

function isCanonicalOrigem(origemTipo: string | null | undefined): boolean {
  const normalized = normalizeUpper(origemTipo);
  return normalized === "FATURA_CREDITO_CONEXAO" || normalized === "CREDITO_CONEXAO_FATURA";
}

function isUrlLike(value: string | null | undefined): boolean {
  const normalized = String(value ?? "").trim();
  return /^https?:\/\//i.test(normalized) || /^data:image\//i.test(normalized);
}

function resolveTipoExibicao(params: {
  metodoPagamento: string | null;
  hasBoleto: boolean;
  hasPix: boolean;
  detailsLabel: string;
}): string {
  if (params.hasBoleto && params.hasPix) return "Boleto + Pix";
  if (params.hasBoleto) return "Boleto";
  if (params.hasPix) return "Pix";

  const metodo = normalizeUpper(params.metodoPagamento);
  if (metodo && !["BOLETO", "PIX", "BOLETO_PIX", "BOLETOPIX", "NEOFIN"].includes(metodo)) {
    return "Pagamento interno";
  }

  return params.detailsLabel;
}

export async function resolverPagamentoExibivel(
  input: ResolverPagamentoExibivelInput,
): Promise<PagamentoExibivel> {
  const cobranca = input.cobranca;
  const integrationIdentifier =
    firstNonEmptyString(
      input.integrationIdentifier,
      isCanonicalOrigem(cobranca?.origem_tipo) && typeof cobranca?.origem_id === "number"
        ? `fatura-credito-conexao-${cobranca.origem_id}`
        : null,
      cobranca?.neofin_charge_id,
    ) ?? null;

  const preferredLookupId =
    firstNonEmptyString(
      looksLikeNeofinBillingNumber(input.neofinInvoiceId) ? input.neofinInvoiceId : null,
      cobranca?.neofin_charge_id,
      integrationIdentifier,
    ) ?? null;

  const remote = preferredLookupId
    ? await getNeofinBilling({ identifier: preferredLookupId })
    : { ok: false, status: 400, body: null };

  const detalhes = extractNeofinBillingDetails(
    remote.ok ? remote.body : cobranca?.neofin_payload,
    {
      identifier: preferredLookupId,
      integrationIdentifier,
    },
  );

  const invoiceId =
    firstNonEmptyString(
      looksLikeNeofinBillingNumber(input.neofinInvoiceId) ? input.neofinInvoiceId : null,
      looksLikeNeofinBillingNumber(detalhes.billingId) ? detalhes.billingId : null,
      looksLikeNeofinBillingNumber(cobranca?.neofin_charge_id) ? cobranca?.neofin_charge_id : null,
    ) ?? null;

  const linkPagamento = detalhes.paymentLink ?? cobranca?.link_pagamento ?? null;
  const linhaDigitavel = detalhes.digitableLine ?? cobranca?.linha_digitavel ?? null;
  const codigoBarras = detalhes.barcode ?? null;
  const pixCopiaCola = detalhes.pixCopyPaste ?? null;
  const qrCodeBruto = detalhes.pixQrCode ?? null;
  const qrCodeUrl = isUrlLike(qrCodeBruto) ? qrCodeBruto : null;
  const chargeId =
    firstNonEmptyString(
      looksLikeNeofinBillingNumber(detalhes.billingId) ? detalhes.billingId : null,
      looksLikeNeofinBillingNumber(cobranca?.neofin_charge_id) ? cobranca?.neofin_charge_id : null,
      cobranca?.neofin_charge_id,
      integrationIdentifier,
    ) ?? null;
  const chargeIdTextualLegado = Boolean(chargeId && !looksLikeNeofinBillingNumber(chargeId));
  const hasBoleto = Boolean(linkPagamento || linhaDigitavel || codigoBarras);
  const hasPix = Boolean(pixCopiaCola || qrCodeBruto);
  const invoiceValida = Boolean(
    invoiceId ||
      linkPagamento ||
      linhaDigitavel ||
      codigoBarras ||
      pixCopiaCola ||
      qrCodeBruto ||
      (chargeId && !chargeIdTextualLegado),
  );

  return {
    tipo_exibicao: resolveTipoExibicao({
      metodoPagamento: cobranca?.metodo_pagamento ?? null,
      hasBoleto,
      hasPix,
      detailsLabel: detalhes.displayLabel,
    }),
    tipo_remoto: detalhes.remoteType,
    status_sincronizado: detalhes.remoteStatus ?? cobranca?.status ?? null,
    invoice_id: invoiceId,
    neofin_charge_id: chargeId,
    integration_identifier: detalhes.integrationIdentifier ?? integrationIdentifier,
    link_pagamento: linkPagamento,
    linha_digitavel: linhaDigitavel,
    codigo_barras: codigoBarras,
    pix_copia_cola: pixCopiaCola,
    qr_code_url: qrCodeUrl,
    qr_code_bruto: qrCodeBruto,
    origem_dos_dados: remote.ok ? "remoto" : cobranca?.neofin_payload || cobranca?.link_pagamento || cobranca?.linha_digitavel ? "local" : "legado",
    invoice_valida: invoiceValida,
    segunda_via_disponivel: Boolean(linkPagamento || linhaDigitavel || codigoBarras || pixCopiaCola || qrCodeBruto),
    charge_id_textual_legado: chargeIdTextualLegado,
  };
}
