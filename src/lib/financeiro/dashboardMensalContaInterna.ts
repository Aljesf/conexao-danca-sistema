import {
  formatarCompetenciaLabel,
  montarTipoContaLabel,
  type CobrancaFonteOperacional,
  type CobrancaOperacionalItem,
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

export type DashboardFinanceiroComposicaoItem = {
  competencia: string;
  competencia_label: string;
  cobranca_id: number;
  cobranca_key: string;
  cobranca_fonte: CobrancaFonteOperacional;
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
  descricao: string;
  referencia: string;
  status: StatusOperacionalCobranca;
  status_label: string;
  status_bruto: string | null;
  valor_previsto_centavos: number;
  valor_recebido_centavos: number;
  valor_pendente_centavos: number;
  valor_vencido_centavos: number;
  valor_neofin_centavos: number;
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
};

export type DashboardFinanceiroCardDetalhe = {
  indicador: DashboardMensalCardKey;
  titulo: string;
  competencia: string;
  competencia_label: string;
  total_centavos: number;
  percentual: number | null;
  composicao: DashboardFinanceiroComposicaoItem[];
  resumo: DashboardFinanceiroComposicaoResumo;
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
  observacao_resumo: string | null;
  composicao_previsto: DashboardFinanceiroComposicaoItem[];
  composicao_pago: DashboardFinanceiroComposicaoItem[];
  composicao_pendente: DashboardFinanceiroComposicaoItem[];
  composicao_vencido: DashboardFinanceiroComposicaoItem[];
  composicao_neofin: DashboardFinanceiroComposicaoItem[];
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

export type DashboardFinanceiroComposicaoItemInput = CobrancaOperacionalItem & {
  conta_conexao_id?: number | null;
  origem_id?: number | null;
  descricao?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
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

function compareCompetenciaAsc(a: string, b: string): number {
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

function buildOrigemLabel(item: DashboardFinanceiroComposicaoItemInput): string {
  const origemTipo = humanizarChave(item.origem_tipo);
  const origemSubtipo = humanizarChave(item.origem_subtipo);
  const partes = [item.tipo_cobranca_label, origemTipo, origemSubtipo].filter(
    (value, index, array): value is string => Boolean(value) && array.indexOf(value) === index,
  );

  return partes.join(" / ") || "Cobranca operacional";
}

function buildObservacaoResumo(item: DashboardFinanceiroComposicaoItemInput): string | null {
  const observacoes: string[] = [];

  if (item.status_operacional === "PENDENTE_VENCIDO" && item.dias_em_atraso > 0) {
    observacoes.push(`${item.dias_em_atraso} ${pluralizar("dia", item.dias_em_atraso)} de atraso`);
  }

  if (item.neofin_situacao_operacional === "NAO_VINCULADA") {
    observacoes.push("Sem vinculo NeoFin");
  } else if (item.neofin_situacao_operacional === "FALHA_INTEGRACAO") {
    observacoes.push("Falha de integracao NeoFin");
  } else if (item.neofin_situacao_operacional === "VINCULADA" && item.saldo_aberto_centavos > 0) {
    observacoes.push("Carteira em cobranca NeoFin");
  }

  if (item.status_operacional === "PAGO" && item.data_pagamento) {
    observacoes.push(`Pagamento em ${item.data_pagamento}`);
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

function resumirComposicao(
  items: DashboardFinanceiroComposicaoItem[],
  competenciaAtualReal: string,
): DashboardFinanceiroComposicaoResumo {
  return {
    total_itens: items.length,
    itens_sem_neofin: items.filter((item) => item.neofin_situacao_operacional !== "VINCULADA").length,
    itens_vencidos: items.filter((item) => item.valor_vencido_centavos > 0).length,
    itens_competencia_futura: items.filter((item) => compareCompetenciaAsc(item.competencia, competenciaAtualReal) > 0).length,
  };
}

function filtrarNatureza(
  items: DashboardFinanceiroComposicaoItem[],
  natureza: DashboardMensalNaturezaKey,
): DashboardFinanceiroComposicaoItem[] {
  if (natureza === "previsto") return sortComposicao(items.filter((item) => item.valor_previsto_centavos > 0), natureza);
  if (natureza === "pago") return sortComposicao(items.filter((item) => item.valor_recebido_centavos > 0), natureza);
  if (natureza === "pendente") return sortComposicao(items.filter((item) => item.valor_pendente_centavos > 0), natureza);
  if (natureza === "vencido") return sortComposicao(items.filter((item) => item.valor_vencido_centavos > 0), natureza);
  return sortComposicao(items.filter((item) => item.valor_neofin_centavos > 0), natureza);
}

function totalNatureza(items: DashboardFinanceiroComposicaoItem[], natureza: DashboardMensalNaturezaKey): number {
  if (natureza === "previsto") {
    return items.reduce((acc, item) => acc + item.valor_previsto_centavos, 0);
  }

  if (natureza === "pago") {
    return items.reduce((acc, item) => acc + item.valor_recebido_centavos, 0);
  }

  if (natureza === "pendente") {
    return items.reduce((acc, item) => acc + item.valor_pendente_centavos, 0);
  }

  if (natureza === "vencido") {
    return items.reduce((acc, item) => acc + item.valor_vencido_centavos, 0);
  }

  return items.reduce((acc, item) => acc + item.valor_neofin_centavos, 0);
}

function criarObservacaoCompetencia(
  competencia: string,
  items: DashboardFinanceiroComposicaoItem[],
  competenciaAtualReal: string,
): string {
  if (items.length === 0) {
    if (compareCompetenciaAsc(competencia, competenciaAtualReal) > 0) {
      return "Competencia futura sem composicao operacional ainda.";
    }

    return "Sem cobrancas geradas na competencia.";
  }

  const mensalidades = items.filter((item) => item.origem_label.includes("Mensalidade")).length;
  const avulsas = items.filter((item) => item.origem_label.includes("Avulsa")).length;
  const recebidos = items.filter((item) => item.valor_recebido_centavos > 0).length;
  const pendentes = items.filter((item) => item.valor_pendente_centavos > 0).length;
  const neofin = items.filter((item) => item.valor_neofin_centavos > 0).length;
  const fontes: string[] = [];

  if (mensalidades > 0) fontes.push(`${mensalidades} ${pluralizar("mensalidade", mensalidades)}`);
  if (avulsas > 0) fontes.push(`${avulsas} ${pluralizar("avulsa", avulsas)}`);

  const resumoFontes = fontes.length > 0 ? `Previsto composto por ${fontes.join(" e ")}.` : "Previsto composto por cobrancas operacionais rastreaveis.";
  const complementos: string[] = [];

  if (recebidos > 0) {
    complementos.push(`${recebidos} ${pluralizar("item", recebidos)} com recebimento financeiro confirmado`);
  }

  if (pendentes > 0) {
    complementos.push(`${pendentes} ${pluralizar("item", pendentes)} ainda em aberto`);
  }

  if (neofin > 0) {
    complementos.push(`${neofin} ${pluralizar("item", neofin)} em cobranca NeoFin`);
  }

  return complementos.length > 0 ? `${resumoFontes} ${complementos.join(". ")}.` : resumoFontes;
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

function cardObservacao(indicador: DashboardMensalCardKey, observacaoCompetencia: string): string {
  switch (indicador) {
    case "recebido_no_mes":
      return `Somente recebimentos financeiros confirmados entram neste total. ${observacaoCompetencia}`;
    case "pendente_do_mes":
      return `Saldo aberto da competencia operacional selecionada. ${observacaoCompetencia}`;
    case "em_cobranca_neofin":
      return `Somente titulos vinculados e ainda em cobranca entram neste total. ${observacaoCompetencia}`;
    case "inadimplencia_do_mes":
      return `Indicador calculado sobre o vencido em relacao ao previsto. ${observacaoCompetencia}`;
    default:
      return observacaoCompetencia;
  }
}

function montarCardDetalhe(
  indicador: DashboardMensalCardKey,
  competencia: string,
  items: DashboardFinanceiroComposicaoItem[],
  competenciaAtualReal: string,
  observacaoCompetencia: string,
): DashboardFinanceiroCardDetalhe {
  const competenciaLabel = formatarCompetenciaLabel(competencia);

  if (indicador === "inadimplencia_do_mes") {
    const composicao = filtrarNatureza(items, "vencido");
    const totalVencido = totalNatureza(composicao, "vencido");
    const totalPrevisto = totalNatureza(items, "previsto");

    return {
      indicador,
      titulo: cardTitulo(indicador),
      competencia,
      competencia_label: competenciaLabel,
      total_centavos: totalVencido,
      percentual: totalPrevisto > 0 ? Math.round((totalVencido / totalPrevisto) * 1000) / 10 : 0,
      composicao,
      resumo: resumirComposicao(composicao, competenciaAtualReal),
      observacao_resumo: cardObservacao(indicador, observacaoCompetencia),
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
  const composicao = filtrarNatureza(items, natureza);

  return {
    indicador,
    titulo: cardTitulo(indicador),
    competencia,
    competencia_label: competenciaLabel,
    total_centavos: totalNatureza(composicao, natureza),
    percentual: null,
    composicao,
    resumo: resumirComposicao(composicao, competenciaAtualReal),
    observacao_resumo: cardObservacao(indicador, observacaoCompetencia),
  };
}

function criarCompetenciaDetalhe(
  competencia: string,
  items: DashboardFinanceiroComposicaoItem[],
  competenciaAtualReal: string,
): DashboardFinanceiroCompetenciaDetalhe {
  const composicaoPrevisto = filtrarNatureza(items, "previsto");
  const composicaoPago = filtrarNatureza(items, "pago");
  const composicaoPendente = filtrarNatureza(items, "pendente");
  const composicaoVencido = filtrarNatureza(items, "vencido");
  const composicaoNeofin = filtrarNatureza(items, "neofin");

  return {
    competencia,
    competencia_label: formatarCompetenciaLabel(competencia),
    previsto_centavos: totalNatureza(composicaoPrevisto, "previsto"),
    pago_centavos: totalNatureza(composicaoPago, "pago"),
    pendente_centavos: totalNatureza(composicaoPendente, "pendente"),
    vencido_centavos: totalNatureza(composicaoVencido, "vencido"),
    neofin_centavos: totalNatureza(composicaoNeofin, "neofin"),
    quantidade_itens: items.length,
    observacao_resumo: criarObservacaoCompetencia(competencia, items, competenciaAtualReal),
    composicao_previsto: composicaoPrevisto,
    composicao_pago: composicaoPago,
    composicao_pendente: composicaoPendente,
    composicao_vencido: composicaoVencido,
    composicao_neofin: composicaoNeofin,
  };
}

export function montarDashboardFinanceiroComposicaoItem(
  item: DashboardFinanceiroComposicaoItemInput,
): DashboardFinanceiroComposicaoItem {
  const valorPrevistoCentavos = Math.max(numeroSeguro(item.valor_centavos), 0);
  const valorRecebidoCentavos = Math.max(Math.min(numeroSeguro(item.valor_pago_centavos), valorPrevistoCentavos), 0);
  const valorPendenteCentavos = Math.max(numeroSeguro(item.saldo_aberto_centavos), 0);
  const valorVencidoCentavos = item.status_operacional === "PENDENTE_VENCIDO" ? valorPendenteCentavos : 0;
  const valorNeofinCentavos =
    item.neofin_situacao_operacional === "VINCULADA" && valorPendenteCentavos > 0 ? valorPendenteCentavos : 0;
  const descricao = normalizarTexto(item.descricao) ?? item.origem_referencia_label;

  return {
    competencia: item.competencia_ano_mes,
    competencia_label: item.competencia_label || formatarCompetenciaLabel(item.competencia_ano_mes),
    cobranca_id: item.cobranca_id,
    cobranca_key: item.cobranca_key,
    cobranca_fonte: item.cobranca_fonte,
    pessoa_id: item.pessoa_id,
    pessoa_nome: item.pessoa_nome,
    pessoa_label: item.pessoa_label,
    conta_conexao_id: item.conta_conexao_id ?? null,
    conta_interna_id: item.conta_conexao_id ?? null,
    tipo_conta: item.tipo_conta,
    tipo_conta_label: item.tipo_conta_label ?? montarTipoContaLabel(item.tipo_conta),
    origem_tipo: normalizarTexto(item.origem_tipo),
    origem_subtipo: normalizarTexto(item.origem_subtipo),
    origem_id: item.origem_id ?? null,
    origem_label: buildOrigemLabel(item),
    descricao,
    referencia: item.origem_referencia_label,
    status: item.status_operacional,
    status_label: statusOperacionalLabel(item.status_operacional),
    status_bruto: normalizarTexto(item.status_bruto),
    valor_previsto_centavos: valorPrevistoCentavos,
    valor_recebido_centavos: valorRecebidoCentavos,
    valor_pendente_centavos: valorPendenteCentavos,
    valor_vencido_centavos: valorVencidoCentavos,
    valor_neofin_centavos: valorNeofinCentavos,
    neofin_status: item.neofin_status,
    neofin_label: item.neofin_label,
    neofin_situacao_operacional: item.neofin_situacao_operacional,
    data_vencimento: item.data_vencimento,
    data_pagamento: item.data_pagamento,
    observacao_resumo: buildObservacaoResumo(item),
    fatura_id: item.fatura_id,
    fatura_competencia: item.fatura_competencia,
    fatura_status: item.fatura_status,
    cobranca_url: item.cobranca_url,
    fatura_url: item.fatura_url,
    dias_em_atraso: item.dias_em_atraso,
    created_at: item.created_at ?? null,
    updated_at: item.updated_at ?? null,
  };
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
  const observacaoSelecionada = mesSelecionado.observacao_resumo ?? "Sem composicao operacional no recorte.";
  const cards_detalhe: Record<DashboardMensalCardKey, DashboardFinanceiroCardDetalhe> = {
    previsto_para_receber: montarCardDetalhe(
      "previsto_para_receber",
      params.competenciaSelecionada,
      itemsSelecionados,
      params.competenciaAtualReal,
      observacaoSelecionada,
    ),
    recebido_no_mes: montarCardDetalhe(
      "recebido_no_mes",
      params.competenciaSelecionada,
      itemsSelecionados,
      params.competenciaAtualReal,
      observacaoSelecionada,
    ),
    pendente_do_mes: montarCardDetalhe(
      "pendente_do_mes",
      params.competenciaSelecionada,
      itemsSelecionados,
      params.competenciaAtualReal,
      observacaoSelecionada,
    ),
    em_cobranca_neofin: montarCardDetalhe(
      "em_cobranca_neofin",
      params.competenciaSelecionada,
      itemsSelecionados,
      params.competenciaAtualReal,
      observacaoSelecionada,
    ),
    inadimplencia_do_mes: montarCardDetalhe(
      "inadimplencia_do_mes",
      params.competenciaSelecionada,
      itemsSelecionados,
      params.competenciaAtualReal,
      observacaoSelecionada,
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
