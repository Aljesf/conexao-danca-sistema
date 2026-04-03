export type StatusOperacionalCobranca = "PAGO" | "PENDENTE_A_VENCER" | "PENDENTE_VENCIDO";

export type NeofinStatusCobranca = "SEM_NEOFIN" | "EM_COBRANCA" | "LIQUIDADA" | "FALHA_INTEGRACAO";

export type NeofinSituacaoOperacional =
  | "VINCULADA"
  | "NAO_VINCULADA"
  | "FALHA_INTEGRACAO"
  | "NAO_SE_APLICA";

export type TipoCobrancaOperacional = "MENSALIDADE" | "AVULSA" | "OUTRA";

export type CobrancaFonteOperacional = "COBRANCA" | "COBRANCA_AVULSA";

export type CobrancaOperacionalClassificavel = {
  status_cobranca: string | null;
  data_vencimento: string | null;
  valor_centavos: number;
  valor_pago_centavos: number;
  saldo_aberto_centavos: number;
};

export type CobrancaOperacionalItem = {
  cobranca_id: number;
  cobranca_fonte: CobrancaFonteOperacional;
  cobranca_key: string;
  pessoa_id: number | null;
  pessoa_nome: string;
  pessoa_label: string;
  competencia_ano_mes: string;
  competencia_label: string;
  tipo_cobranca: TipoCobrancaOperacional;
  tipo_cobranca_label: string;
  data_vencimento: string | null;
  valor_centavos: number;
  valor_pago_centavos: number;
  saldo_centavos: number;
  saldo_aberto_centavos: number;
  valor_formatado: string;
  status_cobranca: string | null;
  status_bruto: string | null;
  status_operacional: StatusOperacionalCobranca;
  neofin_status: NeofinStatusCobranca;
  neofin_label: string;
  neofin_situacao_operacional: NeofinSituacaoOperacional;
  neofin_situacao_label: string;
  neofin_charge_id: string | null;
  neofin_invoice_id: string | null;
  origem_tipo: string | null;
  origem_subtipo: string | null;
  origem_referencia_label: string;
  dias_em_atraso: number;
  fatura_id: number | null;
  fatura_competencia: string | null;
  fatura_status: string | null;
  tipo_conta: string | null;
  tipo_conta_label: string | null;
  permite_vinculo_manual: boolean;
  sugestao_competencia_vinculo: string | null;
  sugestao_fatura_ids: number[];
  cobranca_url: string | null;
  fatura_url: string | null;
  data_pagamento: string | null;
  link_pagamento: string | null;
  linha_digitavel: string | null;
};

export type CobrancaOperacionalViewBase = {
  cobranca_id: number;
  cobranca_fonte: CobrancaFonteOperacional | string | null;
  pessoa_id: number | null;
  pessoa_nome: string | null;
  pessoa_label: string | null;
  competencia_ano_mes: string | null;
  competencia_label: string | null;
  tipo_cobranca: TipoCobrancaOperacional | string | null;
  data_vencimento: string | null;
  valor_centavos: number | null;
  valor_pago_centavos: number | null;
  saldo_centavos: number | null;
  saldo_aberto_centavos: number | null;
  status_cobranca: string | null;
  status_bruto: string | null;
  status_operacional: StatusOperacionalCobranca | string | null;
  neofin_charge_id: string | null;
  neofin_invoice_id: string | null;
  neofin_situacao_operacional: NeofinSituacaoOperacional | string | null;
  origem_tipo: string | null;
  origem_subtipo: string | null;
  origem_referencia_label: string | null;
  dias_em_atraso: number | null;
  fatura_id: number | null;
  fatura_competencia: string | null;
  fatura_status: string | null;
  tipo_conta: string | null;
  tipo_conta_label: string | null;
  permite_vinculo_manual: boolean | null;
  data_pagamento: string | null;
  link_pagamento: string | null;
  linha_digitavel: string | null;
};

