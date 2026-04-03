import { upsertLancamentoPorCobranca } from "@/lib/credito-conexao/upsertLancamentoPorCobranca";
import {
  agendarFaturamentoMensalAluno,
  agendarFaturamentoMensalColaborador,
  type ContaInternaTipo,
} from "@/lib/financeiro/conta-interna";
import { recalcularComprasFatura } from "@/lib/financeiro/creditoConexaoFaturas";
import { processarClassificacaoFinanceira } from "@/lib/financeiro/processarClassificacaoFinanceira";

type SupabaseLike = {
  from: (table: string) => any;
};

type PagamentoContaInternaInput = {
  dataPagamento: string;
  metodoPagamento: string;
  formaPagamentoCodigo?: string | null;
  origemSistemaRecebimento?: string | null;
  observacoes?: string | null;
  centroCustoId?: number | null;
  usuarioId?: string | null;
  descricaoMovimento?: string | null;
};

type GarantirObrigacaoContaInternaInput = {
  supabase: SupabaseLike;
  tipoConta?: ContaInternaTipo;
  pessoaCobrancaId: number;
  contaInternaId: number;
  competencia: string;
  valorCentavos: number;
  descricao: string;
  origemSistema: string;
  origemId: number;
  origemTipoCobranca: string;
  origemSubtipoCobranca?: string | null;
  origemItemTipo: string;
  origemItemId: number;
  referenciaItem: string;
  diaVencimento?: number | null;
  centroCustoId?: number | null;
  alunoId?: number | null;
  matriculaId?: number | null;
  observacoes?: string | null;
  origemLabel?: string | null;
  composicaoJson?: Record<string, unknown> | null;
  pagamento?: PagamentoContaInternaInput | null;
  fallbackLegacyLookup?: {
    origemTipos?: string[];
    origemSubtipo?: string | null;
    origemId?: number | null;
    competenciaAnoMes?: string | null;
    lancamentoOrigemSistemas?: string[];
  } | null;
};

type CobrancaEncontrada = {
  id: number;
  status: string | null;
  vencimento: string | null;
  created_at: string | null;
  data_pagamento: string | null;
  metodo_pagamento: string | null;
  centro_custo_id: number | null;
  valor_centavos: number | null;
  origem_tipo: string | null;
  origem_id: number | null;
};

type LancamentoEncontrado = {
  id: number;
  cobranca_id: number | null;
  referencia_item: string | null;
  origem_sistema: string | null;
  origem_id: number | null;
  matricula_id: number | null;
  created_at: string | null;
};

type RecebimentoEncontrado = {
  id: number;
  valor_centavos: number | null;
  data_pagamento: string | null;
  metodo_pagamento: string | null;
  created_at: string | null;
};

const STATUSS_QUITADOS = new Set([
  "PAGO",
  "PAGA",
  "RECEBIDO",
  "RECEBIDA",
  "LIQUIDADO",
  "LIQUIDADA",
  "QUITADO",
  "QUITADA",
]);

const STATUSS_CANCELADOS = new Set(["CANCELADO", "CANCELADA", "CANCELED", "CANCELLED", "VOID"]);
const STATUSS_LANCAMENTO_ATIVOS = ["PENDENTE_FATURA", "FATURADO"];

function textOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function upper(value: unknown): string {
  return textOrNull(value)
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase() ?? "";
}

function numberOrNull(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.trunc(parsed);
}

function nowIso() {
  return new Date().toISOString();
}

function todayIso() {
  return nowIso().slice(0, 10);
}

function normalizeDateOnly(value: string | null | undefined) {
  const normalized = textOrNull(value);
  if (!normalized) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;
  if (/^\d{4}-\d{2}-\d{2}T/.test(normalized)) return normalized.slice(0, 10);
  return null;
}

function normalizeTimestamp(value: string | null | undefined) {
  const normalized = textOrNull(value);
  if (!normalized) return null;
  if (normalized.includes("T")) return normalized;
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return `${normalized}T12:00:00.000Z`;
  }
  return null;
}

