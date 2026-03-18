export type ContasReceberVisao = "VENCIDAS" | "A_VENCER" | "RECEBIDAS" | "INCONSISTENCIAS";

export type ContasReceberTipoPeriodo =
  | "MES_ANO"
  | "ANO_INTEIRO"
  | "ENTRE_DATAS"
  | "COMPETENCIA"
  | "SEM_PERIODO";

export type ContasReceberOrdenacao =
  | "MAIOR_ATRASO"
  | "MAIOR_VALOR"
  | "VENCIMENTO_MAIS_ANTIGO"
  | "VENCIMENTO_MAIS_PROXIMO"
  | "NOME_PESSOA"
  | "DATA_MAIS_RECENTE"
  | "CRITICIDADE";

export type RankingModo = "DEVEDORES" | "EXPOSICAO" | "RECEBIMENTOS" | "INCONSISTENCIAS";

type ViewConfig = {
  tituloBlocoPrincipal: string;
  subtituloBlocoPrincipal: string;
  tituloRanking: string;
  subtituloRanking: string;
  rankingModo: RankingModo;
  mostrarCardDevedores: boolean;
  tituloTabela: string;
  subtituloTabela: string;
  ordenacaoPadrao: ContasReceberOrdenacao;
};

export const VISAO_OPTIONS: Array<{ value: ContasReceberVisao; label: string }> = [
  { value: "VENCIDAS", label: "Vencidas" },
  { value: "A_VENCER", label: "A vencer" },
  { value: "RECEBIDAS", label: "Recebidas" },
  { value: "INCONSISTENCIAS", label: "Inconsistencias" },
];

export const TIPO_PERIODO_OPTIONS: Array<{ value: ContasReceberTipoPeriodo; label: string }> = [
  { value: "MES_ANO", label: "Mes e ano" },
  { value: "ANO_INTEIRO", label: "Ano inteiro" },
  { value: "ENTRE_DATAS", label: "Entre datas" },
  { value: "COMPETENCIA", label: "Competencia" },
  { value: "SEM_PERIODO", label: "Sem periodo" },
];

export const CONTEXTO_FILTER_OPTIONS = [
  { value: "TODOS", label: "Todos" },
  { value: "ESCOLA", label: "Escola" },
  { value: "CAFE", label: "Cafe" },
  { value: "LOJA", label: "Loja" },
  { value: "OUTRO", label: "Outro" },
] as const;

export const ORDENACAO_LABELS: Record<ContasReceberOrdenacao, string> = {
  MAIOR_ATRASO: "Maior atraso",
  MAIOR_VALOR: "Maior valor",
  VENCIMENTO_MAIS_ANTIGO: "Vencimento mais antigo",
  VENCIMENTO_MAIS_PROXIMO: "Vencimento mais proximo",
  NOME_PESSOA: "Nome da pessoa",
  DATA_MAIS_RECENTE: "Data mais recente",
  CRITICIDADE: "Criticidade",
};

