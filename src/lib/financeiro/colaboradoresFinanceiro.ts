import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>;

type ColaboradorRow = {
  id: number;
  pessoa_id: number | null;
  tipo_vinculo_id: number | null;
  ativo: boolean | null;
};

type PessoaRow = {
  id: number;
  nome: string | null;
  cpf: string | null;
  telefone: string | null;
  email: string | null;
};

type TipoVinculoRow = {
  id: number;
  nome: string | null;
};

type FuncaoRelRow = {
  colaborador_id: number;
  funcao_id: number;
  ativo: boolean | null;
  principal: boolean | null;
};

type FuncaoRow = {
  id: number;
  nome: string | null;
};

type ConfigFinanceiraRow = {
  colaborador_id: number;
  gera_folha: boolean | null;
  tipo_remuneracao: string | null;
  salario_base_centavos: number | null;
  valor_hora_centavos: number | null;
  politica_desconto_cartao: string | null;
  politica_corte_cartao: string | null;
};

type ContaInternaRow = {
  id: number;
  tipo_conta: string | null;
  pessoa_titular_id: number | null;
  descricao_exibicao: string | null;
  dia_fechamento: number | null;
  dia_vencimento: number | null;
  ativo: boolean | null;
};

type FaturaRow = {
  id: number;
  conta_conexao_id: number;
  periodo_referencia: string | null;
  data_fechamento: string | null;
  data_vencimento: string | null;
  valor_total_centavos: number | null;
  valor_taxas_centavos: number | null;
  status: string | null;
  cobranca_id: number | null;
  folha_pagamento_id: number | null;
};

type FolhaRow = {
  id: number;
  colaborador_id: number;
  competencia_ano_mes: string | null;
  status: string | null;
  data_fechamento: string | null;
  data_pagamento: string | null;
  observacoes: string | null;
};

type FolhaEventoRow = {
  folha_pagamento_id: number;
  tipo: "PROVENTO" | "DESCONTO";
  descricao: string | null;
  valor_centavos: number | null;
  origem_tipo: string | null;
  origem_id: number | null;
};

type PagamentoRow = {
  id: number;
  colaborador_id: number;
  tipo: string | null;
  competencia_ano_mes: string | null;
  data_pagamento: string | null;
  valor_centavos: number | null;
  folha_pagamento_colaborador_id: number | null;
  folha_evento_id: number | null;
  observacoes: string | null;
};

type CafeVendaRow = {
  id: number;
  status_pagamento: string | null;
};

type CafeVendaItemRow = {
  venda_id: number;
  produto_id: number | null;
  quantidade: number | null;
  valor_unitario_centavos: number | null;
  valor_total_centavos: number | null;
  descricao_snapshot: string | null;
};

type CafeProdutoRow = {
  id: number;
  nome: string | null;
};

type LojaVendaRow = {
  id: number;
  status_venda: string | null;
};

type LojaVendaItemRow = {
  venda_id: number;
  produto_id: number | null;
  variante_id: number | null;
  quantidade: number | null;
  preco_unitario_centavos: number | null;
  total_centavos: number | null;
  observacoes: string | null;
};

type LojaProdutoRow = {
  id: number;
  nome: string | null;
};

export type FaturaLancamentoOperacionalInput = {
  id: number;
  conta_conexao_id: number | null;
  origem_sistema: string | null;
  origem_id: number | null;
  descricao: string | null;
  valor_centavos: number | null;
  competencia: string | null;
  referencia_item: string | null;
  status: string | null;
  composicao_json: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
  aluno_pessoa_id?: number | null;
  aluno_nome?: string | null;
  responsavel_financeiro_nome?: string | null;
  cobranca_fatura_id?: number | null;
};

export type FaturaItemOperacional = {
  descricao: string;
  quantidade: number | null;
  valor_unitario_centavos: number | null;
  valor_total_centavos: number;
  detalhe: string | null;
};

export type FaturaLancamentoOperacional = FaturaLancamentoOperacionalInput & {
  descricao_operacional: string;
  origem_cancelada: boolean;
  itens_operacionais: FaturaItemOperacional[];
};

export type ColaboradorCompetenciaResumo = {
  competencia: string;
  valor_bruto_receber_centavos: number;
  proventos_centavos: number;
  adicionais_centavos: number;
  adiantamentos_centavos: number;
  descontos_centavos: number;
  descontos_excluindo_adiantamentos_centavos: number;
  consumo_conta_interna_centavos: number;
  saldo_liquido_centavos: number;
  status_competencia: string;
  status_fatura: string | null;
  status_folha: string | null;
  status_importacao_folha: string;
  folha_pagamento_colaborador_id: number | null;
  folha_pagamento_id: number | null;
  fatura_id: number | null;
  cobranca_id: number | null;
  data_vencimento: string | null;
  data_pagamento: string | null;
  espelho_disponivel: boolean;
};

export type ColaboradorFinanceiroPainel = {
  colaborador: {
    id: number;
    pessoa_id: number;
    nome: string;
    cpf: string | null;
    telefone: string | null;
    email: string | null;
    status_vinculo: "ATIVO" | "INATIVO";
    tipo_vinculo: string | null;
    funcao_principal: string | null;
  };
  configuracao_pagamento: {
    gera_folha: boolean;
    tipo_remuneracao: string | null;
    salario_base_centavos: number;
    valor_hora_centavos: number;
    politica_desconto_cartao: string | null;
    politica_corte_cartao: string | null;
  };
  conta_interna: {
    existe: boolean;
    id: number | null;
    tipo_conta: string;
    descricao_exibicao: string | null;
    situacao_atual: string;
    dia_fechamento: number | null;
    dia_vencimento: number | null;
    quantidade_faturas: number;
    competencias_abertas: string[];
    quantidade_competencias_abertas: number;
    saldo_em_aberto_centavos: number;
    ultima_fatura_id: number | null;
    ultima_fatura_competencia: string | null;
    ultima_fatura_status: string | null;
    ultima_importacao_folha: {
      referencia_id: number | null;
      competencia: string | null;
      status: string | null;
    } | null;
    importacao_pendente: boolean;
    permite_parcelamento: boolean;
  };
  competencia_atual: string;
  resumo_mes_atual: ColaboradorCompetenciaResumo;
  ultimas_competencias: ColaboradorCompetenciaResumo[];
  totais_mes_atual: {
    adiantamentos_centavos: number;
    importado_conta_interna_centavos: number;
    saldo_liquido_estimado_centavos: number;
  };
  adiantamentos_mes_atual: ColaboradorPagamentoResumo[];
  adiantamentos_recentes: ColaboradorPagamentoResumo[];
  referencias: {
    colaborador_id: number;
    pessoa_id: number;
    conta_interna_id: number | null;
    ultima_fatura_id: number | null;
    folha_pagamento_colaborador_id: number | null;
    folha_pagamento_id: number | null;
  };
};

