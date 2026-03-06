export type StatusOperacionalCobranca = "PAGO" | "PENDENTE_A_VENCER" | "PENDENTE_VENCIDO";

export type NeofinStatusCobranca = "SEM_NEOFIN" | "EM_COBRANCA" | "LIQUIDADA";

export type CobrancaOperacionalClassificavel = {
  status_cobranca: string | null;
  data_vencimento: string | null;
  valor_centavos: number;
  valor_pago_centavos: number;
  saldo_aberto_centavos: number;
};

export type CobrancaOperacionalItem = {
  cobranca_id: number;
  pessoa_id: number | null;
  pessoa_nome: string;
  pessoa_label: string;
  competencia_ano_mes: string;
  competencia_label: string;
  data_vencimento: string | null;
  valor_centavos: number;
  valor_pago_centavos: number;
  saldo_aberto_centavos: number;
  valor_formatado: string;
  status_cobranca: string | null;
  status_operacional: StatusOperacionalCobranca;
  neofin_status: NeofinStatusCobranca;
  neofin_label: string;
  neofin_charge_id: string | null;
  origem_tipo: string | null;
  origem_subtipo: string | null;
  origem_referencia_label: string;
  dias_em_atraso: number;
  fatura_id: number | null;
  cobranca_url: string | null;
  fatura_url: string | null;
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

export function inferirNeofinStatusCobranca(
  neofinChargeId: string | null | undefined,
  statusOperacional: StatusOperacionalCobranca,
): NeofinStatusCobranca {
  if (!normalizarTexto(neofinChargeId)) return "SEM_NEOFIN";
  return statusOperacional === "PAGO" ? "LIQUIDADA" : "EM_COBRANCA";
}

export function montarNeofinLabel(status: NeofinStatusCobranca): string {
  switch (status) {
    case "LIQUIDADA":
      return "NeoFin liquidada";
    case "EM_COBRANCA":
      return "Em cobranca NeoFin";
    default:
      return "Sem NeoFin";
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

    if (item.neofin_charge_id && saldoAbertoCentavos > 0) {
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