function extractNaturezaContaInterna(
  referenciaItem: string | null | undefined,
  origemSubtipo: string | null | undefined,
  origemSistema?: string | null,
) {
  const normalizedRef = textOrNull(referenciaItem);
  if (normalizedRef) {
    const matchNatureza = normalizedRef.match(/(?:^|\|)natureza:([^|]+)/i);
    if (matchNatureza?.[1]) return upper(matchNatureza[1]);
    if (normalizedRef.includes("|cartao_conexao|")) return "MENSALIDADE";
  }

  const subtipo = upper(origemSubtipo);
  if (subtipo.startsWith("CONTA_INTERNA_")) {
    return subtipo.replace(/^CONTA_INTERNA_/, "");
  }
  if (subtipo === "CARTAO_CONEXAO") return "MENSALIDADE";

  const sistema = upper(origemSistema);
  if (["MATRICULA", "MATRICULA_MENSAL", "MATRICULA_REPROCESSAR"].includes(sistema)) {
    return "MENSALIDADE";
  }
  if (sistema === "LOJA" || sistema === "LOJA_VENDA") return "COMPRA";
  if (sistema === "EVENTO_ESCOLA") return "EVENTO";
  return null;
}

function isQuitado(status: string | null | undefined): boolean {
  return STATUSS_QUITADOS.has(upper(status));
}

function isCancelado(status: string | null | undefined): boolean {
  return STATUSS_CANCELADOS.has(upper(status));
}

function buildVencimentoFromCompetencia(competencia: string, diaVencimento: number | null | undefined) {
  const [anoRaw, mesRaw] = competencia.split("-");
  const ano = Number(anoRaw);
  const mes = Number(mesRaw);
  const diaBase =
    typeof diaVencimento === "number" && Number.isFinite(diaVencimento) ? Math.trunc(diaVencimento) : 12;
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const dia = Math.max(1, Math.min(ultimoDia, diaBase));
  return `${anoRaw}-${mesRaw}-${String(dia).padStart(2, "0")}`;
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => upper(value))
        .filter((value) => Boolean(value)),
    ),
  );
}

function escolherCobrancaPreferida(rows: Array<Record<string, unknown>>): CobrancaEncontrada | null {
  const normalized = rows
    .map((row) => ({
      id: numberOrNull(row.id),
      status: textOrNull(row.status),
      vencimento: textOrNull(row.vencimento),
      created_at: textOrNull(row.created_at),
      data_pagamento: textOrNull(row.data_pagamento),
      metodo_pagamento: textOrNull(row.metodo_pagamento),
      centro_custo_id: numberOrNull(row.centro_custo_id),
      valor_centavos: numberOrNull(row.valor_centavos),
      origem_tipo: textOrNull(row.origem_tipo),
      origem_id: numberOrNull(row.origem_id),
    }))
    .filter((row): row is CobrancaEncontrada => Boolean(row.id));

  if (normalized.length === 0) return null;

  normalized.sort((left, right) => {
    const leftCancelada = isCancelado(left.status);
    const rightCancelada = isCancelado(right.status);
    if (leftCancelada !== rightCancelada) return leftCancelada ? 1 : -1;

    const leftQuitada = isQuitado(left.status);
    const rightQuitada = isQuitado(right.status);
    if (leftQuitada !== rightQuitada) return leftQuitada ? -1 : 1;

    const byCreated = (left.created_at ?? "").localeCompare(right.created_at ?? "");
    if (byCreated !== 0) return byCreated;

    return left.id - right.id;
  });

  return normalized[0] ?? null;
}

