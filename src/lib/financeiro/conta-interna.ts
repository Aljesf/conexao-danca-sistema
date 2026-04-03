import type { SupabaseClient } from "@supabase/supabase-js";
import { upsertLancamentoPorCobranca } from "@/lib/credito-conexao/upsertLancamentoPorCobranca";
import { recalcularComprasFatura, vincularLancamentoNaFatura } from "@/lib/financeiro/creditoConexaoFaturas";

type SupabaseLike = Pick<SupabaseClient, "from">;

export type ContaInternaTipo = "ALUNO" | "COLABORADOR";
export type ContaInternaTipoTitular = "ALUNO" | "COLABORADOR" | "RESPONSAVEL_FINANCEIRO";
export type ContaInternaTipoFatura = "MENSAL";
export type ContaInternaDestinoLiquidacaoFatura =
  | "NEOFIN"
  | "PAGAMENTO_DIRETO_ESCOLA"
  | "INTEGRACAO_FOLHA_MES_SEGUINTE";
export type ContaInternaLiquidacao = "FATURA_MENSAL";

export type ContaInternaResolvida = {
  elegivel: boolean;
  tipo: ContaInternaTipo | null;
  tipo_titular: ContaInternaTipoTitular | null;
  conta_id: number | null;
  titular_pessoa_id: number | null;
  responsavel_financeiro_pessoa_id: number | null;
  dia_vencimento: number | null;
  tipo_fatura: ContaInternaTipoFatura | null;
  tipo_liquidacao: ContaInternaLiquidacao | null;
  destino_liquidacao_fatura: ContaInternaDestinoLiquidacaoFatura | null;
  permite_parcelamento: boolean;
  motivo: string | null;
  descricao: string | null;
};

export type ContaInternaOpcaoElegivel = {
  conta_id: number;
  tipo: ContaInternaTipo;
  tipo_titular: ContaInternaTipoTitular;
  titular_pessoa_id: number;
  responsavel_financeiro_pessoa_id: number | null;
  dia_vencimento: number | null;
  tipo_fatura: ContaInternaTipoFatura | null;
  tipo_liquidacao: ContaInternaLiquidacao | null;
  destino_liquidacao_fatura: ContaInternaDestinoLiquidacaoFatura | null;
  permite_parcelamento: boolean;
  descricao: string | null;
  prioridade: number;
};

type FaturaAbertaParams = {
  supabase: SupabaseLike;
  contaInternaId: number;
  competencia: string;
  diaVencimento: number | null;
};

