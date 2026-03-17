import type { SupabaseClient } from "@supabase/supabase-js";
import { upsertLancamentoPorCobranca } from "@/lib/credito-conexao/upsertLancamentoPorCobranca";
import { recalcularComprasFatura, vincularLancamentoNaFatura } from "@/lib/financeiro/creditoConexaoFaturas";

type SupabaseLike = Pick<SupabaseClient, "from" | "rpc">;

export const CAFE_COMPRADOR_TIPO = {
  NAO_IDENTIFICADO: "NAO_IDENTIFICADO",
  ALUNO: "ALUNO",
  COLABORADOR: "COLABORADOR",
  PESSOA_AVULSA: "PESSOA_AVULSA",
} as const;

export const CAFE_FLUXO_FINANCEIRO = {
  IMEDIATO: "IMEDIATO",
  CARTAO_EXTERNO: "CARTAO_EXTERNO",
  CARTAO_CONEXAO_ALUNO: "CARTAO_CONEXAO_ALUNO",
  CARTAO_CONEXAO_COLABORADOR: "CARTAO_CONEXAO_COLABORADOR",
  CONTA_INTERNA: "CONTA_INTERNA",
} as const;

export const CAFE_STATUS_FINANCEIRO = {
  PENDENTE: "PENDENTE",
  PAGO_IMEDIATO: "PAGO_IMEDIATO",
  EM_COBRANCA: "EM_COBRANCA",
  FATURADO_CARTAO_CONEXAO: "FATURADO_CARTAO_CONEXAO",
  EM_CONTA_INTERNA: "EM_CONTA_INTERNA",
  CANCELADO: "CANCELADO",
} as const;

export type CafeCompradorTipo = (typeof CAFE_COMPRADOR_TIPO)[keyof typeof CAFE_COMPRADOR_TIPO];
export type CafeFluxoFinanceiro = (typeof CAFE_FLUXO_FINANCEIRO)[keyof typeof CAFE_FLUXO_FINANCEIRO];
export type CafeStatusFinanceiro = (typeof CAFE_STATUS_FINANCEIRO)[keyof typeof CAFE_STATUS_FINANCEIRO];

export type CafeContaConexaoResumo = {
  id: number;
  tipo_conta: "ALUNO" | "COLABORADOR";
  pessoa_titular_id: number;
  dia_fechamento: number | null;
  dia_vencimento: number | null;
};

export type CafeCompradorClassificado = {
  pessoa_id: number | null;
  tipo: CafeCompradorTipo;
  conta_conexao: CafeContaConexaoResumo | null;
  conta_conexao_elegivel: boolean;
};

export type CafePagamentoOpcao = {
  id: number | null;
  codigo: string;
  label: string;
  tipo_fluxo: CafeFluxoFinanceiro;
  exige_conta_conexao: boolean;
  habilitado: boolean;
  motivo_bloqueio: string | null;
  conta_financeira_id: number | null;
  cartao_maquina_id: number | null;
  carteira_tipo: string | null;
};

export type CafePagamentoOpcaoResponse = {
  centro_custo_id: number;
  comprador: {
    pessoa_id: number | null;
    tipo: CafeCompradorTipo;
  };
  opcoes: CafePagamentoOpcao[];
};

type FormaPagamentoRow = Record<string, unknown> & {
  id?: number;
  codigo?: string | null;
  nome?: string | null;
  tipo_base?: string | null;
  ativo?: boolean | null;
};

type FormaPagamentoContextoRow = Record<string, unknown> & {
  id?: number;
  centro_custo_id?: number | null;
  forma_pagamento_codigo?: string | null;
  descricao_exibicao?: string | null;
  ativo?: boolean | null;
  ordem_exibicao?: number | null;
  conta_financeira_id?: number | null;
  cartao_maquina_id?: number | null;
  carteira_tipo?: string | null;
};

function asInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Math.trunc(Number(value));
  }
  return null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value.trim() || null : null;
}

function upper(value: unknown): string {
  return typeof value === "string"
    ? value
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
    : "";
}

function nowIso() {
  return new Date().toISOString();
}

function todayIso() {
  return nowIso().slice(0, 10);
}

function isCompetencia(value: string | null | undefined): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}$/.test(value);
}

function competenciaFromDate(dateIso: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateIso) ? dateIso.slice(0, 7) : todayIso().slice(0, 7);
}

function buildVencimentoFromCompetencia(competencia: string, diaVencimento: number | null) {
  const [anoRaw, mesRaw] = competencia.split("-");
  const ano = Number(anoRaw);
  const mes = Number(mesRaw);
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const diaBase = diaVencimento && Number.isFinite(diaVencimento) ? Math.trunc(diaVencimento) : 12;
  const dia = Math.max(1, Math.min(ultimoDia, diaBase));
  return `${anoRaw}-${mesRaw}-${String(dia).padStart(2, "0")}`;
}

function normalizeBuyerType(value: string | null | undefined): CafeCompradorTipo {
  const normalized = upper(value);
  if (normalized === "ALUNO") return CAFE_COMPRADOR_TIPO.ALUNO;
  if (normalized === "COLABORADOR") return CAFE_COMPRADOR_TIPO.COLABORADOR;
  if (normalized === "PESSOA_AVULSA" || normalized === "PESSOA") {
    return CAFE_COMPRADOR_TIPO.PESSOA_AVULSA;
  }
  return CAFE_COMPRADOR_TIPO.NAO_IDENTIFICADO;
}

function inferirFluxoFinanceiroCafe(codigo: string | null | undefined): CafeFluxoFinanceiro {
  const normalized = upper(codigo);
  if (normalized === "CARTAO_CONEXAO_ALUNO" || normalized === "CREDITO_ALUNO") {
    return CAFE_FLUXO_FINANCEIRO.CARTAO_CONEXAO_ALUNO;
  }
  if (normalized === "CARTAO_CONEXAO_COLAB" || normalized === "CARTAO_CONEXAO_COLABORADOR") {
    return CAFE_FLUXO_FINANCEIRO.CARTAO_CONEXAO_COLABORADOR;
  }
  if (
    normalized === "CREDIARIO_COLAB" ||
    normalized === "CONTA_INTERNA" ||
    normalized === "CONTA_INTERNA_COLABORADOR"
  ) {
    return CAFE_FLUXO_FINANCEIRO.CONTA_INTERNA;
  }
  if (normalized.includes("CREDITO") || normalized.includes("CARTAO")) {
    return CAFE_FLUXO_FINANCEIRO.CARTAO_EXTERNO;
  }
  return CAFE_FLUXO_FINANCEIRO.IMEDIATO;
}

