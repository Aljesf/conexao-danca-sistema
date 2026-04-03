import { apiFetch } from "./api";

export type PessoaBuscaItem = {
  id: number;
  nome: string;
  email: string | null;
};

export type CafeCompradorTipo =
  | "NAO_IDENTIFICADO"
  | "ALUNO"
  | "COLABORADOR"
  | "PESSOA_AVULSA";

export type CategoriaCafe = {
  id: number;
  nome: string;
  slug: string | null;
  subcategorias: Array<{
    id: number;
    categoria_id: number;
    nome: string;
    slug: string | null;
  }>;
};

export type ProdutoCatalogo = {
  id: number;
  nome: string;
  preco_venda_centavos: number;
  unidade_venda: string | null;
  categoria_id: number | null;
  subcategoria_id: number | null;
  categoria_nome: string | null;
  subcategoria_nome: string | null;
  ativo: boolean;
};

export type PagamentoOpcao = {
  id: number | null;
  codigo: string;
  nome: string | null;
  label: string;
  tipo_fluxo: "IMEDIATO" | "CARTAO_EXTERNO" | "CONTA_INTERNA_ALUNO" | "CONTA_INTERNA_COLABORADOR";
  exige_conta_conexao: boolean;
  exige_troco: boolean;
  exige_maquininha: boolean;
  habilitado: boolean;
  motivo_bloqueio: string | null;
};

export type ContaInternaInfo = {
  elegivel: boolean;
  tipo: "ALUNO" | "COLABORADOR" | null;
  conta_id: number | null;
  titular_pessoa_id: number | null;
  motivo: string | null;
};

export type PagamentosCafeResponse = {
  centro_custo_id: number | null;
  comprador: {
    pessoa_id: number | null;
    tipo: CafeCompradorTipo;
  };
  conta_interna: ContaInternaInfo | null;
  opcoes: PagamentoOpcao[];
};

export type TabelaPrecoOpcao = {
  id: number;
  nome: string;
  codigo: string | null;
  descricao: string | null;
  padrao: boolean;
};

export type HistoricoVendaItem = {
  id: number;
  pagador_nome: string | null;
  colaborador_nome: string | null;
  comprador_tipo: string | null;
  data_operacao: string;
  data_hora_venda: string | null;
  forma_pagamento: string | null;
  operador_nome: string | null;
  operador_user_id: string | null;
  valor_total_centavos: number;
  valor_pago_centavos: number;
  valor_em_aberto_centavos: number;
  status_pagamento: string;
  status_financeiro: string | null;
};

export type ResumoFormaPagamento = {
  codigo: string;
  label: string;
  quantidade: number;
  total_centavos: number;
};

export type ResumoDia = {
  quantidade_vendas: number;
  total_centavos: number;
  ticket_medio_centavos: number;
  por_forma_pagamento: ResumoFormaPagamento[];
};

export type VendaDetalhe = {
  id: number;
  numero_legivel: string;
  created_at: string;
  operador: {
    nome: string | null;
    user_id: string | null;
  };
  competencia: string | null;
  comprador: {
    pessoa_id: number | null;
    nome: string | null;
  };
  perfil_resolvido: string | null;
  forma_pagamento: string | null;
  tabela_preco: string | null;
  centro_custo: {
    id: number | null;
    nome: string | null;
  };
  total_centavos: number;
  cobranca_id: number | null;
  fatura_id: number | null;
  conta_interna_id: number | null;
  itens: Array<{
    produto_id: number | null;
    produto_nome: string;
    quantidade: number;
    valor_unitario_centavos: number;
    subtotal_centavos: number;
  }>;
};

export type CriarVendaPayload = {
  compradorPessoaId: number;
  compradorTipo: CafeCompradorTipo;
  dataHoraVenda: string;
  formaPagamento: PagamentoOpcao;
  tabelaPrecoId: number | null;
  contaInternaId: number | null;
  competenciaAnoMes: string | null;
  valorRecebidoCentavos: number | null;
  trocoCentavos: number | null;
  observacaoVenda: string | null;
  itens: Array<{
    produto_id: number;
    nome: string;
    quantidade: number;
    valor_unitario_centavos: number;
    observacao: string | null;
  }>;
};

type PessoasBuscaResponse = {
  items?: Array<{
    id?: number;
    nome?: string;
    email?: string | null;
  }>;
};

type CategoriasResponse = {
  categorias?: Array<{
    id?: number;
    nome?: string;
    slug?: string | null;
    subcategorias?: Array<{
      id?: number;
      categoria_id?: number;
      nome?: string;
      slug?: string | null;
    }>;
  }>;
};