export type ColaboradorContaInternaResponse = {
  colaborador: ColaboradorFinanceiroPainel["colaborador"];
  conta_interna: ColaboradorFinanceiroPainel["conta_interna"];
  resumo: {
    saldo_em_aberto_centavos: number;
    quantidade_faturas: number;
    competencias_abertas: string[];
    ultima_fatura_id: number | null;
  };
  faturas: Array<{
    id: number;
    competencia: string;
    valor_total_centavos: number;
    valor_taxas_centavos: number;
    status: string;
    data_fechamento: string | null;
    data_vencimento: string | null;
    folha_pagamento_id: number | null;
    folha_pagamento_colaborador_id: number | null;
    status_importacao_folha: string;
    cobranca_id: number | null;
  }>;
};

export type ColaboradorPagamentoResumo = {
  id: number;
  tipo: "ADIANTAMENTO" | "SAQUE";
  competencia: string;
  data_pagamento: string | null;
  valor_centavos: number;
  observacao: string | null;
  folha_pagamento_colaborador_id: number | null;
  folha_evento_id: number | null;
};

export type ColaboradorAdiantamentosResponse = {
  colaborador_id: number;
  competencia: string | null;
  total_adiantamentos_centavos: number;
  adiantamentos: ColaboradorPagamentoResumo[];
  recentes: ColaboradorPagamentoResumo[];
};

export type RegistrarAdiantamentoColaboradorInput = {
  colaborador_id: number;
  competencia: string;
  valor_centavos: number;
  data_pagamento: string;
  observacao?: string | null;
  conta_financeira_id?: number | null;
};

type ColaboradorFinanceiroBundle = {
  colaborador: ColaboradorRow;
  pessoa: PessoaRow;
  tipoVinculo: string | null;
  funcaoPrincipal: string | null;
  configFinanceira: ConfigFinanceiraRow | null;
  contaInterna: ContaInternaRow | null;
  faturas: FaturaRow[];
  folhas: FolhaRow[];
  pagamentos: PagamentoRow[];
  folhaEventosByFolhaId: Map<number, FolhaEventoRow[]>;
  permiteParcelamento: boolean;
};

const FATURA_STATUS_ABERTA = new Set(["ABERTA", "EM_ABERTO", "PENDENTE"]);

function competenciaAtual(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function toPositiveInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return Math.trunc(value);
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return Math.trunc(parsed);
  }
  return null;
}

function normalizeCompetencia(value: string | null | undefined): string | null {
  const raw = String(value ?? "").trim();
  return /^\d{4}-\d{2}$/.test(raw) ? raw : null;
}

function isIsoDate(value: string | null | undefined) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? "").trim());
}