export type ResumoMensalFinanceiro = {
  competencia: string;
  competencia_label: string;
  previsto_centavos: number;
  pago_centavos: number;
  pendente_centavos: number;
  a_vencer_centavos: number;
  vencido_centavos: number;
  neofin_centavos: number;
};

export type CobrancasCompetenciaGrupo = {
  competencia: string;
  competencia_label: string;
  totais: {
    previsto_centavos: number;
    pago_centavos: number;
    pendente_centavos: number;
    a_vencer_centavos: number;
    vencido_centavos: number;
    neofin_centavos: number;
  };
  grupos: {
    pago: CobrancaOperacionalItem[];
    pendente_a_vencer: CobrancaOperacionalItem[];
    pendente_vencido: CobrancaOperacionalItem[];
  };
};

export type CobrancasMensaisResponse = {
  resumo_geral: {
    total_registros: number;
    total_valor_centavos: number;
    total_pago_centavos: number;
    total_pendente_centavos: number;
    total_vencido_centavos: number;
    total_a_vencer_centavos: number;
    total_neofin_centavos: number;
  };
  meses: CobrancasCompetenciaGrupo[];
  paginacao: {
    pagina: number;
    limite: number;
    total: number;
  };
  competencias_disponiveis: Array<{
    competencia: string;
    competencia_label: string;
  }>;
  competencia_ativa_padrao: string | null;
};

export type DashboardFinanceiroMensalResponse = {
  competencia_atual: string;
  cards: {
    previsto_mes_centavos: number;
    pago_mes_centavos: number;
    pendente_mes_centavos: number;
    neofin_mes_centavos: number;
    inadimplencia_mes_percentual: number;
  };
  meses: Array<{
    competencia: string;
    previsto_centavos: number;
    pago_centavos: number;
    pendente_centavos: number;
    vencido_centavos: number;
    neofin_centavos: number;
  }>;
  destaques: Array<{
    tipo: "ALERTA" | "INFO";
    titulo: string;
    descricao: string;
    acao_sugerida: string;
  }>;
};

const MONTH_FORMATTER = new Intl.DateTimeFormat("pt-BR", { month: "long" });
const DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const STATUSS_PAGOS = new Set(["PAGO", "PAGA", "RECEBIDO", "RECEBIDA", "LIQUIDADO", "LIQUIDADA", "QUITADO", "QUITADA"]);

function normalizarTexto(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function numeroSeguro(value: number | null | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) return 0;
  return Math.trunc(value);
}

function localIsoDate(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function primeiraMaiuscula(value: string): string {
  return value ? `${value.slice(0, 1).toUpperCase()}${value.slice(1)}` : value;
}

function competenciaValida(value: string | null | undefined): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}$/.test(value);
}

function dataValida(value: string | null | undefined): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function resolverCompetencia(value: string | null | undefined, dataVencimento: string | null | undefined): string {
  if (competenciaValida(value)) return value;
  if (dataValida(dataVencimento)) return dataVencimento.slice(0, 7);
  return localIsoDate(new Date()).slice(0, 7);
}

function normalizarTipoCobrancaInterno(value: string | null | undefined): TipoCobrancaOperacional {
  const normalized = normalizarTexto(value)?.toUpperCase();
  if (normalized === "MENSALIDADE" || normalized === "AVULSA") {
    return normalized;
  }
  return "OUTRA";
}

function normalizarFonteInterna(value: string | null | undefined): CobrancaFonteOperacional {
  return normalizarTexto(value)?.toUpperCase() === "COBRANCA_AVULSA" ? "COBRANCA_AVULSA" : "COBRANCA";
}

function normalizarStatusOperacionalInterno(
  value: string | null | undefined,
  fallback: StatusOperacionalCobranca,
): StatusOperacionalCobranca {
  const normalized = normalizarTexto(value)?.toUpperCase();
  if (normalized === "PAGO" || normalized === "PENDENTE_A_VENCER" || normalized === "PENDENTE_VENCIDO") {
    return normalized;
  }
  return fallback;
}