type ProdutosResponse = {
  data?: {
    items?: Array<{
      id?: number;
      nome?: string;
      preco_venda_centavos?: number;
      unidade_venda?: string | null;
      categoria_id?: number | null;
      subcategoria_id?: number | null;
      categoria_nome?: string | null;
      subcategoria_nome?: string | null;
      ativo?: boolean;
    }>;
  };
};

type PagamentosResponse = {
  centro_custo_id?: number | null;
  comprador?: {
    pessoa_id?: number | null;
    tipo?: CafeCompradorTipo;
  };
  conta_interna?: ContaInternaInfo | null;
  opcoes?: Array<PagamentoOpcao>;
};

type TabelasPrecoResponse = {
  tabela_preco_atual_id?: number | null;
  itens?: Array<{
    id?: number;
    nome?: string;
    codigo?: string | null;
    descricao?: string | null;
    padrao?: boolean;
  }>;
  data?: Array<{
    id?: number;
    nome?: string;
    codigo?: string | null;
    descricao?: string | null;
    is_default?: boolean;
  }>;
};

type HistoricoResponse = {
  data?: HistoricoVendaItem[];
};

type VendaDetalheResponse = {
  venda?: VendaDetalhe;
};

type CriarVendaResponse = {
  data?: {
    id?: number;
  };
};

