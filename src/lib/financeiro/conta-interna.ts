import type { SupabaseClient } from "@supabase/supabase-js";
import { upsertLancamentoPorCobranca } from "@/lib/credito-conexao/upsertLancamentoPorCobranca";
import { recalcularComprasFatura, vincularLancamentoNaFatura } from "@/lib/financeiro/creditoConexaoFaturas";

type SupabaseLike = Pick<SupabaseClient, "from">;

export type ContaInternaTipo = "ALUNO" | "COLABORADOR";
export type ContaInternaLiquidacao = "FATURA_MENSAL" | "FOLHA_PAGAMENTO";

export type ContaInternaResolvida = {
  elegivel: boolean;
  tipo: ContaInternaTipo | null;
  conta_id: number | null;
  titular_pessoa_id: number | null;
  responsavel_financeiro_pessoa_id: number | null;
  dia_vencimento: number | null;
  tipo_liquidacao: ContaInternaLiquidacao | null;
  motivo: string | null;
  descricao: string | null;
};

type FaturaAbertaParams = {
  supabase: SupabaseLike;
  contaInternaId: number;
  competencia: string;
  diaVencimento: number | null;
};

type CriarLancamentoContaInternaParams = {
  supabase: SupabaseLike;
  cobrancaId: number;
  contaInternaId: number;
  competencia: string;
  valorCentavos: number;
  descricao: string;
  origemSistema: "CAFE" | "LOJA" | "ESCOLA";
  origemId: number;
  composicaoJson?: Record<string, unknown>;
};

function asInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Math.trunc(Number(value));
  }
  return null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
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

