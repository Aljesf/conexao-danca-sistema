import type { SupabaseClient } from "@supabase/supabase-js";
import { classifyReceiptChannel } from "@/lib/financeiro/dashboardMensalContaInterna";

type CentroCustoRow = {
  id: number;
  codigo: string | null;
  nome: string | null;
  ativo: boolean | null;
};

type MovimentoFinanceiroRow = {
  id: number;
  tipo: string | null;
  centro_custo_id: number | null;
  valor_centavos: number | null;
  data_movimento: string | null;
  origem: string | null;
  origem_id: number | null;
  descricao: string | null;
};

type RecebimentoRow = {
  id: number;
  cobranca_id: number | null;
  centro_custo_id: number | null;
  valor_centavos: number | null;
  data_pagamento: string | null;
  metodo_pagamento: string | null;
  forma_pagamento_codigo: string | null;
  origem_sistema: string | null;
  observacoes: string | null;
};

type CobrancaRow = {
  id: number;
  pessoa_id: number | null;
  descricao: string | null;
  status: string | null;
  centro_custo_id: number | null;
  competencia_ano_mes: string | null;
  origem_tipo: string | null;
  origem_subtipo: string | null;
  origem_id: number | null;
  neofin_charge_id: string | null;
  valor_centavos: number | null;
};

type PessoaRow = {
  id: number;
  nome: string | null;
};

type PagamentoContaPagarRow = {
  id: number;
  conta_pagar_id: number | null;
  centro_custo_id: number | null;
  valor_principal_centavos: number | null;
  juros_centavos: number | null;
  desconto_centavos: number | null;
  data_pagamento: string | null;
  metodo_pagamento: string | null;
  forma_pagamento_codigo: string | null;
  observacoes: string | null;
};

type ContaPagarRow = {
  id: number;
  pessoa_id: number | null;
  descricao: string | null;
  status: string | null;
  centro_custo_id: number | null;
  categoria_id: number | null;
};

type FaturaPivotRow = {
  fatura_id: number;
  lancamento_id: number;
};

type FaturaRow = {
  id: number;
  cobranca_id: number | null;
};

type LancamentoRow = {
  id: number;
  cobranca_id: number | null;
  conta_conexao_id: number | null;
  centro_custo_id: number | null;
  valor_centavos: number | null;
  competencia: string | null;
  origem_sistema: string | null;
  origem_id: number | null;
  descricao: string | null;
};

type AllocationBucket = {
  centro_custo_id: number | null;
  base_centavos: number;
  conta_interna_id: number | null;
  observacao_resumo: string | null;
};

export type DashboardCentroCustoTendenciaValor = {
  atual_centavos: number;
  anterior_centavos: number;
  variacao_percentual: number | null;
  direcao: "UP" | "DOWN" | "FLAT";
  descricao?: "BASE_ZERO_SUBIU" | "ZEROU" | "SEM_MOVIMENTO" | null;
};

export type DashboardCentroCustoDetalheItem = {
  item_key: string;
  centro_custo_id: number | null;
  centro_custo_codigo: string | null;
  centro_custo_nome: string | null;
  tipo_movimento: "RECEITA" | "DESPESA";
  origem: string;
  pessoa_documento_origem: string | null;
  descricao: string;
  data_operacional: string;
  competencia: string | null;
  valor_centavos: number;
  status: string | null;
  canal: string | null;
  referencia_interna: string | null;
  cobranca_id: number | null;
  recebimento_id: number | null;
  pagamento_id: number | null;
  movimento_financeiro_id: number | null;
  conta_interna_id: number | null;
  observacao_resumo: string | null;
};

export type DashboardCentroCustoResumo = {
  centro_custo_id: number;
  centro_custo_codigo: string | null;
  centro_custo_nome: string | null;
  receitas_30d_centavos: number;
  despesas_30d_centavos: number;
  resultado_30d_centavos: number;
  tendencia_resultado: DashboardCentroCustoTendenciaValor;
  quantidade_receitas: number;
  quantidade_despesas: number;
};

export type DashboardCentroCustoDiagnostico = {
  receitas_sem_centro_resolvido_centavos: number;
  receitas_sem_centro_resolvido_qtd: number;
  despesas_sem_centro_resolvido_centavos: number;
  despesas_sem_centro_resolvido_qtd: number;
};

export type DashboardCentroCustoDetalhe = {
  centro_custo_id: number;
  centro_custo_codigo: string | null;
  centro_custo_nome: string | null;
  receitas_atual_centavos: number;
  despesas_atual_centavos: number;
  resultado_atual_centavos: number;
  receitas_anterior_centavos: number;
  despesas_anterior_centavos: number;
  resultado_anterior_centavos: number;
  tendencia_resultado: DashboardCentroCustoTendenciaValor;
  itens_atuais: DashboardCentroCustoDetalheItem[];
};

export type DashboardCentroCustoResponse = {
  data_base: string;
  periodo_atual: { inicio: string; fim: string };
  periodo_anterior: { inicio: string; fim: string };
  resumo_por_centro: DashboardCentroCustoResumo[];
  diagnostico: DashboardCentroCustoDiagnostico;
  detalhe_centro: DashboardCentroCustoDetalhe | null;
};