function exigeContaConexao(fluxo: CafeFluxoFinanceiro) {
  return (
    fluxo === CAFE_FLUXO_FINANCEIRO.CARTAO_CONEXAO_ALUNO ||
    fluxo === CAFE_FLUXO_FINANCEIRO.CARTAO_CONEXAO_COLABORADOR ||
    fluxo === CAFE_FLUXO_FINANCEIRO.CONTA_INTERNA
  );
}

async function carregarFormasContextoCafe(
  supabase: SupabaseLike,
  centroCustoId: number,
): Promise<Array<FormaPagamentoContextoRow & { forma: FormaPagamentoRow | null }>> {
  const { data: formasContextoRaw, error: formasContextoError } = await supabase
    .from("formas_pagamento_contexto")
    .select(
      "id,centro_custo_id,forma_pagamento_codigo,descricao_exibicao,ativo,ordem_exibicao,conta_financeira_id,cartao_maquina_id,carteira_tipo",
    )
    .eq("centro_custo_id", centroCustoId)
    .eq("ativo", true)
    .order("ordem_exibicao", { ascending: true })
    .order("id", { ascending: true });

  if (formasContextoError) throw formasContextoError;

  const formasContexto = ((formasContextoRaw ?? []) as FormaPagamentoContextoRow[]).filter(
    (item) => Boolean(asString(item.forma_pagamento_codigo)),
  );
  const codigos = Array.from(
    new Set(formasContexto.map((item) => asString(item.forma_pagamento_codigo)).filter((item): item is string => Boolean(item))),
  );

  if (codigos.length === 0) return [];

  const { data: formasRaw, error: formasError } = await supabase
    .from("formas_pagamento")
    .select("id,codigo,nome,tipo_base,ativo")
    .in("codigo", codigos);

  if (formasError) throw formasError;

  const formaMap = new Map<string, FormaPagamentoRow>();
  for (const forma of (formasRaw ?? []) as FormaPagamentoRow[]) {
    const codigo = asString(forma.codigo);
    if (codigo) formaMap.set(codigo, forma);
  }

  return formasContexto.map((item) => ({
    ...item,
    forma: formaMap.get(asString(item.forma_pagamento_codigo) ?? "") ?? null,
  }));
}

export async function resolverCentroCustoCafe(supabase: SupabaseLike): Promise<number> {
  const { data, error } = await supabase
    .from("centros_custo")
    .select("id,codigo,nome,ativo")
    .eq("ativo", true);

  if (error) throw error;

  const rows = ((data ?? []) as Array<Record<string, unknown>>).map((item) => ({
    id: asInt(item.id),
    codigo: asString(item.codigo),
    nome: asString(item.nome),
  }));

  const found =
    rows.find((item) => upper(item.codigo) === "CAFE") ??
    rows.find((item) => upper(item.nome).includes("CAFE"));

  if (!found?.id) {
    throw new Error("centro_custo_cafe_nao_configurado");
  }

  return found.id;
}

export async function resolverContaFinanceiraPadraoCafe(
  supabase: SupabaseLike,
  params?: { preferirCaixa?: boolean },
): Promise<number | null> {
  const { preferirCaixa = false } = params ?? {};
  const { data, error } = await supabase
    .from("contas_financeiras")
    .select("id,codigo,nome,ativo")
    .eq("ativo", true);

  if (error) throw error;

  const rows = ((data ?? []) as Array<Record<string, unknown>>).map((item) => ({
    id: asInt(item.id),
    codigo: asString(item.codigo),
    nome: asString(item.nome),
  }));

  const target = preferirCaixa ? "CAFE_CAIXA" : "CAFE_CONTA";
  const secondary = preferirCaixa ? "CAFE_CONTA" : "CAFE_CAIXA";

  const match =
    rows.find((item) => upper(item.codigo) === target) ??
    rows.find((item) => upper(item.codigo) === secondary) ??
    rows.find((item) => upper(item.nome).includes("CAFE"));

  return match?.id ?? null;
}

export async function resolverContaConexaoCafe(
  supabase: SupabaseLike,
  params: {
    compradorPessoaId: number | null;
    compradorTipo: CafeCompradorTipo;
  },
): Promise<CafeContaConexaoResumo | null> {
  const { compradorPessoaId, compradorTipo } = params;
  if (!compradorPessoaId) return null;

  const tipoConta =
    compradorTipo === CAFE_COMPRADOR_TIPO.ALUNO
      ? "ALUNO"
      : compradorTipo === CAFE_COMPRADOR_TIPO.COLABORADOR
        ? "COLABORADOR"
        : null;

  if (!tipoConta) return null;

  const { data, error } = await supabase
    .from("credito_conexao_contas")
    .select("id,pessoa_titular_id,tipo_conta,dia_fechamento,dia_vencimento,ativo")
    .eq("pessoa_titular_id", compradorPessoaId)
    .eq("tipo_conta", tipoConta)
    .eq("ativo", true)
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data?.id) return null;

  return {
    id: asInt(data.id) ?? 0,
    pessoa_titular_id: asInt(data.pessoa_titular_id) ?? compradorPessoaId,
    tipo_conta: (upper(data.tipo_conta) === "ALUNO" ? "ALUNO" : "COLABORADOR") as "ALUNO" | "COLABORADOR",
    dia_fechamento: asInt(data.dia_fechamento),
    dia_vencimento: asInt(data.dia_vencimento),
  };
}