function todayIso() {
  return new Date().toISOString().slice(0, 10);
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

async function listarResponsaveisFinanceirosAtivos(
  supabase: SupabaseLike,
  alunoPessoaId: number,
): Promise<number[]> {
  const ids = new Set<number>();

  const { data: vinculosCanonicos, error: vinculosCanonicosError } = await supabase
    .from("pessoa_responsavel_financeiro_vinculos")
    .select("responsavel_pessoa_id,ativo")
    .eq("dependente_pessoa_id", alunoPessoaId)
    .eq("ativo", true);

  if (vinculosCanonicosError) {
    console.error("[CONTA_INTERNA][ALUNO][RESPONSAVEIS][ERRO]", vinculosCanonicosError);
    throw vinculosCanonicosError;
  }

  for (const item of (vinculosCanonicos ?? []) as Array<Record<string, unknown>>) {
    const responsavelId = asInt(item.responsavel_pessoa_id);
    if (responsavelId) ids.add(responsavelId);
  }

  const { data: matriculaAtual, error: matriculaError } = await supabase
    .from("matriculas")
    .select("responsavel_financeiro_id,status,created_at")
    .eq("pessoa_id", alunoPessoaId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (matriculaError) {
    console.error("[CONTA_INTERNA][ALUNO][MATRICULA][ERRO]", matriculaError);
    throw matriculaError;
  }

  const responsavelMatriculaId = asInt(
    (matriculaAtual as Record<string, unknown> | null)?.responsavel_financeiro_id,
  );
  if (responsavelMatriculaId) ids.add(responsavelMatriculaId);

  return Array.from(ids);
}

async function carregarContaInternaPorTitulares(params: {
  supabase: SupabaseLike;
  pessoaTitularIds: number[];
  tipoConta: ContaInternaTipo;
  alunoPessoaId?: number | null;
}): Promise<ContaInternaResolvida> {
  const { supabase, pessoaTitularIds, tipoConta, alunoPessoaId = null } = params;
  if (pessoaTitularIds.length === 0) {
    console.warn("[CONTA_INTERNA][SEM_TITULAR]", { tipoConta });
    return {
      elegivel: false,
      tipo: tipoConta,
      conta_id: null,
      titular_pessoa_id: null,
      responsavel_financeiro_pessoa_id: null,
      dia_vencimento: null,
      tipo_liquidacao: tipoConta === "COLABORADOR" ? "FOLHA_PAGAMENTO" : "FATURA_MENSAL",
      motivo:
        tipoConta === "ALUNO"
          ? "Nenhum responsavel financeiro elegivel foi encontrado."
          : "Colaborador sem conta interna ativa.",
      descricao: null,
    };
  }

  const { data, error } = await supabase
    .from("credito_conexao_contas")
    .select("id,pessoa_titular_id,tipo_conta,dia_vencimento,descricao_exibicao,ativo")
    .in("pessoa_titular_id", pessoaTitularIds)
    .eq("tipo_conta", tipoConta)
    .eq("ativo", true);

  if (error) {
    console.error("[CONTA_INTERNA][CARREGAR][ERRO]", { tipoConta, pessoaTitularIds, error });
    throw error;
  }

  const contas = ((data ?? []) as Array<Record<string, unknown>>)
    .map((item) => ({
      id: asInt(item.id),
      pessoa_titular_id: asInt(item.pessoa_titular_id),
      dia_vencimento: asInt(item.dia_vencimento),
      descricao_exibicao: asString(item.descricao_exibicao),
      tipo_liquidacao: tipoConta === "COLABORADOR" ? "FOLHA_PAGAMENTO" : "FATURA_MENSAL",
    }))
    .filter((item) => item.id && item.pessoa_titular_id) as Array<{
    id: number;
    pessoa_titular_id: number;
    dia_vencimento: number | null;
    descricao_exibicao: string | null;
    tipo_liquidacao: ContaInternaLiquidacao;
  }>;

  const conta =
    pessoaTitularIds
      .map((pessoaId) => contas.find((item) => item.pessoa_titular_id === pessoaId) ?? null)
      .find(Boolean) ?? null;

  if (!conta) {
    console.warn("[CONTA_INTERNA][NAO_ENCONTRADA]", { tipoConta, pessoaTitularIds });
    return {
      elegivel: false,
      tipo: tipoConta,
      conta_id: null,
      titular_pessoa_id: null,
      responsavel_financeiro_pessoa_id: null,
      dia_vencimento: null,
      tipo_liquidacao: tipoConta === "COLABORADOR" ? "FOLHA_PAGAMENTO" : "FATURA_MENSAL",
      motivo:
        tipoConta === "ALUNO"
          ? "Aluno ou responsavel financeiro sem conta interna ativa."
          : "Colaborador sem conta interna ativa.",
      descricao: null,
    };
  }

  return {
    elegivel: true,
    tipo: tipoConta,
    conta_id: conta.id,
    titular_pessoa_id: conta.pessoa_titular_id,
    responsavel_financeiro_pessoa_id:
      tipoConta === "ALUNO" && alunoPessoaId && conta.pessoa_titular_id !== alunoPessoaId
        ? conta.pessoa_titular_id
        : null,
    dia_vencimento: conta.dia_vencimento,
    tipo_liquidacao: conta.tipo_liquidacao,
    motivo: null,
    descricao: conta.descricao_exibicao,
  };
}

export async function resolverContaInternaDoAlunoOuResponsavel(params: {
  supabase: SupabaseLike;
  alunoPessoaId: number | null;
  permitirContaDoAluno?: boolean;
}): Promise<ContaInternaResolvida> {
  const { supabase, alunoPessoaId, permitirContaDoAluno = true } = params;
  if (!alunoPessoaId) {
    return {
      elegivel: false,
      tipo: "ALUNO",
      conta_id: null,
      titular_pessoa_id: null,
      responsavel_financeiro_pessoa_id: null,
      dia_vencimento: null,
      tipo_liquidacao: "FATURA_MENSAL",
      motivo: "Aluno nao informado.",
      descricao: null,
    };
  }

  const responsaveis = await listarResponsaveisFinanceirosAtivos(supabase, alunoPessoaId);
  const candidatos = permitirContaDoAluno ? [...responsaveis, alunoPessoaId] : responsaveis;
  console.log("[CONTA_INTERNA][ALUNO][RESOLVER]", {
    alunoPessoaId,
    responsaveis,
    candidatos,
  });
  return carregarContaInternaPorTitulares({
    supabase,
    pessoaTitularIds: Array.from(new Set(candidatos)),
    tipoConta: "ALUNO",
    alunoPessoaId,
  });
}

export async function resolverContaInternaDoColaborador(params: {
  supabase: SupabaseLike;
  colaboradorPessoaId: number | null;
}): Promise<ContaInternaResolvida> {
  const { supabase, colaboradorPessoaId } = params;
  if (!colaboradorPessoaId) {
    return {
      elegivel: false,
      tipo: "COLABORADOR",
      conta_id: null,
      titular_pessoa_id: null,
      responsavel_financeiro_pessoa_id: null,
      dia_vencimento: null,
      tipo_liquidacao: "FOLHA_PAGAMENTO",
      motivo: "Colaborador nao informado.",
      descricao: null,
    };
  }

  const { data: colaborador, error: colaboradorError } = await supabase
    .from("colaboradores")
    .select("id,pessoa_id,ativo")
    .eq("pessoa_id", colaboradorPessoaId)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  if (colaboradorError) {
    console.error("[CONTA_INTERNA][COLABORADOR][VINCULO][ERRO]", {
      colaboradorPessoaId,
      error: colaboradorError,
    });
    throw colaboradorError;
  }

  const colaboradorEncontrado = Boolean(asInt((colaborador as Record<string, unknown> | null)?.id));
  console.log("[CONTA_INTERNA][COLABORADOR][RESOLVER]", {
    colaboradorPessoaId,
    colaboradorEncontrado,
  });

  if (!colaboradorEncontrado) {
    return {
      elegivel: false,
      tipo: "COLABORADOR",
      conta_id: null,
      titular_pessoa_id: null,
      responsavel_financeiro_pessoa_id: null,
      dia_vencimento: null,
      tipo_liquidacao: "FOLHA_PAGAMENTO",
      motivo: "Pessoa selecionada nao possui vinculo ativo de colaborador.",
      descricao: null,
    };
  }

  const conta = await carregarContaInternaPorTitulares({
    supabase,
    pessoaTitularIds: [colaboradorPessoaId],
    tipoConta: "COLABORADOR",
  });

  console.log("[CONTA_INTERNA][COLABORADOR][RESULTADO]", {
    colaboradorPessoaId,
    colaboradorEncontrado,
    contaEncontrada: conta.elegivel,
    contaId: conta.conta_id,
    motivo: conta.motivo,
  });

  return conta;
}

export async function criarLancamentoContaInterna(
  params: CriarLancamentoContaInternaParams,
) {
  return upsertLancamentoPorCobranca({
    cobrancaId: params.cobrancaId,
    contaConexaoId: params.contaInternaId,
    competencia: params.competencia,
    valorCentavos: params.valorCentavos,
    descricao: params.descricao,
    origemSistema: params.origemSistema,
    origemId: params.origemId,
    composicaoJson: params.composicaoJson ?? {},
    supabase: params.supabase,
  });
}

async function ensureFaturaAbertaCompetencia({
  supabase,
  contaInternaId,
  competencia,
  diaVencimento,
}: FaturaAbertaParams): Promise<number> {
  const { data: existente, error: findError } = await supabase
    .from("credito_conexao_faturas")
    .select("id,status")
    .eq("conta_conexao_id", contaInternaId)
    .eq("periodo_referencia", competencia)
    .maybeSingle();

  if (findError) throw findError;

  if (existente?.id) {
    const status = upper(existente.status);
    if (status === "FECHADA" || status === "PAGA") {
      throw new Error("competencia_fechada_para_conta_interna");
    }
    return Number(existente.id);
  }

  const { data: created, error: createError } = await supabase
    .from("credito_conexao_faturas")
    .insert({
      conta_conexao_id: contaInternaId,
      periodo_referencia: competencia,
      data_fechamento: todayIso(),
      data_vencimento: buildVencimentoFromCompetencia(competencia, diaVencimento),
      valor_total_centavos: 0,
      valor_taxas_centavos: 0,
      status: "ABERTA",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (createError || !created?.id) {
    throw createError ?? new Error("falha_criar_fatura_conta_interna");
  }

  return Number(created.id);
}

export async function agendarFaturamentoMensalAluno(params: {
  supabase: SupabaseLike;
  contaInternaId: number;
  competencia: string;
  diaVencimento: number | null;
  lancamentoId: number;
}) {
  const faturaId = await ensureFaturaAbertaCompetencia({
    supabase: params.supabase,
    contaInternaId: params.contaInternaId,
    competencia: params.competencia,
    diaVencimento: params.diaVencimento,
  });

  const vinculo = await vincularLancamentoNaFatura(
    params.supabase as Parameters<typeof vincularLancamentoNaFatura>[0],
    faturaId,
    params.lancamentoId,
  );
  if (!vinculo.ok) {
    throw vinculo.error ?? new Error("falha_vincular_lancamento_fatura");
  }

  await recalcularComprasFatura(
    params.supabase as Parameters<typeof recalcularComprasFatura>[0],
    faturaId,
  );

  return {
    fatura_id: faturaId,
    tipo_liquidacao: "FATURA_MENSAL" as const,
  };
}

export async function vincularLiquidacaoFolhaColaborador(params: {
  supabase: SupabaseLike;
  contaInternaId: number;
  competencia: string;
  diaVencimento: number | null;
  lancamentoId: number;
}) {
  const faturaId = await ensureFaturaAbertaCompetencia({
    supabase: params.supabase,
    contaInternaId: params.contaInternaId,
    competencia: params.competencia,
    diaVencimento: params.diaVencimento,
  });

  const vinculo = await vincularLancamentoNaFatura(
    params.supabase as Parameters<typeof vincularLancamentoNaFatura>[0],
    faturaId,
    params.lancamentoId,
  );
  if (!vinculo.ok) {
    throw vinculo.error ?? new Error("falha_vincular_lancamento_fatura");
  }

  await recalcularComprasFatura(
    params.supabase as Parameters<typeof recalcularComprasFatura>[0],
    faturaId,
  );

  return {
    fatura_id: faturaId,
    tipo_liquidacao: "FOLHA_PAGAMENTO" as const,
  };
}