const TIPOS_RECEITA = new Set(["ENTRADA", "RECEITA"]);
const TIPOS_DESPESA = new Set(["SAIDA", "DESPESA"]);
const ORIGENS_RECEITA_STANDALONE_EXCLUIDAS = new Set([
  "RECEBIMENTO",
  "COBRANCA",
  "RATEIO_COBRANCA",
  "TAXA_CREDITO_CONEXAO",
  "CARTAO_REPASSE",
]);

function dataHojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(base: string, days: number): string {
  const date = new Date(`${base}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function sliceDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const stringValue = String(value).trim();
  return stringValue.length >= 10 ? stringValue.slice(0, 10) : null;
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function upper(value: unknown): string {
  return normalizeText(value)
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase() ?? "";
}

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function variacao(atual: number, anterior: number): DashboardCentroCustoTendenciaValor {
  const safeAtual = toNumber(atual);
  const safeAnterior = toNumber(anterior);
  let variacaoPercentual: number | null = null;
  let descricao: DashboardCentroCustoTendenciaValor["descricao"] = null;

  if (safeAnterior === 0 && safeAtual > 0) descricao = "BASE_ZERO_SUBIU";
  else if (safeAnterior > 0 && safeAtual === 0) {
    variacaoPercentual = -100;
    descricao = "ZEROU";
  } else if (safeAnterior === 0 && safeAtual === 0) {
    variacaoPercentual = 0;
    descricao = "SEM_MOVIMENTO";
  } else {
    variacaoPercentual = ((safeAtual - safeAnterior) / Math.abs(safeAnterior)) * 100;
  }

  let direcao: DashboardCentroCustoTendenciaValor["direcao"] = "FLAT";
  if (descricao === "BASE_ZERO_SUBIU") direcao = "UP";
  else if (descricao === "ZEROU") direcao = "DOWN";
  else if (variacaoPercentual !== null) {
    if (variacaoPercentual > 5) direcao = "UP";
    else if (variacaoPercentual < -5) direcao = "DOWN";
  }

  return {
    atual_centavos: safeAtual,
    anterior_centavos: safeAnterior,
    variacao_percentual: variacaoPercentual,
    direcao,
    descricao,
  };
}

function withinRange(dateIso: string | null, inicio: string, fim: string): boolean {
  return Boolean(dateIso && dateIso >= inicio && dateIso <= fim);
}

function compareDetalheDesc(a: DashboardCentroCustoDetalheItem, b: DashboardCentroCustoDetalheItem): number {
  const byDate = (b.data_operacional ?? "").localeCompare(a.data_operacional ?? "");
  if (byDate !== 0) return byDate;
  const byTipo = a.tipo_movimento.localeCompare(b.tipo_movimento);
  if (byTipo !== 0) return byTipo;
  return b.valor_centavos - a.valor_centavos;
}

function agruparBucketsPorCentro(buckets: AllocationBucket[]): AllocationBucket[] {
  const aggregated = new Map<number | null, AllocationBucket>();

  for (const bucket of buckets) {
    const current = aggregated.get(bucket.centro_custo_id) ?? {
      centro_custo_id: bucket.centro_custo_id,
      base_centavos: 0,
      conta_interna_id: bucket.conta_interna_id,
      observacao_resumo: bucket.observacao_resumo,
    };

    current.base_centavos += bucket.base_centavos;
    if (!current.conta_interna_id && bucket.conta_interna_id) {
      current.conta_interna_id = bucket.conta_interna_id;
    }
    if (!current.observacao_resumo && bucket.observacao_resumo) {
      current.observacao_resumo = bucket.observacao_resumo;
    }
    aggregated.set(bucket.centro_custo_id, current);
  }

  return Array.from(aggregated.values()).filter((bucket) => bucket.base_centavos > 0);
}

function distribuirValor(totalCentavos: number, buckets: AllocationBucket[]): AllocationBucket[] {
  const total = toNumber(totalCentavos);
  const validBuckets = buckets.filter((bucket) => toNumber(bucket.base_centavos) > 0);
  if (total <= 0 || validBuckets.length === 0) return [];
  if (validBuckets.length === 1) {
    return [{ ...validBuckets[0], base_centavos: total }];
  }

  const baseTotal = validBuckets.reduce((acc, bucket) => acc + toNumber(bucket.base_centavos), 0);
  if (baseTotal <= 0) {
    return [{ ...validBuckets[0], base_centavos: total }];
  }

  let restante = total;
  return validBuckets.map((bucket, index) => {
    const valor =
      index === validBuckets.length - 1
        ? restante
        : Math.round((total * toNumber(bucket.base_centavos)) / baseTotal);
    restante -= valor;
    return {
      ...bucket,
      base_centavos: valor,
    };
  });
}

function inferirCodigoCentroPorOrigem(cobranca: CobrancaRow | null): "ESCOLA" | "CAFE" | "LOJA" | "FIN" | null {
  const origemTipo = upper(cobranca?.origem_tipo);
  const origemSubtipo = upper(cobranca?.origem_subtipo);

  if (
    origemTipo === "ESCOLA" ||
    origemTipo === "MATRICULA" ||
    origemTipo === "MATRICULA_REPROCESSAR" ||
    origemSubtipo === "CARTAO_CONEXAO" ||
    origemTipo === "FATURA_CREDITO_CONEXAO" ||
    origemTipo === "CREDITO_CONEXAO_FATURA"
  ) {
    return "ESCOLA";
  }

  if (origemTipo === "CAFE") return "CAFE";
  if (origemTipo === "LOJA" || origemTipo === "LOJA_VENDA") return "LOJA";
  return null;
}

function centroAliasMatches(codigo: string | null): "ESCOLA" | "CAFE" | "LOJA" | "FIN" | null {
  const normalized = upper(codigo);
  if (["ESCOLA", "ESC"].includes(normalized)) return "ESCOLA";
  if (["CAFE", "CAF", "BALLET CAFE"].includes(normalized)) return "CAFE";
  if (["LOJA", "AJ DANCE STORE"].includes(normalized)) return "LOJA";
  if (["FIN", "INTERMEDIACAO FINANCEIRA"].includes(normalized)) return "FIN";
  return null;
}

function resolverCentroPorCodigo(
  codigo: "ESCOLA" | "CAFE" | "LOJA" | "FIN" | null,
  centros: CentroCustoRow[],
): number | null {
  if (!codigo) return null;
  const encontrado = centros.find((centro) => {
    const codigoCentro = centroAliasMatches(centro.codigo);
    const nomeCentro = centroAliasMatches(centro.nome);
    return codigoCentro === codigo || nomeCentro === codigo;
  });
  return encontrado ? Number(encontrado.id) : null;
}

function resolverBucketsFallback(params: {
  receipt: RecebimentoRow;
  cobranca: CobrancaRow | null;
  directBuckets: AllocationBucket[];
  faturaBuckets: AllocationBucket[];
  centros: CentroCustoRow[];
}): AllocationBucket[] {
  if (typeof params.receipt.centro_custo_id === "number") {
    return [
      {
        centro_custo_id: Number(params.receipt.centro_custo_id),
        base_centavos: toNumber(params.receipt.valor_centavos),
        conta_interna_id: null,
        observacao_resumo: "Centro herdado do recebimento confirmado",
      },
    ];
  }

  if (typeof params.cobranca?.centro_custo_id === "number") {
    return [
      {
        centro_custo_id: Number(params.cobranca.centro_custo_id),
        base_centavos: toNumber(params.receipt.valor_centavos),
        conta_interna_id: null,
        observacao_resumo: "Centro herdado da cobranca de origem",
      },
    ];
  }

  if (params.directBuckets.length > 0) {
    return distribuirValor(toNumber(params.receipt.valor_centavos), params.directBuckets).map((bucket) => ({
      ...bucket,
      observacao_resumo: bucket.observacao_resumo ?? "Centro herdado dos lancamentos vinculados a cobranca",
    }));
  }

  if (params.faturaBuckets.length > 0) {
    return distribuirValor(toNumber(params.receipt.valor_centavos), params.faturaBuckets).map((bucket) => ({
      ...bucket,
      observacao_resumo: bucket.observacao_resumo ?? "Centro herdado dos lancamentos da fatura",
    }));
  }

  const centroResolvido = resolverCentroPorCodigo(inferirCodigoCentroPorOrigem(params.cobranca), params.centros);
  if (centroResolvido) {
    return [
      {
        centro_custo_id: centroResolvido,
        base_centavos: toNumber(params.receipt.valor_centavos),
        conta_interna_id: null,
        observacao_resumo: "Centro inferido pela origem operacional da cobranca",
      },
    ];
  }

  return [];
}

function criarDetalheReceita(params: {
  allocation: AllocationBucket;
  centro: CentroCustoRow | null;
  receipt: RecebimentoRow;
  cobranca: CobrancaRow | null;
  pessoaNome: string | null;
  competencia: string | null;
  canal: string | null;
  itemKey: string;
}): DashboardCentroCustoDetalheItem {
  return {
    item_key: params.itemKey,
    centro_custo_id: params.allocation.centro_custo_id,
    centro_custo_codigo: params.centro?.codigo ?? null,
    centro_custo_nome: params.centro?.nome ?? null,
    tipo_movimento: "RECEITA",
    origem:
      normalizeText(params.receipt.origem_sistema) ??
      normalizeText(params.cobranca?.origem_tipo) ??
      "RECEBIMENTO_CONFIRMADO",
    pessoa_documento_origem: params.pessoaNome,
    descricao:
      normalizeText(params.cobranca?.descricao) ??
      normalizeText(params.receipt.observacoes) ??
      `Recebimento #${params.receipt.id}`,
    data_operacional: sliceDate(params.receipt.data_pagamento) ?? dataHojeISO(),
    competencia: params.competencia,
    valor_centavos: toNumber(params.allocation.base_centavos),
    status: normalizeText(params.cobranca?.status) ?? "RECEBIDO_CONFIRMADO",
    canal: params.canal,
    referencia_interna: `recebimento:${params.receipt.id}${params.receipt.cobranca_id ? ` | cobranca:${params.receipt.cobranca_id}` : ""}`,
    cobranca_id: params.receipt.cobranca_id ?? null,
    recebimento_id: params.receipt.id,
    pagamento_id: null,
    movimento_financeiro_id: null,
    conta_interna_id: params.allocation.conta_interna_id,
    observacao_resumo: params.allocation.observacao_resumo,
  };
}