function compareIsoAsc(a: string | null | undefined, b: string | null | undefined): number {
  const av = dataValida(a) ? a : "9999-12-31";
  const bv = dataValida(b) ? b : "9999-12-31";
  return av.localeCompare(bv);
}

function compareIsoDesc(a: string | null | undefined, b: string | null | undefined): number {
  return compareIsoAsc(b, a);
}

function comparadorPendentes(a: CobrancaOperacionalItem, b: CobrancaOperacionalItem): number {
  const byDue = compareIsoAsc(a.data_vencimento, b.data_vencimento);
  if (byDue !== 0) return byDue;
  const byType = a.tipo_cobranca_label.localeCompare(b.tipo_cobranca_label, "pt-BR");
  if (byType !== 0) return byType;
  return a.pessoa_label.localeCompare(b.pessoa_label, "pt-BR");
}

function comparadorPagos(a: CobrancaOperacionalItem, b: CobrancaOperacionalItem): number {
  const byPayment = compareIsoDesc(a.data_pagamento, b.data_pagamento);
  if (byPayment !== 0) return byPayment;
  const byDue = compareIsoDesc(a.data_vencimento, b.data_vencimento);
  if (byDue !== 0) return byDue;
  return a.pessoa_label.localeCompare(b.pessoa_label, "pt-BR");
}

export function formatarCompetenciaLabel(competencia: string | null | undefined): string {
  const resolved = resolverCompetencia(competencia, null);
  const [yearRaw, monthRaw] = resolved.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return resolved;
  }

  const referenceDate = new Date(year, month - 1, 1);
  const monthLabel = primeiraMaiuscula(MONTH_FORMATTER.format(referenceDate));
  return `${monthLabel}/${year}`;
}

export function formatarDataLabel(dataIso: string | null | undefined): string {
  if (!dataValida(dataIso)) return "-";
  return DATE_FORMATTER.format(new Date(`${dataIso}T00:00:00`));
}

export function montarPessoaLabel(nome: string | null | undefined, pessoaId: number | null | undefined): string {
  const nomeLimpo = normalizarTexto(nome);
  const idValido = typeof pessoaId === "number" && Number.isFinite(pessoaId) ? Math.trunc(pessoaId) : null;

  if (nomeLimpo && idValido) return `${nomeLimpo} (#${idValido})`;
  if (nomeLimpo) return nomeLimpo;
  if (idValido) return `Pessoa #${idValido}`;
  return "Pessoa nao identificada";
}

export function montarCobrancaKey(
  cobrancaFonte: CobrancaFonteOperacional | string | null | undefined,
  cobrancaId: number | null | undefined,
): string {
  const fonte = normalizarTexto(cobrancaFonte)?.toUpperCase() ?? "COBRANCA";
  const id = typeof cobrancaId === "number" && Number.isFinite(cobrancaId) ? Math.trunc(cobrancaId) : 0;
  return `${fonte}:${id}`;
}

export function montarTipoCobrancaLabel(tipo: TipoCobrancaOperacional | string | null | undefined): string {
  switch (normalizarTexto(tipo)?.toUpperCase()) {
    case "MENSALIDADE":
      return "Mensalidade";
    case "AVULSA":
      return "Avulsa";
    default:
      return "Cobranca diversa";
  }
}

export function montarTipoContaLabel(tipoConta: string | null | undefined): string | null {
  switch (normalizarTexto(tipoConta)?.toUpperCase()) {
    case "ALUNO":
      return "Conta Interna";
    case "COLABORADOR":
      return "Conta Interna Colaborador";
    default:
      return null;
  }
}

