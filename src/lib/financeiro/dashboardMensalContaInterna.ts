import {
  formatarDataLabel,
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
  | "recebido_via_neofin"
  | "recebido_baixa_interna"
  | "recebido_hoje"
  | "recebido_ultimos_7_dias"
  | "pendente_do_mes"
  | "em_cobranca_neofin"
  | "inadimplencia_do_mes";

export type DashboardMensalNaturezaKey = "previsto" | "pago" | "pendente" | "vencido" | "neofin";

export type DashboardFinanceiroFonteItem = "COBRANCA" | "COBRANCA_AVULSA" | "LANCAMENTO";

export type DashboardFinanceiroCanalRecebimento =
  | "NEOFIN_CONFIRMADO"
  | "INTERNO_DINHEIRO"
  | "INTERNO_PIX"
  | "INTERNO_CARTAO"
  | "INTERNO_OUTROS"
  | "NAO_CLASSIFICADO";

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
  recebimento_id: number | null;
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
  canal_recebimento: DashboardFinanceiroCanalRecebimento | null;
  canal_recebimento_label: string | null;
  origem_recebimento_sistema: string | null;
  forma_pagamento_codigo: string | null;
  metodo_pagamento: string | null;
  confirmado_via_neofin: boolean;
  confirmado_via_baixa_interna: boolean;
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
  subtitulo: string | null;
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
    recebido_via_neofin_mes_centavos: number;
    recebido_baixa_interna_mes_centavos: number;
    recebido_hoje_centavos: number;
    recebido_ultimos_7_dias_centavos: number;
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
  recebimento_id?: number | null;
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
  canal_recebimento?: DashboardFinanceiroCanalRecebimento | null;
  canal_recebimento_label?: string | null;
  origem_recebimento_sistema?: string | null;
  forma_pagamento_codigo?: string | null;
  metodo_pagamento?: string | null;
  confirmado_via_neofin?: boolean;
  confirmado_via_baixa_interna?: boolean;
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
  receiptItems: DashboardFinanceiroComposicaoItem[];
  competenciaSelecionada: string;
  competenciaInicio: string;
  competenciaFim: string;
  limite: number;
  tipoConta: string;
  competenciaAtualReal: string;
  todayIso: string;
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

const CANAIS_INTERNOS_POR_ORIGEM = new Set([
  "ADMIN_FINANCEIRO",
  "PAGAMENTO_PRESENCIAL",
  "COBRANCA_AVULSA",
  "CARTAO_REPASSE",
]);

const CODIGOS_DINHEIRO = new Set(["DINHEIRO"]);
const CODIGOS_PIX = new Set(["PIX"]);
const CODIGOS_CARTAO = new Set([
  "CARTAO",
  "CARTAO_CREDITO_AVISTA",
  "CARTAO_CREDITO_PARCELADO",
  "CARTAO_DEBITO",
  "CARTAO_CONEXAO_ALUNO",
  "CARTAO_CONEXAO_COLABORADOR",
  "CREDITO_OPERADORA",
]);

type DashboardReceiptClassificationInput = {
  possui_vinculo_neofin: boolean;
  origem_recebimento_sistema?: string | null;
  forma_pagamento_codigo?: string | null;
  metodo_pagamento?: string | null;
};

type DashboardReceiptClassification = {
  canal_recebimento: DashboardFinanceiroCanalRecebimento;
  canal_recebimento_label: string;
  confirmado_via_neofin: boolean;
  confirmado_via_baixa_interna: boolean;
};

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

export function addCompetenciaMonths(competencia: string, offset: number): string {
  const [yearRaw, monthRaw] = competencia.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const date = new Date(year, month - 1 + offset, 1);
  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
  return `${nextYear}-${nextMonth}`;
}

export function startOfCompetencia(competencia: string): string {
  return `${competencia}-01`;
}

export function endOfCompetencia(competencia: string): string {
  const [yearRaw, monthRaw] = competencia.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const date = new Date(year, month, 0);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function addIsoDays(dateIso: string, offset: number): string {
  const [yearRaw, monthRaw, dayRaw] = dateIso.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const date = new Date(year, month - 1, day + offset, 12, 0, 0);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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

function hasInternalOrigin(origemRecebimentoSistema: string | null | undefined): boolean {
  return CANAIS_INTERNOS_POR_ORIGEM.has(upper(origemRecebimentoSistema));
}

function isDinheiro(codeOrMethod: string | null | undefined): boolean {
  return CODIGOS_DINHEIRO.has(upper(codeOrMethod));
}

function isPix(codeOrMethod: string | null | undefined): boolean {
  return CODIGOS_PIX.has(upper(codeOrMethod));
}

function isCartao(codeOrMethod: string | null | undefined): boolean {
  const normalized = upper(codeOrMethod);
  return (
    CODIGOS_CARTAO.has(normalized) ||
    normalized.includes("CARTAO") ||
    normalized.includes("CREDITO") ||
    normalized.includes("DEBITO")
  );
}

function hasExplicitInternalMarker(input: DashboardReceiptClassificationInput): boolean {
  return (
    hasInternalOrigin(input.origem_recebimento_sistema) ||
    isDinheiro(input.forma_pagamento_codigo) ||
    isDinheiro(input.metodo_pagamento) ||
    isPix(input.forma_pagamento_codigo) ||
    isPix(input.metodo_pagamento) ||
    isCartao(input.forma_pagamento_codigo) ||
    isCartao(input.metodo_pagamento)
  );
}

export function isNeoFinConfirmedReceipt(input: DashboardReceiptClassificationInput): boolean {
  return input.possui_vinculo_neofin && !hasExplicitInternalMarker(input);
}

export function isInternalConfirmedReceipt(input: DashboardReceiptClassificationInput): boolean {
  return !isNeoFinConfirmedReceipt(input);
}

export function classifyReceiptChannel(input: DashboardReceiptClassificationInput): DashboardReceiptClassification {
  if (isNeoFinConfirmedReceipt(input)) {
    return {
      canal_recebimento: "NEOFIN_CONFIRMADO",
      canal_recebimento_label: "NeoFin confirmado",
      confirmado_via_neofin: true,
      confirmado_via_baixa_interna: false,
    };
  }

  if (isPix(input.forma_pagamento_codigo) || isPix(input.metodo_pagamento)) {
    return {
      canal_recebimento: "INTERNO_PIX",
      canal_recebimento_label: "Baixa interna via PIX",
      confirmado_via_neofin: false,
      confirmado_via_baixa_interna: true,
    };
  }

  if (isDinheiro(input.forma_pagamento_codigo) || isDinheiro(input.metodo_pagamento)) {
    return {
      canal_recebimento: "INTERNO_DINHEIRO",
      canal_recebimento_label: "Baixa interna em dinheiro",
      confirmado_via_neofin: false,
      confirmado_via_baixa_interna: true,
    };
  }

  if (isCartao(input.forma_pagamento_codigo) || isCartao(input.metodo_pagamento)) {
    return {
      canal_recebimento: "INTERNO_CARTAO",
      canal_recebimento_label: "Baixa interna em cartao",
      confirmado_via_neofin: false,
      confirmado_via_baixa_interna: true,
    };
  }

  return {
    canal_recebimento: "INTERNO_OUTROS",
    canal_recebimento_label: "Baixa interna / outros meios",
    confirmado_via_neofin: false,
    confirmado_via_baixa_interna: true,
  };
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

  if (item.elegivel_recebido && item.canal_recebimento_label) {
    observacoes.push(item.canal_recebimento_label);
  }

  if (item.confirmado_via_neofin) {
    observacoes.push("NeoFin confirmado por recebimento local");
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
    case "recebido_via_neofin":
      return "Recebido via NeoFin";
    case "recebido_baixa_interna":
      return "Recebido por baixa interna";
    case "recebido_hoje":
      return "Recebido hoje";
    case "recebido_ultimos_7_dias":
      return "Recebido ultimos 7 dias";
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
    case "recebido_via_neofin":
      return `${prefixoExclusao}NeoFin so entra como recebido quando ha confirmacao local de recebimento elegivel. Sincronizacao remota isolada nao compoe este total.`;
    case "recebido_baixa_interna":
      return `${prefixoExclusao}Entram apenas baixas internas, presenciais, avulsas ou outros meios nao classificados como NeoFin confirmado.`;
    case "recebido_hoje":
      return `${prefixoExclusao}Janela movel do dia corrente usando a data efetiva do recebimento confirmado.`;
    case "recebido_ultimos_7_dias":
      return `${prefixoExclusao}Janela movel dos ultimos 7 dias, incluindo hoje, pela data efetiva do recebimento confirmado.`;
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
      subtitulo: `Competencia ${competenciaLabel}`,
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
    subtitulo: `Competencia ${competenciaLabel}`,
    total_centavos: totalNatureza(composicao, natureza),
    percentual: null,
    composicao,
    composicao_excluida: excluidos,
    resumo: resumirComposicao(composicao, excluidos, competenciaAtualReal),
    resumo_exclusoes: resumoExclusoes,
    observacao_resumo: cardObservacao(indicador, observacaoCompetencia, resumoExclusoes),
  };
}

function montarCardDetalheRecebimentos(params: {
  indicador: DashboardMensalCardKey;
  competencia: string;
  subtitulo: string;
  itemsTodos: DashboardFinanceiroComposicaoItem[];
  competenciaAtualReal: string;
}): DashboardFinanceiroCardDetalhe {
  const elegiveis = sortComposicao(params.itemsTodos.filter((item) => !item.excluido_do_total), "pago");
  const excluidos = sortComposicao(params.itemsTodos.filter((item) => item.excluido_do_total), "pago");
  const resumoExclusoes = resumirExclusoes(excluidos);

  return {
    indicador: params.indicador,
    titulo: cardTitulo(params.indicador),
    competencia: params.competencia,
    competencia_label: formatarCompetenciaLabel(params.competencia),
    subtitulo: params.subtitulo,
    total_centavos: totalNatureza(elegiveis, "pago"),
    percentual: null,
    composicao: elegiveis,
    composicao_excluida: excluidos,
    resumo: resumirComposicao(elegiveis, excluidos, params.competenciaAtualReal),
    resumo_exclusoes: resumoExclusoes,
    observacao_resumo: cardObservacao(params.indicador, "", resumoExclusoes),
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
  const statusInferido = inferirStatusOperacional(
    normalizarTexto(input.data_vencimento),
    valorNominalCentavos,
    valorRecebidoCentavos,
    valorPendenteCentavos,
  );
  const statusOperacionalBase =
    input.status_operacional ??
    statusInferido;
  const statusOperacional =
    statusOperacionalBase === "PAGO" && valorRecebidoCentavos <= 0 && valorPendenteCentavos > 0
      ? statusInferido
      : statusOperacionalBase;
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
    recebimento_id: input.recebimento_id ?? null,
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
    canal_recebimento: input.canal_recebimento ?? null,
    canal_recebimento_label: normalizarTexto(input.canal_recebimento_label),
    origem_recebimento_sistema: normalizarTexto(input.origem_recebimento_sistema),
    forma_pagamento_codigo: normalizarTexto(input.forma_pagamento_codigo),
    metodo_pagamento: normalizarTexto(input.metodo_pagamento),
    confirmado_via_neofin: input.confirmado_via_neofin === true,
    confirmado_via_baixa_interna: input.confirmado_via_baixa_interna === true,
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

export function montarDashboardFinanceiroRecebimentoItem(
  baseItem: DashboardFinanceiroComposicaoItem,
  input: {
    recebimento_id: number | null;
    cobranca_key: string;
    valor_recebido_centavos: number;
    data_pagamento: string;
    origem_recebimento_sistema?: string | null;
    forma_pagamento_codigo?: string | null;
    metodo_pagamento?: string | null;
    referencia?: string | null;
  },
): DashboardFinanceiroComposicaoItem {
  const classificacao = classifyReceiptChannel({
    possui_vinculo_neofin:
      baseItem.neofin_status !== "SEM_NEOFIN" ||
      baseItem.neofin_situacao_operacional === "VINCULADA",
    origem_recebimento_sistema: input.origem_recebimento_sistema,
    forma_pagamento_codigo: input.forma_pagamento_codigo,
    metodo_pagamento: input.metodo_pagamento,
  });

  const composicao: DashboardFinanceiroComposicaoItem = {
    ...baseItem,
    recebimento_id: input.recebimento_id,
    cobranca_key: input.cobranca_key,
    referencia: normalizarTexto(input.referencia) ?? baseItem.referencia,
    valor_nominal_centavos: numeroSeguro(input.valor_recebido_centavos),
    valor_previsto_centavos: 0,
    valor_recebido_centavos: numeroSeguro(input.valor_recebido_centavos),
    valor_pendente_centavos: 0,
    valor_vencido_centavos: 0,
    valor_neofin_centavos: 0,
    elegivel_previsto: false,
    elegivel_recebido: !baseItem.excluido_do_total && numeroSeguro(input.valor_recebido_centavos) > 0,
    elegivel_pendente: false,
    elegivel_vencido: false,
    elegivel_neofin: false,
    status: "PAGO",
    status_label: statusOperacionalLabel("PAGO"),
    status_normalizado: "RECEBIDO_CONFIRMADO",
    data_pagamento: normalizarTexto(input.data_pagamento),
    canal_recebimento: classificacao.canal_recebimento,
    canal_recebimento_label: classificacao.canal_recebimento_label,
    origem_recebimento_sistema: normalizarTexto(input.origem_recebimento_sistema),
    forma_pagamento_codigo: normalizarTexto(input.forma_pagamento_codigo),
    metodo_pagamento: normalizarTexto(input.metodo_pagamento),
    confirmado_via_neofin: classificacao.confirmado_via_neofin,
    confirmado_via_baixa_interna: classificacao.confirmado_via_baixa_interna,
    observacao_resumo: null,
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
    .sort(compareCompetenciaAsc)
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

  const inicioMesSelecionado = startOfCompetencia(params.competenciaSelecionada);
  const fimMesSelecionado = endOfCompetencia(params.competenciaSelecionada);
  const inicioUltimos7Dias = addIsoDays(params.todayIso, -6);
  const recebimentosMes = sortComposicao(
    params.receiptItems.filter((item) => {
      const pagamento = normalizarTexto(item.data_pagamento)?.slice(0, 10);
      return Boolean(
        item.elegivel_recebido &&
        !item.excluido_do_total &&
        pagamento &&
        pagamento >= inicioMesSelecionado &&
        pagamento <= fimMesSelecionado,
      );
    }),
    "pago",
  );
  const recebimentosViaNeofinMes = recebimentosMes.filter((item) => item.confirmado_via_neofin);
  const recebimentosBaixaInternaMes = recebimentosMes.filter((item) => item.confirmado_via_baixa_interna);
  const recebimentosHoje = sortComposicao(
    params.receiptItems.filter(
      (item) =>
        item.elegivel_recebido &&
        !item.excluido_do_total &&
        normalizarTexto(item.data_pagamento)?.slice(0, 10) === params.todayIso,
    ),
    "pago",
  );
  const recebimentosUltimos7Dias = sortComposicao(
    params.receiptItems.filter((item) => {
      const pagamento = normalizarTexto(item.data_pagamento)?.slice(0, 10);
      return Boolean(
        item.elegivel_recebido &&
        !item.excluido_do_total &&
        pagamento &&
        pagamento >= inicioUltimos7Dias &&
        pagamento <= params.todayIso,
      );
    }),
    "pago",
  );

  const cards = {
    previsto_mes_centavos: mesSelecionado.previsto_centavos,
    pago_mes_centavos: mesSelecionado.pago_centavos,
    recebido_via_neofin_mes_centavos: totalNatureza(recebimentosViaNeofinMes, "pago"),
    recebido_baixa_interna_mes_centavos: totalNatureza(recebimentosBaixaInternaMes, "pago"),
    recebido_hoje_centavos: totalNatureza(recebimentosHoje, "pago"),
    recebido_ultimos_7_dias_centavos: totalNatureza(recebimentosUltimos7Dias, "pago"),
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
    recebido_via_neofin: montarCardDetalheRecebimentos({
      indicador: "recebido_via_neofin",
      competencia: params.competenciaSelecionada,
      subtitulo: `Recebimentos confirmados em ${formatarCompetenciaLabel(params.competenciaSelecionada)}`,
      itemsTodos: recebimentosViaNeofinMes,
      competenciaAtualReal: params.competenciaAtualReal,
    }),
    recebido_baixa_interna: montarCardDetalheRecebimentos({
      indicador: "recebido_baixa_interna",
      competencia: params.competenciaSelecionada,
      subtitulo: `Baixas internas e outros meios em ${formatarCompetenciaLabel(params.competenciaSelecionada)}`,
      itemsTodos: recebimentosBaixaInternaMes,
      competenciaAtualReal: params.competenciaAtualReal,
    }),
    recebido_hoje: montarCardDetalheRecebimentos({
      indicador: "recebido_hoje",
      competencia: params.competenciaSelecionada,
      subtitulo: `Recebimentos confirmados em ${formatarDataLabel(params.todayIso)}`,
      itemsTodos: recebimentosHoje,
      competenciaAtualReal: params.competenciaAtualReal,
    }),
    recebido_ultimos_7_dias: montarCardDetalheRecebimentos({
      indicador: "recebido_ultimos_7_dias",
      competencia: params.competenciaSelecionada,
      subtitulo: `Janela movel de ${formatarDataLabel(inicioUltimos7Dias)} ate ${formatarDataLabel(params.todayIso)}`,
      itemsTodos: recebimentosUltimos7Dias,
      competenciaAtualReal: params.competenciaAtualReal,
    }),
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