type FaturaAbertaResult = {
  faturaId: number;
  dataVencimento: string | null;
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
  referenciaItem?: string | null;
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

function contaInternaCompativelComTipo(
  tipoContaEsperado: ContaInternaTipo,
  conta: Record<string, unknown>,
) {
  const tipoConta = upper(conta.tipo_conta);
  const descricaoExibicao = upper(conta.descricao_exibicao);

  if (tipoContaEsperado === "ALUNO") {
    return (
      tipoConta === "ALUNO" ||
      tipoConta === "RESPONSAVEL_FINANCEIRO" ||
      descricaoExibicao.includes("ALUNO") ||
      descricaoExibicao.includes("RESPONSAVEL")
    );
  }

  return (
    tipoConta === "COLABORADOR" ||
    descricaoExibicao.includes("COLABORADOR") ||
    descricaoExibicao.includes("CONTA INTERNA COLABORADOR") ||
    descricaoExibicao.includes("CARTAO CONEXAO COLABORADOR") ||
    descricaoExibicao.includes("CARTAO CONEXAO COLAB")
  );
}

function resolveContaInternaTipoTitular(
  tipoContaEsperado: ContaInternaTipo,
  conta: Record<string, unknown> | null = null,
): ContaInternaTipoTitular {
  const tipoConta = upper(conta?.tipo_conta);
  if (tipoContaEsperado === "ALUNO" && tipoConta === "RESPONSAVEL_FINANCEIRO") {
    return "RESPONSAVEL_FINANCEIRO";
  }
  return tipoContaEsperado;
}

function resolveDestinoLiquidacaoFatura(
  tipoContaEsperado: ContaInternaTipo,
): ContaInternaDestinoLiquidacaoFatura {
  return tipoContaEsperado === "COLABORADOR"
    ? "INTEGRACAO_FOLHA_MES_SEGUINTE"
    : "NEOFIN";
}

async function verificarPermiteParcelamento(
  supabase: SupabaseLike,
  tipoConta: ContaInternaTipo,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("credito_conexao_regras_parcelas")
    .select("id")
    .eq("tipo_conta", tipoConta)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[CONTA_INTERNA][PARCELAMENTO][ERRO]", { tipoConta, error });
    throw error;
  }

  return Boolean(asInt((data as Record<string, unknown> | null)?.id));
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
  const permiteParcelamento = await verificarPermiteParcelamento(supabase, tipoConta);

  if (pessoaTitularIds.length === 0) {
    console.warn("[CONTA_INTERNA][SEM_TITULAR]", { tipoConta });
    return {
      elegivel: false,
      tipo: tipoConta,
      tipo_titular: resolveContaInternaTipoTitular(tipoConta),
      conta_id: null,
      titular_pessoa_id: null,
      responsavel_financeiro_pessoa_id: null,
      dia_vencimento: null,
      tipo_fatura: "MENSAL",
      tipo_liquidacao: "FATURA_MENSAL",
      destino_liquidacao_fatura: resolveDestinoLiquidacaoFatura(tipoConta),
      permite_parcelamento: permiteParcelamento,
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
    .eq("ativo", true);

  if (error) {
    console.error("[CONTA_INTERNA][CARREGAR][ERRO]", { tipoConta, pessoaTitularIds, error });
    throw error;
  }

  const contas = ((data ?? []) as Array<Record<string, unknown>>)
    .filter((item) => contaInternaCompativelComTipo(tipoConta, item))
    .map((item) => ({
      id: asInt(item.id),
      pessoa_titular_id: asInt(item.pessoa_titular_id),
      dia_vencimento: asInt(item.dia_vencimento),
      descricao_exibicao: asString(item.descricao_exibicao),
      tipo_liquidacao: "FATURA_MENSAL" as const,
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
      tipo_titular: resolveContaInternaTipoTitular(tipoConta),
      conta_id: null,
      titular_pessoa_id: null,
      responsavel_financeiro_pessoa_id: null,
      dia_vencimento: null,
      tipo_fatura: "MENSAL",
      tipo_liquidacao: "FATURA_MENSAL",
      destino_liquidacao_fatura: resolveDestinoLiquidacaoFatura(tipoConta),
      permite_parcelamento: permiteParcelamento,
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
    tipo_titular: resolveContaInternaTipoTitular(tipoConta, {
      tipo_conta:
        tipoConta === "ALUNO" &&
        alunoPessoaId &&
        conta.pessoa_titular_id !== alunoPessoaId
          ? "RESPONSAVEL_FINANCEIRO"
          : tipoConta,
    }),
    conta_id: conta.id,
    titular_pessoa_id: conta.pessoa_titular_id,
    responsavel_financeiro_pessoa_id:
      tipoConta === "ALUNO" && alunoPessoaId && conta.pessoa_titular_id !== alunoPessoaId
        ? conta.pessoa_titular_id
        : null,
    dia_vencimento: conta.dia_vencimento,
    tipo_fatura: "MENSAL",
    tipo_liquidacao: conta.tipo_liquidacao,
    destino_liquidacao_fatura: resolveDestinoLiquidacaoFatura(tipoConta),
    permite_parcelamento: permiteParcelamento,
    motivo: null,
    descricao: conta.descricao_exibicao,
  };
}

async function listarContasInternasAtivasPorTitulares(params: {
  supabase: SupabaseLike;
  pessoaTitularIds: number[];
  tipoConta: ContaInternaTipo;
}): Promise<ContaInternaOpcaoElegivel[]> {
  const { supabase, pessoaTitularIds, tipoConta } = params;
  if (pessoaTitularIds.length === 0) {
    return [];
  }

  const permiteParcelamento = await verificarPermiteParcelamento(supabase, tipoConta);
  const { data, error } = await supabase
    .from("credito_conexao_contas")
    .select(
      "id,pessoa_titular_id,responsavel_financeiro_pessoa_id,tipo_conta,dia_vencimento,descricao_exibicao,ativo",
    )
    .in("pessoa_titular_id", pessoaTitularIds)
    .eq("ativo", true);

  if (error) {
    console.error("[CONTA_INTERNA][LISTAR][ERRO]", { tipoConta, pessoaTitularIds, error });
    throw error;
  }

  return ((data ?? []) as Array<Record<string, unknown>>)
    .filter((item) => contaInternaCompativelComTipo(tipoConta, item))
    .map((item) => {
      const contaId = asInt(item.id);
      const titularPessoaId = asInt(item.pessoa_titular_id);

      if (!contaId || !titularPessoaId) return null;

      return {
        conta_id: contaId,
        tipo: tipoConta,
        tipo_titular: resolveContaInternaTipoTitular(tipoConta, item),
        titular_pessoa_id: titularPessoaId,
        responsavel_financeiro_pessoa_id: asInt(item.responsavel_financeiro_pessoa_id),
        dia_vencimento: asInt(item.dia_vencimento),
        tipo_fatura: "MENSAL" as const,
        tipo_liquidacao: "FATURA_MENSAL" as const,
        destino_liquidacao_fatura: resolveDestinoLiquidacaoFatura(tipoConta),
        permite_parcelamento: permiteParcelamento,
        descricao: asString(item.descricao_exibicao),
        prioridade: tipoConta === "COLABORADOR" ? 3 : 99,
      } satisfies ContaInternaOpcaoElegivel;
    })
    .filter((item): item is ContaInternaOpcaoElegivel => item !== null);
}

function dedupeAndSortContaInternaOpcoes(
  opcoes: ContaInternaOpcaoElegivel[],
): ContaInternaOpcaoElegivel[] {
  const map = new Map<number, ContaInternaOpcaoElegivel>();

  for (const opcao of opcoes) {
    const atual = map.get(opcao.conta_id);
    if (!atual || opcao.prioridade < atual.prioridade) {
      map.set(opcao.conta_id, opcao);
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.prioridade !== b.prioridade) return a.prioridade - b.prioridade;
    return a.conta_id - b.conta_id;
  });
}

async function getDiaVencimentoPadraoContaAluno(
  supabase: SupabaseLike,
): Promise<number> {
  const { data, error } = await supabase
    .from("matricula_configuracoes")
    .select("vencimento_dia_padrao")
    .eq("ativo", true)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[CONTA_INTERNA][CONFIG_MATRICULA][ERRO]", error);
    throw error;
  }

  const dia = asInt((data as Record<string, unknown> | null)?.vencimento_dia_padrao);
  if (!dia) return 12;
  return Math.max(1, Math.min(31, dia));
}

async function getCentroCustoPrincipalContaAluno(
  supabase: SupabaseLike,
): Promise<number | null> {
  const { data: config, error: configError } = await supabase
    .from("escola_config_financeira")
    .select("centro_custo_padrao_escola_id")
    .eq("id", 1)
    .maybeSingle();

  if (configError) {
    console.error("[CONTA_INTERNA][CENTRO_CUSTO_ESCOLA][ERRO]", configError);
    throw configError;
  }

  const centroCustoId = asInt(
    (config as Record<string, unknown> | null)?.centro_custo_padrao_escola_id,
  );

  if (centroCustoId) return centroCustoId;

  const { data: centros, error: centrosError } = await supabase
    .from("centros_custo")
    .select("id,codigo,ativo")
    .eq("ativo", true)
    .order("id", { ascending: true });

  if (centrosError) {
    console.error("[CONTA_INTERNA][CENTROS_CUSTO][ERRO]", centrosError);
    throw centrosError;
  }

  const centroPadrao =
    ((centros ?? []) as Array<Record<string, unknown>>).find(
      (item) => asString(item.codigo) === "ESCOLA",
    ) ?? ((centros ?? [])[0] as Record<string, unknown> | undefined);

  return centroPadrao ? asInt(centroPadrao.id) : null;
}

async function criarOuAtivarContaInternaAluno(params: {
  supabase: SupabaseLike;
  alunoPessoaId: number;
  responsavelFinanceiroPessoaId?: number | null;
}): Promise<ContaInternaOpcaoElegivel | null> {
  const {
    supabase,
    alunoPessoaId,
    responsavelFinanceiroPessoaId = null,
  } = params;

  const responsaveisSet = new Set<number>(
    await listarResponsaveisFinanceirosAtivos(supabase, alunoPessoaId),
  );

  if (responsavelFinanceiroPessoaId) {
    responsaveisSet.add(responsavelFinanceiroPessoaId);
  }

  const responsaveis = Array.from(responsaveisSet).filter(
    (item) => item !== alunoPessoaId,
  );
  const candidatoTitularId = responsaveis[0] ?? alunoPessoaId;

  const { data: existentes, error: existentesError } = await supabase
    .from("credito_conexao_contas")
    .select(
      "id,pessoa_titular_id,responsavel_financeiro_pessoa_id,tipo_conta,dia_vencimento,descricao_exibicao,ativo",
    )
    .eq("tipo_conta", "ALUNO")
    .or(
      `pessoa_titular_id.eq.${candidatoTitularId},responsavel_financeiro_pessoa_id.eq.${candidatoTitularId}`,
    )
    .order("ativo", { ascending: false })
    .order("id", { ascending: false });

  if (existentesError) {
    console.error("[CONTA_INTERNA][CRIAR_OU_ATIVAR][BUSCA][ERRO]", existentesError);
    throw existentesError;
  }

  const contaExistente = ((existentes ?? []) as Array<Record<string, unknown>>).find((item) =>
    contaInternaCompativelComTipo("ALUNO", item),
  );

  const diaVencimento = await getDiaVencimentoPadraoContaAluno(supabase);
  const centroCustoPrincipalId = await getCentroCustoPrincipalContaAluno(supabase);

  if (contaExistente) {
    const contaId = asInt(contaExistente.id);
    if (!contaId) return null;

    const updatePayload = {
      pessoa_titular_id: candidatoTitularId,
      responsavel_financeiro_pessoa_id:
        candidatoTitularId !== alunoPessoaId ? candidatoTitularId : null,
      dia_vencimento: asInt(contaExistente.dia_vencimento) ?? diaVencimento,
      centro_custo_principal_id: centroCustoPrincipalId,
      ativo: true,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from("credito_conexao_contas")
      .update(updatePayload)
      .eq("id", contaId);

    if (updateError) {
      console.error("[CONTA_INTERNA][CRIAR_OU_ATIVAR][UPDATE][ERRO]", updateError);
      throw updateError;
    }
  } else {
    const descricaoExibicao =
      candidatoTitularId === alunoPessoaId
        ? "Conta interna do aluno"
        : "Conta interna do responsavel financeiro";

    const { error: insertError } = await supabase
      .from("credito_conexao_contas")
      .insert({
        pessoa_titular_id: candidatoTitularId,
        responsavel_financeiro_pessoa_id:
          candidatoTitularId !== alunoPessoaId ? candidatoTitularId : null,
        tipo_conta: "ALUNO",
        descricao_exibicao: descricaoExibicao,
        dia_fechamento: 10,
        dia_vencimento: diaVencimento,
        centro_custo_principal_id: centroCustoPrincipalId,
        ativo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("[CONTA_INTERNA][CRIAR_OU_ATIVAR][INSERT][ERRO]", insertError);
      throw insertError;
    }
  }

  const opcoes = await listarContasInternasElegiveisParaInscricaoInterna({
    supabase,
    alunoPessoaId,
    responsavelFinanceiroPessoaId,
    incluirContaColaborador: true,
  });

  return opcoes[0] ?? null;
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
      tipo_titular: "ALUNO",
      conta_id: null,
      titular_pessoa_id: null,
      responsavel_financeiro_pessoa_id: null,
      dia_vencimento: null,
      tipo_fatura: "MENSAL",
      tipo_liquidacao: "FATURA_MENSAL",
      destino_liquidacao_fatura: "NEOFIN",
      permite_parcelamento: false,
      motivo: "Aluno nao informado.",
      descricao: null,
    };
  }

  const responsaveis = await listarResponsaveisFinanceirosAtivos(supabase, alunoPessoaId);
  const candidatos = permitirContaDoAluno ? [...responsaveis, alunoPessoaId] : responsaveis;
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
      tipo_titular: "COLABORADOR",
      conta_id: null,
      titular_pessoa_id: null,
      responsavel_financeiro_pessoa_id: null,
      dia_vencimento: null,
      tipo_fatura: "MENSAL",
      tipo_liquidacao: "FATURA_MENSAL",
      destino_liquidacao_fatura: "INTEGRACAO_FOLHA_MES_SEGUINTE",
      permite_parcelamento: false,
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
  if (!colaboradorEncontrado) {
    return {
      elegivel: false,
      tipo: "COLABORADOR",
      tipo_titular: "COLABORADOR",
      conta_id: null,
      titular_pessoa_id: null,
      responsavel_financeiro_pessoa_id: null,
      dia_vencimento: null,
      tipo_fatura: "MENSAL",
      tipo_liquidacao: "FATURA_MENSAL",
      destino_liquidacao_fatura: "INTEGRACAO_FOLHA_MES_SEGUINTE",
      permite_parcelamento: false,
      motivo: "Pessoa selecionada nao possui vinculo ativo de colaborador.",
      descricao: null,
    };
  }

  const conta = await carregarContaInternaPorTitulares({
    supabase,
    pessoaTitularIds: [colaboradorPessoaId],
    tipoConta: "COLABORADOR",
  });

  return conta;
}

export async function listarContasInternasElegiveisParaInscricaoInterna(params: {
  supabase: SupabaseLike;
  alunoPessoaId: number | null;
  responsavelFinanceiroPessoaId?: number | null;
  incluirContaColaborador?: boolean;
}): Promise<ContaInternaOpcaoElegivel[]> {
  const {
    supabase,
    alunoPessoaId,
    responsavelFinanceiroPessoaId = null,
    incluirContaColaborador = true,
  } = params;

  if (!alunoPessoaId) {
    return [];
  }

  const responsaveisSet = new Set<number>(
    await listarResponsaveisFinanceirosAtivos(supabase, alunoPessoaId),
  );

  if (responsavelFinanceiroPessoaId) {
    responsaveisSet.add(responsavelFinanceiroPessoaId);
  }

  responsaveisSet.delete(alunoPessoaId);
  const responsaveis = Array.from(responsaveisSet);

  const [contasAlunoOuResponsavel, contasColaborador] = await Promise.all([
    listarContasInternasAtivasPorTitulares({
      supabase,
      pessoaTitularIds: [alunoPessoaId, ...responsaveis],
      tipoConta: "ALUNO",
    }),
    incluirContaColaborador
      ? listarContasInternasAtivasPorTitulares({
          supabase,
          pessoaTitularIds: [alunoPessoaId],
          tipoConta: "COLABORADOR",
        })
      : Promise.resolve([]),
  ]);

  const opcoesAlunoOuResponsavel = contasAlunoOuResponsavel.map((opcao) => {
    if (opcao.titular_pessoa_id === alunoPessoaId) {
      return {
        ...opcao,
        tipo_titular: "ALUNO" as const,
        responsavel_financeiro_pessoa_id: null,
        prioridade: 1,
      };
    }

    return {
      ...opcao,
      tipo_titular: "RESPONSAVEL_FINANCEIRO" as const,
      responsavel_financeiro_pessoa_id: opcao.titular_pessoa_id,
      prioridade: 2,
    };
  });

  const opcoesColaborador = contasColaborador.map((opcao) => ({
    ...opcao,
    tipo_titular: "COLABORADOR" as const,
    responsavel_financeiro_pessoa_id: null,
    prioridade: 3,
  }));

  const opcoes = dedupeAndSortContaInternaOpcoes([
    ...opcoesAlunoOuResponsavel,
    ...opcoesColaborador,
  ]);

  return opcoes;
}

export async function garantirContaInternaElegivelParaInscricaoInterna(params: {
  supabase: SupabaseLike;
  alunoPessoaId: number | null;
  responsavelFinanceiroPessoaId?: number | null;
}): Promise<ContaInternaOpcaoElegivel[]> {
  const {
    supabase,
    alunoPessoaId,
    responsavelFinanceiroPessoaId = null,
  } = params;

  if (!alunoPessoaId) {
    return [];
  }

  const existentes = await listarContasInternasElegiveisParaInscricaoInterna({
    supabase,
    alunoPessoaId,
    responsavelFinanceiroPessoaId,
    incluirContaColaborador: true,
  });

  if (existentes.length > 0) {
    return existentes;
  }

  await criarOuAtivarContaInternaAluno({
    supabase,
    alunoPessoaId,
    responsavelFinanceiroPessoaId,
  });

  return listarContasInternasElegiveisParaInscricaoInterna({
    supabase,
    alunoPessoaId,
    responsavelFinanceiroPessoaId,
    incluirContaColaborador: true,
  });
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
    referenciaItem: params.referenciaItem ?? null,
    supabase: params.supabase,
  });
}