async function buscarCobrancaExistente(
  input: GarantirObrigacaoContaInternaInput,
): Promise<CobrancaEncontrada | null> {
  const {
    supabase,
    contaInternaId,
    competencia,
    origemItemTipo,
    origemItemId,
    origemSubtipoCobranca,
    fallbackLegacyLookup,
  } = input;

  let canonicalQuery = (supabase as any)
    .from("cobrancas")
    .select(
      "id,status,vencimento,created_at,data_pagamento,metodo_pagamento,centro_custo_id,valor_centavos,origem_tipo,origem_id",
    )
    .eq("competencia_ano_mes", competencia)
    .eq("conta_interna_id", contaInternaId)
    .eq("origem_agrupador_tipo", "CONTA_INTERNA")
    .eq("origem_agrupador_id", contaInternaId)
    .eq("origem_item_tipo", origemItemTipo)
    .eq("origem_item_id", origemItemId)
    .order("created_at", { ascending: true })
    .limit(10);

  const origemSubtipoCanonico = textOrNull(origemSubtipoCobranca);
  if (origemSubtipoCanonico) {
    canonicalQuery = canonicalQuery.eq("origem_subtipo", origemSubtipoCanonico);
  }

  const canonicalResult = await canonicalQuery;

  if (canonicalResult.error) throw canonicalResult.error;
  const canonical = escolherCobrancaPreferida((canonicalResult.data ?? []) as Array<Record<string, unknown>>);
  if (canonical) return canonical;

  const origemTipos = fallbackLegacyLookup?.origemTipos?.filter((item) => textOrNull(item)) ?? [];
  const origemId = numberOrNull(fallbackLegacyLookup?.origemId);
  if (origemTipos.length === 0 || !origemId) return null;

  let legacyQuery = (supabase as any)
    .from("cobrancas")
    .select(
      "id,status,vencimento,created_at,data_pagamento,metodo_pagamento,centro_custo_id,valor_centavos,origem_tipo,origem_id",
    )
    .in("origem_tipo", origemTipos)
    .eq("origem_id", origemId)
    .eq("competencia_ano_mes", fallbackLegacyLookup?.competenciaAnoMes ?? competencia)
    .order("created_at", { ascending: true })
    .limit(20);

  const origemSubtipo = textOrNull(fallbackLegacyLookup?.origemSubtipo);
  if (origemSubtipo) {
    legacyQuery = legacyQuery.eq("origem_subtipo", origemSubtipo);
  }

  const legacyResult = await legacyQuery;
  if (legacyResult.error) throw legacyResult.error;

  return escolherCobrancaPreferida((legacyResult.data ?? []) as Array<Record<string, unknown>>);
}

async function garantirCobrancaCanonica(
  input: GarantirObrigacaoContaInternaInput,
): Promise<{
  id: number;
  created: boolean;
  status: string | null;
  vencimento: string | null;
  data_pagamento: string | null;
  metodo_pagamento: string | null;
  centro_custo_id: number | null;
  valor_centavos: number | null;
  origem_tipo: string | null;
  origem_id: number | null;
}> {
  const {
    supabase,
    pessoaCobrancaId,
    contaInternaId,
    competencia,
    valorCentavos,
    descricao,
    origemTipoCobranca,
    origemSubtipoCobranca,
    origemId,
    origemItemTipo,
    origemItemId,
    diaVencimento,
    centroCustoId,
    observacoes,
    origemLabel,
    pagamento,
  } = input;

  const vencimentoBase = buildVencimentoFromCompetencia(competencia, diaVencimento);
  const existente = await buscarCobrancaExistente(input);
  const dataPagamento = normalizeDateOnly(pagamento?.dataPagamento);
  const metodoPagamento = textOrNull(pagamento?.metodoPagamento);
  const formaPagamentoCodigo = textOrNull(pagamento?.formaPagamentoCodigo) ?? metodoPagamento;
  const basePayload: Record<string, unknown> = {
    pessoa_id: pessoaCobrancaId,
    descricao,
    valor_centavos: valorCentavos,
    moeda: "BRL",
    vencimento: vencimentoBase,
    data_prevista_pagamento: vencimentoBase,
    observacoes: observacoes ?? null,
    centro_custo_id: centroCustoId ?? null,
    conta_interna_id: contaInternaId,
    origem_tipo: origemTipoCobranca,
    origem_subtipo: origemSubtipoCobranca ?? null,
    origem_id: origemId,
    competencia_ano_mes: competencia,
    origem_agrupador_tipo: "CONTA_INTERNA",
    origem_agrupador_id: contaInternaId,
    origem_item_tipo: origemItemTipo,
    origem_item_id: origemItemId,
    origem_label: origemLabel ?? descricao,
    updated_at: nowIso(),
  };

  if (dataPagamento && metodoPagamento) {
    basePayload.status = "PAGO";
    basePayload.data_pagamento = dataPagamento;
    basePayload.metodo_pagamento = metodoPagamento;
    basePayload.forma_pagamento_codigo = formaPagamentoCodigo;
  }

  if (!existente) {
    const insertPayload = {
      ...basePayload,
      status: dataPagamento && metodoPagamento ? "PAGO" : "PENDENTE",
      created_at: nowIso(),
    };
    const { data, error } = await (supabase as any)
      .from("cobrancas")
      .insert(insertPayload)
      .select(
        "id,status,vencimento,data_pagamento,metodo_pagamento,centro_custo_id,valor_centavos,origem_tipo,origem_id",
      )
      .single();

    if (error) throw error;

    return {
      id: Number(data.id),
      created: true,
      status: textOrNull(data.status),
      vencimento: textOrNull(data.vencimento),
      data_pagamento: textOrNull(data.data_pagamento),
      metodo_pagamento: textOrNull(data.metodo_pagamento),
      centro_custo_id: numberOrNull(data.centro_custo_id),
      valor_centavos: numberOrNull(data.valor_centavos),
      origem_tipo: textOrNull(data.origem_tipo),
      origem_id: numberOrNull(data.origem_id),
    };
  }

  const updatePayload: Record<string, unknown> = { ...basePayload };
  if (dataPagamento && metodoPagamento) {
    updatePayload.status = "PAGO";
    updatePayload.data_pagamento = dataPagamento;
    updatePayload.metodo_pagamento = metodoPagamento;
    updatePayload.forma_pagamento_codigo = formaPagamentoCodigo;
  } else if (!isQuitado(existente.status) && !isCancelado(existente.status)) {
    updatePayload.valor_centavos = valorCentavos;
    updatePayload.vencimento = vencimentoBase;
    updatePayload.data_prevista_pagamento = vencimentoBase;
  }

  const { data, error } = await (supabase as any)
    .from("cobrancas")
    .update(updatePayload)
    .eq("id", existente.id)
    .select(
      "id,status,vencimento,data_pagamento,metodo_pagamento,centro_custo_id,valor_centavos,origem_tipo,origem_id",
    )
    .single();

  if (error) throw error;

  return {
    id: Number(data.id),
    created: false,
    status: textOrNull(data.status),
    vencimento: textOrNull(data.vencimento),
    data_pagamento: textOrNull(data.data_pagamento),
    metodo_pagamento: textOrNull(data.metodo_pagamento),
    centro_custo_id: numberOrNull(data.centro_custo_id),
    valor_centavos: numberOrNull(data.valor_centavos),
    origem_tipo: textOrNull(data.origem_tipo),
    origem_id: numberOrNull(data.origem_id),
  };
}