export function montarCobrancaOperacionalBase(
  row: CobrancaOperacionalViewBase,
  todayDate = new Date(),
): CobrancaOperacionalItem {
  const cobrancaFonte = normalizarFonteInterna(row.cobranca_fonte);
  const pessoaId = typeof row.pessoa_id === "number" && Number.isFinite(row.pessoa_id) ? row.pessoa_id : null;
  const pessoaNome = normalizarTexto(row.pessoa_nome) ?? (pessoaId ? `Pessoa #${pessoaId}` : "Pessoa nao identificada");
  const pessoaLabel = normalizarTexto(row.pessoa_label) ?? montarPessoaLabel(pessoaNome, pessoaId);
  const competenciaFinal = resolverCompetencia(row.competencia_ano_mes, row.data_vencimento);
  const valorCentavos = numeroSeguro(row.valor_centavos);
  const valorPagoCentavos = numeroSeguro(row.valor_pago_centavos);
  const saldoAbertoCentavos = Math.max(numeroSeguro(row.saldo_aberto_centavos), 0);
  const statusFallback = classificarStatusOperacionalCobranca(
    {
      status_cobranca: row.status_cobranca,
      data_vencimento: row.data_vencimento,
      valor_centavos: valorCentavos,
      valor_pago_centavos: valorPagoCentavos,
      saldo_aberto_centavos: saldoAbertoCentavos,
    },
    todayDate,
  );
  const statusOperacional = normalizarStatusOperacionalInterno(row.status_operacional, statusFallback);
  const tipoCobranca = normalizarTipoCobrancaInterno(row.tipo_cobranca);
  const neofinSituacao = normalizarNeofinSituacaoOperacional(row.neofin_situacao_operacional, statusOperacional);
  const neofinStatus = inferirNeofinStatusCobranca(
    normalizarTexto(row.neofin_charge_id) ?? normalizarTexto(row.neofin_invoice_id),
    statusOperacional,
    neofinSituacao,
  );

  return {
    cobranca_id: row.cobranca_id,
    cobranca_fonte: cobrancaFonte,
    cobranca_key: montarCobrancaKey(cobrancaFonte, row.cobranca_id),
    pessoa_id: pessoaId,
    pessoa_nome: pessoaNome,
    pessoa_label: pessoaLabel,
    competencia_ano_mes: competenciaFinal,
    competencia_label: normalizarTexto(row.competencia_label) ?? formatarCompetenciaLabel(competenciaFinal),
    tipo_cobranca: tipoCobranca,
    tipo_cobranca_label: montarTipoCobrancaLabel(tipoCobranca),
    data_vencimento: row.data_vencimento,
    valor_centavos: valorCentavos,
    valor_pago_centavos: valorPagoCentavos,
    saldo_centavos: numeroSeguro(row.saldo_centavos) || saldoAbertoCentavos,
    saldo_aberto_centavos: saldoAbertoCentavos,
    valor_formatado: formatBRLFromCents(valorCentavos),
    status_cobranca: row.status_cobranca,
    status_bruto: row.status_bruto ?? row.status_cobranca,
    status_operacional: statusOperacional,
    neofin_status: neofinStatus,
    neofin_label: montarNeofinLabel(neofinStatus),
    neofin_situacao_operacional: neofinSituacao,
    neofin_situacao_label: montarNeofinSituacaoLabel(neofinSituacao, neofinStatus),
    neofin_charge_id: normalizarTexto(row.neofin_charge_id),
    neofin_invoice_id: normalizarTexto(row.neofin_invoice_id),
    origem_tipo: row.origem_tipo,
    origem_subtipo: row.origem_subtipo,
    origem_referencia_label:
      normalizarTexto(row.origem_referencia_label) ?? normalizarTexto(row.pessoa_label) ?? "Cobranca operacional",
    dias_em_atraso: numeroSeguro(row.dias_em_atraso),
    fatura_id: typeof row.fatura_id === "number" && Number.isFinite(row.fatura_id) ? row.fatura_id : null,
    fatura_competencia: normalizarTexto(row.fatura_competencia),
    fatura_status: normalizarTexto(row.fatura_status),
    tipo_conta: normalizarTexto(row.tipo_conta),
    tipo_conta_label: normalizarTexto(row.tipo_conta_label) ?? montarTipoContaLabel(row.tipo_conta),
    permite_vinculo_manual: row.permite_vinculo_manual === true,
    sugestao_competencia_vinculo: competenciaFinal,
    sugestao_fatura_ids: [],
    cobranca_url: null,
    fatura_url:
      typeof row.fatura_id === "number" && Number.isFinite(row.fatura_id)
        ? `/admin/financeiro/credito-conexao/faturas/${row.fatura_id}`
        : null,
    data_pagamento: row.data_pagamento,
    link_pagamento: normalizarTexto(row.link_pagamento),
    linha_digitavel: normalizarTexto(row.linha_digitavel),
  };
}