async function ensureFaturaAbertaCompetencia({
  supabase,
  contaInternaId,
  competencia,
  diaVencimento,
}: FaturaAbertaParams): Promise<FaturaAbertaResult> {
  const { data: existente, error: findError } = await supabase
    .from("credito_conexao_faturas")
    .select("id,status,data_vencimento")
    .eq("conta_conexao_id", contaInternaId)
    .eq("periodo_referencia", competencia)
    .maybeSingle();

  if (findError) throw findError;

  if (existente?.id) {
    const status = upper(existente.status);
    if (status === "FECHADA" || status === "PAGA") {
      throw new Error("competencia_fechada_para_conta_interna");
    }
    return {
      faturaId: Number(existente.id),
      dataVencimento: asString(existente.data_vencimento),
    };
  }

  const dataVencimento = buildVencimentoFromCompetencia(competencia, diaVencimento);
  const { data: created, error: createError } = await supabase
    .from("credito_conexao_faturas")
    .insert({
      conta_conexao_id: contaInternaId,
      periodo_referencia: competencia,
      data_fechamento: todayIso(),
      data_vencimento: dataVencimento,
      valor_total_centavos: 0,
      valor_taxas_centavos: 0,
      status: "ABERTA",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id,data_vencimento")
    .single();

  if (createError || !created?.id) {
    throw createError ?? new Error("falha_criar_fatura_conta_interna");
  }

  return {
    faturaId: Number(created.id),
    dataVencimento: asString(created.data_vencimento) ?? dataVencimento,
  };
}

export async function agendarFaturamentoMensalAluno(params: {
  supabase: SupabaseLike;
  contaInternaId: number;
  competencia: string;
  diaVencimento: number | null;
  lancamentoId: number;
}) {
  const fatura = await ensureFaturaAbertaCompetencia({
    supabase: params.supabase,
    contaInternaId: params.contaInternaId,
    competencia: params.competencia,
    diaVencimento: params.diaVencimento,
  });

  const vinculo = await vincularLancamentoNaFatura(
    params.supabase as Parameters<typeof vincularLancamentoNaFatura>[0],
    fatura.faturaId,
    params.lancamentoId,
  );
  if (!vinculo.ok) {
    throw vinculo.error ?? new Error("falha_vincular_lancamento_fatura");
  }

  await recalcularComprasFatura(
    params.supabase as Parameters<typeof recalcularComprasFatura>[0],
    fatura.faturaId,
  );

  return {
    fatura_id: fatura.faturaId,
    data_vencimento: fatura.dataVencimento,
    tipo_liquidacao: "FATURA_MENSAL" as const,
    tipo_fatura: "MENSAL" as const,
    destino_liquidacao_fatura: "NEOFIN" as const,
  };
}

export async function agendarFaturamentoMensalColaborador(params: {
  supabase: SupabaseLike;
  contaInternaId: number;
  competencia: string;
  diaVencimento: number | null;
  lancamentoId: number;
}) {
  const fatura = await ensureFaturaAbertaCompetencia({
    supabase: params.supabase,
    contaInternaId: params.contaInternaId,
    competencia: params.competencia,
    diaVencimento: params.diaVencimento,
  });

  const vinculo = await vincularLancamentoNaFatura(
    params.supabase as Parameters<typeof vincularLancamentoNaFatura>[0],
    fatura.faturaId,
    params.lancamentoId,
  );
  if (!vinculo.ok) {
    throw vinculo.error ?? new Error("falha_vincular_lancamento_fatura");
  }

  await recalcularComprasFatura(
    params.supabase as Parameters<typeof recalcularComprasFatura>[0],
    fatura.faturaId,
  );

  return {
    fatura_id: fatura.faturaId,
    data_vencimento: fatura.dataVencimento,
    tipo_liquidacao: "FATURA_MENSAL" as const,
    tipo_fatura: "MENSAL" as const,
    destino_liquidacao_fatura: "INTEGRACAO_FOLHA_MES_SEGUINTE" as const,
  };
}

export const vincularLiquidacaoFolhaColaborador = agendarFaturamentoMensalColaborador;
