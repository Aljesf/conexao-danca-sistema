import {
  formatarCompetenciaLabel,
  inferirNeofinStatusCobranca,
  montarNeofinLabel,
  montarTipoContaLabel,
  normalizarNeofinSituacaoOperacional,
  type NeofinSituacaoOperacional,
  type NeofinStatusCobranca,
  type StatusOperacionalCobranca,
} from "@/lib/financeiro/creditoConexao/cobrancas";

export type DashboardMensalCardKey =
  | "previsto_para_receber"
  | "recebido_no_mes"
  | "pendente_do_mes"
  | "em_cobranca_neofin"
  | "inadimplencia_do_mes";

export type DashboardMensalNaturezaKey = "previsto" | "pago" | "pendente" | "vencido" | "neofin";

export type DashboardFinanceiroFonteItem = "COBRANCA" | "COBRANCA_AVULSA" | "LANCAMENTO";

export type DashboardFinanceiroStatusNormalizado =
  | "RECEBIDO_CONFIRMADO"
  | "PENDENTE_A_VENCER"
  | "PENDENTE_VENCIDO"
  | "CANCELADO"
  | "EXPURGADO"
  | "INATIVO";

export type DashboardFinanceiroResumoExclusoes = {
  total_itens_excluidos: number;
  itens_cancelados: number;
  itens_expurgados: number;
  itens_inativos: number;
  mensagem: string | null;
};

export type DashboardFinanceiroComposicaoItem = {
  competencia: string;
  competencia_label: string;
  cobranca_id: number | null;
  lancamento_id: number | null;
  cobranca_key: string;
  cobranca_fonte: DashboardFinanceiroFonteItem;
  pessoa_id: number | null;
  pessoa_nome: string;
  pessoa_label: string;
  conta_conexao_id: number | null;
  conta_interna_id: number | null;
  tipo_conta: string | null;
  tipo_conta_label: string | null;
  origem_tipo: string | null;
  origem_subtipo: string | null;
  origem_id: number | null;
  origem_label: string;
  origem_lancamento: string | null;
  origem_fatura: string | null;
  descricao: string;
  referencia: string;
  status: StatusOperacionalCobranca;
  status_label: string;
  status_bruto: string | null;
  status_original: string | null;
  status_normalizado: DashboardFinanceiroStatusNormalizado;
  valor_nominal_centavos: number;
  valor_previsto_centavos: number;
  valor_recebido_centavos: number;
  valor_pendente_centavos: number;
  valor_vencido_centavos: number;
  valor_neofin_centavos: number;
  elegivel_previsto: boolean;
  elegivel_recebido: boolean;
  elegivel_pendente: boolean;
  elegivel_vencido: boolean;
  elegivel_neofin: boolean;
  excluido_do_total: boolean;
  motivo_exclusao: string | null;
  gerado_antecipadamente: boolean;
  neofin_status: NeofinStatusCobranca;
  neofin_label: string;
  neofin_situacao_operacional: NeofinSituacaoOperacional;
  data_vencimento: string | null;
  data_pagamento: string | null;
  observacao_resumo: string | null;
  fatura_id: number | null;
  fatura_competencia: string | null;
  fatura_status: string | null;
  cobranca_url: string | null;
  fatura_url: string | null;
  dias_em_atraso: number;
  created_at: string | null;
  updated_at: string | null;
};

export type DashboardFinanceiroComposicaoResumo = {
  total_itens: number;
  itens_sem_neofin: number;
  itens_vencidos: number;
  itens_competencia_futura: number;
  itens_excluidos_total: number;
  itens_gerados_antecipadamente: number;
};

export type DashboardFinanceiroCardDetalhe = {
  indicador: DashboardMensalCardKey;
  titulo: string;
  competencia: string;
  competencia_label: string;
  total_centavos: number;
  percentual: number | null;
  composicao: DashboardFinanceiroComposicaoItem[];
  composicao_excluida: DashboardFinanceiroComposicaoItem[];
  resumo: DashboardFinanceiroComposicaoResumo;
  resumo_exclusoes: DashboardFinanceiroResumoExclusoes;
  observacao_resumo: string | null;
};