export function classificarStatusOperacionalCobranca(
  cobranca: CobrancaOperacionalClassificavel,
  todayDate = new Date(),
): StatusOperacionalCobranca {
  const status = normalizarTexto(cobranca.status_cobranca)?.toUpperCase() ?? "";
  const saldoAberto = Math.max(numeroSeguro(cobranca.saldo_aberto_centavos), 0);
  const valorCentavos = Math.max(numeroSeguro(cobranca.valor_centavos), 0);
  const valorPago = Math.max(numeroSeguro(cobranca.valor_pago_centavos), 0);

  if (STATUSS_PAGOS.has(status) || saldoAberto <= 0 || (valorCentavos > 0 && valorPago >= valorCentavos)) {
    return "PAGO";
  }

  const todayIso = localIsoDate(todayDate);
  if (dataValida(cobranca.data_vencimento) && cobranca.data_vencimento < todayIso) {
    return "PENDENTE_VENCIDO";
  }

  return "PENDENTE_A_VENCER";
}

export function normalizarNeofinSituacaoOperacional(
  value: string | null | undefined,
  statusOperacional: StatusOperacionalCobranca,
): NeofinSituacaoOperacional {
  switch (normalizarTexto(value)?.toUpperCase()) {
    case "VINCULADA":
      return "VINCULADA";
    case "FALHA_INTEGRACAO":
      return "FALHA_INTEGRACAO";
    case "NAO_VINCULADA":
      return "NAO_VINCULADA";
    case "NAO_SE_APLICA":
      return "NAO_SE_APLICA";
    default:
      return statusOperacional === "PAGO" ? "NAO_SE_APLICA" : "NAO_VINCULADA";
  }
}

export function inferirNeofinStatusCobranca(
  neofinIdentifier: string | null | undefined,
  statusOperacional: StatusOperacionalCobranca,
  neofinSituacao?: NeofinSituacaoOperacional | string | null,
): NeofinStatusCobranca {
  const situacao = normalizarTexto(neofinSituacao)?.toUpperCase();

  if (situacao === "FALHA_INTEGRACAO") return "FALHA_INTEGRACAO";
  if (situacao === "VINCULADA") {
    return statusOperacional === "PAGO" ? "LIQUIDADA" : "EM_COBRANCA";
  }

  if (!normalizarTexto(neofinIdentifier)) return "SEM_NEOFIN";
  return statusOperacional === "PAGO" ? "LIQUIDADA" : "EM_COBRANCA";
}

export function montarNeofinLabel(status: NeofinStatusCobranca): string {
  switch (status) {
    case "LIQUIDADA":
      return "NeoFin liquidada";
    case "EM_COBRANCA":
      return "Em cobranca NeoFin";
    case "FALHA_INTEGRACAO":
      return "Falha de integracao";
    default:
      return "Sem NeoFin";
  }
}

export function montarNeofinSituacaoLabel(
  situacao: NeofinSituacaoOperacional,
  status: NeofinStatusCobranca,
): string {
  switch (situacao) {
    case "VINCULADA":
      return status === "LIQUIDADA" ? "NeoFin liquidada" : "Em cobranca NeoFin";
    case "FALHA_INTEGRACAO":
      return "Falha de integracao";
    case "NAO_VINCULADA":
      return "Sem vinculo NeoFin";
    default:
      return "Nao se aplica";
  }
}