export async function classificarCompradorCafe(
  supabase: SupabaseLike,
  params: {
    compradorPessoaId: number | null;
    compradorTipoInformado?: string | null;
  },
): Promise<CafeCompradorClassificado> {
  const { compradorPessoaId } = params;
  const informado = normalizeBuyerType(params.compradorTipoInformado ?? null);

  if (!compradorPessoaId) {
    return {
      pessoa_id: null,
      tipo: informado,
      conta_conexao: null,
      conta_conexao_elegivel: informado === CAFE_COMPRADOR_TIPO.COLABORADOR,
    };
  }

  const [colaboradorResult, alunoResult] = await Promise.all([
    supabase
      .from("colaboradores")
      .select("pessoa_id,ativo")
      .eq("pessoa_id", compradorPessoaId)
      .eq("ativo", true)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("pessoas_roles")
      .select("pessoa_id,role")
      .eq("pessoa_id", compradorPessoaId)
      .eq("role", "ALUNO")
      .limit(1)
      .maybeSingle(),
  ]);

  if (colaboradorResult.error) throw colaboradorResult.error;
  if (alunoResult.error) throw alunoResult.error;

  const ehColaborador = Boolean(colaboradorResult.data?.pessoa_id);
  const ehAluno = Boolean(alunoResult.data?.pessoa_id);

  let tipo = informado;
  if (informado === CAFE_COMPRADOR_TIPO.NAO_IDENTIFICADO) {
    if (ehColaborador) tipo = CAFE_COMPRADOR_TIPO.COLABORADOR;
    else if (ehAluno) tipo = CAFE_COMPRADOR_TIPO.ALUNO;
    else tipo = CAFE_COMPRADOR_TIPO.PESSOA_AVULSA;
  }

  const conta = await resolverContaConexaoCafe(supabase, {
    compradorPessoaId,
    compradorTipo: tipo,
  });

  return {
    pessoa_id: compradorPessoaId,
    tipo,
    conta_conexao: conta,
    conta_conexao_elegivel:
      tipo === CAFE_COMPRADOR_TIPO.COLABORADOR
        ? true
        : tipo === CAFE_COMPRADOR_TIPO.ALUNO
          ? Boolean(conta)
          : false,
  };
}

async function resolveFormaPagamentoCafe(params: {
  supabase: SupabaseLike;
  centroCustoId: number;
  formaPagamentoId: number | null;
  formaPagamentoCodigo: string | null;
}): Promise<CafePagamentoOpcao> {
  const { supabase, centroCustoId, formaPagamentoId, formaPagamentoCodigo } = params;
  const formas = await carregarFormasContextoCafe(supabase, centroCustoId);

  const byId = formaPagamentoId
    ? formas.find((item) => asInt(item.forma?.id) === formaPagamentoId)
    : null;
  const byCode = asString(formaPagamentoCodigo)
    ? formas.find((item) => upper(item.forma_pagamento_codigo) === upper(formaPagamentoCodigo))
    : null;
  const found = byId ?? byCode;

  if (found) {
    const codigo = asString(found.forma_pagamento_codigo) ?? "DINHEIRO";
    return {
      id: asInt(found.forma?.id),
      codigo,
      label: asString(found.descricao_exibicao) ?? asString(found.forma?.nome) ?? codigo,
      tipo_fluxo: inferirFluxoFinanceiroCafe(codigo),
      exige_conta_conexao: exigeContaConexao(inferirFluxoFinanceiroCafe(codigo)),
      habilitado: true,
      motivo_bloqueio: null,
      conta_financeira_id: asInt(found.conta_financeira_id),
      cartao_maquina_id: asInt(found.cartao_maquina_id),
      carteira_tipo: asString(found.carteira_tipo),
    };
  }

  const codigo = upper(formaPagamentoCodigo) || "DINHEIRO";
  const defaultAccount =
    codigo === "DINHEIRO"
      ? await resolverContaFinanceiraPadraoCafe(supabase, { preferirCaixa: true })
      : await resolverContaFinanceiraPadraoCafe(supabase, { preferirCaixa: false });

  return {
    id: formaPagamentoId,
    codigo,
    label: codigo,
    tipo_fluxo: inferirFluxoFinanceiroCafe(codigo),
    exige_conta_conexao: exigeContaConexao(inferirFluxoFinanceiroCafe(codigo)),
    habilitado: true,
    motivo_bloqueio: null,
    conta_financeira_id: defaultAccount,
    cartao_maquina_id: null,
    carteira_tipo: null,
  };
}

async function ensureContaInternaColaborador(supabase: SupabaseLike, colaboradorPessoaId: number) {
  const existente = await resolverContaConexaoCafe(supabase, {
    compradorPessoaId: colaboradorPessoaId,
    compradorTipo: CAFE_COMPRADOR_TIPO.COLABORADOR,
  });

  if (existente) return existente;

  const { data: created, error: createError } = await supabase
    .from("credito_conexao_contas")
    .insert({
      pessoa_titular_id: colaboradorPessoaId,
      tipo_conta: "COLABORADOR",
      dia_fechamento: 10,
      dia_vencimento: 12,
      ativo: true,
      descricao_exibicao: "Conta interna COLABORADOR",
    })
    .select("id,pessoa_titular_id,tipo_conta,dia_fechamento,dia_vencimento")
    .single();

  if (createError || !created) {
    throw createError ?? new Error("falha_criar_conta_interna_colaborador");
  }

  return {
    id: asInt(created.id) ?? 0,
    pessoa_titular_id: asInt(created.pessoa_titular_id) ?? colaboradorPessoaId,
    tipo_conta: "COLABORADOR" as const,
    dia_fechamento: asInt(created.dia_fechamento),
    dia_vencimento: asInt(created.dia_vencimento),
  };
}