export function todayIso(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function currentCompetencia(): string {
  return todayIso().slice(0, 7);
}

export function formatMoney(valueInCentavos: number): string {
  return (valueInCentavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatVendaHora(value: string | null | undefined): string {
  if (!value) return "--:--";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatFormaPagamento(value: string | null | undefined): string {
  const normalized = value?.trim().toUpperCase();

  switch (normalized) {
    case "DINHEIRO":
      return "Dinheiro";
    case "PIX":
      return "Pix";
    case "CARTAO":
    case "CREDITO_AVISTA":
      return "Cartao";
    case "CONTA_INTERNA":
    case "CONTA_INTERNA_COLABORADOR":
    case "CARTAO_CONEXAO_COLAB":
    case "CARTAO_CONEXAO_COLABORADOR":
      return "Conta interna";
    case "CARTAO_CONEXAO_ALUNO":
      return "Conta interna do aluno";
    default:
      return value?.trim() || "Nao informado";
  }
}

export function formatPerfil(value: string | null | undefined): string {
  const normalized = value?.trim().toUpperCase();

  switch (normalized) {
    case "ALUNO":
      return "Aluno";
    case "COLABORADOR":
      return "Colaborador";
    case "PESSOA_AVULSA":
      return "Pessoa avulsa";
    default:
      return "Nao identificado";
  }
}

export function formatPdvErrorMessage(message: string): string {
  switch (message) {
    case "AUTH_SESSION_EXPIRED":
      return "Sessao expirada. Faca login novamente.";
    case "comprador_pessoa_id_obrigatorio":
      return "Selecione a pessoa da venda antes de finalizar.";
    case "conta_interna_exige_colaborador":
      return "A conta interna do colaborador exige um comprador elegivel.";
    case "conta_interna_aluno_nao_encontrada":
      return "A API nao encontrou conta interna ativa para este aluno.";
    case "conta_interna_colaborador_nao_encontrada":
      return "A API nao encontrou conta interna ativa para este colaborador.";
    case "competencia_obrigatoria_para_conta_interna":
      return "Defina a competencia antes de finalizar em conta interna.";
    case "data_hora_venda_obrigatoria":
      return "A data e hora da venda sao obrigatorias.";
    case "itens_obrigatorios":
      return "Adicione ao menos um item antes de finalizar.";
    default:
      return message;
  }
}

function buildQuery(params: Record<string, string | number | null | undefined>): string {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    query.set(key, String(value));
  }

  return query.toString();
}

export async function buscarPessoas(query: string): Promise<PessoaBuscaItem[]> {
  const payload = await apiFetch<PessoasBuscaResponse>(
    `/api/pessoas/busca?${buildQuery({ query, limit: 8 })}`,
  );

  return (payload.items ?? []).map((item) => ({
    id: Number(item.id ?? 0),
    nome: String(item.nome ?? "Pessoa"),
    email: item.email ?? null,
  }));
}

export async function carregarCategorias(): Promise<CategoriaCafe[]> {
  const payload = await apiFetch<CategoriasResponse>("/api/cafe/categorias");

  return (payload.categorias ?? []).map((categoria) => ({
    id: Number(categoria.id ?? 0),
    nome: String(categoria.nome ?? "Categoria"),
    slug: categoria.slug ?? null,
    subcategorias: (categoria.subcategorias ?? []).map((subcategoria) => ({
      id: Number(subcategoria.id ?? 0),
      categoria_id: Number(subcategoria.categoria_id ?? categoria.id ?? 0),
      nome: String(subcategoria.nome ?? "Subcategoria"),
      slug: subcategoria.slug ?? null,
    })),
  }));
}

export async function carregarProdutos(params: {
  search?: string;
  categoriaId?: number | null;
  subcategoriaId?: number | null;
  tabelaPrecoId?: number | null;
  ids?: number[];
}): Promise<ProdutoCatalogo[]> {
  const query = buildQuery({
    search: params.search?.trim() || undefined,
    categoria_id: params.categoriaId ?? undefined,
    subcategoria_id: params.subcategoriaId ?? undefined,
    tabela_preco_id: params.tabelaPrecoId ?? undefined,
    ids: params.ids && params.ids.length > 0 ? params.ids.join(",") : undefined,
    page: 1,
    pageSize: params.ids && params.ids.length > 0 ? Math.max(params.ids.length, 20) : 60,
  });

  const payload = await apiFetch<ProdutosResponse>(`/api/cafe/produtos?${query}`);

  return (payload.data?.items ?? []).map((item) => ({
    id: Number(item.id ?? 0),
    nome: String(item.nome ?? "Produto"),
    preco_venda_centavos: Number(item.preco_venda_centavos ?? 0),
    unidade_venda: item.unidade_venda ?? null,
    categoria_id: item.categoria_id ?? null,
    subcategoria_id: item.subcategoria_id ?? null,
    categoria_nome: item.categoria_nome ?? null,
    subcategoria_nome: item.subcategoria_nome ?? null,
    ativo: item.ativo ?? true,
  }));
}

export async function carregarPagamentos(params: {
  compradorPessoaId?: number | null;
  compradorTipo?: CafeCompradorTipo | null;
}): Promise<PagamentosCafeResponse> {
  const query = buildQuery({
    comprador_pessoa_id: params.compradorPessoaId ?? undefined,
    comprador_tipo: params.compradorTipo ?? undefined,
  });

  const payload = await apiFetch<PagamentosResponse>(`/api/cafe/pagamentos/opcoes?${query}`);

  return {
    centro_custo_id: payload.centro_custo_id ?? null,
    comprador: {
      pessoa_id: payload.comprador?.pessoa_id ?? null,
      tipo: payload.comprador?.tipo ?? "NAO_IDENTIFICADO",
    },
    conta_interna: payload.conta_interna ?? null,
    opcoes: payload.opcoes ?? [],
  };
}

export async function carregarTabelasPreco(params: {
  compradorPessoaId?: number | null;
  compradorTipo?: CafeCompradorTipo | null;
}): Promise<{ tabelaPrecoAtualId: number | null; itens: TabelaPrecoOpcao[] }> {
  const query = buildQuery({
    comprador_pessoa_id: params.compradorPessoaId ?? undefined,
    comprador_tipo: params.compradorTipo ?? undefined,
  });

  const payload = await apiFetch<TabelasPrecoResponse>(`/api/cafe/tabelas-preco?${query}`);

  const itens = Array.isArray(payload.itens)
    ? payload.itens
    : (payload.data ?? []).map((item) => ({
        id: Number(item.id ?? 0),
        nome: String(item.nome ?? "Tabela"),
        codigo: item.codigo ?? null,
        descricao: item.descricao ?? null,
        padrao: Boolean(item.is_default),
      }));

  return {
    tabelaPrecoAtualId: payload.tabela_preco_atual_id ?? null,
    itens: itens.map((item) => ({
      id: Number(item.id ?? 0),
      nome: String(item.nome ?? "Tabela"),
      codigo: item.codigo ?? null,
      descricao: item.descricao ?? null,
      padrao: Boolean(item.padrao),
    })),
  };
}

export async function carregarHistoricoDia(dateIso = todayIso()): Promise<HistoricoVendaItem[]> {
  const query = buildQuery({
    data_inicial: dateIso,
    data_final: dateIso,
  });

  const payload = await apiFetch<HistoricoResponse>(`/api/cafe/caixa?${query}`);
  return payload.data ?? [];
}

export function calcularResumoDia(vendas: HistoricoVendaItem[]): ResumoDia {
  const vendasValidas = vendas.filter((item) => item.status_pagamento?.toUpperCase() !== "CANCELADO");
  const totalCentavos = vendasValidas.reduce((total, item) => total + item.valor_total_centavos, 0);
  const porFormaPagamentoMap = new Map<string, ResumoFormaPagamento>();

  for (const venda of vendasValidas) {
    const codigo = venda.forma_pagamento?.trim().toUpperCase() || "NAO_INFORMADO";
    const current = porFormaPagamentoMap.get(codigo);

    if (current) {
      current.quantidade += 1;
      current.total_centavos += venda.valor_total_centavos;
      continue;
    }

    porFormaPagamentoMap.set(codigo, {
      codigo,
      label: formatFormaPagamento(venda.forma_pagamento),
      quantidade: 1,
      total_centavos: venda.valor_total_centavos,
    });
  }

  return {
    quantidade_vendas: vendasValidas.length,
    total_centavos: totalCentavos,
    ticket_medio_centavos: vendasValidas.length > 0 ? Math.round(totalCentavos / vendasValidas.length) : 0,
    por_forma_pagamento: Array.from(porFormaPagamentoMap.values()).sort(
      (left, right) => right.total_centavos - left.total_centavos,
    ),
  };
}

export async function carregarVendaDetalhe(vendaId: number): Promise<VendaDetalhe> {
  const payload = await apiFetch<VendaDetalheResponse>(`/api/cafe/vendas/${vendaId}`);

  if (!payload.venda) {
    throw new Error("Venda nao encontrada.");
  }

  return payload.venda;
}

export async function criarVenda(payload: CriarVendaPayload): Promise<{ id: number }> {
  const response = await apiFetch<CriarVendaResponse>("/api/cafe/vendas", {
    method: "POST",
    body: JSON.stringify({
      data_operacao: todayIso(),
      data_hora_venda: payload.dataHoraVenda,
      origem_operacao: "PDV",
      comprador_tipo: payload.compradorTipo,
      comprador_id: payload.compradorPessoaId,
      comprador_pessoa_id: payload.compradorPessoaId,
      pagador_pessoa_id: payload.compradorPessoaId,
      cliente_pessoa_id: payload.compradorPessoaId,
      colaborador_pessoa_id:
        payload.compradorTipo === "COLABORADOR" ? payload.compradorPessoaId : null,
      tipo_quitacao:
        payload.formaPagamento.tipo_fluxo === "CONTA_INTERNA_COLABORADOR"
          ? "CONTA_INTERNA_COLABORADOR"
          : payload.formaPagamento.tipo_fluxo === "CONTA_INTERNA_ALUNO"
            ? "CARTAO_CONEXAO"
            : "IMEDIATA",
      forma_pagamento_id: payload.formaPagamento.id,
      forma_pagamento_saas_id: payload.formaPagamento.id,
      forma_pagamento_codigo: payload.formaPagamento.codigo,
      metodo_pagamento: payload.formaPagamento.codigo,
      tabela_preco_id: payload.tabelaPrecoId,
      conta_conexao_id: payload.contaInternaId,
      conta_interna_id: payload.contaInternaId,
      competencia_ano_mes: payload.formaPagamento.exige_conta_conexao ? payload.competenciaAnoMes : null,
      data_competencia: payload.formaPagamento.exige_conta_conexao ? payload.competenciaAnoMes : null,
      valor_pago_centavos:
        payload.formaPagamento.tipo_fluxo === "IMEDIATO" || payload.formaPagamento.tipo_fluxo === "CARTAO_EXTERNO"
          ? payload.itens.reduce((total, item) => total + item.valor_unitario_centavos * item.quantidade, 0)
          : 0,
      valor_recebido_centavos: payload.valorRecebidoCentavos,
      troco_centavos: payload.trocoCentavos,
      observacoes: payload.observacaoVenda,
      observacoes_internas: payload.observacaoVenda ? `PDV mobile: ${payload.observacaoVenda}` : "PDV mobile",
      itens: payload.itens.map((item) => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        valor_unitario_centavos: item.valor_unitario_centavos,
        descricao_snapshot: item.observacao
          ? `${item.nome} | Obs: ${item.observacao}`
          : item.nome,
      })),
    }),
  });

  const id = Number(response.data?.id ?? 0);
  if (!id) {
    throw new Error("Falha ao confirmar a venda no PDV.");
  }

  return { id };
}