export const CONTAS_RECEBER_VIEW_CONFIG: Record<ContasReceberVisao, ViewConfig> = {
  VENCIDAS: {
    tituloBlocoPrincipal: "Cobrancas vencidas em aberto",
    subtituloBlocoPrincipal: "Leitura focada em atraso, concentracao de saldo e urgencia de cobranca.",
    tituloRanking: "Devedores mais antigos",
    subtituloRanking: "Leitura baseada em titulos vencidos com maior atraso nos filtros atuais.",
    rankingModo: "DEVEDORES",
    mostrarCardDevedores: true,
    tituloTabela: "Fila de cobranca vencida",
    subtituloTabela: "Priorize atraso, valor aberto e origem real antes de acionar recebimento.",
    ordenacaoPadrao: "MAIOR_ATRASO",
  },
  A_VENCER: {
    tituloBlocoPrincipal: "Exposicao a vencer",
    subtituloBlocoPrincipal: "Visao preventiva das proximas cobrancas a vencer, por valor e concentracao.",
    tituloRanking: "Maiores exposicoes a vencer",
    subtituloRanking: "Leitura baseada nos maiores valores futuros dentro dos filtros atuais.",
    rankingModo: "EXPOSICAO",
    mostrarCardDevedores: false,
    tituloTabela: "Agenda de vencimentos",
    subtituloTabela: "Acompanhe quem vence primeiro, quanto cada titulo representa e de onde a divida nasce.",
    ordenacaoPadrao: "MAIOR_VALOR",
  },
  RECEBIDAS: {
    tituloBlocoPrincipal: "Recebimentos do periodo",
    subtituloBlocoPrincipal: "Leitura de caixa realizado com foco em volume, concentracao e recorrencia.",
    tituloRanking: "Maiores recebimentos do periodo",
    subtituloRanking: "Leitura baseada em maior valor recebido e data mais recente.",
    rankingModo: "RECEBIMENTOS",
    mostrarCardDevedores: false,
    tituloTabela: "Recebimentos auditaveis",
    subtituloTabela: "Revise recebimentos realizados, contexto financeiro e origem operacional da cobranca.",
    ordenacaoPadrao: "DATA_MAIS_RECENTE",
  },
  INCONSISTENCIAS: {
    tituloBlocoPrincipal: "Casos em revisao financeira",
    subtituloBlocoPrincipal: "Leitura de diagnostico para identificar registros que pedem auditoria manual.",
    tituloRanking: "Principais inconsistencias",
    subtituloRanking: "Leitura baseada em criticidade, valor e antiguidade do problema.",
    rankingModo: "INCONSISTENCIAS",
    mostrarCardDevedores: false,
    tituloTabela: "Itens para auditoria",
    subtituloTabela: "Priorize o que tem maior risco de distorcer a leitura financeira da operacao.",
    ordenacaoPadrao: "CRITICIDADE",
  },
};

export function normalizeContasReceberVisao(value: string | null | undefined): ContasReceberVisao {
  const normalized = (value ?? "").trim().toUpperCase();
  if (normalized === "AVENCER" || normalized === "A_VENCER") return "A_VENCER";
  if (normalized === "RECEBIDAS") return "RECEBIDAS";
  if (normalized === "INCONSISTENCIAS") return "INCONSISTENCIAS";
  return "VENCIDAS";
}

export function normalizeContasReceberTipoPeriodo(
  value: string | null | undefined,
): ContasReceberTipoPeriodo {
  const normalized = (value ?? "").trim().toUpperCase();
  if (
    normalized === "MES_ANO" ||
    normalized === "ANO_INTEIRO" ||
    normalized === "ENTRE_DATAS" ||
    normalized === "COMPETENCIA" ||
    normalized === "SEM_PERIODO"
  ) {
    return normalized;
  }
  return "SEM_PERIODO";
}

export function normalizeContasReceberOrdenacao(
  value: string | null | undefined,
  visao: ContasReceberVisao,
): ContasReceberOrdenacao {
  const normalized = (value ?? "").trim().toUpperCase();
  if (
    normalized === "MAIOR_ATRASO" ||
    normalized === "MAIOR_VALOR" ||
    normalized === "VENCIMENTO_MAIS_ANTIGO" ||
    normalized === "VENCIMENTO_MAIS_PROXIMO" ||
    normalized === "NOME_PESSOA" ||
    normalized === "DATA_MAIS_RECENTE" ||
    normalized === "CRITICIDADE"
  ) {
    return normalized;
  }
  return CONTAS_RECEBER_VIEW_CONFIG[visao].ordenacaoPadrao;
}

export function getOrdenacoesDisponiveis(visao: ContasReceberVisao): ContasReceberOrdenacao[] {
  if (visao === "RECEBIDAS") {
    return ["DATA_MAIS_RECENTE", "MAIOR_VALOR", "NOME_PESSOA"];
  }
  if (visao === "INCONSISTENCIAS") {
    return ["CRITICIDADE", "MAIOR_VALOR", "VENCIMENTO_MAIS_ANTIGO", "NOME_PESSOA"];
  }
  return [
    CONTAS_RECEBER_VIEW_CONFIG[visao].ordenacaoPadrao,
    "MAIOR_VALOR",
    "VENCIMENTO_MAIS_ANTIGO",
    "VENCIMENTO_MAIS_PROXIMO",
    "NOME_PESSOA",
  ].filter((value, index, array) => array.indexOf(value) === index);
}

export function getContextoLabel(value: "ESCOLA" | "CAFE" | "LOJA" | "OUTRO"): string {
  if (value === "ESCOLA") return "Escola";
  if (value === "CAFE") return "Cafe";
  if (value === "LOJA") return "Loja";
  return "Em revisao";
}
