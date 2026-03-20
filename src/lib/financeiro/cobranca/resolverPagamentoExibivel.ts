import {
  extractNeofinBillingDetails,
  firstNonEmptyString,
  looksLikeNeofinBillingNumber,
} from "@/lib/neofinBilling";
import { getNeofinBilling } from "@/lib/neofinClient";
import {
  resolverLinkPublicoNeofin,
  type NeofinLinkOrigem,
  type NeofinTipoCorrespondencia,
} from "@/lib/neofinResolverLinkPublico";

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
  parcela_numero?: number | null;
  total_parcelas?: number | null;
};

export type PagamentoExibivel = {
  tipo_exibicao: string;
  tipo_remoto: string | null;
  status_sincronizado: string | null;
  invoice_id: string | null;
  neofin_charge_id: string | null;
  integration_identifier: string | null;
  link_pagamento: string | null;
  link_pagamento_validado: boolean;
  link_pagamento_origem: NeofinLinkOrigem;
  correspondencia_confirmada: boolean;
  tipo_correspondencia: NeofinTipoCorrespondencia;
  payment_number: string | null;
  linha_digitavel: string | null;
  codigo_barras: string | null;
  pix_copia_cola: string | null;
  qr_code_url: string | null;
  qr_code_bruto: string | null;
  origem_dos_dados: "remoto" | "local" | "legado";
  invoice_valida: boolean;
  segunda_via_disponivel: boolean;
  link_historico_informativo: boolean;
  charge_id_textual_legado: boolean;
  mensagem_operacional: string | null;
  observacao_validacao: string | null;
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

function resolveMensagemOperacional(params: {
  linkValidado: boolean;
  segundaViaDisponivel: boolean;
  historicoInformativo: boolean;
  correspondenciaConfirmada: boolean;
  paymentNumber: string | null;
  observacaoValidacao: string | null;
  chargeIdTextualLegado: boolean;
}): string | null {
  if (!params.correspondenciaConfirmada) {
    return (
      params.observacaoValidacao
      ?? "A URL publica nao foi liberada porque a correspondencia com a cobranca exibida nao foi confirmada."
    );
  }

  if (params.historicoInformativo) {
    return params.paymentNumber
      ? `Cobranca quitada; o link validado da NeoFin ficou disponivel apenas como historico da parcela ${params.paymentNumber}.`
      : "Cobranca quitada; o link validado da NeoFin ficou disponivel apenas como historico informativo.";
  }

  if (params.segundaViaDisponivel && params.linkValidado) {
    return params.paymentNumber
      ? `Segunda via validada na NeoFin para a parcela ${params.paymentNumber}.`
      : "Segunda via validada na NeoFin para a cobranca exibida.";
  }

  if (params.chargeIdTextualLegado) {
    return "A cobranca ainda preserva identificador textual legado, mas a abertura publica agora depende apenas da correspondencia validada na NeoFin.";
  }

  return params.observacaoValidacao;
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

  const origemDosDados: "remoto" | "local" | "legado" = remote.ok
    ? "remoto"
    : cobranca?.neofin_payload || cobranca?.link_pagamento || cobranca?.linha_digitavel
      ? "local"
      : "legado";

  const sourceBody = remote.ok ? remote.body : cobranca?.neofin_payload;
  const detalhes = extractNeofinBillingDetails(sourceBody, {
    identifier: preferredLookupId,
    integrationIdentifier,
  });
  const resolvedLink = resolverLinkPublicoNeofin({
    body: sourceBody,
    identifier: preferredLookupId,
    integrationIdentifier,
    invoiceId: input.neofinInvoiceId ?? null,
    chargeId: cobranca?.neofin_charge_id ?? null,
    parcelaNumero: cobranca?.parcela_numero ?? null,
    totalParcelas: cobranca?.total_parcelas ?? null,
    statusLocal: cobranca?.status ?? null,
    linkPagamentoLocal: cobranca?.link_pagamento ?? null,
  });

  const invoiceId =
    firstNonEmptyString(
      looksLikeNeofinBillingNumber(input.neofinInvoiceId) ? input.neofinInvoiceId : null,
      looksLikeNeofinBillingNumber(resolvedLink.invoice_id) ? resolvedLink.invoice_id : null,
      looksLikeNeofinBillingNumber(detalhes.billingId) ? detalhes.billingId : null,
      looksLikeNeofinBillingNumber(cobranca?.neofin_charge_id) ? cobranca?.neofin_charge_id : null,
    ) ?? null;

  const linkPagamento = resolvedLink.correspondencia_confirmada ? resolvedLink.url_publica : null;
  const linhaDigitavel = detalhes.digitableLine ?? cobranca?.linha_digitavel ?? null;
  const codigoBarras = detalhes.barcode ?? null;
  const pixCopiaCola = detalhes.pixCopyPaste ?? null;
  const qrCodeBruto = detalhes.pixQrCode ?? null;
  const qrCodeUrl = isUrlLike(qrCodeBruto) ? qrCodeBruto : null;
  const chargeId =
    firstNonEmptyString(
      looksLikeNeofinBillingNumber(resolvedLink.charge_id) ? resolvedLink.charge_id : null,
      looksLikeNeofinBillingNumber(detalhes.billingId) ? detalhes.billingId : null,
      looksLikeNeofinBillingNumber(cobranca?.neofin_charge_id) ? cobranca?.neofin_charge_id : null,
      cobranca?.neofin_charge_id,
      integrationIdentifier,
    ) ?? null;
  const chargeIdTextualLegado = Boolean(chargeId && !looksLikeNeofinBillingNumber(chargeId));
  const hasBoleto = Boolean(linkPagamento || linhaDigitavel || codigoBarras);
  const hasPix = Boolean(pixCopiaCola || qrCodeBruto);
  const invoiceValida = Boolean(
    resolvedLink.correspondencia_confirmada
    && (
      invoiceId
      || linkPagamento
      || linhaDigitavel
      || codigoBarras
      || pixCopiaCola
      || qrCodeBruto
      || (chargeId && !chargeIdTextualLegado)
    ),
  );
  const linkPagamentoValidado = Boolean(linkPagamento && resolvedLink.correspondencia_confirmada);

  return {
    tipo_exibicao: resolveTipoExibicao({
      metodoPagamento: cobranca?.metodo_pagamento ?? null,
      hasBoleto,
      hasPix,
      detailsLabel: detalhes.displayLabel,
    }),
    tipo_remoto: detalhes.remoteType,
    status_sincronizado: resolvedLink.status_remoto ?? detalhes.remoteStatus ?? cobranca?.status ?? null,
    invoice_id: invoiceId,
    neofin_charge_id: chargeId,
    integration_identifier: detalhes.integrationIdentifier ?? integrationIdentifier,
    link_pagamento: linkPagamento,
    link_pagamento_validado: linkPagamentoValidado,
    link_pagamento_origem: resolvedLink.origem_url,
    correspondencia_confirmada: resolvedLink.correspondencia_confirmada,
    tipo_correspondencia: resolvedLink.tipo_correspondencia,
    payment_number: resolvedLink.payment_number,
    linha_digitavel: linhaDigitavel,
    codigo_barras: codigoBarras,
    pix_copia_cola: pixCopiaCola,
    qr_code_url: qrCodeUrl,
    qr_code_bruto: qrCodeBruto,
    origem_dos_dados: origemDosDados,
    invoice_valida: invoiceValida,
    segunda_via_disponivel: resolvedLink.segunda_via_disponivel,
    link_historico_informativo: resolvedLink.historico_informativo,
    charge_id_textual_legado: chargeIdTextualLegado,
    mensagem_operacional: resolveMensagemOperacional({
      linkValidado: linkPagamentoValidado,
      segundaViaDisponivel: resolvedLink.segunda_via_disponivel,
      historicoInformativo: resolvedLink.historico_informativo,
      correspondenciaConfirmada: resolvedLink.correspondencia_confirmada,
      paymentNumber: resolvedLink.payment_number,
      observacaoValidacao: resolvedLink.observacao_validacao,
      chargeIdTextualLegado,
    }),
    observacao_validacao: resolvedLink.observacao_validacao,
  };
}