export function calcularResumoMensalFinanceiro(items: CobrancaOperacionalItem[]): ResumoMensalFinanceiro[] {
  const resumoPorCompetencia = new Map<string, ResumoMensalFinanceiro>();

  for (const item of items) {
    const competencia = resolverCompetencia(item.competencia_ano_mes, item.data_vencimento);
    const atual =
      resumoPorCompetencia.get(competencia) ??
      {
        competencia,
        competencia_label: formatarCompetenciaLabel(competencia),
        previsto_centavos: 0,
        pago_centavos: 0,
        pendente_centavos: 0,
        a_vencer_centavos: 0,
        vencido_centavos: 0,
        neofin_centavos: 0,
      };

    const valorCentavos = Math.max(numeroSeguro(item.valor_centavos), 0);
    const valorPagoCentavos = Math.max(numeroSeguro(item.valor_pago_centavos), 0);
    const saldoAbertoCentavos = Math.max(numeroSeguro(item.saldo_aberto_centavos), 0);

    atual.previsto_centavos += valorCentavos;
    atual.pago_centavos += Math.min(valorPagoCentavos, valorCentavos);
    atual.pendente_centavos += saldoAbertoCentavos;

    if (item.status_operacional === "PENDENTE_VENCIDO") {
      atual.vencido_centavos += saldoAbertoCentavos;
    }

    if (item.status_operacional === "PENDENTE_A_VENCER") {
      atual.a_vencer_centavos += saldoAbertoCentavos;
    }

    if (item.neofin_situacao_operacional === "VINCULADA" && saldoAbertoCentavos > 0) {
      atual.neofin_centavos += saldoAbertoCentavos;
    }

    resumoPorCompetencia.set(competencia, atual);
  }

  return Array.from(resumoPorCompetencia.values()).sort((a, b) => b.competencia.localeCompare(a.competencia));
}

export function agruparCobrancasPorCompetencia(items: CobrancaOperacionalItem[]): CobrancasCompetenciaGrupo[] {
  const resumoPorCompetencia = new Map(
    calcularResumoMensalFinanceiro(items).map((resumo) => [resumo.competencia, resumo] as const),
  );
  const grupos = new Map<string, CobrancasCompetenciaGrupo>();

  for (const item of items) {
    const competencia = resolverCompetencia(item.competencia_ano_mes, item.data_vencimento);
    const resumo =
      resumoPorCompetencia.get(competencia) ??
      {
        competencia,
        competencia_label: formatarCompetenciaLabel(competencia),
        previsto_centavos: 0,
        pago_centavos: 0,
        pendente_centavos: 0,
        a_vencer_centavos: 0,
        vencido_centavos: 0,
        neofin_centavos: 0,
      };

    const atual =
      grupos.get(competencia) ??
      {
        competencia,
        competencia_label: resumo.competencia_label,
        totais: {
          previsto_centavos: resumo.previsto_centavos,
          pago_centavos: resumo.pago_centavos,
          pendente_centavos: resumo.pendente_centavos,
          a_vencer_centavos: resumo.a_vencer_centavos,
          vencido_centavos: resumo.vencido_centavos,
          neofin_centavos: resumo.neofin_centavos,
        },
        grupos: {
          pago: [],
          pendente_a_vencer: [],
          pendente_vencido: [],
        },
      };

    if (item.status_operacional === "PAGO") {
      atual.grupos.pago.push(item);
    } else if (item.status_operacional === "PENDENTE_VENCIDO") {
      atual.grupos.pendente_vencido.push(item);
    } else {
      atual.grupos.pendente_a_vencer.push(item);
    }

    grupos.set(competencia, atual);
  }

  const ordenados = Array.from(grupos.values()).sort((a, b) => b.competencia.localeCompare(a.competencia));

  for (const grupo of ordenados) {
    grupo.grupos.pendente_vencido.sort(comparadorPendentes);
    grupo.grupos.pendente_a_vencer.sort(comparadorPendentes);
    grupo.grupos.pago.sort(comparadorPagos);
  }

  return ordenados;
}
import { formatBRLFromCents } from "@/lib/formatters/money";