async function buscarLancamentosEquivalentes(
  input: GarantirObrigacaoContaInternaInput,
  cobrancaId: number,
): Promise<LancamentoEncontrado[]> {
  const { data, error } = await (input.supabase as any)
    .from("credito_conexao_lancamentos")
    .select("id,cobranca_id,referencia_item,origem_sistema,origem_id,matricula_id,created_at")
    .eq("conta_conexao_id", input.contaInternaId)
    .eq("competencia", input.competencia)
    .in("status", STATUSS_LANCAMENTO_ATIVOS)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) throw error;

  const origemIdLegado = numberOrNull(input.fallbackLegacyLookup?.origemId) ?? input.origemId;
  const matriculaId = numberOrNull(input.matriculaId);
  const naturezaEsperada = extractNaturezaContaInterna(
    input.referenciaItem,
    input.origemSubtipoCobranca,
    input.origemSistema,
  );
  const sistemasLegados = new Set(
    uniqueStrings([
      input.origemSistema,
      ...(input.fallbackLegacyLookup?.lancamentoOrigemSistemas ?? []),
      input.origemItemTipo === "MATRICULA" ? "MATRICULA" : null,
      input.origemItemTipo === "MATRICULA" ? "MATRICULA_MENSAL" : null,
      input.origemItemTipo === "MATRICULA" ? "MATRICULA_REPROCESSAR" : null,
    ]),
  );

  const candidatos = ((data ?? []) as Array<Record<string, unknown>>)
    .map((row) => ({
      id: numberOrNull(row.id),
      cobranca_id: numberOrNull(row.cobranca_id),
      referencia_item: textOrNull(row.referencia_item),
      origem_sistema: textOrNull(row.origem_sistema),
      origem_id: numberOrNull(row.origem_id),
      matricula_id: numberOrNull(row.matricula_id),
      created_at: textOrNull(row.created_at),
    }))
    .filter((row): row is LancamentoEncontrado => Boolean(row.id))
    .filter((row) => {
      const naturezaCandidata = extractNaturezaContaInterna(row.referencia_item, null, row.origem_sistema);
      const naturezaCompativel =
        !naturezaEsperada || !naturezaCandidata || naturezaEsperada === naturezaCandidata;
      const sameCobranca = row.cobranca_id === cobrancaId;
      const sameReferencia = row.referencia_item === input.referenciaItem;
      const sameMatricula =
        typeof matriculaId === "number" &&
        matriculaId > 0 &&
        row.matricula_id === matriculaId &&
        naturezaCompativel &&
        (sistemasLegados.size === 0 || sistemasLegados.has(upper(row.origem_sistema)));
      const sameOrigemLegada =
        typeof origemIdLegado === "number" &&
        origemIdLegado > 0 &&
        row.origem_id === origemIdLegado &&
        naturezaCompativel &&
        (sistemasLegados.size === 0 || sistemasLegados.has(upper(row.origem_sistema)));

      return sameCobranca || sameReferencia || sameMatricula || sameOrigemLegada;
    });

  candidatos.sort((left, right) => {
    const leftScore =
      left.cobranca_id === cobrancaId
        ? 0
        : left.referencia_item === input.referenciaItem
          ? 1
          : left.matricula_id === matriculaId
            ? 2
            : left.origem_id === origemIdLegado
              ? 3
              : 4;
    const rightScore =
      right.cobranca_id === cobrancaId
        ? 0
        : right.referencia_item === input.referenciaItem
          ? 1
          : right.matricula_id === matriculaId
            ? 2
            : right.origem_id === origemIdLegado
              ? 3
              : 4;

    if (leftScore !== rightScore) return leftScore - rightScore;

    const byCreated = (left.created_at ?? "").localeCompare(right.created_at ?? "");
    if (byCreated !== 0) return byCreated;

    return left.id - right.id;
  });

  return candidatos;
}

