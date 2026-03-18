import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/supabase.generated";

export type ContextoPrincipal = "ESCOLA" | "CAFE" | "LOJA" | "OUTRO";

export type OrigemDetalhada =
  | "MATRICULA"
  | "CURSO_LIVRE"
  | "INSCRICAO_ESPETACULO"
  | "SERVICO_ESCOLA"
  | "CONSUMO_CAFE"
  | "CONTA_INTERNA_ALUNO"
  | "CONTA_INTERNA_COLABORADOR"
  | "VENDA_LOJA"
  | "CREDITO_INTERNO_LOJA"
  | "COMPLEMENTO_LOJA"
  | "ORIGEM_NAO_RESOLVIDA";

export interface ClassificacaoCobranca {
  contextoPrincipal: ContextoPrincipal;
  origemDetalhada: OrigemDetalhada;
  origemLabel: string;
}

export interface ContasReceberAuditoriaInput {
  visao?: string;
  situacao?: string;
  status?: string;
  bucket?: string;
  competencia?: string;
  vencimentoInicio?: string;
  vencimentoFim?: string;
  somenteAbertas?: boolean;
  q?: string;
  page?: number;
  pageSize?: number;
  detalheCobrancaId?: number | null;
}

export interface TotalPorContexto {
  escola: number;
  cafe: number;
  loja: number;
  outro: number;
}

export interface ContasReceberResumo {
  total_aberto_centavos: number;
  total_vencido_centavos: number;
  total_a_vencer_centavos: number;
  total_por_contexto: TotalPorContexto;
}

export interface DevedorAuditoriaItem {
  pessoa_id: number;
  pessoa_nome: string;
  total_vencido_centavos: number;
  titulos_vencidos: number;
  maior_atraso_dias: number;
  vencimento_mais_antigo: string | null;
}

export interface FaturaConexaoItem {
  lancamento_id: number;
  descricao: string;
  valor_centavos: number;
  origem_sistema: string | null;
  origem_id: number | null;
  cobranca_id_relacionada: number | null;
  referencia_item: string | null;
  composicao_json: Json | null;
}

export interface ComposicaoFaturaConexao {
  fatura_id: number;
  conta_conexao_id: number | null;
  periodo_referencia: string | null;
  data_vencimento: string | null;
  valor_total_centavos: number;
  itens: FaturaConexaoItem[];
}

export interface CobrancaListaItem {
  cobranca_id: number;
  pessoa_id: number | null;
  pessoa_nome: string;
  contexto_principal: ContextoPrincipal;
  origem_detalhada: OrigemDetalhada;
  origem_label: string;
  vencimento: string | null;
  competencia_ano_mes: string | null;
  bucket: string | null;
  valor_centavos: number;
  valor_aberto_centavos: number;
  valor_recebido_centavos: number;
  status_cobranca: string | null;
  status_interno: string | null;
  centro_custo_id: number | null;
  centro_custo_nome: string | null;
  atraso_dias: number;
  origem_tipo: string | null;
  origem_subtipo: string | null;
  origem_id: number | null;
}

export interface DetalheDocumentoVinculado {
  tipo: string;
  id: number | null;
  label: string;
}

export interface TrilhaAuditavelItem {
  titulo: string;
  valor: string;
}

export interface DetalheCobrancaAuditoria {
  pessoa: {
    id: number | null;
    nome: string;
  };
  cobranca: {
    id: number;
    descricao: string | null;
    valor_centavos: number;
    valor_aberto_centavos: number;
    valor_recebido_centavos: number;
    vencimento: string | null;
    competencia_ano_mes: string | null;
    status_cobranca: string | null;
    status_interno: string | null;
    origem_tipo: string | null;
    origem_subtipo: string | null;
    origem_id: number | null;
    created_at: string | null;
    updated_at: string | null;
  };
  contexto_principal: ContextoPrincipal;
  origem_detalhada: OrigemDetalhada;
  origem_label: string;
  centro_custo: {
    id: number | null;
    codigo: string | null;
    nome: string | null;
  };
  documento_vinculado: DetalheDocumentoVinculado | null;
  trilha_auditavel: TrilhaAuditavelItem[];
  composicao_fatura_conexao: ComposicaoFaturaConexao | null;
}

export interface PerdaCancelamentoItem {
  periodo: string;
  quantidade_matriculas_canceladas: number;
  valor_aberto_centavos: number;
  valor_potencial_perdido_centavos: number;
  diagnostico_em_validacao: boolean;
}

export interface ContasReceberAuditoriaPayload {
  resumo: ContasReceberResumo;
  top_devedores: DevedorAuditoriaItem[];
  devedores_lista: DevedorAuditoriaItem[];
  cobrancas_lista: CobrancaListaItem[];
  detalhe_cobranca: DetalheCobrancaAuditoria | null;
  composicao_fatura_conexao: ComposicaoFaturaConexao | null;
  perdas_cancelamento: PerdaCancelamentoItem[];
  paginacao: {
    page: number;
    page_size: number;
    total: number;
    total_paginas: number;
  };
  filtros_aplicados: {
    visao: string;
    q: string;
    situacao: string | null;
    status: string | null;
    bucket: string | null;
    competencia: string | null;
    vencimento_inicio: string | null;
    vencimento_fim: string | null;
  };
}

type FlatRow = {
  cobranca_id: number;
  pessoa_id: number | null;
  vencimento: string | null;
  status_cobranca: string | null;
  origem_tipo: string | null;
  origem_id: number | null;
  valor_centavos: number;
  valor_recebido_centavos: number;
  saldo_aberto_centavos: number;
  competencia_ano_mes: string | null;
  dias_atraso: number;
  situacao_saas: string | null;
  bucket_vencimento: string | null;
};

type CobrancaRow = Database["public"]["Tables"]["cobrancas"]["Row"];
type PessoaRow = Database["public"]["Tables"]["pessoas"]["Row"];
type CentroCustoRow = Database["public"]["Tables"]["centros_custo"]["Row"];
type FaturaRow = Database["public"]["Tables"]["credito_conexao_faturas"]["Row"];
type LancamentoRow = Database["public"]["Tables"]["credito_conexao_lancamentos"]["Row"];
type ContaConexaoRow = Database["public"]["Tables"]["credito_conexao_contas"]["Row"];
type CafeVendaRow = Database["public"]["Tables"]["cafe_vendas"]["Row"];
type LojaVendaRow = Database["public"]["Tables"]["loja_vendas"]["Row"];
type MatriculaRow = Database["public"]["Tables"]["matriculas"]["Row"];
type MatriculaEncerramentoRow = Database["public"]["Tables"]["matriculas_encerramentos"]["Row"];
type TurmaAlunoRow = Database["public"]["Tables"]["turma_aluno"]["Row"];
type TurmaRow = Database["public"]["Tables"]["turmas"]["Row"];
type VinculoRow = Database["public"]["Tables"]["vinculos"]["Row"];

type FaturaLancamentoLinkRow = {
  fatura_id: number | null;
  lancamento_id: number | null;
};

type DataMaps = {
  cobrancas: Map<number, CobrancaRow>;
  pessoas: Map<number, PessoaRow>;
  centrosCusto: Map<number, CentroCustoRow>;
  faturasPorId: Map<number, FaturaRow>;
  faturasPorCobranca: Map<number, FaturaRow>;
  lancamentosPorId: Map<number, LancamentoRow>;
  lancamentosDiretosPorCobranca: Map<number, LancamentoRow[]>;
  composicaoPorFatura: Map<number, ComposicaoFaturaConexao>;
  contasConexao: Map<number, ContaConexaoRow>;
  cafeVendasPorCobranca: Map<number, CafeVendaRow[]>;
  cafeVendasPorId: Map<number, CafeVendaRow>;
  lojaVendasPorCobranca: Map<number, LojaVendaRow[]>;
  lojaVendasPorId: Map<number, LojaVendaRow>;
  matriculas: Map<number, MatriculaRow>;
  turmaAlunoPorMatricula: Map<number, TurmaAlunoRow>;
  turmas: Map<number, TurmaRow>;
  vinculos: Map<number, VinculoRow>;
};