async function ensureFaturaAbertaCompetencia(
  supabase: SupabaseLike,
  contaConexaoId: number,
  competencia: string,
  diaVencimento: number | null,
) {
  const { data: existente, error: findError } = await supabase
    .from("credito_conexao_faturas")
    .select("id,status,folha_pagamento_id,data_vencimento")
    .eq("conta_conexao_id", contaConexaoId)
    .eq("periodo_referencia", competencia)
    .maybeSingle();

  if (findError) throw findError;

  if (existente?.id) {
    const status = upper(existente.status);
    if (status === "FECHADA" || status === "PAGA") {
      throw new Error("competencia_fechada_para_conta_interna");
    }
    return asInt(existente.id) ?? 0;
  }

  const { data: created, error: createError } = await supabase
    .from("credito_conexao_faturas")
    .insert({
      conta_conexao_id: contaConexaoId,
      periodo_referencia: competencia,
      data_fechamento: todayIso(),
      data_vencimento: buildVencimentoFromCompetencia(competencia, diaVencimento),
      valor_total_centavos: 0,
      valor_taxas_centavos: 0,
      status: "ABERTA",
      created_at: nowIso(),
      updated_at: nowIso(),
    })
    .select("id")
    .single();

  if (createError || !created?.id) {
    throw createError ?? new Error("falha_criar_fatura_cafe");
  }

  return Number(created.id);
}

async function findCafeCobrancaCompetencia(params: {
  supabase: SupabaseLike;
  pessoaId: number;
  competencia: string;
  origemSubtipo: string;
  currentId?: number | null;
}) {
  const { supabase, pessoaId, competencia, origemSubtipo, currentId } = params;

  if (currentId && currentId > 0) {
    const { data, error } = await supabase.from("cobrancas").select("id").eq("id", currentId).maybeSingle();
    if (error) throw error;
    if (data?.id) return Number(data.id);
  }

  const { data, error } = await supabase
    .from("cobrancas")
    .select("id")
    .eq("pessoa_id", pessoaId)
    .eq("competencia_ano_mes", competencia)
    .eq("origem_tipo", "CAFE")
    .eq("origem_subtipo", origemSubtipo)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return asInt(data?.id);
}