async function cancelarLancamentosPorIds(params: {
  supabase: SupabaseLike;
  lancamentoIds: number[];
}) {
  const { supabase, lancamentoIds } = params;
  if (lancamentoIds.length === 0) {
    return { lancamentoIds: [] as number[], faturaIds: [] as number[] };
  }

  const { data: pivotsRaw, error: pivotsError } = await (supabase as any)
    .from("credito_conexao_fatura_lancamentos")
    .select("fatura_id,lancamento_id")
    .in("lancamento_id", lancamentoIds);

  if (pivotsError) throw pivotsError;

  const faturaIds = Array.from(
    new Set(
      ((pivotsRaw ?? []) as Array<Record<string, unknown>>)
        .map((row) => numberOrNull(row.fatura_id))
        .filter((row): row is number => Boolean(row)),
    ),
  );

  const { error: deletePivotError } = await (supabase as any)
    .from("credito_conexao_fatura_lancamentos")
    .delete()
    .in("lancamento_id", lancamentoIds);

  if (deletePivotError) throw deletePivotError;

  const { error: cancelError } = await (supabase as any)
    .from("credito_conexao_lancamentos")
    .update({
      status: "CANCELADO",
      updated_at: nowIso(),
    })
    .in("id", lancamentoIds);

  if (cancelError) throw cancelError;

  return { lancamentoIds, faturaIds };
}

async function cancelarLancamentosDuplicadosPorReferencia(params: {
  supabase: SupabaseLike;
  contaInternaId: number;
  referenciaItem: string;
  lancamentoMantidoId: number;
}) {
  const { supabase, contaInternaId, referenciaItem, lancamentoMantidoId } = params;
  if (!textOrNull(referenciaItem)) {
    return { lancamentoIds: [] as number[], faturaIds: [] as number[] };
  }

  const { data: duplicadosRaw, error: duplicadosError } = await (supabase as any)
    .from("credito_conexao_lancamentos")
    .select("id")
    .eq("conta_conexao_id", contaInternaId)
    .eq("referencia_item", referenciaItem)
    .in("status", STATUSS_LANCAMENTO_ATIVOS)
    .neq("id", lancamentoMantidoId);

  if (duplicadosError) throw duplicadosError;

  const duplicados = ((duplicadosRaw ?? []) as Array<Record<string, unknown>>)
    .map((row) => numberOrNull(row.id))
    .filter((row): row is number => Boolean(row));

  return cancelarLancamentosPorIds({ supabase, lancamentoIds: duplicados });
}