export type DashboardFinanceiroCompetenciaDetalhe = {
  competencia: string;
  competencia_label: string;
  previsto_centavos: number;
  pago_centavos: number;
  pendente_centavos: number;
  vencido_centavos: number;
  neofin_centavos: number;
  quantidade_itens: number;
  quantidade_itens_excluidos: number;
  observacao_resumo: string | null;
  resumo_exclusoes: DashboardFinanceiroResumoExclusoes;
  composicao_previsto: DashboardFinanceiroComposicaoItem[];
  composicao_pago: DashboardFinanceiroComposicaoItem[];
  composicao_pendente: DashboardFinanceiroComposicaoItem[];
  composicao_vencido: DashboardFinanceiroComposicaoItem[];
  composicao_neofin: DashboardFinanceiroComposicaoItem[];
  composicao_excluida: DashboardFinanceiroComposicaoItem[];
};

export type DashboardFinanceiroMensalResponse = {
  competencia_atual: string;
  faixa_competencias: {
    inicio: string;
    fim: string;
    limite: number;
    tipo_conta: string;
    tipo_conta_label: string | null;
  };
  cards: {
    previsto_mes_centavos: number;
    pago_mes_centavos: number;
    pendente_mes_centavos: number;
    neofin_mes_centavos: number;
    inadimplencia_mes_percentual: number;
  };
  cards_detalhe: Record<DashboardMensalCardKey, DashboardFinanceiroCardDetalhe>;
  meses: DashboardFinanceiroCompetenciaDetalhe[];
  destaques: Array<{
    tipo: "ALERTA" | "INFO";
    titulo: string;
    descricao: string;
    acao_sugerida: string;
  }>;
};

export type DashboardFinanceiroMensalPayloadBase = Omit<DashboardFinanceiroMensalResponse, "destaques">;

export type DashboardFinanceiroNormalizacaoInput = {
  competencia: string;
  cobranca_id?: number | null;
  lancamento_id?: number | null;
  cobranca_key: string;
  cobranca_fonte: DashboardFinanceiroFonteItem;
  pessoa_id?: number | null;
  pessoa_nome: string;
  pessoa_label?: string | null;
  conta_conexao_id?: number | null;
  conta_interna_id?: number | null;
  tipo_conta?: string | null;
  tipo_conta_label?: string | null;
  origem_tipo?: string | null;
  origem_subtipo?: string | null;
  origem_id?: number | null;
  origem_lancamento?: string | null;
  origem_fatura?: string | null;
  descricao?: string | null;
  referencia?: string | null;
  status_operacional?: StatusOperacionalCobranca | null;
  status_bruto?: string | null;
  status_original?: string | null;
  valor_nominal_centavos: number;
  valor_recebido_confirmado_centavos?: number | null;
  valor_pendente_base_centavos?: number | null;
  data_vencimento?: string | null;
  data_pagamento?: string | null;
  neofin_status?: NeofinStatusCobranca | null;
  neofin_label?: string | null;
  neofin_situacao_operacional?: NeofinSituacaoOperacional | null;
  fatura_id?: number | null;
  fatura_competencia?: string | null;
  fatura_status?: string | null;
  cobranca_url?: string | null;
  fatura_url?: string | null;
  dias_em_atraso?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  cancelado?: boolean;
  expurgado?: boolean;
  inativo?: boolean;
  motivo_cancelamento?: string | null;
  motivo_expurgo?: string | null;
  gerado_antecipadamente?: boolean;
};

type MontarDashboardFinanceiroMensalParams = {
  items: DashboardFinanceiroComposicaoItem[];
  competenciaSelecionada: string;
  competenciaInicio: string;
  competenciaFim: string;
  limite: number;
  tipoConta: string;
  competenciaAtualReal: string;
};

function normalizarTexto(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function numeroSeguro(value: number | null | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) return 0;
  return Math.trunc(value);
}

function pluralizar(label: string, quantidade: number): string {
  return quantidade === 1 ? label : `${label}s`;
}

function humanizarChave(value: string | null | undefined): string | null {
  const normalized = normalizarTexto(value);
  if (!normalized) return null;

  return normalized
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function upper(value: string | null | undefined): string {
  return normalizarTexto(value)
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase() ?? "";
}

function statusOperacionalLabel(status: StatusOperacionalCobranca): string {
  switch (status) {
    case "PAGO":
      return "Pago";
    case "PENDENTE_VENCIDO":
      return "Pendente vencido";
    default:
      return "Pendente a vencer";
  }
}

function compareIsoAsc(a: string | null | undefined, b: string | null | undefined): number {
  const av = normalizarTexto(a) ?? "9999-12-31";
  const bv = normalizarTexto(b) ?? "9999-12-31";
  return av.localeCompare(bv);
}

function compareIsoDesc(a: string | null | undefined, b: string | null | undefined): number {
  return compareIsoAsc(b, a);
}

function competenciaToIndex(competencia: string): number {
  const [yearRaw, monthRaw] = competencia.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);

  if (!Number.isFinite(year) || !Number.isFinite(month)) return Number.MAX_SAFE_INTEGER;
  return year * 12 + (month - 1);
}