function criarDetalheDespesa(params: {
  centro: CentroCustoRow | null;
  pagamento: PagamentoContaPagarRow;
  conta: ContaPagarRow | null;
  pessoaNome: string | null;
  valorCentavos: number;
  observacaoResumo: string | null;
}): DashboardCentroCustoDetalheItem {
  return {
    item_key: `PAGAMENTO:${params.pagamento.id}`,
    centro_custo_id:
      typeof params.pagamento.centro_custo_id === "number"
        ? Number(params.pagamento.centro_custo_id)
        : params.conta?.centro_custo_id ?? null,
    centro_custo_codigo: params.centro?.codigo ?? null,
    centro_custo_nome: params.centro?.nome ?? null,
    tipo_movimento: "DESPESA",
    origem: "CONTA_PAGAR",
    pessoa_documento_origem: params.pessoaNome,
    descricao:
      normalizeText(params.conta?.descricao) ??
      normalizeText(params.pagamento.observacoes) ??
      `Pagamento conta #${params.pagamento.conta_pagar_id ?? params.pagamento.id}`,
    data_operacional: sliceDate(params.pagamento.data_pagamento) ?? dataHojeISO(),
    competencia: null,
    valor_centavos: params.valorCentavos,
    status: normalizeText(params.conta?.status) ?? "PAGO",
    canal: normalizeText(params.pagamento.forma_pagamento_codigo) ?? normalizeText(params.pagamento.metodo_pagamento),
    referencia_interna: `conta_pagar_pagamento:${params.pagamento.id}${params.pagamento.conta_pagar_id ? ` | conta_pagar:${params.pagamento.conta_pagar_id}` : ""}`,
    cobranca_id: null,
    recebimento_id: null,
    pagamento_id: params.pagamento.id,
    movimento_financeiro_id: null,
    conta_interna_id: null,
    observacao_resumo: params.observacaoResumo,
  };
}