const ORIGEM_LABELS: Record<OrigemDetalhada, string> = {
  MATRICULA: "Matrícula",
  CURSO_LIVRE: "Curso livre",
  INSCRICAO_ESPETACULO: "Inscrição em espetáculo",
  SERVICO_ESCOLA: "Serviço da escola",
  CONSUMO_CAFE: "Consumo no café",
  CONTA_INTERNA_ALUNO: "Conta interna do aluno",
  CONTA_INTERNA_COLABORADOR: "Conta interna do colaborador",
  VENDA_LOJA: "Venda da loja",
  CREDITO_INTERNO_LOJA: "Crédito interno da loja",
  COMPLEMENTO_LOJA: "Complemento da loja",
  ORIGEM_NAO_RESOLVIDA: "Origem não resolvida",
};

function textOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function upper(value: unknown): string {
  return textOrNull(value)?.toUpperCase() ?? "";
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function numberOrZero(value: unknown): number {
  return numberOrNull(value) ?? 0;
}

function normalizeDate(value: unknown): string | null {
  const date = textOrNull(value);
  if (!date) return null;
  return date.length >= 10 ? date.slice(0, 10) : date;
}

function pessoaNome(pessoaId: number | null, pessoa: PessoaRow | undefined): string {
  const nome = textOrNull(pessoa?.nome);
  if (nome) return nome;
  if (typeof pessoaId === "number" && pessoaId > 0) return `Pessoa #${pessoaId}`;
  return "Pessoa não identificada";
}

function chunkNumbers(values: number[], chunkSize = 200): number[][] {
  if (values.length === 0) return [];
  const chunks: number[][] = [];
  for (let index = 0; index < values.length; index += chunkSize) {
    chunks.push(values.slice(index, index + chunkSize));
  }
  return chunks;
}

async function selectMany<T>(
  fetcher: (chunk: number[]) => Promise<T[]>,
  ids: number[],
  chunkSize = 200,
): Promise<T[]> {
  const uniqueIds = Array.from(new Set(ids.filter((id) => Number.isFinite(id) && id > 0)));
  if (uniqueIds.length === 0) return [];
  const chunks = chunkNumbers(uniqueIds, chunkSize);
  const settled = await Promise.all(chunks.map((chunk) => fetcher(chunk)));
  return settled.flat();
}

function isDateLike(value?: string | null): boolean {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isAnoMes(value?: string | null): boolean {
  return typeof value === "string" && /^\d{4}-\d{2}$/.test(value);
}

function contextoDoCentroCusto(centroCusto: CentroCustoRow | undefined): ContextoPrincipal | null {
  const codigo = upper(centroCusto?.codigo);
  const nome = upper(centroCusto?.nome);
  const contextoAplicavel = Array.isArray(centroCusto?.contextos_aplicaveis)
    ? centroCusto.contextos_aplicaveis.map((item) => upper(item))
    : [];

  if (codigo === "ESCOLA" || nome.includes("ESCOLA") || contextoAplicavel.includes("ESCOLA")) return "ESCOLA";
  if (codigo === "CAFE" || nome.includes("CAFE") || contextoAplicavel.includes("CAFE")) return "CAFE";
  if (codigo === "LOJA" || nome.includes("LOJA") || contextoAplicavel.includes("LOJA")) return "LOJA";

  return null;
}

function origemDetalhadaDoLancamento(
  lancamento: LancamentoRow,
  conta: ContaConexaoRow | undefined,
): OrigemDetalhada {
  const origemSistema = upper(lancamento.origem_sistema);
  const descricao = upper(lancamento.descricao);

  if (origemSistema === "CAFE") {
    if (upper(conta?.tipo_conta) === "COLABORADOR") return "CONTA_INTERNA_COLABORADOR";
    if (upper(conta?.tipo_conta) === "ALUNO") return "CONTA_INTERNA_ALUNO";
    return "CONSUMO_CAFE";
  }

  if (origemSistema === "LOJA") return "VENDA_LOJA";

  if (origemSistema === "MATRICULA" || origemSistema === "MATRICULA_REPROCESSAR") {
    if (descricao.includes("CURSO LIVRE")) return "CURSO_LIVRE";
    if (descricao.includes("ESPETAC")) return "INSCRICAO_ESPETACULO";
    return "MATRICULA";
  }

  return "ORIGEM_NAO_RESOLVIDA";
}

function contextoDoLancamento(
  lancamento: LancamentoRow,
  origemDetalhada: OrigemDetalhada,
): ContextoPrincipal {
  const origemSistema = upper(lancamento.origem_sistema);
  if (origemSistema === "CAFE") return "CAFE";
  if (origemSistema === "LOJA") return "LOJA";
  if (origemSistema === "MATRICULA" || origemSistema === "MATRICULA_REPROCESSAR") return "ESCOLA";

  if (
    origemDetalhada === "CONSUMO_CAFE" ||
    origemDetalhada === "CONTA_INTERNA_ALUNO" ||
    origemDetalhada === "CONTA_INTERNA_COLABORADOR"
  ) {
    return "CAFE";
  }

  if (
    origemDetalhada === "MATRICULA" ||
    origemDetalhada === "CURSO_LIVRE" ||
    origemDetalhada === "INSCRICAO_ESPETACULO" ||
    origemDetalhada === "SERVICO_ESCOLA"
  ) {
    return "ESCOLA";
  }

  if (
    origemDetalhada === "VENDA_LOJA" ||
    origemDetalhada === "CREDITO_INTERNO_LOJA" ||
    origemDetalhada === "COMPLEMENTO_LOJA"
  ) {
    return "LOJA";
  }

  return "OUTRO";
}

function classificarPelaComposicao(
  composicao: ComposicaoFaturaConexao | null,
  conta: ContaConexaoRow | undefined,
): { contextoPrincipal: ContextoPrincipal; origemDetalhada: OrigemDetalhada } | null {
  if (!composicao || composicao.itens.length === 0) return null;

  const origens = composicao.itens.map((item) =>
    origemDetalhadaDoLancamento(
      {
        id: item.lancamento_id,
        conta_conexao_id: conta?.id ?? null,
        origem_sistema: item.origem_sistema,
        origem_id: item.origem_id,
        descricao: item.descricao,
        valor_centavos: item.valor_centavos,
        data_lancamento: null,
        status: null,
        created_at: null,
        updated_at: null,
        numero_parcelas: null,
        competencia: null,
        referencia_item: item.referencia_item,
        composicao_json: item.composicao_json,
        cobranca_id: item.cobranca_id_relacionada,
      },
      conta,
    ),
  );
  const contextos = composicao.itens.map((item, index) =>
    contextoDoLancamento(
      {
        id: item.lancamento_id,
        conta_conexao_id: conta?.id ?? null,
        origem_sistema: item.origem_sistema,
        origem_id: item.origem_id,
        descricao: item.descricao,
        valor_centavos: item.valor_centavos,
        data_lancamento: null,
        status: null,
        created_at: null,
        updated_at: null,
        numero_parcelas: null,
        competencia: null,
        referencia_item: item.referencia_item,
        composicao_json: item.composicao_json,
        cobranca_id: item.cobranca_id_relacionada,
      },
      origens[index] ?? "ORIGEM_NAO_RESOLVIDA",
    ),
  );

  const origensUnicas = Array.from(new Set(origens));
  const contextosUnicos = Array.from(new Set(contextos));

  return {
    contextoPrincipal: contextosUnicos.length === 1 ? contextosUnicos[0] : "OUTRO",
    origemDetalhada: origensUnicas.length === 1 ? origensUnicas[0] : "ORIGEM_NAO_RESOLVIDA",
  };
}

type ClassificacaoContexto = {
  cobranca: CobrancaRow | undefined;
  centroCusto: CentroCustoRow | undefined;
  fatura: FaturaRow | undefined;
  conta: ContaConexaoRow | undefined;
  composicao: ComposicaoFaturaConexao | null;
  cafeVenda: CafeVendaRow | undefined;
  lojaVenda: LojaVendaRow | undefined;
  matricula: MatriculaRow | undefined;
  turma: TurmaRow | undefined;
};

function classificarCobranca(context: ClassificacaoContexto): ClassificacaoCobranca {
  const origemTipo = upper(context.cobranca?.origem_tipo);
  const origemSubtipo = upper(context.cobranca?.origem_subtipo);
  const centroCustoContexto = contextoDoCentroCusto(context.centroCusto);
  const classificacaoComposicao = classificarPelaComposicao(context.composicao, context.conta);

  if (origemTipo === "CAFE") {
    let origemDetalhada: OrigemDetalhada = "CONSUMO_CAFE";

    if (origemSubtipo === "CONTA_INTERNA_COLABORADOR") {
      origemDetalhada = "CONTA_INTERNA_COLABORADOR";
    } else if (
      origemSubtipo === "CARTAO_CONEXAO" ||
      upper(context.cafeVenda?.tipo_quitacao).includes("CONTA_INTERNA")
    ) {
      origemDetalhada =
        upper(context.cafeVenda?.tipo_quitacao).includes("COLABORADOR") ||
        upper(context.conta?.tipo_conta) === "COLABORADOR"
          ? "CONTA_INTERNA_COLABORADOR"
          : "CONTA_INTERNA_ALUNO";
    }

    return {
      contextoPrincipal: centroCustoContexto ?? "CAFE",
      origemDetalhada,
      origemLabel: ORIGEM_LABELS[origemDetalhada],
    };
  }

  if (origemTipo === "LOJA") {
    let origemDetalhada: OrigemDetalhada = "VENDA_LOJA";
    if (origemSubtipo.includes("CREDITO")) origemDetalhada = "CREDITO_INTERNO_LOJA";
    if (origemSubtipo.includes("COMPLEMENTO")) origemDetalhada = "COMPLEMENTO_LOJA";

    return {
      contextoPrincipal: centroCustoContexto ?? "LOJA",
      origemDetalhada,
      origemLabel: ORIGEM_LABELS[origemDetalhada],
    };
  }

  if (origemTipo === "MATRICULA") {
    let origemDetalhada: OrigemDetalhada = "MATRICULA";
    const descricao = upper(context.cobranca?.descricao);

    if (context.turma?.curso_livre_id) {
      origemDetalhada = "CURSO_LIVRE";
    } else if (descricao.includes("CURSO LIVRE")) {
      origemDetalhada = "CURSO_LIVRE";
    } else if (descricao.includes("ESPETAC")) {
      origemDetalhada = "INSCRICAO_ESPETACULO";
    } else if (origemSubtipo.includes("SERVICO")) {
      origemDetalhada = "SERVICO_ESCOLA";
    }

    return {
      contextoPrincipal: centroCustoContexto ?? "ESCOLA",
      origemDetalhada,
      origemLabel: ORIGEM_LABELS[origemDetalhada],
    };
  }

  if (origemTipo === "FATURA_CREDITO_CONEXAO" || origemTipo === "CREDITO_CONEXAO_FATURA") {
    if (classificacaoComposicao) {
      return {
        contextoPrincipal: classificacaoComposicao.contextoPrincipal,
        origemDetalhada: classificacaoComposicao.origemDetalhada,
        origemLabel:
          classificacaoComposicao.origemDetalhada === "ORIGEM_NAO_RESOLVIDA"
            ? "Fatura do Cartão Conexão com composição mista"
            : `Fatura do Cartão Conexão - ${ORIGEM_LABELS[classificacaoComposicao.origemDetalhada]}`,
      };
    }

    return {
      contextoPrincipal: centroCustoContexto ?? "OUTRO",
      origemDetalhada: "ORIGEM_NAO_RESOLVIDA",
      origemLabel: "Fatura do Cartão Conexão sem composição resolvida",
    };
  }

  if (classificacaoComposicao) {
    return {
      contextoPrincipal: classificacaoComposicao.contextoPrincipal,
      origemDetalhada: classificacaoComposicao.origemDetalhada,
      origemLabel: ORIGEM_LABELS[classificacaoComposicao.origemDetalhada],
    };
  }

  return {
    contextoPrincipal: centroCustoContexto ?? "OUTRO",
    origemDetalhada: "ORIGEM_NAO_RESOLVIDA",
    origemLabel: ORIGEM_LABELS.ORIGEM_NAO_RESOLVIDA,
  };
}

function sortItensFatura(itens: FaturaConexaoItem[]): FaturaConexaoItem[] {
  return [...itens].sort((left, right) => {
    const origemLeft = textOrNull(left.origem_sistema) ?? "";
    const origemRight = textOrNull(right.origem_sistema) ?? "";
    if (origemLeft !== origemRight) return origemLeft.localeCompare(origemRight);
    if (left.lancamento_id !== right.lancamento_id) return left.lancamento_id - right.lancamento_id;
    return (left.referencia_item ?? "").localeCompare(right.referencia_item ?? "");
  });
}

function buildComposicaoPorFatura(
  faturas: FaturaRow[],
  links: FaturaLancamentoLinkRow[],
  lancamentos: Map<number, LancamentoRow>,
): Map<number, ComposicaoFaturaConexao> {
  const lancamentosPorFatura = new Map<number, FaturaConexaoItem[]>();

  for (const link of links) {
    const faturaId = numberOrNull(link.fatura_id);
    const lancamentoId = numberOrNull(link.lancamento_id);
    if (!faturaId || !lancamentoId) continue;
    const lancamento = lancamentos.get(lancamentoId);
    if (!lancamento) continue;

    const atual = lancamentosPorFatura.get(faturaId) ?? [];
    atual.push({
      lancamento_id: lancamento.id,
      descricao: textOrNull(lancamento.descricao) ?? `Lançamento #${lancamento.id}`,
      valor_centavos: numberOrZero(lancamento.valor_centavos),
      origem_sistema: textOrNull(lancamento.origem_sistema),
      origem_id: numberOrNull(lancamento.origem_id),
      cobranca_id_relacionada: numberOrNull(lancamento.cobranca_id),
      referencia_item: textOrNull(lancamento.referencia_item),
      composicao_json: lancamento.composicao_json,
    });
    lancamentosPorFatura.set(faturaId, atual);
  }

  const map = new Map<number, ComposicaoFaturaConexao>();
  for (const fatura of faturas) {
    map.set(fatura.id, {
      fatura_id: fatura.id,
      conta_conexao_id: numberOrNull(fatura.conta_conexao_id),
      periodo_referencia: textOrNull(fatura.periodo_referencia),
      data_vencimento: normalizeDate(fatura.data_vencimento),
      valor_total_centavos: numberOrZero(fatura.valor_total_centavos),
      itens: sortItensFatura(lancamentosPorFatura.get(fatura.id) ?? []),
    });
  }

  return map;
}

function buildDocumentoVinculado(
  item: CobrancaListaItem,
  cobranca: CobrancaRow | undefined,
  cafeVenda: CafeVendaRow | undefined,
  lojaVenda: LojaVendaRow | undefined,
  matricula: MatriculaRow | undefined,
  turma: TurmaRow | undefined,
  fatura: FaturaRow | undefined,
): DetalheDocumentoVinculado | null {
  if (!cobranca) return null;

  const origemTipo = upper(cobranca.origem_tipo);

  if (origemTipo === "MATRICULA" && matricula) {
    const turmaLabel = textOrNull(turma?.nome);
    return {
      tipo: "Matrícula",
      id: matricula.id,
      label: turmaLabel ? `Matrícula #${matricula.id} - ${turmaLabel}` : `Matrícula #${matricula.id}`,
    };
  }

  if (origemTipo === "CAFE") {
    const vendaId = cafeVenda?.id ?? numberOrNull(cobranca.origem_id);
    return {
      tipo: "Venda do Café",
      id: vendaId,
      label: vendaId ? `Venda do Café #${vendaId}` : "Venda do Café",
    };
  }

  if (origemTipo === "LOJA") {
    const vendaId = lojaVenda?.id ?? numberOrNull(cobranca.origem_id);
    return {
      tipo: "Venda da Loja",
      id: vendaId,
      label: vendaId ? `Venda da Loja #${vendaId}` : "Venda da Loja",
    };
  }

  if ((origemTipo === "FATURA_CREDITO_CONEXAO" || origemTipo === "CREDITO_CONEXAO_FATURA") && fatura) {
    return {
      tipo: "Fatura do Cartão Conexão",
      id: fatura.id,
      label: `Fatura #${fatura.id} - ${textOrNull(fatura.periodo_referencia) ?? "sem período"}`,
    };
  }

  return {
    tipo: "Cobrança",
    id: item.origem_id,
    label: item.origem_label,
  };
}

function buildTrilhaAuditavel(
  item: CobrancaListaItem,
  cobranca: CobrancaRow | undefined,
  centroCusto: CentroCustoRow | undefined,
  documento: DetalheDocumentoVinculado | null,
  fatura: FaturaRow | undefined,
  conta: ContaConexaoRow | undefined,
  matricula: MatriculaRow | undefined,
  turma: TurmaRow | undefined,
  vinculo: VinculoRow | undefined,
  lancamentos: LancamentoRow[],
): TrilhaAuditavelItem[] {
  const trilha: TrilhaAuditavelItem[] = [];

  trilha.push({ titulo: "Pessoa devedora", valor: item.pessoa_nome });
  trilha.push({ titulo: "Contexto principal", valor: item.contexto_principal });
  trilha.push({ titulo: "Origem detalhada", valor: item.origem_label });

  if (documento) {
    trilha.push({ titulo: "Documento / entidade vinculada", valor: documento.label });
  }

  trilha.push({
    titulo: "Situação financeira",
    valor: `${textOrNull(item.status_interno) ?? textOrNull(item.status_cobranca) ?? "Sem status"} | aberto ${item.valor_aberto_centavos / 100}`,
  });

  if (centroCusto) {
    trilha.push({
      titulo: "Centro de custo",
      valor: `${textOrNull(centroCusto.codigo) ?? "--"} - ${textOrNull(centroCusto.nome) ?? "Sem nome"}`,
    });
  }

  if (matricula) {
    trilha.push({
      titulo: "Aluno / matrícula",
      valor: `Matrícula #${matricula.id} | responsável financeiro #${matricula.responsavel_financeiro_id ?? "--"}`,
    });
    if (turma) {
      trilha.push({
        titulo: "Turma / vínculo",
        valor: `${textOrNull(turma.nome) ?? `Turma #${turma.turma_id}`} | turno ${textOrNull(turma.turno) ?? "--"}`,
      });
    }
    if (vinculo) {
      trilha.push({
        titulo: "Vínculo acadêmico",
        valor: `Aluno #${vinculo.aluno_id ?? "--"} | responsável #${vinculo.responsavel_id ?? "--"}`,
      });
    }
  }

  if (fatura) {
    trilha.push({
      titulo: "Cartão Conexão / fatura",
      valor: `Fatura #${fatura.id} | período ${textOrNull(fatura.periodo_referencia) ?? "--"} | conta #${fatura.conta_conexao_id ?? "--"}`,
    });
  }

  if (conta) {
    trilha.push({
      titulo: "Conta conexão",
      valor: `${textOrNull(conta.tipo_conta) ?? "SEM_TIPO"} | titular #${conta.pessoa_titular_id ?? "--"}`,
    });
  }

  if (lancamentos.length > 0) {
    trilha.push({
      titulo: "Lançamentos relacionados",
      valor: `${lancamentos.length} item(ns) vinculados à cobrança/fatura`,
    });
  }

  if (cobranca?.descricao) {
    trilha.push({ titulo: "Descrição original", valor: cobranca.descricao });
  }

  return trilha;
}

function buildDetalhe(item: CobrancaListaItem, maps: DataMaps): DetalheCobrancaAuditoria {
  const cobranca = maps.cobrancas.get(item.cobranca_id);
  const centroCusto = item.centro_custo_id ? maps.centrosCusto.get(item.centro_custo_id) : undefined;
  const fatura =
    maps.faturasPorCobranca.get(item.cobranca_id) ??
    (item.origem_tipo && upper(item.origem_tipo).includes("FATURA")
      ? maps.faturasPorId.get(item.origem_id ?? 0)
      : undefined);
  const conta = fatura?.conta_conexao_id ? maps.contasConexao.get(fatura.conta_conexao_id) : undefined;
  const cafeVenda =
    maps.cafeVendasPorCobranca.get(item.cobranca_id)?.[0] ??
    (item.origem_tipo && upper(item.origem_tipo) === "CAFE" ? maps.cafeVendasPorId.get(item.origem_id ?? 0) : undefined);
  const lojaVenda =
    maps.lojaVendasPorCobranca.get(item.cobranca_id)?.[0] ??
    (item.origem_tipo && upper(item.origem_tipo) === "LOJA" ? maps.lojaVendasPorId.get(item.origem_id ?? 0) : undefined);
  const matricula =
    item.origem_tipo && upper(item.origem_tipo) === "MATRICULA" ? maps.matriculas.get(item.origem_id ?? 0) : undefined;
  const turmaAluno = matricula ? maps.turmaAlunoPorMatricula.get(matricula.id) : undefined;
  const turma = turmaAluno?.turma_id ? maps.turmas.get(turmaAluno.turma_id) : undefined;
  const vinculo = matricula?.vinculo_id ? maps.vinculos.get(matricula.vinculo_id) : undefined;
  const composicao = fatura ? maps.composicaoPorFatura.get(fatura.id) ?? null : null;
  const lancamentos = [
    ...(maps.lancamentosDiretosPorCobranca.get(item.cobranca_id) ?? []),
    ...(fatura
      ? (composicao?.itens
          .map((faturaItem) => maps.lancamentosPorId.get(faturaItem.lancamento_id))
          .filter((value): value is LancamentoRow => Boolean(value)) ?? [])
      : []),
  ];
  const documentoVinculado = buildDocumentoVinculado(item, cobranca, cafeVenda, lojaVenda, matricula, turma, fatura);

  return {
    pessoa: {
      id: item.pessoa_id,
      nome: item.pessoa_nome,
    },
    cobranca: {
      id: item.cobranca_id,
      descricao: textOrNull(cobranca?.descricao),
      valor_centavos: item.valor_centavos,
      valor_aberto_centavos: item.valor_aberto_centavos,
      valor_recebido_centavos: item.valor_recebido_centavos,
      vencimento: item.vencimento,
      competencia_ano_mes: item.competencia_ano_mes,
      status_cobranca: item.status_cobranca,
      status_interno: item.status_interno,
      origem_tipo: item.origem_tipo,
      origem_subtipo: item.origem_subtipo,
      origem_id: item.origem_id,
      created_at: textOrNull(cobranca?.created_at),
      updated_at: textOrNull(cobranca?.updated_at),
    },
    contexto_principal: item.contexto_principal,
    origem_detalhada: item.origem_detalhada,
    origem_label: item.origem_label,
    centro_custo: {
      id: item.centro_custo_id,
      codigo: textOrNull(centroCusto?.codigo),
      nome: textOrNull(centroCusto?.nome),
    },
    documento_vinculado: documentoVinculado,
    trilha_auditavel: buildTrilhaAuditavel(
      item,
      cobranca,
      centroCusto,
      documentoVinculado,
      fatura,
      conta,
      matricula,
      turma,
      vinculo,
      lancamentos,
    ),
    composicao_fatura_conexao: composicao,
  };
}

function devedorFromItems(items: CobrancaListaItem[]): DevedorAuditoriaItem[] {
  const mapa = new Map<number, DevedorAuditoriaItem>();

  for (const item of items) {
    if (!item.pessoa_id || item.valor_aberto_centavos <= 0 || upper(item.status_interno) !== "VENCIDA") {
      continue;
    }

    const atual = mapa.get(item.pessoa_id) ?? {
      pessoa_id: item.pessoa_id,
      pessoa_nome: item.pessoa_nome,
      total_vencido_centavos: 0,
      titulos_vencidos: 0,
      maior_atraso_dias: 0,
      vencimento_mais_antigo: item.vencimento,
    };

    atual.total_vencido_centavos += item.valor_aberto_centavos;
    atual.titulos_vencidos += 1;
    atual.maior_atraso_dias = Math.max(atual.maior_atraso_dias, item.atraso_dias);
    if (item.vencimento && (!atual.vencimento_mais_antigo || item.vencimento < atual.vencimento_mais_antigo)) {
      atual.vencimento_mais_antigo = item.vencimento;
    }
    mapa.set(item.pessoa_id, atual);
  }

  return Array.from(mapa.values()).sort((left, right) => {
    if (left.total_vencido_centavos !== right.total_vencido_centavos) {
      return right.total_vencido_centavos - left.total_vencido_centavos;
    }
    if (left.maior_atraso_dias !== right.maior_atraso_dias) {
      return right.maior_atraso_dias - left.maior_atraso_dias;
    }
    return left.pessoa_nome.localeCompare(right.pessoa_nome);
  });
}

function filtrarPorBusca(items: CobrancaListaItem[], rawQuery: string | null): CobrancaListaItem[] {
  const query = textOrNull(rawQuery)?.toLowerCase();
  if (!query) return items;

  return items.filter((item) => {
    const haystack = [
      String(item.cobranca_id),
      item.pessoa_nome,
      item.contexto_principal,
      item.origem_label,
      item.origem_detalhada,
      item.centro_custo_nome ?? "",
      item.origem_tipo ?? "",
      item.origem_subtipo ?? "",
      item.competencia_ano_mes ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

function construirResumo(items: CobrancaListaItem[]): ContasReceberResumo {
  const totalPorContexto: TotalPorContexto = { escola: 0, cafe: 0, loja: 0, outro: 0 };
  let totalAbertoCentavos = 0;
  let totalVencidoCentavos = 0;
  let totalAVencerCentavos = 0;

  for (const item of items) {
    const aberto = Math.max(0, item.valor_aberto_centavos);
    totalAbertoCentavos += aberto;

    if (upper(item.status_interno) === "VENCIDA") totalVencidoCentavos += aberto;
    if (upper(item.status_interno) === "EM_ABERTO") totalAVencerCentavos += aberto;

    if (item.contexto_principal === "ESCOLA") totalPorContexto.escola += aberto;
    if (item.contexto_principal === "CAFE") totalPorContexto.cafe += aberto;
    if (item.contexto_principal === "LOJA") totalPorContexto.loja += aberto;
    if (item.contexto_principal === "OUTRO") totalPorContexto.outro += aberto;
  }

  return {
    total_aberto_centavos: totalAbertoCentavos,
    total_vencido_centavos: totalVencidoCentavos,
    total_a_vencer_centavos: totalAVencerCentavos,
    total_por_contexto: totalPorContexto,
  };
}

async function fetchFlatRows(
  supabase: SupabaseClient,
  input: ContasReceberAuditoriaInput,
): Promise<FlatRow[]> {
  const visao = upper(input.visao) || "VENCIDAS";
  const baseSelect =
    "cobranca_id,pessoa_id,vencimento,status_cobranca,origem_tipo,origem_id,valor_centavos,valor_recebido_centavos,saldo_aberto_centavos,competencia_ano_mes,dias_atraso,situacao_saas,bucket_vencimento";

  let idsInconsistentes: number[] = [];
  if (visao === "INCONSISTENCIAS") {
    const { data: inconsistentes } = await supabase
      .from("vw_financeiro_cobrancas_inconsistentes")
      .select("cobranca_id")
      .limit(5000);

    idsInconsistentes = (inconsistentes ?? [])
      .map((row) => numberOrNull((row as Record<string, unknown>).cobranca_id))
      .filter((id): id is number => typeof id === "number" && id > 0);

    if (idsInconsistentes.length === 0) return [];
  }

  let query = supabase
    .from("vw_financeiro_contas_receber_flat")
    .select(baseSelect)
    .order("vencimento", { ascending: true, nullsFirst: false })
    .order("cobranca_id", { ascending: false });

  if (input.situacao) query = query.eq("situacao_saas", input.situacao);
  if (input.status) query = query.eq("status_cobranca", input.status);
  if (input.bucket) query = query.eq("bucket_vencimento", input.bucket);
  if (input.competencia) query = query.eq("competencia_ano_mes", input.competencia);
  if (input.vencimentoInicio) query = query.gte("vencimento", input.vencimentoInicio);
  if (input.vencimentoFim) query = query.lte("vencimento", input.vencimentoFim);
  if (upper(input.status) !== "CANCELADA" && visao !== "INCONSISTENCIAS") {
    query = query.not("status_cobranca", "ilike", "CANCELADA");
  }

  switch (visao) {
    case "VENCIDAS":
      query = query.eq("situacao_saas", "VENCIDA").gt("saldo_aberto_centavos", 0);
      break;
    case "AVENCER":
      query = query.eq("situacao_saas", "EM_ABERTO").gt("saldo_aberto_centavos", 0);
      break;
    case "RECEBIDAS":
      query = query.eq("situacao_saas", "QUITADA");
      break;
    case "INCONSISTENCIAS":
      query = query.in("cobranca_id", idsInconsistentes);
      break;
    default:
      query = query.gt("saldo_aberto_centavos", 0);
      break;
  }

  if (input.somenteAbertas && visao !== "RECEBIDAS") {
    query = query.gt("saldo_aberto_centavos", 0);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`erro_listar_contas_receber: ${error.message}`);
  }

  return ((data ?? []) as unknown[]).map((row) => {
    const typed = row as Record<string, unknown>;
    return {
      cobranca_id: numberOrZero(typed.cobranca_id),
      pessoa_id: numberOrNull(typed.pessoa_id),
      vencimento: normalizeDate(typed.vencimento),
      status_cobranca: textOrNull(typed.status_cobranca),
      origem_tipo: textOrNull(typed.origem_tipo),
      origem_id: numberOrNull(typed.origem_id),
      valor_centavos: numberOrZero(typed.valor_centavos),
      valor_recebido_centavos: numberOrZero(typed.valor_recebido_centavos),
      saldo_aberto_centavos: numberOrZero(typed.saldo_aberto_centavos),
      competencia_ano_mes: textOrNull(typed.competencia_ano_mes),
      dias_atraso: numberOrZero(typed.dias_atraso),
      situacao_saas: textOrNull(typed.situacao_saas),
      bucket_vencimento: textOrNull(typed.bucket_vencimento),
    };
  });
}

async function buildMaps(supabase: SupabaseClient, baseRows: FlatRow[]): Promise<DataMaps> {
  const cobrancaIds = Array.from(new Set(baseRows.map((row) => row.cobranca_id)));
  const pessoaIds = Array.from(new Set(baseRows.map((row) => row.pessoa_id).filter((id): id is number => !!id)));
  const origemCafeIds = baseRows
    .filter((row) => upper(row.origem_tipo) === "CAFE" && typeof row.origem_id === "number")
    .map((row) => row.origem_id as number);
  const origemLojaIds = baseRows
    .filter((row) => upper(row.origem_tipo) === "LOJA" && typeof row.origem_id === "number")
    .map((row) => row.origem_id as number);
  const matriculaIds = baseRows
    .filter((row) => upper(row.origem_tipo) === "MATRICULA" && typeof row.origem_id === "number")
    .map((row) => row.origem_id as number);
  const faturaOrigemIds = baseRows
    .filter(
      (row) =>
        (upper(row.origem_tipo) === "FATURA_CREDITO_CONEXAO" || upper(row.origem_tipo) === "CREDITO_CONEXAO_FATURA") &&
        typeof row.origem_id === "number",
    )
    .map((row) => row.origem_id as number);

  const cobrancas = await selectMany<CobrancaRow>(async (chunk) => {
    const { data, error } = await supabase
      .from("cobrancas")
      .select(
        "id,pessoa_id,descricao,valor_centavos,vencimento,status,created_at,updated_at,centro_custo_id,origem_tipo,origem_subtipo,origem_id,competencia_ano_mes",
      )
      .in("id", chunk);
    if (error) throw new Error(`erro_carregar_cobrancas: ${error.message}`);
    return (data ?? []) as CobrancaRow[];
  }, cobrancaIds);

  const pessoas = await selectMany<PessoaRow>(async (chunk) => {
    const { data, error } = await supabase.from("pessoas").select("id,nome").in("id", chunk);
    if (error) throw new Error(`erro_carregar_pessoas: ${error.message}`);
    return (data ?? []) as PessoaRow[];
  }, pessoaIds);

  const centrosCustoIds = Array.from(
    new Set(
      cobrancas
        .map((cobranca) => numberOrNull(cobranca.centro_custo_id))
        .filter((id): id is number => typeof id === "number" && id > 0),
    ),
  );

  const centrosCusto = await selectMany<CentroCustoRow>(async (chunk) => {
    const { data, error } = await supabase
      .from("centros_custo")
      .select("id,codigo,nome,ativo,contextos_aplicaveis")
      .in("id", chunk);
    if (error) throw new Error(`erro_carregar_centros_custo: ${error.message}`);
    return (data ?? []) as CentroCustoRow[];
  }, centrosCustoIds);

  const faturasPorCobranca = await selectMany<FaturaRow>(async (chunk) => {
    const { data, error } = await supabase
      .from("credito_conexao_faturas")
      .select(
        "id,conta_conexao_id,periodo_referencia,data_vencimento,valor_total_centavos,status,cobranca_id,neofin_invoice_id,created_at,updated_at",
      )
      .in("cobranca_id", chunk);
    if (error) throw new Error(`erro_carregar_faturas_por_cobranca: ${error.message}`);
    return (data ?? []) as FaturaRow[];
  }, cobrancaIds);

  const faturasPorId = await selectMany<FaturaRow>(async (chunk) => {
    const { data, error } = await supabase
      .from("credito_conexao_faturas")
      .select(
        "id,conta_conexao_id,periodo_referencia,data_vencimento,valor_total_centavos,status,cobranca_id,neofin_invoice_id,created_at,updated_at",
      )
      .in("id", chunk);
    if (error) throw new Error(`erro_carregar_faturas_por_id: ${error.message}`);
    return (data ?? []) as FaturaRow[];
  }, faturaOrigemIds);

  const faturas = Array.from(
    new Map([...faturasPorCobranca, ...faturasPorId].map((fatura) => [fatura.id, fatura])).values(),
  );
  const faturaIds = faturas.map((fatura) => fatura.id);
  const contaConexaoIds = Array.from(
    new Set(
      faturas
        .map((fatura) => numberOrNull(fatura.conta_conexao_id))
        .filter((id): id is number => typeof id === "number" && id > 0),
    ),
  );

  const contasConexao = await selectMany<ContaConexaoRow>(async (chunk) => {
    const { data, error } = await supabase
      .from("credito_conexao_contas")
      .select("id,pessoa_titular_id,tipo_conta,descricao_exibicao,ativo,centro_custo_principal_id")
      .in("id", chunk);
    if (error) throw new Error(`erro_carregar_contas_conexao: ${error.message}`);
    return (data ?? []) as ContaConexaoRow[];
  }, contaConexaoIds);

  const linksFaturaLancamentos = await selectMany<FaturaLancamentoLinkRow>(async (chunk) => {
    const { data, error } = await supabase
      .from("credito_conexao_fatura_lancamentos")
      .select("fatura_id,lancamento_id")
      .in("fatura_id", chunk);
    if (error) throw new Error(`erro_carregar_fatura_lancamentos: ${error.message}`);
    return ((data ?? []) as unknown[]).map((row) => {
      const typed = row as Record<string, unknown>;
      return {
        fatura_id: numberOrNull(typed.fatura_id),
        lancamento_id: numberOrNull(typed.lancamento_id),
      };
    });
  }, faturaIds);

  const lancamentoIds = Array.from(
    new Set(
      linksFaturaLancamentos
        .map((link) => link.lancamento_id)
        .filter((id): id is number => typeof id === "number" && id > 0),
    ),
  );

  const lancamentosDasFaturas = await selectMany<LancamentoRow>(async (chunk) => {
    const { data, error } = await supabase
      .from("credito_conexao_lancamentos")
      .select(
        "id,conta_conexao_id,origem_sistema,origem_id,descricao,valor_centavos,data_lancamento,status,created_at,updated_at,numero_parcelas,competencia,referencia_item,composicao_json,cobranca_id",
      )
      .in("id", chunk);
    if (error) throw new Error(`erro_carregar_lancamentos_fatura: ${error.message}`);
    return (data ?? []) as LancamentoRow[];
  }, lancamentoIds);

  const lancamentosDiretos = await selectMany<LancamentoRow>(async (chunk) => {
    const { data, error } = await supabase
      .from("credito_conexao_lancamentos")
      .select(
        "id,conta_conexao_id,origem_sistema,origem_id,descricao,valor_centavos,data_lancamento,status,created_at,updated_at,numero_parcelas,competencia,referencia_item,composicao_json,cobranca_id",
      )
      .in("cobranca_id", chunk);
    if (error) throw new Error(`erro_carregar_lancamentos_diretos: ${error.message}`);
    return (data ?? []) as LancamentoRow[];
  }, cobrancaIds);

  const cafeVendasPorCobranca = await selectMany<CafeVendaRow>(async (chunk) => {
    const { data, error } = await supabase
      .from("cafe_vendas")
      .select(
        "id,pagador_pessoa_id,consumidor_pessoa_id,valor_total_centavos,forma_pagamento,status_pagamento,cobranca_id,data_competencia,colaborador_pessoa_id,tipo_quitacao,valor_pago_centavos,valor_em_aberto_centavos,created_at,updated_at",
      )
      .in("cobranca_id", chunk);
    if (error) throw new Error(`erro_carregar_cafe_por_cobranca: ${error.message}`);
    return (data ?? []) as CafeVendaRow[];
  }, cobrancaIds);

  const cafeVendasPorId = await selectMany<CafeVendaRow>(async (chunk) => {
    const { data, error } = await supabase
      .from("cafe_vendas")
      .select(
        "id,pagador_pessoa_id,consumidor_pessoa_id,valor_total_centavos,forma_pagamento,status_pagamento,cobranca_id,data_competencia,colaborador_pessoa_id,tipo_quitacao,valor_pago_centavos,valor_em_aberto_centavos,created_at,updated_at",
      )
      .in("id", chunk);
    if (error) throw new Error(`erro_carregar_cafe_por_id: ${error.message}`);
    return (data ?? []) as CafeVendaRow[];
  }, origemCafeIds);

  const lojaVendasPorCobranca = await selectMany<LojaVendaRow>(async (chunk) => {
    const { data, error } = await supabase
      .from("loja_vendas")
      .select(
        "id,cliente_pessoa_id,tipo_venda,valor_total_centavos,forma_pagamento,status_pagamento,status_venda,data_venda,data_vencimento,cobranca_id,conta_conexao_id,numero_parcelas,created_at,updated_at",
      )
      .in("cobranca_id", chunk);
    if (error) throw new Error(`erro_carregar_loja_por_cobranca: ${error.message}`);
    return (data ?? []) as LojaVendaRow[];
  }, cobrancaIds);

  const lojaVendasPorId = await selectMany<LojaVendaRow>(async (chunk) => {
    const { data, error } = await supabase
      .from("loja_vendas")
      .select(
        "id,cliente_pessoa_id,tipo_venda,valor_total_centavos,forma_pagamento,status_pagamento,status_venda,data_venda,data_vencimento,cobranca_id,conta_conexao_id,numero_parcelas,created_at,updated_at",
      )
      .in("id", chunk);
    if (error) throw new Error(`erro_carregar_loja_por_id: ${error.message}`);
    return (data ?? []) as LojaVendaRow[];
  }, origemLojaIds);

  const matriculas = await selectMany<MatriculaRow>(async (chunk) => {
    const { data, error } = await supabase
      .from("matriculas")
      .select("id,pessoa_id,responsavel_financeiro_id,vinculo_id,status,total_mensalidade_centavos,encerramento_em")
      .in("id", chunk);
    if (error) throw new Error(`erro_carregar_matriculas: ${error.message}`);
    return (data ?? []) as MatriculaRow[];
  }, matriculaIds);

  const turmaAluno = await selectMany<TurmaAlunoRow>(async (chunk) => {
    const { data, error } = await supabase
      .from("turma_aluno")
      .select("turma_aluno_id,turma_id,aluno_pessoa_id,status,matricula_id")
      .in("matricula_id", chunk);
    if (error) throw new Error(`erro_carregar_turma_aluno: ${error.message}`);
    return (data ?? []) as TurmaAlunoRow[];
  }, matriculaIds);

  const turmaIds = Array.from(
    new Set(
      turmaAluno
        .map((row) => numberOrNull(row.turma_id))
        .filter((id): id is number => typeof id === "number" && id > 0),
    ),
  );

  const turmas = await selectMany<TurmaRow>(async (chunk) => {
    const { data, error } = await supabase
      .from("turmas")
      .select("turma_id,nome,curso,turno,curso_livre_id")
      .in("turma_id", chunk);
    if (error) throw new Error(`erro_carregar_turmas: ${error.message}`);
    return (data ?? []) as TurmaRow[];
  }, turmaIds);

  const vinculoIds = Array.from(
    new Set(
      matriculas
        .map((row) => numberOrNull(row.vinculo_id))
        .filter((id): id is number => typeof id === "number" && id > 0),
    ),
  );

  const vinculos = await selectMany<VinculoRow>(async (chunk) => {
    const { data, error } = await supabase
      .from("vinculos")
      .select("id,aluno_id,responsavel_id,parentesco")
      .in("id", chunk);
    if (error) throw new Error(`erro_carregar_vinculos: ${error.message}`);
    return (data ?? []) as VinculoRow[];
  }, vinculoIds);

  const mapCobrancas = new Map(cobrancas.map((row) => [row.id, row]));
  const mapPessoas = new Map(pessoas.map((row) => [row.id, row]));
  const mapCentros = new Map(centrosCusto.map((row) => [row.id, row]));
  const mapFaturasPorId = new Map(faturas.map((row) => [row.id, row]));
  const mapFaturasPorCobranca = new Map(
    faturas
      .filter((row) => typeof row.cobranca_id === "number" && row.cobranca_id > 0)
      .map((row) => [row.cobranca_id as number, row]),
  );
  const mapLancamentos = new Map([...lancamentosDasFaturas, ...lancamentosDiretos].map((row) => [row.id, row]));
  const mapContasConexao = new Map(contasConexao.map((row) => [row.id, row]));
  const mapCafePorCobranca = new Map<number, CafeVendaRow[]>();
  const mapCafePorId = new Map(cafeVendasPorId.map((row) => [row.id, row]));
  const mapLojaPorCobranca = new Map<number, LojaVendaRow[]>();
  const mapLojaPorId = new Map(lojaVendasPorId.map((row) => [row.id, row]));
  const mapMatriculas = new Map(matriculas.map((row) => [row.id, row]));
  const mapTurmaAluno = new Map(
    turmaAluno
      .filter((row) => typeof row.matricula_id === "number" && row.matricula_id > 0)
      .map((row) => [row.matricula_id as number, row]),
  );
  const mapTurmas = new Map(turmas.map((row) => [row.turma_id, row]));
  const mapVinculos = new Map(vinculos.map((row) => [row.id, row]));
  const mapLancamentosDiretosPorCobranca = new Map<number, LancamentoRow[]>();

  for (const venda of cafeVendasPorCobranca) {
    const cobrancaId = numberOrNull(venda.cobranca_id);
    if (!cobrancaId) continue;
    const atual = mapCafePorCobranca.get(cobrancaId) ?? [];
    atual.push(venda);
    mapCafePorCobranca.set(cobrancaId, atual);
  }

  for (const venda of lojaVendasPorCobranca) {
    const cobrancaId = numberOrNull(venda.cobranca_id);
    if (!cobrancaId) continue;
    const atual = mapLojaPorCobranca.get(cobrancaId) ?? [];
    atual.push(venda);
    mapLojaPorCobranca.set(cobrancaId, atual);
  }

  for (const lancamento of lancamentosDiretos) {
    const cobrancaId = numberOrNull(lancamento.cobranca_id);
    if (!cobrancaId) continue;
    const atual = mapLancamentosDiretosPorCobranca.get(cobrancaId) ?? [];
    atual.push(lancamento);
    mapLancamentosDiretosPorCobranca.set(cobrancaId, atual);
  }

  return {
    cobrancas: mapCobrancas,
    pessoas: mapPessoas,
    centrosCusto: mapCentros,
    faturasPorId: mapFaturasPorId,
    faturasPorCobranca: mapFaturasPorCobranca,
    lancamentosPorId: mapLancamentos,
    lancamentosDiretosPorCobranca: mapLancamentosDiretosPorCobranca,
    composicaoPorFatura: buildComposicaoPorFatura(faturas, linksFaturaLancamentos, mapLancamentos),
    contasConexao: mapContasConexao,
    cafeVendasPorCobranca: mapCafePorCobranca,
    cafeVendasPorId: mapCafePorId,
    lojaVendasPorCobranca: mapLojaPorCobranca,
    lojaVendasPorId: mapLojaPorId,
    matriculas: mapMatriculas,
    turmaAlunoPorMatricula: mapTurmaAluno,
    turmas: mapTurmas,
    vinculos: mapVinculos,
  };
}

function buildItem(baseRow: FlatRow, maps: DataMaps): CobrancaListaItem {
  const cobranca = maps.cobrancas.get(baseRow.cobranca_id);
  const pessoa = baseRow.pessoa_id ? maps.pessoas.get(baseRow.pessoa_id) : undefined;
  const centroCustoId = numberOrNull(cobranca?.centro_custo_id);
  const centroCusto = centroCustoId ? maps.centrosCusto.get(centroCustoId) : undefined;
  const fatura =
    maps.faturasPorCobranca.get(baseRow.cobranca_id) ??
    ((upper(cobranca?.origem_tipo) === "FATURA_CREDITO_CONEXAO" || upper(cobranca?.origem_tipo) === "CREDITO_CONEXAO_FATURA") &&
    typeof cobranca?.origem_id === "number"
      ? maps.faturasPorId.get(cobranca.origem_id)
      : undefined);
  const conta = fatura?.conta_conexao_id ? maps.contasConexao.get(fatura.conta_conexao_id) : undefined;
  const composicao = fatura ? maps.composicaoPorFatura.get(fatura.id) ?? null : null;
  const cafeVenda =
    maps.cafeVendasPorCobranca.get(baseRow.cobranca_id)?.[0] ??
    (upper(cobranca?.origem_tipo) === "CAFE" && typeof cobranca?.origem_id === "number"
      ? maps.cafeVendasPorId.get(cobranca.origem_id)
      : undefined);
  const lojaVenda =
    maps.lojaVendasPorCobranca.get(baseRow.cobranca_id)?.[0] ??
    (upper(cobranca?.origem_tipo) === "LOJA" && typeof cobranca?.origem_id === "number"
      ? maps.lojaVendasPorId.get(cobranca.origem_id)
      : undefined);
  const matricula =
    upper(cobranca?.origem_tipo) === "MATRICULA" && typeof cobranca?.origem_id === "number"
      ? maps.matriculas.get(cobranca.origem_id)
      : undefined;
  const turmaAluno = matricula ? maps.turmaAlunoPorMatricula.get(matricula.id) : undefined;
  const turma = turmaAluno?.turma_id ? maps.turmas.get(turmaAluno.turma_id) : undefined;
  const classificacao = classificarCobranca({
    cobranca,
    centroCusto,
    fatura,
    conta,
    composicao,
    cafeVenda,
    lojaVenda,
    matricula,
    turma,
  });

  return {
    cobranca_id: baseRow.cobranca_id,
    pessoa_id: baseRow.pessoa_id,
    pessoa_nome: pessoaNome(baseRow.pessoa_id, pessoa),
    contexto_principal: classificacao.contextoPrincipal,
    origem_detalhada: classificacao.origemDetalhada,
    origem_label: classificacao.origemLabel,
    vencimento: baseRow.vencimento,
    competencia_ano_mes:
      textOrNull(cobranca?.competencia_ano_mes) ??
      baseRow.competencia_ano_mes ??
      textOrNull(fatura?.periodo_referencia),
    bucket: baseRow.bucket_vencimento,
    valor_centavos: numberOrZero(cobranca?.valor_centavos || baseRow.valor_centavos),
    valor_aberto_centavos: baseRow.saldo_aberto_centavos,
    valor_recebido_centavos: baseRow.valor_recebido_centavos,
    status_cobranca: textOrNull(cobranca?.status) ?? baseRow.status_cobranca,
    status_interno: baseRow.situacao_saas,
    centro_custo_id: centroCustoId,
    centro_custo_nome: textOrNull(centroCusto?.nome),
    atraso_dias: baseRow.dias_atraso,
    origem_tipo: textOrNull(cobranca?.origem_tipo) ?? baseRow.origem_tipo,
    origem_subtipo: textOrNull(cobranca?.origem_subtipo),
    origem_id: numberOrNull(cobranca?.origem_id) ?? baseRow.origem_id,
  };
}

async function buildPerdasCancelamento(
  supabase: SupabaseClient,
): Promise<PerdaCancelamentoItem[]> {
  const { data: matriculasEncerradas, error: errorMatriculas } = await supabase
    .from("matriculas")
    .select("id,status,total_mensalidade_centavos,encerramento_em")
    .eq("status", "CANCELADA")
    .order("encerramento_em", { ascending: false, nullsFirst: false });

  if (errorMatriculas) {
    throw new Error(`erro_carregar_matriculas_canceladas: ${errorMatriculas.message}`);
  }

  const matriculaIds = ((matriculasEncerradas ?? []) as MatriculaRow[]).map((row) => row.id);
  if (matriculaIds.length === 0) return [];

  const encerramentos = await selectMany<MatriculaEncerramentoRow>(async (chunk) => {
    const { data, error } = await supabase
      .from("matriculas_encerramentos")
      .select("id,matricula_id,tipo,realizado_em,cobrancas_canceladas_valor_centavos")
      .in("matricula_id", chunk);
    if (error) throw new Error(`erro_carregar_encerramentos_matricula: ${error.message}`);
    return (data ?? []) as MatriculaEncerramentoRow[];
  }, matriculaIds);

  const abertas = await selectMany<FlatRow>(async (chunk) => {
    const { data, error } = await supabase
      .from("vw_financeiro_contas_receber_flat")
      .select(
        "cobranca_id,origem_id,competencia_ano_mes,saldo_aberto_centavos,status_cobranca,situacao_saas,valor_centavos,valor_recebido_centavos,vencimento,dias_atraso,bucket_vencimento,pessoa_id,origem_tipo",
      )
      .eq("origem_tipo", "MATRICULA")
      .in("origem_id", chunk)
      .gt("saldo_aberto_centavos", 0);
    if (error) throw new Error(`erro_carregar_aberto_cancelamento: ${error.message}`);
    return ((data ?? []) as unknown[]).map((row) => {
      const typed = row as Record<string, unknown>;
      return {
        cobranca_id: numberOrZero(typed.cobranca_id),
        pessoa_id: numberOrNull(typed.pessoa_id),
        vencimento: normalizeDate(typed.vencimento),
        status_cobranca: textOrNull(typed.status_cobranca),
        origem_tipo: textOrNull(typed.origem_tipo),
        origem_id: numberOrNull(typed.origem_id),
        valor_centavos: numberOrZero(typed.valor_centavos),
        valor_recebido_centavos: numberOrZero(typed.valor_recebido_centavos),
        saldo_aberto_centavos: numberOrZero(typed.saldo_aberto_centavos),
        competencia_ano_mes: textOrNull(typed.competencia_ano_mes),
        dias_atraso: numberOrZero(typed.dias_atraso),
        situacao_saas: textOrNull(typed.situacao_saas),
        bucket_vencimento: textOrNull(typed.bucket_vencimento),
      };
    });
  }, matriculaIds);

  const encerramentoPorMatricula = new Map<number, MatriculaEncerramentoRow>();
  for (const encerramento of encerramentos) {
    const matriculaId = numberOrNull(encerramento.matricula_id);
    if (!matriculaId) continue;
    const atual = encerramentoPorMatricula.get(matriculaId);
    if (!atual || (textOrNull(encerramento.realizado_em) ?? "") > (textOrNull(atual.realizado_em) ?? "")) {
      encerramentoPorMatricula.set(matriculaId, encerramento);
    }
  }

  const abertoPorMatricula = new Map<number, number>();
  for (const row of abertas) {
    const matriculaId = row.origem_id;
    if (!matriculaId) continue;
    abertoPorMatricula.set(matriculaId, (abertoPorMatricula.get(matriculaId) ?? 0) + row.saldo_aberto_centavos);
  }

  const agregado = new Map<string, PerdaCancelamentoItem>();
  for (const matricula of (matriculasEncerradas ?? []) as MatriculaRow[]) {
    const encerramento = encerramentoPorMatricula.get(matricula.id);
    const periodo =
      textOrNull(encerramento?.realizado_em)?.slice(0, 7) ??
      textOrNull(matricula.encerramento_em)?.slice(0, 7) ??
      "sem-periodo";
    const atual = agregado.get(periodo) ?? {
      periodo,
      quantidade_matriculas_canceladas: 0,
      valor_aberto_centavos: 0,
      valor_potencial_perdido_centavos: 0,
      diagnostico_em_validacao: true,
    };

    atual.quantidade_matriculas_canceladas += 1;
    atual.valor_aberto_centavos += abertoPorMatricula.get(matricula.id) ?? 0;
    atual.valor_potencial_perdido_centavos +=
      numberOrZero(encerramento?.cobrancas_canceladas_valor_centavos) ||
      numberOrZero(matricula.total_mensalidade_centavos);

    agregado.set(periodo, atual);
  }

  return Array.from(agregado.values()).sort((left, right) => right.periodo.localeCompare(left.periodo));
}

function paginate<T>(
  items: T[],
  page: number,
  pageSize: number,
): { rows: T[]; total: number; totalPaginas: number; pageAjustada: number } {
  const total = items.length;
  const totalPaginas = Math.max(Math.ceil(total / pageSize), 1);
  const paginaAjustada = Math.min(Math.max(page, 1), totalPaginas);
  const inicio = (paginaAjustada - 1) * pageSize;
  return {
    rows: items.slice(inicio, inicio + pageSize),
    total,
    totalPaginas,
    pageAjustada: paginaAjustada,
  };
}

export async function listarContasReceberAuditoria(
  supabase: SupabaseClient,
  input: ContasReceberAuditoriaInput,
): Promise<ContasReceberAuditoriaPayload> {
  const visao = upper(input.visao) || "VENCIDAS";
  const page = Math.max(input.page ?? 1, 1);
  const pageSize = Math.min(Math.max(input.pageSize ?? 50, 1), 200);

  const baseRows = await fetchFlatRows(supabase, input);
  const maps = await buildMaps(supabase, baseRows);
  const itensEnriquecidos = baseRows.map((row) => buildItem(row, maps));
  const filtradosPorBusca = filtrarPorBusca(itensEnriquecidos, input.q ?? null);
  const devedoresBase = devedorFromItems(itensEnriquecidos);
  const paginacao = paginate(filtradosPorBusca, page, pageSize);
  const detalheItem =
    typeof input.detalheCobrancaId === "number"
      ? itensEnriquecidos.find((item) => item.cobranca_id === input.detalheCobrancaId) ?? null
      : null;
  const detalhe = detalheItem ? buildDetalhe(detalheItem, maps) : null;

  return {
    resumo: construirResumo(filtradosPorBusca),
    top_devedores: devedoresBase.slice(0, 10),
    devedores_lista: devedoresBase,
    cobrancas_lista: paginacao.rows,
    detalhe_cobranca: detalhe,
    composicao_fatura_conexao: detalhe?.composicao_fatura_conexao ?? null,
    perdas_cancelamento: await buildPerdasCancelamento(supabase),
    paginacao: {
      page: paginacao.pageAjustada,
      page_size: pageSize,
      total: paginacao.total,
      total_paginas: paginacao.totalPaginas,
    },
    filtros_aplicados: {
      visao,
      q: textOrNull(input.q) ?? "",
      situacao: textOrNull(input.situacao),
      status: textOrNull(input.status),
      bucket: textOrNull(input.bucket),
      competencia: textOrNull(input.competencia),
      vencimento_inicio: isDateLike(input.vencimentoInicio ?? null) ? input.vencimentoInicio ?? null : null,
      vencimento_fim: isDateLike(input.vencimentoFim ?? null) ? input.vencimentoFim ?? null : null,
    },
  };
}

export function validarContasReceberInput(input: ContasReceberAuditoriaInput): string | null {
  if (input.competencia && !isAnoMes(input.competencia)) return "competencia_invalida";
  if (input.vencimentoInicio && !isDateLike(input.vencimentoInicio)) return "vencimento_inicio_invalido";
  if (input.vencimentoFim && !isDateLike(input.vencimentoFim)) return "vencimento_fim_invalido";
  return null;
}