async function buscarRecebimentoExistente(params: {
  supabase: SupabaseLike;
  cobrancaId: number;
  valorCentavos: number;
  dataPagamentoIso: string;
  metodoPagamento: string;
}) {
  const { supabase, cobrancaId, valorCentavos, dataPagamentoIso, metodoPagamento } = params;
  const { data, error } = await (supabase as any)
    .from("recebimentos")
    .select("id,valor_centavos,data_pagamento,metodo_pagamento,created_at")
    .eq("cobranca_id", cobrancaId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) throw error;

  const recebimentos = ((data ?? []) as Array<Record<string, unknown>>)
    .map((row) => ({
      id: numberOrNull(row.id),
      valor_centavos: numberOrNull(row.valor_centavos),
      data_pagamento: textOrNull(row.data_pagamento),
      metodo_pagamento: textOrNull(row.metodo_pagamento),
      created_at: textOrNull(row.created_at),
    }))
    .filter((row): row is RecebimentoEncontrado => Boolean(row.id));

  const dataPagamentoBase = normalizeDateOnly(dataPagamentoIso);
  return (
    recebimentos.find(
      (row) =>
        row.valor_centavos === valorCentavos &&
        normalizeDateOnly(row.data_pagamento) === dataPagamentoBase &&
        upper(row.metodo_pagamento) === upper(metodoPagamento),
    ) ??
    recebimentos[0] ??
    null
  );
}

async function garantirRecebimentoQuitacaoContaInterna(params: {
  supabase: SupabaseLike;
  cobrancaId: number;
  centroCustoId: number | null;
  valorCentavos: number;
  dataPagamentoIso: string;
  metodoPagamento: string;
  formaPagamentoCodigo: string | null;
  origemSistemaRecebimento: string;
  observacoes: string | null;
}) {
  const existente = await buscarRecebimentoExistente(params);
  if (existente) {
    return existente;
  }

  const { data, error } = await (params.supabase as any)
    .from("recebimentos")
    .insert({
      cobranca_id: params.cobrancaId,
      centro_custo_id: params.centroCustoId,
      valor_centavos: params.valorCentavos,
      data_pagamento: params.dataPagamentoIso,
      metodo_pagamento: params.metodoPagamento,
      forma_pagamento_codigo: params.formaPagamentoCodigo,
      origem_sistema: params.origemSistemaRecebimento,
      observacoes: params.observacoes,
    })
    .select("id,valor_centavos,data_pagamento,metodo_pagamento,created_at")
    .single();

  if (error) throw error;

  return {
    id: Number(data.id),
    valor_centavos: numberOrNull(data.valor_centavos),
    data_pagamento: textOrNull(data.data_pagamento),
    metodo_pagamento: textOrNull(data.metodo_pagamento),
    created_at: textOrNull(data.created_at),
  } satisfies RecebimentoEncontrado;
}

async function garantirMovimentoFinanceiroReceita(params: {
  supabase: SupabaseLike;
  recebimentoId: number;
  centroCustoId: number | null;
  valorCentavos: number;
  dataPagamentoIso: string;
  descricao: string;
  usuarioId: string | null;
}) {
  if (!params.centroCustoId) {
    return null;
  }

  const { data: existente, error: existenteError } = await (params.supabase as any)
    .from("movimento_financeiro")
    .select("id")
    .eq("origem", "RECEBIMENTO")
    .eq("origem_id", params.recebimentoId)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existenteError) throw existenteError;
  if (numberOrNull(existente?.id)) {
    return numberOrNull(existente.id);
  }

  const { data, error } = await (params.supabase as any)
    .from("movimento_financeiro")
    .insert({
      tipo: "RECEITA",
      centro_custo_id: params.centroCustoId,
      valor_centavos: params.valorCentavos,
      data_movimento: params.dataPagamentoIso,
      origem: "RECEBIMENTO",
      origem_id: params.recebimentoId,
      descricao: params.descricao,
      usuario_id: params.usuarioId,
    })
    .select("id")
    .single();

  if (error) throw error;
  return numberOrNull(data.id);
}