function criarDetalheMovimentoStandalone(params: {
  itemKey: string;
  centro: CentroCustoRow | null;
  movimento: MovimentoFinanceiroRow;
  tipoMovimento: "RECEITA" | "DESPESA";
}): DashboardCentroCustoDetalheItem {
  return {
    item_key: params.itemKey,
    centro_custo_id: params.movimento.centro_custo_id ?? null,
    centro_custo_codigo: params.centro?.codigo ?? null,
    centro_custo_nome: params.centro?.nome ?? null,
    tipo_movimento: params.tipoMovimento,
    origem: normalizeText(params.movimento.origem) ?? "MOVIMENTO_FINANCEIRO",
    pessoa_documento_origem: null,
    descricao: normalizeText(params.movimento.descricao) ?? `Movimento #${params.movimento.id}`,
    data_operacional: sliceDate(params.movimento.data_movimento) ?? dataHojeISO(),
    competencia: null,
    valor_centavos: toNumber(params.movimento.valor_centavos),
    status: "CONFIRMADO",
    canal: null,
    referencia_interna: `movimento_financeiro:${params.movimento.id}`,
    cobranca_id: null,
    recebimento_id: null,
    pagamento_id: null,
    movimento_financeiro_id: params.movimento.id,
    conta_interna_id: null,
    observacao_resumo: "Lancamento complementar registrado diretamente no movimento financeiro",
  };
}

async function carregarCentrosAtivos(supabase: SupabaseClient): Promise<CentroCustoRow[]> {
  const { data, error } = await supabase
    .from("centros_custo")
    .select("id,codigo,nome,ativo")
    .eq("ativo", true)
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`erro_buscar_centros_custo: ${error.message}`);
  }

  return (data ?? []) as CentroCustoRow[];
}