export function compareCompetenciaAsc(a: string, b: string): number {
  return competenciaToIndex(a) - competenciaToIndex(b);
}

function compareCompetenciaDesc(a: string, b: string): number {
  return compareCompetenciaAsc(b, a);
}

export function addCompetenciaMonths(competencia: string, offset: number): string {
  const [yearRaw, monthRaw] = competencia.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const date = new Date(year, month - 1 + offset, 1);
  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
  return `${nextYear}-${nextMonth}`;
}

export function buildCompetenciaSeries(inicio: string, fim: string): string[] {
  if (compareCompetenciaAsc(inicio, fim) > 0) return [];

  const competencias: string[] = [];
  let atual = inicio;

  while (compareCompetenciaAsc(atual, fim) <= 0) {
    competencias.push(atual);
    atual = addCompetenciaMonths(atual, 1);
  }

  return competencias;
}

function isStatusCancelado(value: string | null | undefined): boolean {
  return new Set(["CANCELADO", "CANCELADA", "CANCELED", "CANCELLED", "VOID"]).has(upper(value));
}

function inferirStatusOperacional(
  dataVencimento: string | null,
  valorNominalCentavos: number,
  valorRecebidoCentavos: number,
  valorPendenteCentavos: number,
): StatusOperacionalCobranca {
  if (
    valorPendenteCentavos <= 0 ||
    (valorNominalCentavos > 0 && valorRecebidoCentavos >= valorNominalCentavos)
  ) {
    return "PAGO";
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  if (normalizarTexto(dataVencimento) && String(dataVencimento) < todayIso) {
    return "PENDENTE_VENCIDO";
  }

  return "PENDENTE_A_VENCER";
}

function buildOrigemLabel(item: DashboardFinanceiroNormalizacaoInput): string {
  const partes = [
    item.cobranca_fonte === "LANCAMENTO" ? "Lancamento" : null,
    item.cobranca_fonte !== "LANCAMENTO" && upper(item.origem_subtipo) === "CARTAO_CONEXAO"
      ? "Mensalidade"
      : null,
    humanizarChave(item.origem_tipo),
    humanizarChave(item.origem_subtipo),
    humanizarChave(item.origem_lancamento),
  ].filter((value, index, array): value is string => Boolean(value) && array.indexOf(value) === index);

  return partes.join(" / ") || "Cobranca operacional";
}

function motivoExclusaoResumo(item: DashboardFinanceiroComposicaoItem): string {
  switch (item.motivo_exclusao) {
    case "expurgado":
      return "expurgado";
    case "inativo":
      return "inativo";
    default:
      return "cancelado";
  }
}

function buildObservacaoResumo(item: DashboardFinanceiroComposicaoItem): string | null {
  const observacoes: string[] = [];

  if (item.excluido_do_total) {
    observacoes.push(`Item excluido do total: ${motivoExclusaoResumo(item)}`);
  }

  if (item.gerado_antecipadamente) {
    observacoes.push("Previsao baseada em lancamento ativo ja gerado");
  }

  if (item.cobranca_fonte === "LANCAMENTO") {
    observacoes.push("Sem dependencia de fatura fechada para previsao");
  }

  if (item.status === "PENDENTE_VENCIDO" && item.dias_em_atraso > 0) {
    observacoes.push(`${item.dias_em_atraso} ${pluralizar("dia", item.dias_em_atraso)} de atraso`);
  }

  if (item.elegivel_recebido && item.data_pagamento) {
    observacoes.push(`Recebimento confirmado em ${item.data_pagamento}`);
  }

  if (item.elegivel_pendente && !item.elegivel_neofin) {
    observacoes.push("Sem vinculo NeoFin");
  } else if (item.elegivel_neofin) {
    observacoes.push("Carteira em cobranca NeoFin");
  }

  return observacoes.length > 0 ? observacoes.join(" | ") : null;
}

function sortComposicao(
  items: DashboardFinanceiroComposicaoItem[],
  natureza: DashboardMensalNaturezaKey,
): DashboardFinanceiroComposicaoItem[] {
  return [...items].sort((a, b) => {
    if (natureza === "pago") {
      const byPagamento = compareIsoDesc(a.data_pagamento, b.data_pagamento);
      if (byPagamento !== 0) return byPagamento;
    }

    const byVencimento = compareIsoAsc(a.data_vencimento, b.data_vencimento);
    if (byVencimento !== 0) return byVencimento;

    const byPessoa = a.pessoa_nome.localeCompare(b.pessoa_nome, "pt-BR");
    if (byPessoa !== 0) return byPessoa;

    return a.cobranca_key.localeCompare(b.cobranca_key, "pt-BR");
  });
}

function resumirExclusoes(items: DashboardFinanceiroComposicaoItem[]): DashboardFinanceiroResumoExclusoes {
  const itensExpurgados = items.filter((item) => item.motivo_exclusao === "expurgado").length;
  const itensInativos = items.filter((item) => item.motivo_exclusao === "inativo").length;
  const itensCancelados = items.filter((item) => item.motivo_exclusao !== "expurgado" && item.motivo_exclusao !== "inativo").length;
  const partesMensagem: string[] = [];

  if (itensCancelados > 0) partesMensagem.push(`${itensCancelados} ${pluralizar("cancelado", itensCancelados)}`);
  if (itensExpurgados > 0) partesMensagem.push(`${itensExpurgados} ${pluralizar("expurgado", itensExpurgados)}`);
  if (itensInativos > 0) partesMensagem.push(`${itensInativos} ${pluralizar("inativo", itensInativos)}`);

  return {
    total_itens_excluidos: items.length,
    itens_cancelados: itensCancelados,
    itens_expurgados: itensExpurgados,
    itens_inativos: itensInativos,
    mensagem: partesMensagem.length > 0
      ? `${partesMensagem.join(", ")} ${partesMensagem.length === 1 ? "foi excluido" : "foram excluidos"} desta composicao.`
      : null,
  };
}

function resumirComposicao(
  elegiveis: DashboardFinanceiroComposicaoItem[],
  excluidos: DashboardFinanceiroComposicaoItem[],
  competenciaAtualReal: string,
): DashboardFinanceiroComposicaoResumo {
  return {
    total_itens: elegiveis.length,
    itens_sem_neofin: elegiveis.filter((item) => item.elegivel_pendente && !item.elegivel_neofin).length,
    itens_vencidos: elegiveis.filter((item) => item.elegivel_vencido).length,
    itens_competencia_futura: elegiveis.filter((item) => compareCompetenciaAsc(item.competencia, competenciaAtualReal) > 0).length,
    itens_excluidos_total: excluidos.length,
    itens_gerados_antecipadamente: elegiveis.filter((item) => item.gerado_antecipadamente).length,
  };
}

function filtrarNatureza(
  items: DashboardFinanceiroComposicaoItem[],
  natureza: DashboardMensalNaturezaKey,
): DashboardFinanceiroComposicaoItem[] {
  if (natureza === "previsto") {
    return sortComposicao(items.filter((item) => item.elegivel_previsto && item.valor_previsto_centavos > 0), natureza);
  }
  if (natureza === "pago") {
    return sortComposicao(items.filter((item) => item.elegivel_recebido && item.valor_recebido_centavos > 0), natureza);
  }
  if (natureza === "pendente") {
    return sortComposicao(items.filter((item) => item.elegivel_pendente && item.valor_pendente_centavos > 0), natureza);
  }
  if (natureza === "vencido") {
    return sortComposicao(items.filter((item) => item.elegivel_vencido && item.valor_vencido_centavos > 0), natureza);
  }
  return sortComposicao(items.filter((item) => item.elegivel_neofin && item.valor_neofin_centavos > 0), natureza);
}

function totalNatureza(items: DashboardFinanceiroComposicaoItem[], natureza: DashboardMensalNaturezaKey): number {
  if (natureza === "previsto") return items.reduce((acc, item) => acc + item.valor_previsto_centavos, 0);
  if (natureza === "pago") return items.reduce((acc, item) => acc + item.valor_recebido_centavos, 0);
  if (natureza === "pendente") return items.reduce((acc, item) => acc + item.valor_pendente_centavos, 0);
  if (natureza === "vencido") return items.reduce((acc, item) => acc + item.valor_vencido_centavos, 0);
  return items.reduce((acc, item) => acc + item.valor_neofin_centavos, 0);
}

function criarObservacaoCompetencia(
  competencia: string,
  elegiveis: DashboardFinanceiroComposicaoItem[],
  excluidos: DashboardFinanceiroComposicaoItem[],
  competenciaAtualReal: string,
): string {
  const exclusoes = resumirExclusoes(excluidos);

  if (elegiveis.length === 0) {
    if (compareCompetenciaAsc(competencia, competenciaAtualReal) > 0) {
      return exclusoes.total_itens_excluidos > 0
        ? `Competencia futura sem itens elegiveis. ${exclusoes.mensagem ?? "Itens cancelados/expurgados ficaram fora do total."}`
        : "Competencia futura sem lancamentos ativos ja gerados.";
    }

    return exclusoes.total_itens_excluidos > 0
      ? `Sem lancamentos elegiveis na competencia. ${exclusoes.mensagem ?? "Itens cancelados/expurgados ficaram fora do total."}`
      : "Sem lancamentos elegiveis no filtro atual.";
  }

  const geradosAntecipadamente = elegiveis.filter((item) => item.gerado_antecipadamente).length;
  const neofin = elegiveis.filter((item) => item.elegivel_neofin).length;
  const pendentes = elegiveis.filter((item) => item.elegivel_pendente).length;
  const recebidos = elegiveis.filter((item) => item.elegivel_recebido).length;
  const partes: string[] = [];

  if (geradosAntecipadamente > 0) {
    partes.push("Previsao baseada em lancamentos ativos ja gerados na Conta Interna Aluno.");
  }
  if (recebidos > 0) {
    partes.push(`${recebidos} ${pluralizar("item", recebidos)} com recebimento financeiro confirmado.`);
  }
  if (pendentes > 0) {
    partes.push(`${pendentes} ${pluralizar("item", pendentes)} em aberto na composicao operacional.`);
  }
  if (neofin > 0) {
    partes.push(`${neofin} ${pluralizar("item", neofin)} em cobranca NeoFin.`);
  }
  if (exclusoes.total_itens_excluidos > 0 && exclusoes.mensagem) {
    partes.push(`Itens cancelados/expurgados nao compoem este total: ${exclusoes.mensagem}`);
  }

  return partes.join(" ");
}

function cardTitulo(indicador: DashboardMensalCardKey): string {
  switch (indicador) {
    case "previsto_para_receber":
      return "Previsto para receber";
    case "recebido_no_mes":
      return "Recebido no mes";
    case "pendente_do_mes":
      return "Pendente do mes";
    case "em_cobranca_neofin":
      return "Em cobranca NeoFin";
    default:
      return "Inadimplencia do mes";
  }
}

function cardObservacao(
  indicador: DashboardMensalCardKey,
  observacaoCompetencia: string,
  exclusoes: DashboardFinanceiroResumoExclusoes,
): string {
  const prefixoExclusao = exclusoes.total_itens_excluidos > 0
    ? "Itens cancelados/expurgados nao compoem este total. "
    : "";

  switch (indicador) {
    case "recebido_no_mes":
      return `${prefixoExclusao}Somente recebimentos financeiros confirmados entram neste total. ${observacaoCompetencia}`;
    case "pendente_do_mes":
      return `${prefixoExclusao}Saldo aberto elegivel da competencia operacional selecionada. ${observacaoCompetencia}`;
    case "em_cobranca_neofin":
      return `${prefixoExclusao}Somente itens vinculados e ainda em cobranca entram neste total. ${observacaoCompetencia}`;
    case "inadimplencia_do_mes":
      return `${prefixoExclusao}Indicador calculado sobre o vencido elegivel em relacao ao previsto. ${observacaoCompetencia}`;
    default:
      return `${prefixoExclusao}${observacaoCompetencia}`;
  }
}

function montarCardDetalhe(
  indicador: DashboardMensalCardKey,
  competencia: string,
  itemsTodos: DashboardFinanceiroComposicaoItem[],
  competenciaAtualReal: string,
): DashboardFinanceiroCardDetalhe {
  const competenciaLabel = formatarCompetenciaLabel(competencia);
  const elegiveis = itemsTodos.filter((item) => !item.excluido_do_total);
  const excluidos = sortComposicao(itemsTodos.filter((item) => item.excluido_do_total), "previsto");
  const resumoExclusoes = resumirExclusoes(excluidos);
  const observacaoCompetencia = criarObservacaoCompetencia(
    competencia,
    elegiveis,
    excluidos,
    competenciaAtualReal,
  );

  if (indicador === "inadimplencia_do_mes") {
    const composicao = filtrarNatureza(elegiveis, "vencido");
    const totalVencido = totalNatureza(composicao, "vencido");
    const totalPrevisto = totalNatureza(filtrarNatureza(elegiveis, "previsto"), "previsto");

    return {
      indicador,
      titulo: cardTitulo(indicador),
      competencia,
      competencia_label: competenciaLabel,
      total_centavos: totalVencido,
      percentual: totalPrevisto > 0 ? Math.round((totalVencido / totalPrevisto) * 1000) / 10 : 0,
      composicao,
      composicao_excluida: excluidos,
      resumo: resumirComposicao(composicao, excluidos, competenciaAtualReal),
      resumo_exclusoes: resumoExclusoes,
      observacao_resumo: cardObservacao(indicador, observacaoCompetencia, resumoExclusoes),
    };
  }

  const natureza =
    indicador === "previsto_para_receber"
      ? "previsto"
      : indicador === "recebido_no_mes"
        ? "pago"
        : indicador === "pendente_do_mes"
          ? "pendente"
          : "neofin";
  const composicao = filtrarNatureza(elegiveis, natureza);

  return {
    indicador,
    titulo: cardTitulo(indicador),
    competencia,
    competencia_label: competenciaLabel,
    total_centavos: totalNatureza(composicao, natureza),
    percentual: null,
    composicao,
    composicao_excluida: excluidos,
    resumo: resumirComposicao(composicao, excluidos, competenciaAtualReal),
    resumo_exclusoes: resumoExclusoes,
    observacao_resumo: cardObservacao(indicador, observacaoCompetencia, resumoExclusoes),
  };
}

function criarCompetenciaDetalhe(
  competencia: string,
  itemsTodos: DashboardFinanceiroComposicaoItem[],
  competenciaAtualReal: string,
): DashboardFinanceiroCompetenciaDetalhe {
  const elegiveis = itemsTodos.filter((item) => !item.excluido_do_total);
  const excluidos = sortComposicao(itemsTodos.filter((item) => item.excluido_do_total), "previsto");
  const composicaoPrevisto = filtrarNatureza(elegiveis, "previsto");
  const composicaoPago = filtrarNatureza(elegiveis, "pago");
  const composicaoPendente = filtrarNatureza(elegiveis, "pendente");
  const composicaoVencido = filtrarNatureza(elegiveis, "vencido");
  const composicaoNeofin = filtrarNatureza(elegiveis, "neofin");

  return {
    competencia,
    competencia_label: formatarCompetenciaLabel(competencia),
    previsto_centavos: totalNatureza(composicaoPrevisto, "previsto"),
    pago_centavos: totalNatureza(composicaoPago, "pago"),
    pendente_centavos: totalNatureza(composicaoPendente, "pendente"),
    vencido_centavos: totalNatureza(composicaoVencido, "vencido"),
    neofin_centavos: totalNatureza(composicaoNeofin, "neofin"),
    quantidade_itens: elegiveis.length,
    quantidade_itens_excluidos: excluidos.length,
    observacao_resumo: criarObservacaoCompetencia(
      competencia,
      elegiveis,
      excluidos,
      competenciaAtualReal,
    ),
    resumo_exclusoes: resumirExclusoes(excluidos),
    composicao_previsto: composicaoPrevisto,
    composicao_pago: composicaoPago,
    composicao_pendente: composicaoPendente,
    composicao_vencido: composicaoVencido,
    composicao_neofin: composicaoNeofin,
    composicao_excluida: excluidos,
  };
}

export function montarDashboardFinanceiroComposicaoItem(
  input: DashboardFinanceiroNormalizacaoInput,
): DashboardFinanceiroComposicaoItem {
  const valorNominalCentavos = Math.max(numeroSeguro(input.valor_nominal_centavos), 0);
  const valorRecebidoCentavos = Math.max(
    Math.min(numeroSeguro(input.valor_recebido_confirmado_centavos), valorNominalCentavos),
    0,
  );
  const valorPendenteCentavos = Math.max(
    numeroSeguro(input.valor_pendente_base_centavos) || Math.max(valorNominalCentavos - valorRecebidoCentavos, 0),
    0,
  );
  const statusOperacional =
    input.status_operacional ??
    inferirStatusOperacional(
      normalizarTexto(input.data_vencimento),
      valorNominalCentavos,
      valorRecebidoCentavos,
      valorPendenteCentavos,
    );
  const statusOriginal = normalizarTexto(input.status_original) ?? normalizarTexto(input.status_bruto);
  const cancelado = input.cancelado === true || isStatusCancelado(statusOriginal) || isStatusCancelado(input.status_bruto);
  const expurgado = input.expurgado === true;
  const inativo = input.inativo === true;

  let statusNormalizado: DashboardFinanceiroStatusNormalizado;
  let motivoExclusao: string | null = null;

  if (expurgado) {
    statusNormalizado = "EXPURGADO";
    motivoExclusao = "expurgado";
  } else if (cancelado) {
    statusNormalizado = "CANCELADO";
    motivoExclusao = "cancelado";
  } else if (inativo) {
    statusNormalizado = "INATIVO";
    motivoExclusao = "inativo";
  } else if (statusOperacional === "PAGO" && valorRecebidoCentavos > 0) {
    statusNormalizado = "RECEBIDO_CONFIRMADO";
  } else if (statusOperacional === "PENDENTE_VENCIDO") {
    statusNormalizado = "PENDENTE_VENCIDO";
  } else {
    statusNormalizado = "PENDENTE_A_VENCER";
  }

  const excluidoDoTotal = Boolean(motivoExclusao);
  const neofinSituacao = normalizarNeofinSituacaoOperacional(
    input.neofin_situacao_operacional,
    statusOperacional,
  );
  const neofinStatus = input.neofin_status
    ?? inferirNeofinStatusCobranca(
      null,
      statusOperacional,
      neofinSituacao,
    );
  const elegivelPrevisto = !excluidoDoTotal && valorNominalCentavos > 0;
  const elegivelRecebido = !excluidoDoTotal && valorRecebidoCentavos > 0;
  const elegivelPendente = !excluidoDoTotal && valorPendenteCentavos > 0;
  const elegivelVencido = elegivelPendente && statusOperacional === "PENDENTE_VENCIDO";
  const elegivelNeofin =
    elegivelPendente &&
    neofinSituacao === "VINCULADA" &&
    upper(input.fatura_status) !== "CANCELADA";
  const descricao = normalizarTexto(input.descricao)
    ?? normalizarTexto(input.referencia)
    ?? buildOrigemLabel(input);
  const composicao: DashboardFinanceiroComposicaoItem = {
    competencia: input.competencia,
    competencia_label: formatarCompetenciaLabel(input.competencia),
    cobranca_id: input.cobranca_id ?? null,
    lancamento_id: input.lancamento_id ?? null,
    cobranca_key: input.cobranca_key,
    cobranca_fonte: input.cobranca_fonte,
    pessoa_id: input.pessoa_id ?? null,
    pessoa_nome: input.pessoa_nome,
    pessoa_label: normalizarTexto(input.pessoa_label) ?? input.pessoa_nome,
    conta_conexao_id: input.conta_conexao_id ?? null,
    conta_interna_id: input.conta_interna_id ?? input.conta_conexao_id ?? null,
    tipo_conta: normalizarTexto(input.tipo_conta),
    tipo_conta_label: normalizarTexto(input.tipo_conta_label) ?? montarTipoContaLabel(input.tipo_conta),
    origem_tipo: normalizarTexto(input.origem_tipo),
    origem_subtipo: normalizarTexto(input.origem_subtipo),
    origem_id: input.origem_id ?? null,
    origem_label: buildOrigemLabel(input),
    origem_lancamento: normalizarTexto(input.origem_lancamento),
    origem_fatura: normalizarTexto(input.origem_fatura) ?? normalizarTexto(input.fatura_status),
    descricao,
    referencia: normalizarTexto(input.referencia) ?? descricao,
    status: statusOperacional,
    status_label: statusOperacionalLabel(statusOperacional),
    status_bruto: normalizarTexto(input.status_bruto),
    status_original: statusOriginal,
    status_normalizado: statusNormalizado,
    valor_nominal_centavos: valorNominalCentavos,
    valor_previsto_centavos: elegivelPrevisto ? valorNominalCentavos : 0,
    valor_recebido_centavos: elegivelRecebido ? valorRecebidoCentavos : 0,
    valor_pendente_centavos: elegivelPendente ? valorPendenteCentavos : 0,
    valor_vencido_centavos: elegivelVencido ? valorPendenteCentavos : 0,
    valor_neofin_centavos: elegivelNeofin ? valorPendenteCentavos : 0,
    elegivel_previsto: elegivelPrevisto,
    elegivel_recebido: elegivelRecebido,
    elegivel_pendente: elegivelPendente,
    elegivel_vencido: elegivelVencido,
    elegivel_neofin: elegivelNeofin,
    excluido_do_total: excluidoDoTotal,
    motivo_exclusao: motivoExclusao,
    gerado_antecipadamente: input.gerado_antecipadamente === true,
    neofin_status: neofinStatus,
    neofin_label: normalizarTexto(input.neofin_label) ?? montarNeofinLabel(neofinStatus),
    neofin_situacao_operacional: neofinSituacao,
    data_vencimento: normalizarTexto(input.data_vencimento),
    data_pagamento: normalizarTexto(input.data_pagamento),
    observacao_resumo: null,
    fatura_id: input.fatura_id ?? null,
    fatura_competencia: normalizarTexto(input.fatura_competencia),
    fatura_status: normalizarTexto(input.fatura_status),
    cobranca_url: normalizarTexto(input.cobranca_url),
    fatura_url: normalizarTexto(input.fatura_url),
    dias_em_atraso: Math.max(numeroSeguro(input.dias_em_atraso), 0),
    created_at: normalizarTexto(input.created_at),
    updated_at: normalizarTexto(input.updated_at),
  };

  composicao.observacao_resumo = buildObservacaoResumo(composicao);
  return composicao;
}

export function montarDashboardFinanceiroMensalPayload(
  params: MontarDashboardFinanceiroMensalParams,
): DashboardFinanceiroMensalPayloadBase {
  const itemsPorCompetencia = new Map<string, DashboardFinanceiroComposicaoItem[]>();

  for (const item of params.items) {
    const lista = itemsPorCompetencia.get(item.competencia) ?? [];
    lista.push(item);
    itemsPorCompetencia.set(item.competencia, lista);
  }

  const competencias = buildCompetenciaSeries(params.competenciaInicio, params.competenciaFim);
  const meses = [...competencias]
    .sort(compareCompetenciaDesc)
    .map((competencia) =>
      criarCompetenciaDetalhe(
        competencia,
        itemsPorCompetencia.get(competencia) ?? [],
        params.competenciaAtualReal,
      ),
    );
  const mesSelecionado =
    meses.find((item) => item.competencia === params.competenciaSelecionada) ??
    criarCompetenciaDetalhe(params.competenciaSelecionada, [], params.competenciaAtualReal);

  const cards = {
    previsto_mes_centavos: mesSelecionado.previsto_centavos,
    pago_mes_centavos: mesSelecionado.pago_centavos,
    pendente_mes_centavos: mesSelecionado.pendente_centavos,
    neofin_mes_centavos: mesSelecionado.neofin_centavos,
    inadimplencia_mes_percentual:
      mesSelecionado.previsto_centavos > 0
        ? Math.round((mesSelecionado.vencido_centavos / mesSelecionado.previsto_centavos) * 1000) / 10
        : 0,
  };

  const itemsSelecionados = itemsPorCompetencia.get(params.competenciaSelecionada) ?? [];
  const cards_detalhe: Record<DashboardMensalCardKey, DashboardFinanceiroCardDetalhe> = {
    previsto_para_receber: montarCardDetalhe(
      "previsto_para_receber",
      params.competenciaSelecionada,
      itemsSelecionados,
      params.competenciaAtualReal,
    ),
    recebido_no_mes: montarCardDetalhe(
      "recebido_no_mes",
      params.competenciaSelecionada,
      itemsSelecionados,
      params.competenciaAtualReal,
    ),
    pendente_do_mes: montarCardDetalhe(
      "pendente_do_mes",
      params.competenciaSelecionada,
      itemsSelecionados,
      params.competenciaAtualReal,
    ),
    em_cobranca_neofin: montarCardDetalhe(
      "em_cobranca_neofin",
      params.competenciaSelecionada,
      itemsSelecionados,
      params.competenciaAtualReal,
    ),
    inadimplencia_do_mes: montarCardDetalhe(
      "inadimplencia_do_mes",
      params.competenciaSelecionada,
      itemsSelecionados,
      params.competenciaAtualReal,
    ),
  };

  return {
    competencia_atual: params.competenciaSelecionada,
    faixa_competencias: {
      inicio: params.competenciaInicio,
      fim: params.competenciaFim,
      limite: params.limite,
      tipo_conta: params.tipoConta,
      tipo_conta_label: montarTipoContaLabel(params.tipoConta),
    },
    cards,
    cards_detalhe,
    meses,
  };
}