async function carregarVendasCafeCompetencia(params: {
  supabase: SupabaseLike;
  compradorTipo: CafeCompradorTipo;
  compradorPessoaId: number | null;
  colaboradorPessoaId: number | null;
  competenciaAnoMes: string;
  origemFinanceira: CafeFluxoFinanceiro;
}) {
  const {
    supabase,
    compradorTipo,
    compradorPessoaId,
    colaboradorPessoaId,
    competenciaAnoMes,
    origemFinanceira,
  } = params;

  let query = supabase
    .from("cafe_vendas")
    .select(
      "id,valor_em_aberto_centavos,valor_total_centavos,valor_pago_centavos,cobranca_id,status_pagamento,data_operacao",
    )
    .eq("competencia_ano_mes", competenciaAnoMes)
    .eq("origem_financeira", origemFinanceira)
    .neq("status_pagamento", "CANCELADO")
    .order("id", { ascending: true });

  if (compradorTipo === CAFE_COMPRADOR_TIPO.COLABORADOR) {
    query = query.eq("colaborador_pessoa_id", colaboradorPessoaId);
  } else {
    query = query.eq("comprador_pessoa_id", compradorPessoaId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).map((item) => ({
    id: asInt(item.id) ?? 0,
    valor_em_aberto_centavos: Math.max(asInt(item.valor_em_aberto_centavos) ?? 0, 0),
    valor_total_centavos: Math.max(asInt(item.valor_total_centavos) ?? 0, 0),
    valor_pago_centavos: Math.max(asInt(item.valor_pago_centavos) ?? 0, 0),
    cobranca_id: asInt(item.cobranca_id),
  }));
}

function flowToOrigemSubtipo(fluxo: CafeFluxoFinanceiro) {
  switch (fluxo) {
    case CAFE_FLUXO_FINANCEIRO.CARTAO_CONEXAO_ALUNO:
      return "CARTAO_CONEXAO_ALUNO";
    case CAFE_FLUXO_FINANCEIRO.CARTAO_CONEXAO_COLABORADOR:
      return "CARTAO_CONEXAO_COLABORADOR";
    case CAFE_FLUXO_FINANCEIRO.CONTA_INTERNA:
      return "CONTA_INTERNA_COLABORADOR";
    default:
      return fluxo;
  }
}

async function atualizarVendasCafePorCompetencia(params: {
  supabase: SupabaseLike;
  vendaIds: number[];
  cobrancaId: number | null;
  contaConexaoId: number | null;
  statusFinanceiro: CafeStatusFinanceiro;
  statusPagamento: "PAGO" | "FATURADO";
  tipoQuitacao: "CONTA_INTERNA_COLABORADOR" | "CONTA_INTERNA" | "CARTAO_CONEXAO";
}) {
  const { supabase, vendaIds, cobrancaId, contaConexaoId, statusFinanceiro, statusPagamento, tipoQuitacao } = params;
  if (vendaIds.length === 0) return;

  const { error } = await supabase
    .from("cafe_vendas")
    .update({
      cobranca_id: cobrancaId,
      conta_conexao_id: contaConexaoId,
      status_financeiro: statusFinanceiro,
      status_pagamento: statusPagamento,
      tipo_quitacao: tipoQuitacao,
      updated_at: nowIso(),
    })
    .in("id", vendaIds);

  if (error) throw error;
}

export async function listarOpcoesPagamentoCafe(params: {
  supabase: SupabaseLike;
  compradorPessoaId: number | null;
  compradorTipoInformado?: string | null;
  centroCustoId?: number | null;
}): Promise<CafePagamentoOpcaoResponse> {
  const { supabase, compradorPessoaId, compradorTipoInformado } = params;
  const centroCustoId = params.centroCustoId ?? (await resolverCentroCustoCafe(supabase));
  const comprador = await classificarCompradorCafe(supabase, {
    compradorPessoaId,
    compradorTipoInformado,
  });
  const formas = await carregarFormasContextoCafe(supabase, centroCustoId);

  const opcoes = formas.map((item) => {
    const codigo = asString(item.forma_pagamento_codigo) ?? "";
    const tipoFluxo = inferirFluxoFinanceiroCafe(codigo);
    let motivoBloqueio: string | null = null;

    if (tipoFluxo === CAFE_FLUXO_FINANCEIRO.CARTAO_CONEXAO_ALUNO) {
      if (comprador.tipo !== CAFE_COMPRADOR_TIPO.ALUNO) {
        motivoBloqueio = "Disponivel apenas para aluno identificado.";
      } else if (!comprador.pessoa_id) {
        motivoBloqueio = "Selecione o aluno para usar Cartao Conexao.";
      } else if (!comprador.conta_conexao) {
        motivoBloqueio = "Aluno sem conta Cartao Conexao elegivel.";
      }
    } else if (
      tipoFluxo === CAFE_FLUXO_FINANCEIRO.CARTAO_CONEXAO_COLABORADOR ||
      tipoFluxo === CAFE_FLUXO_FINANCEIRO.CONTA_INTERNA
    ) {
      if (comprador.tipo !== CAFE_COMPRADOR_TIPO.COLABORADOR) {
        motivoBloqueio = "Disponivel apenas para colaborador identificado.";
      } else if (!comprador.pessoa_id) {
        motivoBloqueio = "Selecione o colaborador para fechamento futuro.";
      }
    } else if (
      comprador.tipo === CAFE_COMPRADOR_TIPO.NAO_IDENTIFICADO &&
      exigeContaConexao(tipoFluxo)
    ) {
      motivoBloqueio = "Comprador nao identificado precisa pagar no ato.";
    }

    return {
      id: asInt(item.forma?.id),
      codigo,
      label: asString(item.descricao_exibicao) ?? asString(item.forma?.nome) ?? codigo,
      tipo_fluxo: tipoFluxo,
      exige_conta_conexao: exigeContaConexao(tipoFluxo),
      habilitado: motivoBloqueio === null,
      motivo_bloqueio: motivoBloqueio,
      conta_financeira_id: asInt(item.conta_financeira_id),
      cartao_maquina_id: asInt(item.cartao_maquina_id),
      carteira_tipo: asString(item.carteira_tipo),
    } satisfies CafePagamentoOpcao;
  });

  return {
    centro_custo_id: centroCustoId,
    comprador: {
      pessoa_id: comprador.pessoa_id,
      tipo: comprador.tipo,
    },
    opcoes,
  };
}

export async function criarRecebimentoImediatoCafe(params: {
  supabase: SupabaseLike;
  vendaId: number;
  centroCustoId: number;
  formaPagamentoCodigo: string;
  valorCentavos: number;
  dataOperacao: string;
  observacoes: string | null;
}): Promise<number | null> {
  const { supabase, vendaId, centroCustoId, formaPagamentoCodigo, valorCentavos, dataOperacao, observacoes } = params;
  if (valorCentavos <= 0) return null;

  const dataPagamento = /^\d{4}-\d{2}-\d{2}$/.test(dataOperacao) ? `${dataOperacao}T00:00:00` : nowIso();

  const { data, error } = await supabase
    .from("recebimentos")
    .insert({
      cobranca_id: null,
      centro_custo_id: centroCustoId,
      valor_centavos: valorCentavos,
      data_pagamento: dataPagamento,
      metodo_pagamento: formaPagamentoCodigo,
      forma_pagamento_codigo: formaPagamentoCodigo,
      origem_sistema: "CAFE",
      observacoes: observacoes ?? `Recebimento imediato do Ballet Cafe - venda #${vendaId}`,
    })
    .select("id")
    .single();

  if (error) throw error;
  return asInt(data?.id);
}

export async function criarMovimentoFinanceiroCafe(params: {
  supabase: SupabaseLike;
  centroCustoId: number;
  valorCentavos: number;
  dataMovimento: string;
  origem: string;
  origemId: number | null;
  descricao: string;
  usuarioId: string | null;
}): Promise<number | null> {
  const { supabase, centroCustoId, valorCentavos, dataMovimento, origem, origemId, descricao, usuarioId } = params;
  if (valorCentavos <= 0) return null;

  const { data, error } = await supabase
    .from("movimento_financeiro")
    .insert({
      tipo: "RECEITA",
      centro_custo_id: centroCustoId,
      valor_centavos: valorCentavos,
      data_movimento: dataMovimento,
      origem,
      origem_id: origemId,
      descricao,
      usuario_id: usuarioId,
    })
    .select("id")
    .single();

  if (error) throw error;
  return asInt(data?.id);
}

export async function criarLancamentoCartaoConexaoCafe(params: {
  supabase: SupabaseLike;
  cobrancaId: number;
  contaConexaoId: number;
  competenciaAnoMes: string;
  valorCentavos: number;
  descricao: string;
  origemFinanceira: CafeFluxoFinanceiro;
  compradorTipo: CafeCompradorTipo;
  compradorPessoaId: number;
  vendaIds: number[];
}) {
  return upsertLancamentoPorCobranca({
    cobrancaId: params.cobrancaId,
    contaConexaoId: params.contaConexaoId,
    competencia: params.competenciaAnoMes,
    valorCentavos: params.valorCentavos,
    descricao: params.descricao,
    origemSistema: "CAFE",
    origemId: params.cobrancaId,
    composicaoJson: {
      origem: "CAFE",
      comprador_tipo: params.compradorTipo,
      comprador_pessoa_id: params.compradorPessoaId,
      origem_financeira: params.origemFinanceira,
      competencia: params.competenciaAnoMes,
      venda_ids: params.vendaIds,
      total_aberto_centavos: params.valorCentavos,
    },
    supabase: params.supabase,
  });
}

type CriarCobrancaCafeInput = {
  supabase: SupabaseLike;
  vendaId: number;
  competenciaAnoMes: string;
  compradorTipo: CafeCompradorTipo;
  compradorPessoaId: number | null;
  colaboradorPessoaId: number | null;
  origemFinanceira: CafeFluxoFinanceiro;
  centroCustoId: number;
  contaConexaoId: number | null;
};

type CriarCobrancaCafeOutput = {
  cobrancaId: number | null;
  contaConexaoId: number | null;
  lancamentoId: number | null;
  faturaId: number | null;
  statusFinanceiro: CafeStatusFinanceiro;
  statusPagamento: "PAGO" | "FATURADO";
  tipoQuitacao: "CONTA_INTERNA_COLABORADOR" | "CONTA_INTERNA" | "CARTAO_CONEXAO";
  observacaoFinanceira: string;
};

export async function criarCobrancaCafe(params: CriarCobrancaCafeInput): Promise<CriarCobrancaCafeOutput> {
  const {
    supabase,
    vendaId,
    competenciaAnoMes,
    compradorTipo,
    compradorPessoaId,
    colaboradorPessoaId,
    origemFinanceira,
    centroCustoId,
  } = params;

  const pessoaReferencia =
    compradorTipo === CAFE_COMPRADOR_TIPO.COLABORADOR ? colaboradorPessoaId : compradorPessoaId;

  if (!pessoaReferencia) {
    throw new Error("comprador_obrigatorio_para_fluxo_futuro");
  }

  const conta =
    compradorTipo === CAFE_COMPRADOR_TIPO.COLABORADOR
      ? await ensureContaInternaColaborador(supabase, pessoaReferencia)
      : await resolverContaConexaoCafe(supabase, {
          compradorPessoaId: pessoaReferencia,
          compradorTipo,
        });

  if (!conta?.id) {
    throw new Error("conta_conexao_nao_encontrada");
  }

  const vendas = await carregarVendasCafeCompetencia({
    supabase,
    compradorTipo,
    compradorPessoaId,
    colaboradorPessoaId,
    competenciaAnoMes,
    origemFinanceira,
  });

  const totalAberto = vendas.reduce((acc, item) => acc + item.valor_em_aberto_centavos, 0);
  const vendaAtual = vendas.find((item) => item.id === vendaId) ?? null;
  const origemSubtipo = flowToOrigemSubtipo(origemFinanceira);
  const cobrancaIdExistente = await findCafeCobrancaCompetencia({
    supabase,
    pessoaId: pessoaReferencia,
    competencia: competenciaAnoMes,
    origemSubtipo,
    currentId: vendaAtual?.cobranca_id ?? null,
  });

  const descricaoBase =
    compradorTipo === CAFE_COMPRADOR_TIPO.ALUNO
      ? `Cafe aluno - competencia ${competenciaAnoMes}`
      : `Cafe colaborador - competencia ${competenciaAnoMes}`;
  const vencimento = buildVencimentoFromCompetencia(competenciaAnoMes, conta.dia_vencimento);
  const statusPagamento = totalAberto > 0 ? "FATURADO" : "PAGO";
  const statusFinanceiro =
    origemFinanceira === CAFE_FLUXO_FINANCEIRO.CONTA_INTERNA
      ? CAFE_STATUS_FINANCEIRO.EM_CONTA_INTERNA
      : CAFE_STATUS_FINANCEIRO.FATURADO_CARTAO_CONEXAO;
  const observacaoFinanceira =
    origemFinanceira === CAFE_FLUXO_FINANCEIRO.CONTA_INTERNA
      ? "Debito vinculado a conta interna do colaborador."
      : "Debito vinculado ao Cartao Conexao.";

  let cobrancaId = cobrancaIdExistente;
  if (cobrancaId) {
    const { error: updateError } = await supabase
      .from("cobrancas")
      .update({
        descricao: descricaoBase,
        valor_centavos: totalAberto,
        vencimento,
        competencia_ano_mes: competenciaAnoMes,
        status: totalAberto > 0 ? "PENDENTE" : "PAGO",
        metodo_pagamento: origemFinanceira === CAFE_FLUXO_FINANCEIRO.CONTA_INTERNA ? "CARTEIRA_INTERNA" : "CARTAO_CONEXAO",
        origem_tipo: "CAFE",
        origem_subtipo: origemSubtipo,
        observacoes: `Origem: CAFE; competencia=${competenciaAnoMes}; comprador_tipo=${compradorTipo}; pessoa_id=${pessoaReferencia}`,
        centro_custo_id: centroCustoId,
        updated_at: nowIso(),
        data_pagamento: totalAberto > 0 ? null : `${todayIso()}T00:00:00`,
      })
      .eq("id", cobrancaId);

    if (updateError) throw updateError;
  } else {
    const { data: created, error: createError } = await supabase
      .from("cobrancas")
      .insert({
        pessoa_id: pessoaReferencia,
        descricao: descricaoBase,
        valor_centavos: totalAberto,
        moeda: "BRL",
        vencimento,
        competencia_ano_mes: competenciaAnoMes,
        status: totalAberto > 0 ? "PENDENTE" : "PAGO",
        metodo_pagamento: origemFinanceira === CAFE_FLUXO_FINANCEIRO.CONTA_INTERNA ? "CARTEIRA_INTERNA" : "CARTAO_CONEXAO",
        origem_tipo: "CAFE",
        origem_subtipo: origemSubtipo,
        observacoes: `Origem: CAFE; competencia=${competenciaAnoMes}; comprador_tipo=${compradorTipo}; pessoa_id=${pessoaReferencia}`,
        centro_custo_id: centroCustoId,
        created_at: nowIso(),
        updated_at: nowIso(),
        data_pagamento: totalAberto > 0 ? null : `${todayIso()}T00:00:00`,
      })
      .select("id")
      .single();

    if (createError || !created?.id) {
      throw createError ?? new Error("falha_criar_cobranca_cafe");
    }
    cobrancaId = Number(created.id);
  }

  const vendaIds = vendas.map((item) => item.id).filter((item) => item > 0);

  await atualizarVendasCafePorCompetencia({
    supabase,
    vendaIds,
    cobrancaId,
    contaConexaoId: conta.id,
    statusFinanceiro,
    statusPagamento,
    tipoQuitacao:
      origemFinanceira === CAFE_FLUXO_FINANCEIRO.CONTA_INTERNA
        ? compradorTipo === CAFE_COMPRADOR_TIPO.COLABORADOR
          ? "CONTA_INTERNA_COLABORADOR"
          : "CONTA_INTERNA"
        : "CARTAO_CONEXAO",
  });

  const lancamento = await criarLancamentoCartaoConexaoCafe({
    supabase,
    cobrancaId,
    contaConexaoId: conta.id,
    competenciaAnoMes,
    valorCentavos: totalAberto,
    descricao: descricaoBase,
    origemFinanceira,
    compradorTipo,
    compradorPessoaId: pessoaReferencia,
    vendaIds,
  });

  let faturaId: number | null = null;
  if (totalAberto > 0) {
    faturaId = await ensureFaturaAbertaCompetencia(supabase, conta.id, competenciaAnoMes, conta.dia_vencimento);
    const vinculo = await vincularLancamentoNaFatura(supabase as Parameters<typeof vincularLancamentoNaFatura>[0], faturaId, lancamento.id);
    if (!vinculo.ok) {
      throw vinculo.error ?? new Error("falha_vincular_lancamento_fatura");
    }
    await recalcularComprasFatura(supabase as Parameters<typeof recalcularComprasFatura>[0], faturaId);
  }

  return {
    cobrancaId,
    contaConexaoId: conta.id,
    lancamentoId: lancamento.id,
    faturaId,
    statusFinanceiro,
    statusPagamento,
    tipoQuitacao:
      origemFinanceira === CAFE_FLUXO_FINANCEIRO.CONTA_INTERNA
        ? compradorTipo === CAFE_COMPRADOR_TIPO.COLABORADOR
          ? "CONTA_INTERNA_COLABORADOR"
          : "CONTA_INTERNA"
        : "CARTAO_CONEXAO",
    observacaoFinanceira,
  };
}

type AplicarFluxoInput = {
  supabase: SupabaseLike;
  vendaId: number;
  dataOperacao: string;
  valorTotalCentavos: number;
  valorPagoCentavos: number;
  compradorPessoaId: number | null;
  colaboradorPessoaId: number | null;
  compradorTipoInformado: string | null;
  formaPagamentoId: number | null;
  formaPagamentoCodigo: string | null;
  competenciaAnoMes: string | null;
  observacoes: string | null;
  usuarioId: string | null;
  origemOperacao: "PDV" | "CAIXA_ADMIN";
};

export type AplicarFluxoOutput = {
  centro_custo_id: number;
  conta_financeira_id: number | null;
  forma_pagamento_id: number | null;
  comprador_tipo: CafeCompradorTipo;
  comprador_pessoa_id: number | null;
  conta_conexao_id: number | null;
  cobranca_id: number | null;
  recebimento_id: number | null;
  movimento_financeiro_id: number | null;
  origem_financeira: string;
  status_financeiro: CafeStatusFinanceiro;
  competencia_ano_mes: string | null;
  observacao_financeira: string | null;
  status_pagamento: "PENDENTE" | "PARCIAL" | "PAGO" | "FATURADO";
  tipo_quitacao: "IMEDIATA" | "PARCIAL" | "CONTA_INTERNA_COLABORADOR" | "CONTA_INTERNA" | "CARTAO_CONEXAO";
  forma_pagamento_codigo: string;
};

export async function aplicarFluxoFinanceiroVendaCafe(input: AplicarFluxoInput): Promise<AplicarFluxoOutput> {
  const {
    supabase,
    vendaId,
    dataOperacao,
    valorTotalCentavos,
    valorPagoCentavos,
    compradorPessoaId,
    colaboradorPessoaId,
    compradorTipoInformado,
    formaPagamentoId,
    formaPagamentoCodigo,
    competenciaAnoMes,
    observacoes,
    usuarioId,
    origemOperacao,
  } = input;

  const centroCustoId = await resolverCentroCustoCafe(supabase);
  const comprador = await classificarCompradorCafe(supabase, {
    compradorPessoaId: colaboradorPessoaId ?? compradorPessoaId,
    compradorTipoInformado,
  });
  const forma = await resolveFormaPagamentoCafe({
    supabase,
    centroCustoId,
    formaPagamentoId,
    formaPagamentoCodigo,
  });
  const competencia = competenciaAnoMes && isCompetencia(competenciaAnoMes)
    ? competenciaAnoMes
    : competenciaFromDate(dataOperacao);

  if (comprador.tipo === CAFE_COMPRADOR_TIPO.NAO_IDENTIFICADO && forma.exige_conta_conexao) {
    throw new Error("comprador_nao_identificado_nao_pode_usar_conta_interna");
  }
  if (forma.tipo_fluxo === CAFE_FLUXO_FINANCEIRO.CARTAO_CONEXAO_ALUNO && comprador.tipo !== CAFE_COMPRADOR_TIPO.ALUNO) {
    throw new Error("cartao_conexao_aluno_exige_aluno_identificado");
  }
  if (
    (forma.tipo_fluxo === CAFE_FLUXO_FINANCEIRO.CARTAO_CONEXAO_COLABORADOR ||
      forma.tipo_fluxo === CAFE_FLUXO_FINANCEIRO.CONTA_INTERNA) &&
    comprador.tipo !== CAFE_COMPRADOR_TIPO.COLABORADOR
  ) {
    throw new Error("conta_interna_exige_colaborador");
  }

  const contaFinanceiraId =
    forma.conta_financeira_id ??
    (await resolverContaFinanceiraPadraoCafe(supabase, {
      preferirCaixa: forma.tipo_fluxo === CAFE_FLUXO_FINANCEIRO.IMEDIATO,
    }));
  const observacaoFinanceiraBase =
    forma.tipo_fluxo === CAFE_FLUXO_FINANCEIRO.IMEDIATO
      ? "Venda imediata do Ballet Cafe com efeito financeiro no caixa."
      : forma.tipo_fluxo === CAFE_FLUXO_FINANCEIRO.CARTAO_EXTERNO
        ? "Venda do Ballet Cafe com liquidacao em cartao externo."
        : forma.tipo_fluxo === CAFE_FLUXO_FINANCEIRO.CARTAO_CONEXAO_ALUNO
          ? "Venda do Ballet Cafe enviada ao Cartao Conexao do aluno."
          : forma.tipo_fluxo === CAFE_FLUXO_FINANCEIRO.CARTAO_CONEXAO_COLABORADOR
            ? "Venda do Ballet Cafe enviada ao Cartao Conexao do colaborador."
            : "Venda do Ballet Cafe lancada para fechamento futuro na conta interna do colaborador.";

  const compradorPessoaFinanceiro =
    comprador.tipo === CAFE_COMPRADOR_TIPO.COLABORADOR
      ? colaboradorPessoaId ?? comprador.pessoa_id
      : comprador.pessoa_id;

  const { error: preUpdateError } = await supabase
    .from("cafe_vendas")
    .update({
      centro_custo_id: centroCustoId,
      conta_financeira_id: contaFinanceiraId,
      forma_pagamento_id: forma.id,
      comprador_tipo: comprador.tipo,
      comprador_pessoa_id: compradorPessoaFinanceiro,
      conta_conexao_id: comprador.conta_conexao?.id ?? null,
      origem_financeira: forma.tipo_fluxo,
      data_competencia: forma.exige_conta_conexao ? competencia : null,
      competencia_ano_mes: forma.exige_conta_conexao ? competencia : null,
      observacao_financeira: observacaoFinanceiraBase,
      forma_pagamento: forma.codigo,
      updated_at: nowIso(),
    })
    .eq("id", vendaId);

  if (preUpdateError) throw preUpdateError;

  if (
    forma.tipo_fluxo === CAFE_FLUXO_FINANCEIRO.CARTAO_CONEXAO_ALUNO ||
    forma.tipo_fluxo === CAFE_FLUXO_FINANCEIRO.CARTAO_CONEXAO_COLABORADOR ||
    forma.tipo_fluxo === CAFE_FLUXO_FINANCEIRO.CONTA_INTERNA
  ) {
    const cobranca = await criarCobrancaCafe({
      supabase,
      vendaId,
      competenciaAnoMes: competencia,
      compradorTipo: comprador.tipo,
      compradorPessoaId: comprador.tipo === CAFE_COMPRADOR_TIPO.ALUNO ? comprador.pessoa_id : compradorPessoaFinanceiro,
      colaboradorPessoaId,
      origemFinanceira: forma.tipo_fluxo,
      centroCustoId,
      contaConexaoId: comprador.conta_conexao?.id ?? null,
    });

    return {
      centro_custo_id: centroCustoId,
      conta_financeira_id: contaFinanceiraId,
      forma_pagamento_id: forma.id,
      comprador_tipo: comprador.tipo,
      comprador_pessoa_id: compradorPessoaFinanceiro,
      conta_conexao_id: cobranca.contaConexaoId,
      cobranca_id: cobranca.cobrancaId,
      recebimento_id: null,
      movimento_financeiro_id: null,
      origem_financeira: forma.tipo_fluxo,
      status_financeiro: cobranca.statusFinanceiro,
      competencia_ano_mes: competencia,
      observacao_financeira: cobranca.observacaoFinanceira,
      status_pagamento: cobranca.statusPagamento,
      tipo_quitacao: cobranca.tipoQuitacao,
      forma_pagamento_codigo: forma.codigo,
    };
  }

  const valorRecebido = Math.max(0, Math.min(valorTotalCentavos, valorPagoCentavos));
  const dataMovimento = /^\d{4}-\d{2}-\d{2}$/.test(dataOperacao) ? `${dataOperacao}T00:00:00` : nowIso();
  const recebimentoId =
    valorRecebido > 0
      ? await criarRecebimentoImediatoCafe({
          supabase,
          vendaId,
          centroCustoId,
          formaPagamentoCodigo: forma.codigo,
          valorCentavos: valorRecebido,
          dataOperacao,
          observacoes: observacoes ?? `${origemOperacao} Ballet Cafe`,
        })
      : null;
  const movimentoFinanceiroId =
    valorRecebido > 0 && recebimentoId
      ? await criarMovimentoFinanceiroCafe({
          supabase,
          centroCustoId,
          valorCentavos: valorRecebido,
          dataMovimento,
          origem: "RECEBIMENTO",
          origemId: recebimentoId,
          descricao: `Recebimento Ballet Cafe - venda #${vendaId}`,
          usuarioId,
        })
      : null;

  const saldoAberto = Math.max(valorTotalCentavos - valorRecebido, 0);
  const statusPagamento =
    saldoAberto <= 0 ? "PAGO" : valorRecebido > 0 ? "PARCIAL" : "PENDENTE";
  const statusFinanceiro =
    valorRecebido > 0 ? CAFE_STATUS_FINANCEIRO.PAGO_IMEDIATO : CAFE_STATUS_FINANCEIRO.PENDENTE;

  const { error: finalizeError } = await supabase
    .from("cafe_vendas")
    .update({
      recebimento_id: recebimentoId,
      movimento_financeiro_id: movimentoFinanceiroId,
      status_financeiro: statusFinanceiro,
      status_pagamento: statusPagamento,
      tipo_quitacao: saldoAberto > 0 ? "PARCIAL" : "IMEDIATA",
      forma_pagamento: forma.codigo,
      updated_at: nowIso(),
    })
    .eq("id", vendaId);

  if (finalizeError) throw finalizeError;

  return {
    centro_custo_id: centroCustoId,
    conta_financeira_id: contaFinanceiraId,
    forma_pagamento_id: forma.id,
    comprador_tipo: comprador.tipo,
    comprador_pessoa_id: compradorPessoaFinanceiro,
    conta_conexao_id: null,
    cobranca_id: null,
    recebimento_id: recebimentoId,
    movimento_financeiro_id: movimentoFinanceiroId,
    origem_financeira: forma.tipo_fluxo,
    status_financeiro: statusFinanceiro,
    competencia_ano_mes: null,
    observacao_financeira:
      saldoAberto > 0
        ? "Pagamento parcial do Ballet Cafe com saldo em aberto."
        : observacaoFinanceiraBase,
    status_pagamento: statusPagamento,
    tipo_quitacao: saldoAberto > 0 ? "PARCIAL" : "IMEDIATA",
    forma_pagamento_codigo: forma.codigo,
  };
}