export async function calcularDashboardCentroCusto(
  supabase: SupabaseClient,
  opts?: { dataBase?: string; centroCustoId?: number | null },
): Promise<DashboardCentroCustoResponse> {
  const hoje = opts?.dataBase ?? dataHojeISO();
  const inicioAtual = addDays(hoje, -29);
  const fimAtual = hoje;
  const inicioAnterior = addDays(inicioAtual, -30);
  const fimAnterior = addDays(inicioAtual, -1);
  const inicioConsulta = inicioAnterior;
  const fimConsulta = fimAtual;

  const centros = await carregarCentrosAtivos(supabase);
  const centroById = new Map<number, CentroCustoRow>(centros.map((centro) => [Number(centro.id), centro]));

  const [{ data: recebimentosData, error: recebimentosError }, { data: pagamentosData, error: pagamentosError }, { data: movimentosData, error: movimentosError }] =
    await Promise.all([
      supabase
        .from("recebimentos")
        .select(
          "id,cobranca_id,centro_custo_id,valor_centavos,data_pagamento,metodo_pagamento,forma_pagamento_codigo,origem_sistema,observacoes",
        )
        .gte("data_pagamento", `${inicioConsulta}T00:00:00`)
        .lte("data_pagamento", `${fimConsulta}T23:59:59`)
        .order("data_pagamento", { ascending: false })
        .range(0, 4999),
      supabase
        .from("contas_pagar_pagamentos")
        .select(
          "id,conta_pagar_id,centro_custo_id,valor_principal_centavos,juros_centavos,desconto_centavos,data_pagamento,metodo_pagamento,forma_pagamento_codigo,observacoes",
        )
        .gte("data_pagamento", `${inicioConsulta}T00:00:00`)
        .lte("data_pagamento", `${fimConsulta}T23:59:59`)
        .order("data_pagamento", { ascending: false })
        .range(0, 4999),
      supabase
        .from("movimento_financeiro")
        .select("id,tipo,centro_custo_id,valor_centavos,data_movimento,origem,origem_id,descricao")
        .gte("data_movimento", `${inicioConsulta}T00:00:00`)
        .lte("data_movimento", `${fimConsulta}T23:59:59`)
        .order("data_movimento", { ascending: false })
        .range(0, 4999),
    ]);

  if (recebimentosError) {
    throw new Error(`erro_buscar_recebimentos_dashboard_centro: ${recebimentosError.message}`);
  }
  if (pagamentosError) {
    throw new Error(`erro_buscar_pagamentos_dashboard_centro: ${pagamentosError.message}`);
  }
  if (movimentosError) {
    throw new Error(`erro_buscar_movimentos_dashboard_centro: ${movimentosError.message}`);
  }

  const recebimentos = (recebimentosData ?? []) as RecebimentoRow[];
  const pagamentos = (pagamentosData ?? []) as PagamentoContaPagarRow[];
  const movimentos = (movimentosData ?? []) as MovimentoFinanceiroRow[];

  const cobrancaIds = Array.from(
    new Set(recebimentos.map((row) => row.cobranca_id).filter((value): value is number => typeof value === "number")),
  );
  const contaPagarIds = Array.from(
    new Set(pagamentos.map((row) => row.conta_pagar_id).filter((value): value is number => typeof value === "number")),
  );

  const cobrançasQuery = cobrancaIds.length
    ? supabase
        .from("cobrancas")
        .select(
          "id,pessoa_id,descricao,status,centro_custo_id,competencia_ano_mes,origem_tipo,origem_subtipo,origem_id,neofin_charge_id,valor_centavos",
        )
        .in("id", cobrancaIds)
        .range(0, 4999)
    : Promise.resolve({ data: [], error: null });
  const contasPagarQuery = contaPagarIds.length
    ? supabase
        .from("contas_pagar")
        .select("id,pessoa_id,descricao,status,centro_custo_id,categoria_id")
        .in("id", contaPagarIds)
        .range(0, 4999)
    : Promise.resolve({ data: [], error: null });

  const [{ data: cobrancasData, error: cobrancasError }, { data: contasData, error: contasError }] =
    await Promise.all([cobrançasQuery, contasPagarQuery]);

  if (cobrancasError) {
    throw new Error(`erro_buscar_cobrancas_dashboard_centro: ${cobrancasError.message}`);
  }
  if (contasError) {
    throw new Error(`erro_buscar_contas_pagar_dashboard_centro: ${contasError.message}`);
  }

  const cobrancas = (cobrancasData ?? []) as CobrancaRow[];
  const contasPagar = (contasData ?? []) as ContaPagarRow[];
  const cobrancaById = new Map<number, CobrancaRow>(cobrancas.map((row) => [Number(row.id), row]));
  const contaById = new Map<number, ContaPagarRow>(contasPagar.map((row) => [Number(row.id), row]));

  const pessoaIds = Array.from(
    new Set(
      [
        ...cobrancas.map((row) => row.pessoa_id),
        ...contasPagar.map((row) => row.pessoa_id),
      ].filter((value): value is number => typeof value === "number"),
    ),
  );

  const { data: pessoasData, error: pessoasError } = pessoaIds.length
    ? await supabase.from("pessoas").select("id,nome").in("id", pessoaIds).range(0, 4999)
    : { data: [], error: null };

  if (pessoasError) {
    throw new Error(`erro_buscar_pessoas_dashboard_centro: ${pessoasError.message}`);
  }

  const pessoas = (pessoasData ?? []) as PessoaRow[];
  const pessoaById = new Map<number, PessoaRow>(pessoas.map((row) => [Number(row.id), row]));

  const { data: lancamentosDiretosData, error: lancamentosDiretosError } = cobrancaIds.length
    ? await supabase
        .from("credito_conexao_lancamentos")
        .select("id,cobranca_id,conta_conexao_id,centro_custo_id,valor_centavos,competencia,origem_sistema,origem_id,descricao")
        .in("cobranca_id", cobrancaIds)
        .range(0, 4999)
    : { data: [], error: null };

  if (lancamentosDiretosError) {
    throw new Error(`erro_buscar_lancamentos_diretos_dashboard_centro: ${lancamentosDiretosError.message}`);
  }

  const cobrancasFatura = cobrancas.filter((row) =>
    ["FATURA_CREDITO_CONEXAO", "CREDITO_CONEXAO_FATURA"].includes(upper(row.origem_tipo)),
  );
  const faturaIdsOrigem = Array.from(
    new Set(cobrancasFatura.map((row) => row.origem_id).filter((value): value is number => typeof value === "number")),
  );

  const { data: faturasData, error: faturasError } = cobrancaIds.length
    ? await supabase
        .from("credito_conexao_faturas")
        .select("id,cobranca_id")
        .in("cobranca_id", cobrancaIds)
        .range(0, 4999)
    : { data: [], error: null };

  if (faturasError) {
    throw new Error(`erro_buscar_faturas_dashboard_centro: ${faturasError.message}`);
  }

  const faturas = (faturasData ?? []) as FaturaRow[];
  const faturaIds = Array.from(
    new Set([...faturaIdsOrigem, ...faturas.map((row) => row.id).filter((value): value is number => typeof value === "number")]),
  );

  const { data: pivotsData, error: pivotsError } = faturaIds.length
    ? await supabase
        .from("credito_conexao_fatura_lancamentos")
        .select("fatura_id,lancamento_id")
        .in("fatura_id", faturaIds)
        .range(0, 4999)
    : { data: [], error: null };

  if (pivotsError) {
    throw new Error(`erro_buscar_pivots_fatura_dashboard_centro: ${pivotsError.message}`);
  }

  const pivots = (pivotsData ?? []) as FaturaPivotRow[];
  const lancamentoIdsPivots = Array.from(
    new Set(pivots.map((row) => row.lancamento_id).filter((value): value is number => typeof value === "number")),
  );
  const lancamentosDiretos = (lancamentosDiretosData ?? []) as LancamentoRow[];
  const lancamentoIdsJaCarregados = new Set(
    lancamentosDiretos.map((row) => row.id).filter((value): value is number => typeof value === "number"),
  );
  const lancamentoIdsComplementares = lancamentoIdsPivots.filter((id) => !lancamentoIdsJaCarregados.has(id));

  const { data: lancamentosComplementaresData, error: lancamentosComplementaresError } =
    lancamentoIdsComplementares.length
      ? await supabase
          .from("credito_conexao_lancamentos")
          .select("id,cobranca_id,conta_conexao_id,centro_custo_id,valor_centavos,competencia,origem_sistema,origem_id,descricao")
          .in("id", lancamentoIdsComplementares)
          .range(0, 4999)
      : { data: [], error: null };

  if (lancamentosComplementaresError) {
    throw new Error(`erro_buscar_lancamentos_fatura_dashboard_centro: ${lancamentosComplementaresError.message}`);
  }

  const lancamentos = [...lancamentosDiretos, ...(((lancamentosComplementaresData ?? []) as LancamentoRow[]))];
  const lancamentoById = new Map<number, LancamentoRow>(lancamentos.map((row) => [Number(row.id), row]));

  const rateioBucketsByCobranca = new Map<number, AllocationBucket[]>();
  for (const movimento of movimentos) {
    if (!TIPOS_RECEITA.has(upper(movimento.tipo))) continue;
    if (!["RATEIO_COBRANCA", "TAXA_CREDITO_CONEXAO"].includes(upper(movimento.origem))) continue;
    if (typeof movimento.origem_id !== "number" || typeof movimento.centro_custo_id !== "number") continue;

    const atual = rateioBucketsByCobranca.get(movimento.origem_id) ?? [];
    atual.push({
      centro_custo_id: Number(movimento.centro_custo_id),
      base_centavos: toNumber(movimento.valor_centavos),
      conta_interna_id: null,
      observacao_resumo:
        upper(movimento.origem) === "TAXA_CREDITO_CONEXAO"
          ? "Centro herdado do rateio financeiro de intermedicao"
          : "Centro herdado do rateio financeiro da cobranca",
    });
    rateioBucketsByCobranca.set(movimento.origem_id, atual);
  }

  const directBucketsByCobranca = new Map<number, AllocationBucket[]>();
  for (const lancamento of lancamentos) {
    if (typeof lancamento.cobranca_id !== "number" || typeof lancamento.centro_custo_id !== "number") continue;

    const atual = directBucketsByCobranca.get(lancamento.cobranca_id) ?? [];
    atual.push({
      centro_custo_id: Number(lancamento.centro_custo_id),
      base_centavos: toNumber(lancamento.valor_centavos),
      conta_interna_id: lancamento.conta_conexao_id ?? null,
      observacao_resumo: "Centro herdado do lancamento financeiro gerado na Conta Interna Aluno",
    });
    directBucketsByCobranca.set(lancamento.cobranca_id, atual);
  }

  const pivotsByFatura = new Map<number, FaturaPivotRow[]>();
  for (const pivot of pivots) {
    const atual = pivotsByFatura.get(pivot.fatura_id) ?? [];
    atual.push(pivot);
    pivotsByFatura.set(pivot.fatura_id, atual);
  }

  const faturaIdsByCobranca = new Map<number, number>();
  for (const fatura of faturas) {
    if (typeof fatura.cobranca_id === "number") {
      faturaIdsByCobranca.set(fatura.cobranca_id, Number(fatura.id));
    }
  }
  for (const cobranca of cobrancasFatura) {
    if (typeof cobranca.origem_id === "number") {
      faturaIdsByCobranca.set(cobranca.id, Number(cobranca.origem_id));
    }
  }

  const faturaBucketsById = new Map<number, AllocationBucket[]>();
  for (const faturaId of faturaIds) {
    const buckets = (pivotsByFatura.get(faturaId) ?? [])
      .map((pivot) => lancamentoById.get(pivot.lancamento_id))
      .filter((row): row is LancamentoRow => Boolean(row))
      .filter((row) => typeof row.centro_custo_id === "number")
      .map((row) => ({
        centro_custo_id: Number(row.centro_custo_id),
        base_centavos: toNumber(row.valor_centavos),
        conta_interna_id: row.conta_conexao_id ?? null,
        observacao_resumo: "Centro herdado dos lancamentos agrupados na fatura da Conta Interna Aluno",
      }));

    const agrupados = agruparBucketsPorCentro(buckets);
    if (agrupados.length > 0) {
      faturaBucketsById.set(faturaId, agrupados);
    }
  }

  const itensReceita: DashboardCentroCustoDetalheItem[] = [];
  const itensDespesa: DashboardCentroCustoDetalheItem[] = [];

  for (const receipt of recebimentos) {
    const dataOperacional = sliceDate(receipt.data_pagamento);
    if (!withinRange(dataOperacional, inicioConsulta, fimConsulta)) continue;

    const cobranca = receipt.cobranca_id ? (cobrancaById.get(receipt.cobranca_id) ?? null) : null;
    const pessoaNome =
      typeof cobranca?.pessoa_id === "number" ? (pessoaById.get(cobranca.pessoa_id)?.nome ?? null) : null;
    const receiptChannel = classifyReceiptChannel({
      possui_vinculo_neofin: Boolean(cobranca?.neofin_charge_id),
      origem_recebimento_sistema: receipt.origem_sistema,
      forma_pagamento_codigo: receipt.forma_pagamento_codigo,
      metodo_pagamento: receipt.metodo_pagamento,
    });
    const directBuckets = cobranca?.id ? agruparBucketsPorCentro(directBucketsByCobranca.get(cobranca.id) ?? []) : [];
    const faturaId = cobranca?.id ? (faturaIdsByCobranca.get(cobranca.id) ?? null) : null;
    const faturaBuckets = faturaId ? (faturaBucketsById.get(faturaId) ?? []) : [];
    const rateioBuckets =
      cobranca?.id
        ? agruparBucketsPorCentro(rateioBucketsByCobranca.get(cobranca.id) ?? []).filter(
            (bucket) => typeof bucket.centro_custo_id === "number",
          )
        : [];
    const allocations =
      rateioBuckets.length > 0
        ? distribuirValor(toNumber(receipt.valor_centavos), rateioBuckets)
        : resolverBucketsFallback({
            receipt,
            cobranca,
            directBuckets,
            faturaBuckets,
            centros,
          });

    if (allocations.length === 0) {
      itensReceita.push(
        criarDetalheReceita({
          allocation: {
            centro_custo_id: null,
            base_centavos: toNumber(receipt.valor_centavos),
            conta_interna_id: null,
            observacao_resumo: "Recebimento confirmado sem centro de custo resolvido",
          },
          centro: null,
          receipt,
          cobranca,
          pessoaNome,
          competencia: cobranca?.competencia_ano_mes ?? null,
          canal: receiptChannel.canal_recebimento_label,
          itemKey: `RECEBIMENTO:${receipt.id}:SEM_CENTRO`,
        }),
      );
      continue;
    }

    for (const allocation of allocations) {
      const centro =
        typeof allocation.centro_custo_id === "number" ? (centroById.get(allocation.centro_custo_id) ?? null) : null;
      itensReceita.push(
        criarDetalheReceita({
          allocation,
          centro,
          receipt,
          cobranca,
          pessoaNome,
          competencia: cobranca?.competencia_ano_mes ?? null,
          canal: receiptChannel.canal_recebimento_label,
          itemKey: `RECEBIMENTO:${receipt.id}:${allocation.centro_custo_id ?? "SEM_CENTRO"}`,
        }),
      );
    }
  }

  for (const pagamento of pagamentos) {
    const dataOperacional = sliceDate(pagamento.data_pagamento);
    if (!withinRange(dataOperacional, inicioConsulta, fimConsulta)) continue;

    const conta = pagamento.conta_pagar_id ? (contaById.get(pagamento.conta_pagar_id) ?? null) : null;
    const centroId =
      typeof pagamento.centro_custo_id === "number"
        ? Number(pagamento.centro_custo_id)
        : typeof conta?.centro_custo_id === "number"
          ? Number(conta.centro_custo_id)
          : null;
    const pessoaNome =
      typeof conta?.pessoa_id === "number" ? (pessoaById.get(conta.pessoa_id)?.nome ?? null) : null;
    const valorCentavos =
      Math.max(
        toNumber(pagamento.valor_principal_centavos) + toNumber(pagamento.juros_centavos) - toNumber(pagamento.desconto_centavos),
        0,
      );

    itensDespesa.push(
      criarDetalheDespesa({
        centro: centroId ? (centroById.get(centroId) ?? null) : null,
        pagamento,
        conta,
        pessoaNome,
        valorCentavos,
        observacaoResumo:
          centroId !== null
            ? "Centro herdado do pagamento/conta a pagar confirmados"
            : "Pagamento confirmado sem centro de custo resolvido",
      }),
    );
  }

  for (const movimento of movimentos) {
    const dataOperacional = sliceDate(movimento.data_movimento);
    if (!withinRange(dataOperacional, inicioConsulta, fimConsulta)) continue;

    const tipoNormalizado = upper(movimento.tipo);
    const origemNormalizada = upper(movimento.origem);

    if (TIPOS_RECEITA.has(tipoNormalizado) && !ORIGENS_RECEITA_STANDALONE_EXCLUIDAS.has(origemNormalizada)) {
      itensReceita.push(
        criarDetalheMovimentoStandalone({
          itemKey: `MOVIMENTO_RECEITA:${movimento.id}`,
          centro: typeof movimento.centro_custo_id === "number" ? (centroById.get(movimento.centro_custo_id) ?? null) : null,
          movimento,
          tipoMovimento: "RECEITA",
        }),
      );
    }

    if (TIPOS_DESPESA.has(tipoNormalizado) && origemNormalizada !== "CONTA_PAGAR") {
      itensDespesa.push(
        criarDetalheMovimentoStandalone({
          itemKey: `MOVIMENTO_DESPESA:${movimento.id}`,
          centro: typeof movimento.centro_custo_id === "number" ? (centroById.get(movimento.centro_custo_id) ?? null) : null,
          movimento,
          tipoMovimento: "DESPESA",
        }),
      );
    }
  }

  const receitasAtuais = itensReceita.filter((item) => withinRange(item.data_operacional, inicioAtual, fimAtual));
  const receitasAnteriores = itensReceita.filter((item) => withinRange(item.data_operacional, inicioAnterior, fimAnterior));
  const despesasAtuais = itensDespesa.filter((item) => withinRange(item.data_operacional, inicioAtual, fimAtual));
  const despesasAnteriores = itensDespesa.filter((item) => withinRange(item.data_operacional, inicioAnterior, fimAnterior));

  const diagnostico: DashboardCentroCustoDiagnostico = {
    receitas_sem_centro_resolvido_centavos: receitasAtuais
      .filter((item) => item.centro_custo_id === null)
      .reduce((acc, item) => acc + item.valor_centavos, 0),
    receitas_sem_centro_resolvido_qtd: receitasAtuais.filter((item) => item.centro_custo_id === null).length,
    despesas_sem_centro_resolvido_centavos: despesasAtuais
      .filter((item) => item.centro_custo_id === null)
      .reduce((acc, item) => acc + item.valor_centavos, 0),
    despesas_sem_centro_resolvido_qtd: despesasAtuais.filter((item) => item.centro_custo_id === null).length,
  };

  const resumo_por_centro: DashboardCentroCustoResumo[] = centros.map((centro) => {
    const receitasCentroAtual = receitasAtuais.filter((item) => item.centro_custo_id === centro.id);
    const despesasCentroAtual = despesasAtuais.filter((item) => item.centro_custo_id === centro.id);
    const receitasCentroAnterior = receitasAnteriores.filter((item) => item.centro_custo_id === centro.id);
    const despesasCentroAnterior = despesasAnteriores.filter((item) => item.centro_custo_id === centro.id);

    const receitasAtualCentavos = receitasCentroAtual.reduce((acc, item) => acc + item.valor_centavos, 0);
    const despesasAtualCentavos = despesasCentroAtual.reduce((acc, item) => acc + item.valor_centavos, 0);
    const resultadoAtualCentavos = receitasAtualCentavos - despesasAtualCentavos;
    const resultadoAnteriorCentavos =
      receitasCentroAnterior.reduce((acc, item) => acc + item.valor_centavos, 0) -
      despesasCentroAnterior.reduce((acc, item) => acc + item.valor_centavos, 0);

    return {
      centro_custo_id: centro.id,
      centro_custo_codigo: centro.codigo ?? null,
      centro_custo_nome: centro.nome ?? null,
      receitas_30d_centavos: receitasAtualCentavos,
      despesas_30d_centavos: despesasAtualCentavos,
      resultado_30d_centavos: resultadoAtualCentavos,
      tendencia_resultado: variacao(resultadoAtualCentavos, resultadoAnteriorCentavos),
      quantidade_receitas: receitasCentroAtual.length,
      quantidade_despesas: despesasCentroAtual.length,
    };
  });

  const detalheCentroId = typeof opts?.centroCustoId === "number" ? Number(opts.centroCustoId) : null;
  const detalhe_centro =
    detalheCentroId === null
      ? null
      : (() => {
          const centro = centroById.get(detalheCentroId) ?? null;
          const itensAtuais = [...receitasAtuais, ...despesasAtuais]
            .filter((item) => item.centro_custo_id === detalheCentroId)
            .sort(compareDetalheDesc);
          const receitasCentroAtual = receitasAtuais
            .filter((item) => item.centro_custo_id === detalheCentroId)
            .reduce((acc, item) => acc + item.valor_centavos, 0);
          const despesasCentroAtual = despesasAtuais
            .filter((item) => item.centro_custo_id === detalheCentroId)
            .reduce((acc, item) => acc + item.valor_centavos, 0);
          const receitasCentroAnterior = receitasAnteriores
            .filter((item) => item.centro_custo_id === detalheCentroId)
            .reduce((acc, item) => acc + item.valor_centavos, 0);
          const despesasCentroAnterior = despesasAnteriores
            .filter((item) => item.centro_custo_id === detalheCentroId)
            .reduce((acc, item) => acc + item.valor_centavos, 0);

          return {
            centro_custo_id: detalheCentroId,
            centro_custo_codigo: centro?.codigo ?? null,
            centro_custo_nome: centro?.nome ?? null,
            receitas_atual_centavos: receitasCentroAtual,
            despesas_atual_centavos: despesasCentroAtual,
            resultado_atual_centavos: receitasCentroAtual - despesasCentroAtual,
            receitas_anterior_centavos: receitasCentroAnterior,
            despesas_anterior_centavos: despesasCentroAnterior,
            resultado_anterior_centavos: receitasCentroAnterior - despesasCentroAnterior,
            tendencia_resultado: variacao(
              receitasCentroAtual - despesasCentroAtual,
              receitasCentroAnterior - despesasCentroAnterior,
            ),
            itens_atuais: itensAtuais,
          };
        })();

  return {
    data_base: hoje,
    periodo_atual: { inicio: inicioAtual, fim: fimAtual },
    periodo_anterior: { inicio: inicioAnterior, fim: fimAnterior },
    resumo_por_centro,
    diagnostico,
    detalhe_centro,
  };
}