export async function garantirObrigacaoContaInterna(
  input: GarantirObrigacaoContaInternaInput,
) {
  const cobranca = await garantirCobrancaCanonica(input);
  const lancamentosEquivalentes = await buscarLancamentosEquivalentes(input, cobranca.id);
  const lancamentoPreferidoId = lancamentosEquivalentes[0]?.id ?? null;
  const lancamento = await upsertLancamentoPorCobranca({
    cobrancaId: cobranca.id,
    existingLancamentoId: lancamentoPreferidoId,
    referenciaItem: input.referenciaItem,
    contaConexaoId: input.contaInternaId,
    competencia: input.competencia,
    valorCentavos: input.valorCentavos,
    centroCustoId: input.centroCustoId ?? null,
    alunoId: input.alunoId ?? null,
    matriculaId: input.matriculaId ?? null,
    descricao: input.descricao,
    origemSistema: input.origemSistema,
    origemId: input.origemId,
    composicaoJson: {
      ...(input.composicaoJson ?? {}),
      conta_interna_business_key: input.referenciaItem,
      conta_interna_id: input.contaInternaId,
      origem_item_tipo: input.origemItemTipo,
      origem_item_id: input.origemItemId,
      cobranca_id_canonica: cobranca.id,
    },
    supabase: input.supabase,
  });

  const dedupeNegocio = await cancelarLancamentosPorIds({
    supabase: input.supabase,
    lancamentoIds: lancamentosEquivalentes
      .map((item) => item.id)
      .filter((id) => id !== lancamento.id),
  });

  const dedupeReferencia = await cancelarLancamentosDuplicadosPorReferencia({
    supabase: input.supabase,
    contaInternaId: input.contaInternaId,
    referenciaItem: input.referenciaItem,
    lancamentoMantidoId: lancamento.id,
  });

  const agendamento =
    input.tipoConta === "COLABORADOR"
      ? await agendarFaturamentoMensalColaborador({
          supabase: input.supabase as Parameters<typeof agendarFaturamentoMensalColaborador>[0]["supabase"],
          contaInternaId: input.contaInternaId,
          competencia: input.competencia,
          diaVencimento: input.diaVencimento ?? null,
          lancamentoId: lancamento.id,
        })
      : await agendarFaturamentoMensalAluno({
          supabase: input.supabase as Parameters<typeof agendarFaturamentoMensalAluno>[0]["supabase"],
          contaInternaId: input.contaInternaId,
          competencia: input.competencia,
          diaVencimento: input.diaVencimento ?? null,
          lancamentoId: lancamento.id,
        });

  const lancamentosCancelados = Array.from(
    new Set([...dedupeNegocio.lancamentoIds, ...dedupeReferencia.lancamentoIds]),
  );
  const faturasAfetadas = Array.from(
    new Set([agendamento.fatura_id, ...dedupeNegocio.faturaIds, ...dedupeReferencia.faturaIds]),
  ).filter((item): item is number => typeof item === "number" && Number.isFinite(item) && item > 0);
  let recebimentoId: number | null = null;

  if (input.pagamento) {
    const dataPagamentoBase = normalizeDateOnly(input.pagamento.dataPagamento) ?? todayIso();
    const dataPagamentoIso = normalizeTimestamp(input.pagamento.dataPagamento) ?? `${dataPagamentoBase}T12:00:00.000Z`;
    const metodoPagamento = textOrNull(input.pagamento.metodoPagamento) ?? "OUTRO";
    const formaPagamentoCodigo = textOrNull(input.pagamento.formaPagamentoCodigo) ?? metodoPagamento;
    const centroCustoQuitacao =
      numberOrNull(input.pagamento.centroCustoId) ??
      numberOrNull(input.centroCustoId) ??
      cobranca.centro_custo_id ??
      null;

    const recebimento = await garantirRecebimentoQuitacaoContaInterna({
      supabase: input.supabase,
      cobrancaId: cobranca.id,
      centroCustoId: centroCustoQuitacao,
      valorCentavos: input.valorCentavos,
      dataPagamentoIso,
      metodoPagamento,
      formaPagamentoCodigo,
      origemSistemaRecebimento:
        textOrNull(input.pagamento.origemSistemaRecebimento) ??
        textOrNull(input.origemSistema) ??
        "CONTA_INTERNA",
      observacoes: textOrNull(input.pagamento.observacoes) ?? textOrNull(input.observacoes),
    });

    recebimentoId = recebimento.id;

    await garantirMovimentoFinanceiroReceita({
      supabase: input.supabase,
      recebimentoId,
      centroCustoId: centroCustoQuitacao,
      valorCentavos: input.valorCentavos,
      dataPagamentoIso,
      descricao:
        textOrNull(input.pagamento.descricaoMovimento) ??
        `Quitacao conta interna - cobranca #${cobranca.id}`,
      usuarioId: textOrNull(input.pagamento.usuarioId),
    });
  }

  for (const faturaId of faturasAfetadas) {
    await recalcularComprasFatura(
      input.supabase as Parameters<typeof recalcularComprasFatura>[0],
      faturaId,
    );
  }

  if (input.pagamento) {
    try {
      await processarClassificacaoFinanceira(input.supabase as any, {
        id: cobranca.id,
        valor_centavos: cobranca.valor_centavos ?? input.valorCentavos,
        centro_custo_id: cobranca.centro_custo_id ?? input.centroCustoId ?? null,
        origem_tipo: cobranca.origem_tipo ?? input.origemTipoCobranca,
        origem_id: cobranca.origem_id ?? input.origemId,
        data_pagamento: cobranca.data_pagamento ?? input.pagamento.dataPagamento,
      });
    } catch (error) {
      console.warn("[CONTA_INTERNA][QUITACAO][CLASSIFICACAO][ERRO]", {
        cobrancaId: cobranca.id,
        error,
      });
    }
  }

  const vencimentoEfetivo = textOrNull(agendamento.data_vencimento) ?? buildVencimentoFromCompetencia(
    input.competencia,
    input.diaVencimento ?? null,
  );

  if (!isQuitado(cobranca.status) && vencimentoEfetivo !== cobranca.vencimento) {
    const { error: updateVencimentoError } = await (input.supabase as any)
      .from("cobrancas")
      .update({
        vencimento: vencimentoEfetivo,
        data_prevista_pagamento: vencimentoEfetivo,
        updated_at: nowIso(),
      })
      .eq("id", cobranca.id);

    if (updateVencimentoError) throw updateVencimentoError;
  }

  return {
    cobranca_id: cobranca.id,
    cobranca_created: cobranca.created,
    lancamento_id: lancamento.id,
    lancamento_created: lancamento.created,
    fatura_id: Number(agendamento.fatura_id),
    data_vencimento: vencimentoEfetivo,
    recebimento_id: recebimentoId,
    lancamentos_cancelados: lancamentosCancelados,
  };
}