function normalizeStatus(value: string | null | undefined) {
  return String(value ?? "").trim().toUpperCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatBrl(value: number) {
  return (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function isStatusCancelado(value: string | null | undefined) {
  const normalized = normalizeStatus(value);
  return normalized.includes("CANCEL");
}

function isPagamentoAdiantamento(tipo: string | null | undefined) {
  const normalized = normalizeStatus(tipo);
  return normalized === "ADIANTAMENTO" || normalized === "SAQUE";
}

function mapPagamentoResumo(row: PagamentoRow): ColaboradorPagamentoResumo | null {
  const tipo = normalizeStatus(row.tipo);
  if (tipo !== "ADIANTAMENTO" && tipo !== "SAQUE") return null;

  return {
    id: row.id,
    tipo,
    competencia: normalizeCompetencia(row.competencia_ano_mes) ?? competenciaAtual(),
    data_pagamento: row.data_pagamento ?? null,
    valor_centavos: Math.max(Number(row.valor_centavos ?? 0), 0),
    observacao: row.observacoes?.trim() || null,
    folha_pagamento_colaborador_id: row.folha_pagamento_colaborador_id ?? null,
    folha_evento_id: row.folha_evento_id ?? null,
  };
}

function buildEmptyCompetencia(competencia: string): ColaboradorCompetenciaResumo {
  return {
    competencia,
    valor_bruto_receber_centavos: 0,
    proventos_centavos: 0,
    adicionais_centavos: 0,
    adiantamentos_centavos: 0,
    descontos_centavos: 0,
    descontos_excluindo_adiantamentos_centavos: 0,
    consumo_conta_interna_centavos: 0,
    saldo_liquido_centavos: 0,
    status_competencia: "SEM_MOVIMENTO",
    status_fatura: null,
    status_folha: null,
    status_importacao_folha: "SEM_MOVIMENTO",
    folha_pagamento_colaborador_id: null,
    folha_pagamento_id: null,
    fatura_id: null,
    cobranca_id: null,
    data_vencimento: null,
    data_pagamento: null,
    espelho_disponivel: false,
  };
}

function normalizeOrigemSistema(value: string | null | undefined) {
  const normalized = normalizeStatus(value);
  if (normalized === "CAFE_CAIXA") return "CAFE";
  if (normalized === "LOJA_VENDA") return "LOJA";
  return normalized;
}

function extrairVendaIdsCafe(lancamento: FaturaLancamentoOperacionalInput) {
  const composicao = isRecord(lancamento.composicao_json) ? lancamento.composicao_json : null;
  const vendaIds = Array.isArray(composicao?.venda_ids)
    ? composicao.venda_ids.map((item) => toPositiveInt(item)).filter((item): item is number => Boolean(item))
    : [];
  if (vendaIds.length > 0) return Array.from(new Set(vendaIds));
  return [];
}

function extrairVendaIdLoja(lancamento: FaturaLancamentoOperacionalInput) {
  const composicao = isRecord(lancamento.composicao_json) ? lancamento.composicao_json : null;
  return toPositiveInt(composicao?.venda_id) ?? toPositiveInt(lancamento.origem_id);
}

function extrairItensDaComposicao(lancamento: FaturaLancamentoOperacionalInput): FaturaItemOperacional[] {
  const composicao = isRecord(lancamento.composicao_json) ? lancamento.composicao_json : null;
  const itens = Array.isArray(composicao?.itens) ? composicao.itens.filter(isRecord) : [];

  return itens.map((item, index) => {
    const quantidade = toPositiveInt(item.quantidade) ?? 1;
    const valorUnitario =
      typeof item.valor_unitario_centavos === "number"
        ? item.valor_unitario_centavos
        : typeof item.preco_unitario_centavos === "number"
          ? item.preco_unitario_centavos
          : null;
    const valorTotal =
      typeof item.valor_total_centavos === "number"
        ? item.valor_total_centavos
        : typeof item.total_centavos === "number"
          ? item.total_centavos
          : typeof item.valor_centavos === "number"
            ? item.valor_centavos
            : Math.max((valorUnitario ?? 0) * quantidade, 0);
    const descricao =
      (typeof item.descricao === "string" && item.descricao.trim()) ||
      (typeof item.label === "string" && item.label.trim()) ||
      `Item ${index + 1}`;

    return {
      descricao,
      quantidade,
      valor_unitario_centavos: valorUnitario,
      valor_total_centavos: Math.max(valorTotal, 0),
      detalhe: typeof item.referencia === "string" ? item.referencia : null,
    };
  });
}

async function carregarItensOperacionaisCafe(
  supabase: SupabaseAdmin,
  lancamentos: FaturaLancamentoOperacionalInput[],
) {
  const vendaIds = Array.from(
    new Set(lancamentos.flatMap((lancamento) => extrairVendaIdsCafe(lancamento))),
  );

  if (vendaIds.length === 0) {
    return {
      itensByVendaId: new Map<number, FaturaItemOperacional[]>(),
      statusByVendaId: new Map<number, string>(),
    };
  }

  const [{ data: vendasData }, { data: itensData }] = await Promise.all([
    supabase.from("cafe_vendas").select("id,status_pagamento").in("id", vendaIds),
    supabase
      .from("cafe_venda_itens")
      .select("venda_id,produto_id,quantidade,valor_unitario_centavos,valor_total_centavos,descricao_snapshot")
      .in("venda_id", vendaIds),
  ]);

  const produtoIds = Array.from(
    new Set(
      ((itensData ?? []) as CafeVendaItemRow[])
        .map((item) => toPositiveInt(item.produto_id))
        .filter((item): item is number => Boolean(item)),
    ),
  );

  const { data: produtosData } = produtoIds.length
    ? await supabase.from("cafe_produtos").select("id,nome").in("id", produtoIds)
    : { data: [] as CafeProdutoRow[] };

  const produtosById = new Map<number, string>();
  for (const produto of (produtosData ?? []) as CafeProdutoRow[]) {
    if (produto.id) produtosById.set(produto.id, produto.nome?.trim() || `Produto #${produto.id}`);
  }

  const itensByVendaId = new Map<number, FaturaItemOperacional[]>();
  for (const item of (itensData ?? []) as CafeVendaItemRow[]) {
    const list = itensByVendaId.get(item.venda_id) ?? [];
    const produtoId = toPositiveInt(item.produto_id);
    const quantidade = toPositiveInt(item.quantidade) ?? 1;
    const valorUnitario = typeof item.valor_unitario_centavos === "number" ? item.valor_unitario_centavos : null;
    const valorTotal =
      typeof item.valor_total_centavos === "number"
        ? item.valor_total_centavos
        : Math.max((valorUnitario ?? 0) * quantidade, 0);
    list.push({
      descricao:
        (produtoId ? produtosById.get(produtoId) : null) ??
        item.descricao_snapshot?.trim() ??
        (produtoId ? `Produto #${produtoId}` : "Item do Cafe"),
      quantidade,
      valor_unitario_centavos: valorUnitario,
      valor_total_centavos: Math.max(valorTotal, 0),
      detalhe: null,
    });
    itensByVendaId.set(item.venda_id, list);
  }

  const statusByVendaId = new Map<number, string>();
  for (const venda of (vendasData ?? []) as CafeVendaRow[]) {
    statusByVendaId.set(venda.id, venda.status_pagamento ?? "");
  }

  return { itensByVendaId, statusByVendaId };
}

async function carregarItensOperacionaisLoja(
  supabase: SupabaseAdmin,
  lancamentos: FaturaLancamentoOperacionalInput[],
) {
  const vendaIds = Array.from(
    new Set(
      lancamentos
        .map((lancamento) => extrairVendaIdLoja(lancamento))
        .filter((item): item is number => Boolean(item)),
    ),
  );

  if (vendaIds.length === 0) {
    return {
      itensByVendaId: new Map<number, FaturaItemOperacional[]>(),
      statusByVendaId: new Map<number, string>(),
    };
  }

  const [{ data: vendasData }, { data: itensData }] = await Promise.all([
    supabase.from("loja_vendas").select("id,status_venda").in("id", vendaIds),
    supabase
      .from("loja_venda_itens")
      .select("venda_id,produto_id,variante_id,quantidade,preco_unitario_centavos,total_centavos,observacoes")
      .in("venda_id", vendaIds),
  ]);

  const produtoIds = Array.from(
    new Set(
      ((itensData ?? []) as LojaVendaItemRow[])
        .map((item) => toPositiveInt(item.produto_id))
        .filter((item): item is number => Boolean(item)),
    ),
  );

  const { data: produtosData } = produtoIds.length
    ? await supabase.from("loja_produtos").select("id,nome").in("id", produtoIds)
    : { data: [] as LojaProdutoRow[] };

  const produtosById = new Map<number, string>();
  for (const produto of (produtosData ?? []) as LojaProdutoRow[]) {
    if (produto.id) produtosById.set(produto.id, produto.nome?.trim() || `Produto #${produto.id}`);
  }

  const itensByVendaId = new Map<number, FaturaItemOperacional[]>();
  for (const item of (itensData ?? []) as LojaVendaItemRow[]) {
    const list = itensByVendaId.get(item.venda_id) ?? [];
    const produtoId = toPositiveInt(item.produto_id);
    const quantidade = toPositiveInt(item.quantidade) ?? 1;
    const valorUnitario = typeof item.preco_unitario_centavos === "number" ? item.preco_unitario_centavos : null;
    const valorTotal =
      typeof item.total_centavos === "number"
        ? item.total_centavos
        : Math.max((valorUnitario ?? 0) * quantidade, 0);
    list.push({
      descricao: (produtoId ? produtosById.get(produtoId) : null) ?? (produtoId ? `Produto #${produtoId}` : "Item da Loja"),
      quantidade,
      valor_unitario_centavos: valorUnitario,
      valor_total_centavos: Math.max(valorTotal, 0),
      detalhe: item.observacoes?.trim() || null,
    });
    itensByVendaId.set(item.venda_id, list);
  }

  const statusByVendaId = new Map<number, string>();
  for (const venda of (vendasData ?? []) as LojaVendaRow[]) {
    statusByVendaId.set(venda.id, venda.status_venda ?? "");
  }

  return { itensByVendaId, statusByVendaId };
}

function montarDescricaoOperacional(
  lancamento: FaturaLancamentoOperacionalInput,
  itensOperacionais: FaturaItemOperacional[],
) {
  if (itensOperacionais.length > 0) {
    return itensOperacionais
      .slice(0, 2)
      .map((item) => {
        const quantidade = item.quantidade && item.quantidade > 1 ? `${item.quantidade}x` : "1x";
        const valorUnitario = item.valor_unitario_centavos !== null ? formatBrl(item.valor_unitario_centavos) : null;
        return `${item.descricao} — ${quantidade}${valorUnitario ? ` — ${valorUnitario}` : ""}`;
      })
      .join(" | ");
  }

  const origem = normalizeOrigemSistema(lancamento.origem_sistema);
  if (origem === "CAFE" && toPositiveInt(lancamento.origem_id)) {
    return `Consumo do Cafe #${lancamento.origem_id}`;
  }
  if (origem === "LOJA" && toPositiveInt(lancamento.origem_id)) {
    return `Compra da Loja #${lancamento.origem_id}`;
  }

  return lancamento.descricao?.trim() || `Lancamento #${lancamento.id}`;
}

export async function enriquecerLancamentosOperacionaisFatura(
  supabase: SupabaseAdmin,
  lancamentos: FaturaLancamentoOperacionalInput[],
) {
  const [cafeData, lojaData] = await Promise.all([
    carregarItensOperacionaisCafe(
      supabase,
      lancamentos.filter((item) => normalizeOrigemSistema(item.origem_sistema) === "CAFE"),
    ),
    carregarItensOperacionaisLoja(
      supabase,
      lancamentos.filter((item) => normalizeOrigemSistema(item.origem_sistema) === "LOJA"),
    ),
  ]);

  const auditoria = lancamentos.map((lancamento) => {
    const origem = normalizeOrigemSistema(lancamento.origem_sistema);
    let itensOperacionais: FaturaItemOperacional[] = [];
    let origemCancelada = isStatusCancelado(lancamento.status);

    if (origem === "CAFE") {
      const vendaIds = extrairVendaIdsCafe(lancamento);
      const vendasAtivas = vendaIds.filter((vendaId) => !isStatusCancelado(cafeData.statusByVendaId.get(vendaId) ?? null));
      origemCancelada = origemCancelada || (vendaIds.length > 0 && vendasAtivas.length === 0);
      itensOperacionais = vendasAtivas.flatMap((vendaId) => cafeData.itensByVendaId.get(vendaId) ?? []);
    } else if (origem === "LOJA") {
      const vendaId = extrairVendaIdLoja(lancamento);
      origemCancelada =
        origemCancelada || (Boolean(vendaId) && isStatusCancelado(lojaData.statusByVendaId.get(vendaId ?? 0) ?? null));
      itensOperacionais = vendaId ? lojaData.itensByVendaId.get(vendaId) ?? [] : [];
    }

    if (itensOperacionais.length === 0) {
      itensOperacionais = extrairItensDaComposicao(lancamento);
    }

    return {
      ...lancamento,
      origem_cancelada: origemCancelada,
      itens_operacionais: itensOperacionais,
      descricao_operacional: montarDescricaoOperacional(lancamento, itensOperacionais),
    };
  });

  return {
    auditoria,
    ativos: auditoria.filter((item) => !item.origem_cancelada),
  };
}

function resolverFuncaoPrincipal(relacoes: FuncaoRelRow[], funcoesById: Map<number, string>) {
  const ordenadas = [...relacoes].sort((a, b) => {
    if (Boolean(a.principal) !== Boolean(b.principal)) return a.principal ? -1 : 1;
    if (Boolean(a.ativo) !== Boolean(b.ativo)) return a.ativo ? -1 : 1;
    return a.funcao_id - b.funcao_id;
  });

  for (const rel of ordenadas) {
    const nome = funcoesById.get(rel.funcao_id)?.trim();
    if (nome) return nome;
  }

  return null;
}

function mapCompetencias(bundle: ColaboradorFinanceiroBundle): ColaboradorCompetenciaResumo[] {
  const competencias = new Set<string>();

  for (const fatura of bundle.faturas) {
    const competencia = normalizeCompetencia(fatura.periodo_referencia);
    if (competencia) competencias.add(competencia);
  }

  for (const folha of bundle.folhas) {
    const competencia = normalizeCompetencia(folha.competencia_ano_mes);
    if (competencia) competencias.add(competencia);
  }

  for (const pagamento of bundle.pagamentos) {
    const competencia = normalizeCompetencia(pagamento.competencia_ano_mes);
    if (competencia) competencias.add(competencia);
  }

  if (competencias.size === 0) {
    competencias.add(competenciaAtual());
  }

  return Array.from(competencias)
    .sort((a, b) => b.localeCompare(a))
    .map((competencia) => {
      const fatura =
        bundle.faturas.find((item) => normalizeCompetencia(item.periodo_referencia) === competencia) ?? null;
      const folha =
        bundle.folhas.find((item) => normalizeCompetencia(item.competencia_ano_mes) === competencia) ?? null;
      const eventos = folha ? bundle.folhaEventosByFolhaId.get(folha.id) ?? [] : [];
      const pagamentosCompetencia = bundle.pagamentos.filter(
        (item) => normalizeCompetencia(item.competencia_ano_mes) === competencia,
      );

      const proventos = eventos
        .filter((evento) => evento.tipo === "PROVENTO")
        .reduce((acc, evento) => acc + Math.max(Number(evento.valor_centavos ?? 0), 0), 0);
      const descontos = eventos
        .filter((evento) => evento.tipo === "DESCONTO")
        .reduce((acc, evento) => acc + Math.max(Number(evento.valor_centavos ?? 0), 0), 0);
      const adiantamentos = pagamentosCompetencia
        .filter((pagamento) => isPagamentoAdiantamento(pagamento.tipo))
        .reduce((acc, pagamento) => acc + Math.max(Number(pagamento.valor_centavos ?? 0), 0), 0);
      const outrosDescontos = Math.max(descontos - adiantamentos, 0);
      const consumoContaInterna = Math.max(Number(fatura?.valor_total_centavos ?? 0), 0);
      const valorBrutoReceber = proventos;
      const saldoLiquido = valorBrutoReceber - descontos - consumoContaInterna;

      let statusImportacaoFolha = "SEM_MOVIMENTO";
      let statusCompetencia = "SEM_MOVIMENTO";

      if (folha?.id) {
        statusImportacaoFolha = "IMPORTADA";
        statusCompetencia = normalizeStatus(folha.status) || "IMPORTADA";
      } else if (fatura?.id) {
        statusImportacaoFolha = "PENDENTE_IMPORTACAO";
        statusCompetencia = normalizeStatus(fatura.status) || "PENDENTE_IMPORTACAO";
      } else if (pagamentosCompetencia.length > 0) {
        statusCompetencia = "PAGAMENTOS_REGISTRADOS";
      }

      return {
        competencia,
        valor_bruto_receber_centavos: valorBrutoReceber,
        proventos_centavos: proventos,
        adicionais_centavos: proventos,
        adiantamentos_centavos: adiantamentos,
        descontos_centavos: descontos,
        descontos_excluindo_adiantamentos_centavos: outrosDescontos,
        consumo_conta_interna_centavos: consumoContaInterna,
        saldo_liquido_centavos: saldoLiquido,
        status_competencia: statusCompetencia,
        status_fatura: fatura?.status ?? null,
        status_folha: folha?.status ?? null,
        status_importacao_folha: statusImportacaoFolha,
        folha_pagamento_colaborador_id: folha?.id ?? null,
        folha_pagamento_id: fatura?.folha_pagamento_id ?? null,
        fatura_id: fatura?.id ?? null,
        cobranca_id: fatura?.cobranca_id ?? null,
        data_vencimento: fatura?.data_vencimento ?? null,
        data_pagamento: folha?.data_pagamento ?? null,
        espelho_disponivel: Boolean(folha?.id) || Boolean(fatura?.id),
      };
    });
}

async function loadColaboradorFinanceiroBundle(
  supabase: SupabaseAdmin,
  colaboradorId: number,
): Promise<ColaboradorFinanceiroBundle | null> {
  const { data: colaborador, error: colaboradorError } = await supabase
    .from("colaboradores")
    .select("id,pessoa_id,tipo_vinculo_id,ativo")
    .eq("id", colaboradorId)
    .maybeSingle();

  if (colaboradorError || !colaborador?.pessoa_id) {
    return null;
  }

  const pessoaId = Number(colaborador.pessoa_id);

  const [
    { data: pessoa },
    { data: tipoVinculo },
    { data: funcoesRel },
    { data: configFinanceira },
    { data: contaInterna },
    { data: folhasData },
    { data: pagamentosData },
    { data: regrasParcelasData },
  ] = await Promise.all([
    supabase.from("pessoas").select("id,nome,cpf,telefone,email").eq("id", pessoaId).maybeSingle(),
    colaborador.tipo_vinculo_id
      ? supabase
          .from("tipos_vinculo_colaborador")
          .select("id,nome")
          .eq("id", Number(colaborador.tipo_vinculo_id))
          .maybeSingle()
      : Promise.resolve({ data: null as TipoVinculoRow | null, error: null }),
    supabase
      .from("colaborador_funcoes")
      .select("colaborador_id,funcao_id,ativo,principal")
      .eq("colaborador_id", colaboradorId),
    supabase
      .from("colaborador_config_financeira")
      .select(
        "colaborador_id,gera_folha,tipo_remuneracao,salario_base_centavos,valor_hora_centavos,politica_desconto_cartao,politica_corte_cartao",
      )
      .eq("colaborador_id", colaboradorId)
      .maybeSingle(),
    supabase
      .from("credito_conexao_contas")
      .select("id,tipo_conta,pessoa_titular_id,descricao_exibicao,dia_fechamento,dia_vencimento,ativo")
      .eq("pessoa_titular_id", pessoaId)
      .eq("tipo_conta", "COLABORADOR")
      .order("ativo", { ascending: false })
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("folha_pagamento_colaborador")
      .select("id,colaborador_id,competencia_ano_mes,status,data_fechamento,data_pagamento,observacoes")
      .eq("colaborador_id", colaboradorId)
      .order("competencia_ano_mes", { ascending: false })
      .order("id", { ascending: false })
      .limit(24),
    supabase
      .from("colaborador_pagamentos")
      .select(
        "id,colaborador_id,tipo,competencia_ano_mes,data_pagamento,valor_centavos,folha_pagamento_colaborador_id,folha_evento_id,observacoes",
      )
      .eq("colaborador_id", colaboradorId)
      .order("competencia_ano_mes", { ascending: false })
      .order("id", { ascending: false })
      .limit(48),
    supabase
      .from("credito_conexao_regras_parcelas")
      .select("id")
      .eq("tipo_conta", "COLABORADOR")
      .eq("ativo", true)
      .limit(1),
  ]);

  const funcoes = (funcoesRel ?? []) as FuncaoRelRow[];
  const funcaoIds = Array.from(
    new Set(funcoes.map((item) => Number(item.funcao_id)).filter((value) => Number.isFinite(value) && value > 0)),
  );

  const { data: funcoesData } = funcaoIds.length
    ? await supabase.from("funcoes_colaborador").select("id,nome").in("id", funcaoIds)
    : { data: [] as FuncaoRow[] };

  const funcoesById = new Map<number, string>();
  for (const funcao of (funcoesData ?? []) as FuncaoRow[]) {
    funcoesById.set(funcao.id, funcao.nome?.trim() || `Funcao #${funcao.id}`);
  }

  const contaId = toPositiveInt(contaInterna?.id);
  const { data: faturasData } = contaId
    ? await supabase
        .from("credito_conexao_faturas")
        .select(
          "id,conta_conexao_id,periodo_referencia,data_fechamento,data_vencimento,valor_total_centavos,valor_taxas_centavos,status,cobranca_id,folha_pagamento_id",
        )
        .eq("conta_conexao_id", contaId)
        .order("periodo_referencia", { ascending: false })
        .order("id", { ascending: false })
    : { data: [] as FaturaRow[] };

  const folhas = (folhasData ?? []) as FolhaRow[];
  const folhaIds = folhas.map((item) => item.id);
  const { data: folhaEventosData } = folhaIds.length
    ? await supabase
        .from("folha_pagamento_eventos")
        .select("folha_pagamento_id,tipo,descricao,valor_centavos,origem_tipo,origem_id")
        .in("folha_pagamento_id", folhaIds)
    : { data: [] as FolhaEventoRow[] };

  const folhaEventosByFolhaId = new Map<number, FolhaEventoRow[]>();
  for (const evento of (folhaEventosData ?? []) as FolhaEventoRow[]) {
    const list = folhaEventosByFolhaId.get(evento.folha_pagamento_id) ?? [];
    list.push(evento);
    folhaEventosByFolhaId.set(evento.folha_pagamento_id, list);
  }

  return {
    colaborador: colaborador as ColaboradorRow,
    pessoa: (pessoa ?? null) as PessoaRow,
    tipoVinculo: tipoVinculo?.nome?.trim() || null,
    funcaoPrincipal: resolverFuncaoPrincipal(funcoes, funcoesById),
    configFinanceira: (configFinanceira ?? null) as ConfigFinanceiraRow | null,
    contaInterna: (contaInterna ?? null) as ContaInternaRow | null,
    faturas: (faturasData ?? []) as FaturaRow[],
    folhas,
    pagamentos: (pagamentosData ?? []) as PagamentoRow[],
    folhaEventosByFolhaId,
    permiteParcelamento: Boolean((regrasParcelasData ?? []).length),
  };
}

async function buscarOuCriarFolhaCompetencia(
  supabase: SupabaseAdmin,
  colaboradorId: number,
  competencia: string,
) {
  const { data: existente, error: existenteError } = await supabase
    .from("folha_pagamento_colaborador")
    .select("id,colaborador_id,competencia_ano_mes,status")
    .eq("colaborador_id", colaboradorId)
    .eq("competencia_ano_mes", competencia)
    .maybeSingle();

  if (existenteError) {
    throw new Error(`falha_buscar_folha:${existenteError.message}`);
  }

  if (existente) {
    return existente as Pick<FolhaRow, "id" | "colaborador_id" | "competencia_ano_mes" | "status">;
  }

  const { data: criada, error: createError } = await supabase
    .from("folha_pagamento_colaborador")
    .insert({ colaborador_id: colaboradorId, competencia_ano_mes: competencia, status: "ABERTA" })
    .select("id,colaborador_id,competencia_ano_mes,status")
    .single();

  if (createError || !criada) {
    throw new Error(`falha_criar_folha:${createError?.message ?? "sem_retorno"}`);
  }

  return criada as Pick<FolhaRow, "id" | "colaborador_id" | "competencia_ano_mes" | "status">;
}

async function validarContaFinanceira(
  supabase: SupabaseAdmin,
  contaFinanceiraId: number | null | undefined,
) {
  if (!contaFinanceiraId) return;

  const { data: conta, error } = await supabase
    .from("contas_financeiras")
    .select("id")
    .eq("id", contaFinanceiraId)
    .maybeSingle();

  if (error) {
    throw new Error(`falha_validar_conta_financeira:${error.message}`);
  }

  if (!conta) {
    throw new Error("conta_financeira_invalida");
  }
}

export async function getColaboradorFinanceiroPainel(
  supabase: SupabaseAdmin,
  colaboradorId: number,
): Promise<ColaboradorFinanceiroPainel | null> {
  const bundle = await loadColaboradorFinanceiroBundle(supabase, colaboradorId);
  if (!bundle) return null;

  const competencias = mapCompetencias(bundle);
  const competenciaMesAtual = competenciaAtual();
  const resumoMesAtual =
    competencias.find((item) => item.competencia === competenciaMesAtual) ?? buildEmptyCompetencia(competenciaMesAtual);

  const faturasAbertas = bundle.faturas.filter((item) => FATURA_STATUS_ABERTA.has(normalizeStatus(item.status)));
  const saldoEmAbertoCentavos = faturasAbertas.reduce(
    (acc, item) => acc + Math.max(Number(item.valor_total_centavos ?? 0), 0),
    0,
  );
  const competenciasAbertas = Array.from(
    new Set(
      faturasAbertas
        .map((item) => normalizeCompetencia(item.periodo_referencia))
        .filter((item): item is string => Boolean(item)),
    ),
  ).sort((a, b) => b.localeCompare(a));
  const ultimaFatura = bundle.faturas[0] ?? null;
  const ultimaImportacao =
    bundle.folhas.find((item) => normalizeStatus(item.status) !== "ABERTA") ??
    bundle.faturas.find((item) => toPositiveInt(item.folha_pagamento_id)) ??
    null;
  const adiantamentosResumo = bundle.pagamentos
    .map((item) => mapPagamentoResumo(item))
    .filter((item): item is ColaboradorPagamentoResumo => Boolean(item));
  const adiantamentosMesAtual = adiantamentosResumo.filter((item) => item.competencia === competenciaMesAtual);

  return {
    colaborador: {
      id: bundle.colaborador.id,
      pessoa_id: Number(bundle.colaborador.pessoa_id),
      nome: bundle.pessoa.nome?.trim() || `Colaborador #${bundle.colaborador.id}`,
      cpf: bundle.pessoa.cpf ?? null,
      telefone: bundle.pessoa.telefone ?? null,
      email: bundle.pessoa.email ?? null,
      status_vinculo: bundle.colaborador.ativo === false ? "INATIVO" : "ATIVO",
      tipo_vinculo: bundle.tipoVinculo,
      funcao_principal: bundle.funcaoPrincipal,
    },
    configuracao_pagamento: {
      gera_folha: Boolean(bundle.configFinanceira?.gera_folha),
      tipo_remuneracao: bundle.configFinanceira?.tipo_remuneracao ?? null,
      salario_base_centavos: Math.max(Number(bundle.configFinanceira?.salario_base_centavos ?? 0), 0),
      valor_hora_centavos: Math.max(Number(bundle.configFinanceira?.valor_hora_centavos ?? 0), 0),
      politica_desconto_cartao: bundle.configFinanceira?.politica_desconto_cartao ?? null,
      politica_corte_cartao: bundle.configFinanceira?.politica_corte_cartao ?? null,
    },
    conta_interna: {
      existe: Boolean(bundle.contaInterna?.id),
      id: toPositiveInt(bundle.contaInterna?.id),
      tipo_conta: bundle.contaInterna?.tipo_conta ?? "COLABORADOR",
      descricao_exibicao: bundle.contaInterna?.descricao_exibicao ?? null,
      situacao_atual:
        bundle.contaInterna?.ativo === false ? "INATIVA" : bundle.contaInterna?.id ? "ATIVA" : "NAO_CRIADA",
      dia_fechamento: bundle.contaInterna?.dia_fechamento ?? null,
      dia_vencimento: bundle.contaInterna?.dia_vencimento ?? null,
      quantidade_faturas: bundle.faturas.length,
      competencias_abertas: competenciasAbertas,
      quantidade_competencias_abertas: competenciasAbertas.length,
      saldo_em_aberto_centavos: saldoEmAbertoCentavos,
      ultima_fatura_id: ultimaFatura?.id ?? null,
      ultima_fatura_competencia: normalizeCompetencia(ultimaFatura?.periodo_referencia) ?? null,
      ultima_fatura_status: ultimaFatura?.status ?? null,
      ultima_importacao_folha: ultimaImportacao
        ? {
            referencia_id: toPositiveInt((ultimaImportacao as { id?: unknown }).id) ?? null,
            competencia:
              normalizeCompetencia((ultimaImportacao as { competencia_ano_mes?: string | null }).competencia_ano_mes) ??
              normalizeCompetencia((ultimaImportacao as { periodo_referencia?: string | null }).periodo_referencia) ??
              null,
            status: (ultimaImportacao as { status?: string | null }).status ?? null,
          }
        : null,
      importacao_pendente:
        resumoMesAtual.consumo_conta_interna_centavos > 0 && !resumoMesAtual.folha_pagamento_colaborador_id,
      permite_parcelamento: bundle.permiteParcelamento,
    },
    competencia_atual: competenciaMesAtual,
    resumo_mes_atual: resumoMesAtual,
    ultimas_competencias: competencias.slice(0, 6),
    totais_mes_atual: {
      adiantamentos_centavos: resumoMesAtual.adiantamentos_centavos,
      importado_conta_interna_centavos: resumoMesAtual.consumo_conta_interna_centavos,
      saldo_liquido_estimado_centavos: resumoMesAtual.saldo_liquido_centavos,
    },
    adiantamentos_mes_atual: adiantamentosMesAtual,
    adiantamentos_recentes: adiantamentosResumo.slice(0, 8),
    referencias: {
      colaborador_id: bundle.colaborador.id,
      pessoa_id: Number(bundle.colaborador.pessoa_id),
      conta_interna_id: toPositiveInt(bundle.contaInterna?.id),
      ultima_fatura_id: ultimaFatura?.id ?? null,
      folha_pagamento_colaborador_id: resumoMesAtual.folha_pagamento_colaborador_id,
      folha_pagamento_id: resumoMesAtual.folha_pagamento_id,
    },
  };
}

export async function getColaboradorCompetencias(
  supabase: SupabaseAdmin,
  colaboradorId: number,
  competencia?: string | null,
) {
  const bundle = await loadColaboradorFinanceiroBundle(supabase, colaboradorId);
  if (!bundle) return null;

  const competencias = mapCompetencias(bundle);
  const competenciaFiltro = normalizeCompetencia(competencia);

  return {
    colaborador_id: colaboradorId,
    competencias: competenciaFiltro
      ? competencias.filter((item) => item.competencia === competenciaFiltro)
      : competencias,
  };
}

export async function getColaboradorContaInterna(
  supabase: SupabaseAdmin,
  colaboradorId: number,
): Promise<ColaboradorContaInternaResponse | null> {
  const painel = await getColaboradorFinanceiroPainel(supabase, colaboradorId);
  if (!painel) return null;

  const bundle = await loadColaboradorFinanceiroBundle(supabase, colaboradorId);
  if (!bundle) return null;

  const competencias = mapCompetencias(bundle);
  const competenciaById = new Map<number, ColaboradorCompetenciaResumo>();
  for (const item of competencias) {
    if (item.fatura_id) {
      competenciaById.set(item.fatura_id, item);
    }
  }

  return {
    colaborador: painel.colaborador,
    conta_interna: painel.conta_interna,
    resumo: {
      saldo_em_aberto_centavos: painel.conta_interna.saldo_em_aberto_centavos,
      quantidade_faturas: painel.conta_interna.quantidade_faturas,
      competencias_abertas: painel.conta_interna.competencias_abertas,
      ultima_fatura_id: painel.conta_interna.ultima_fatura_id,
    },
    faturas: bundle.faturas.map((fatura) => {
      const resumoCompetencia = competenciaById.get(fatura.id) ?? null;
      return {
        id: fatura.id,
        competencia: normalizeCompetencia(fatura.periodo_referencia) ?? "-",
        valor_total_centavos: Math.max(Number(fatura.valor_total_centavos ?? 0), 0),
        valor_taxas_centavos: Math.max(Number(fatura.valor_taxas_centavos ?? 0), 0),
        status: fatura.status ?? "SEM_STATUS",
        data_fechamento: fatura.data_fechamento ?? null,
        data_vencimento: fatura.data_vencimento ?? null,
        folha_pagamento_id: fatura.folha_pagamento_id ?? null,
        folha_pagamento_colaborador_id: resumoCompetencia?.folha_pagamento_colaborador_id ?? null,
        status_importacao_folha: resumoCompetencia?.status_importacao_folha ?? "SEM_MOVIMENTO",
        cobranca_id: fatura.cobranca_id ?? null,
      };
    }),
  };
}

export async function getColaboradorAdiantamentos(
  supabase: SupabaseAdmin,
  colaboradorId: number,
  competencia?: string | null,
): Promise<ColaboradorAdiantamentosResponse | null> {
  const bundle = await loadColaboradorFinanceiroBundle(supabase, colaboradorId);
  if (!bundle) return null;

  const competenciaFiltro = normalizeCompetencia(competencia);
  const adiantamentos = bundle.pagamentos
    .map((item) => mapPagamentoResumo(item))
    .filter((item): item is ColaboradorPagamentoResumo => Boolean(item));

  const adiantamentosCompetencia = competenciaFiltro
    ? adiantamentos.filter((item) => item.competencia === competenciaFiltro)
    : adiantamentos;

  return {
    colaborador_id: colaboradorId,
    competencia: competenciaFiltro,
    total_adiantamentos_centavos: adiantamentosCompetencia.reduce((acc, item) => acc + item.valor_centavos, 0),
    adiantamentos: adiantamentosCompetencia,
    recentes: adiantamentos.slice(0, 8),
  };
}

export async function registrarAdiantamentoColaborador(
  supabase: SupabaseAdmin,
  input: RegistrarAdiantamentoColaboradorInput,
) {
  const competencia = normalizeCompetencia(input.competencia);
  if (!competencia) throw new Error("competencia_invalida");
  if (!isIsoDate(input.data_pagamento)) throw new Error("data_pagamento_invalida");
  if (!Number.isFinite(input.valor_centavos) || input.valor_centavos <= 0) {
    throw new Error("valor_centavos_invalido");
  }

  const bundle = await loadColaboradorFinanceiroBundle(supabase, input.colaborador_id);
  if (!bundle) throw new Error("colaborador_nao_encontrado");

  await validarContaFinanceira(supabase, input.conta_financeira_id);

  const folha = await buscarOuCriarFolhaCompetencia(supabase, input.colaborador_id, competencia);
  if (normalizeStatus(folha.status) === "PAGA") {
    throw new Error("folha_paga_nao_permite_novos_eventos");
  }

  const observacoes = input.observacao?.trim() || null;
  const { data: pagamentoCriado, error: pagamentoError } = await supabase
    .from("colaborador_pagamentos")
    .insert({
      colaborador_id: input.colaborador_id,
      tipo: "ADIANTAMENTO",
      competencia_ano_mes: competencia,
      data_pagamento: input.data_pagamento,
      valor_centavos: Math.trunc(input.valor_centavos),
      conta_financeira_id: input.conta_financeira_id ?? null,
      observacoes,
      folha_pagamento_colaborador_id: folha.id,
    })
    .select(
      "id,colaborador_id,tipo,competencia_ano_mes,data_pagamento,valor_centavos,folha_pagamento_colaborador_id,folha_evento_id,observacoes",
    )
    .single();

  if (pagamentoError || !pagamentoCriado) {
    throw new Error(`falha_criar_pagamento:${pagamentoError?.message ?? "sem_retorno"}`);
  }

  const descricaoEvento = `Desconto por adiantamento registrado em ${input.data_pagamento}`;
  const { data: eventoCriado, error: eventoError } = await supabase
    .from("folha_pagamento_eventos")
    .insert({
      folha_pagamento_id: folha.id,
      tipo: "DESCONTO",
      descricao: descricaoEvento,
      valor_centavos: Math.trunc(input.valor_centavos),
      origem_tipo: "COLABORADOR_PAGAMENTO",
      origem_id: Number(pagamentoCriado.id),
    })
    .select("id")
    .single();

  if (eventoError || !eventoCriado) {
    await supabase.from("colaborador_pagamentos").delete().eq("id", Number(pagamentoCriado.id));
    throw new Error(`falha_criar_evento_folha:${eventoError?.message ?? "sem_retorno"}`);
  }

  const { error: updatePagamentoError } = await supabase
    .from("colaborador_pagamentos")
    .update({ folha_evento_id: Number(eventoCriado.id) })
    .eq("id", Number(pagamentoCriado.id));

  if (updatePagamentoError) {
    await supabase.from("folha_pagamento_eventos").delete().eq("id", Number(eventoCriado.id));
    await supabase.from("colaborador_pagamentos").delete().eq("id", Number(pagamentoCriado.id));
    throw new Error(`falha_atualizar_pagamento_com_evento_folha:${updatePagamentoError.message}`);
  }

  const { data: pagamentoFinal, error: pagamentoFinalError } = await supabase
    .from("colaborador_pagamentos")
    .select(
      "id,colaborador_id,tipo,competencia_ano_mes,data_pagamento,valor_centavos,folha_pagamento_colaborador_id,folha_evento_id,observacoes",
    )
    .eq("id", Number(pagamentoCriado.id))
    .maybeSingle();

  if (pagamentoFinalError || !pagamentoFinal) {
    throw new Error(`falha_buscar_pagamento_final:${pagamentoFinalError?.message ?? "sem_retorno"}`);
  }

  return mapPagamentoResumo(pagamentoFinal as PagamentoRow);
}