export function buildReferenciaContaInterna(params: {
  entidade: string;
  entidadeId: string | number;
  competencia: string;
  natureza?: string | null;
  parcela?: number | null;
}) {
  const parts = [
    `${params.entidade}:${params.entidadeId}`,
    `competencia:${params.competencia}`,
  ];
  const natureza = textOrNull(params.natureza);
  if (natureza) parts.push(`natureza:${natureza}`);
  const parcela = numberOrNull(params.parcela);
  if (parcela) parts.push(`parcela:${parcela}`);
  return parts.join("|");
}

export function buildReferenciaMatriculaContaInterna(matriculaId: number, competencia: string) {
  return buildReferenciaContaInterna({
    entidade: "matricula",
    entidadeId: matriculaId,
    competencia,
    natureza: "mensalidade",
  });
}

export function buildReferenciaMatriculaEntradaContaInterna(matriculaId: number, competencia: string) {
  return buildReferenciaContaInterna({
    entidade: "matricula_entrada",
    entidadeId: matriculaId,
    competencia,
    natureza: "entrada_prorata",
  });
}

export function buildReferenciaLojaContaInterna(vendaId: number, competencia: string, parcelaNumero?: number | null) {
  return buildReferenciaContaInterna({
    entidade: "loja_venda",
    entidadeId: vendaId,
    competencia,
    natureza: "compra",
    parcela: parcelaNumero ?? null,
  });
}

export function buildReferenciaEventoContaInterna(
  inscricaoId: string | number,
  competencia: string,
  parcelaNumero?: number | null,
) {
  return buildReferenciaContaInterna({
    entidade: "evento_inscricao",
    entidadeId: inscricaoId,
    competencia,
    natureza: "evento",
    parcela: parcelaNumero ?? null,
  });
}

export function competenciaHoje() {
  return todayIso().slice(0, 7);
}
