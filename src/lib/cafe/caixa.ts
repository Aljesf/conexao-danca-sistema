import { upsertLancamentoPorCobranca } from "@/lib/credito-conexao/upsertLancamentoPorCobranca";
import { recalcularComprasFatura, vincularLancamentoNaFatura } from "@/lib/financeiro/creditoConexaoFaturas";
import {
  aplicarFluxoFinanceiroVendaCafe,
  CAFE_COMPRADOR_TIPO as CAFE_COMPRADOR_TIPO_FINANCEIRO,
  CAFE_FLUXO_FINANCEIRO,
  criarCobrancaCafe,
} from "@/lib/cafe/financeiro";

export const CAFE_TIPO_QUITACAO = {
  IMEDIATA: "IMEDIATA",
  PARCIAL: "PARCIAL",
  CONTA_INTERNA_COLABORADOR: "CONTA_INTERNA_COLABORADOR",
  CONTA_INTERNA: "CONTA_INTERNA",
  CARTAO_CONEXAO: "CARTAO_CONEXAO",
} as const;

export const CAFE_TIPO_COMPRADOR = {
  SEM_VINCULO: "SEM_VINCULO",
  NAO_IDENTIFICADO: "NAO_IDENTIFICADO",
  PESSOA_AVULSA: "PESSOA_AVULSA",
  ALUNO: "ALUNO",
  COLABORADOR: "COLABORADOR",
  CARGO_SETOR: "CARGO_SETOR",
} as const;

export const CAFE_FORMAS_PAGAMENTO = {
  DINHEIRO: "DINHEIRO",
  PIX: "PIX",
  CARTAO: "CARTAO",
  CREDITO_AVISTA: "CREDITO_AVISTA",
  TICKET: "TICKET",
  TRANSFERENCIA: "TRANSFERENCIA",
  CONTA_INTERNA_COLABORADOR: "CONTA_INTERNA_COLABORADOR",
  CONTA_INTERNA: "CONTA_INTERNA",
  CREDIARIO_COLAB: "CREDIARIO_COLAB",
  CARTAO_CONEXAO_ALUNO: "CARTAO_CONEXAO_ALUNO",
  CARTAO_CONEXAO_COLABORADOR: "CARTAO_CONEXAO_COLABORADOR",
  CARTAO_CONEXAO_COLAB: "CARTAO_CONEXAO_COLAB",
} as const;

export const CAFE_STATUS_PAGAMENTO = {
  PENDENTE: "PENDENTE",
  PARCIAL: "PARCIAL",
  PAGO: "PAGO",
  FATURADO: "FATURADO",
  CANCELADO: "CANCELADO",
} as const;

type TipoQuitacao = (typeof CAFE_TIPO_QUITACAO)[keyof typeof CAFE_TIPO_QUITACAO];
type StatusPagamento = (typeof CAFE_STATUS_PAGAMENTO)[keyof typeof CAFE_STATUS_PAGAMENTO];
type TipoComprador = (typeof CAFE_TIPO_COMPRADOR)[keyof typeof CAFE_TIPO_COMPRADOR];

type ParsedItem = {
  produto_id: number;
  quantidade: number;
  valor_unitario_centavos: number;
  valor_total_centavos: number;
  descricao_snapshot: string | null;
};

type VendaRow = Record<string, unknown> & {
  id: number;
  pagador_pessoa_id: number | null;
  comprador_pessoa_id?: number | null;
  comprador_tipo?: string | null;
  consumidor_pessoa_id: number | null;
  colaborador_pessoa_id: number | null;
  data_operacao: string;
  data_competencia: string | null;
  competencia_ano_mes?: string | null;
  tipo_quitacao: TipoQuitacao;
  status_pagamento: StatusPagamento;
  status_financeiro?: string | null;
  valor_total_centavos: number;
  valor_pago_centavos: number;
  valor_em_aberto_centavos: number;
  cobranca_id: number | null;
  forma_pagamento: string | null;
  forma_pagamento_id?: number | null;
  conta_conexao_id?: number | null;
  recebimento_id?: number | null;
  movimento_financeiro_id?: number | null;
  origem_financeira?: string | null;
  observacao_financeira?: string | null;
  observacoes: string | null;
  observacoes_internas: string | null;
  created_at: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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

function parseCentavos(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value !== "string") return null;

  const raw = value.trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return Math.trunc(Number(raw));

  const normalized = raw.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 100);
}

function pickInt(record: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const parsed = asInt(record[key]);
    if (parsed !== null) return parsed;
  }
  return null;
}

function pickCentavos(record: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const parsed = parseCentavos(record[key]);
    if (parsed !== null) return parsed;
  }
  return null;
}

function nowIso(): string {
  return new Date().toISOString();
}

function todayIso(): string {
  return nowIso().slice(0, 10);
}

function isIsoDate(value: string | null | undefined): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isCompetencia(value: string | null | undefined): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}$/.test(value);
}

function competenciaFromDate(dateIso: string): string {
  return dateIso.slice(0, 7);
}

function buildVencimentoFromCompetencia(competencia: string, diaVencimento: number | null): string {
  const [anoRaw, mesRaw] = competencia.split("-");
  const ano = Number(anoRaw);
  const mes = Number(mesRaw);
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const diaBase = diaVencimento && Number.isFinite(diaVencimento) ? Math.trunc(diaVencimento) : 12;
  const dia = Math.max(1, Math.min(ultimoDia, diaBase));
  return `${anoRaw}-${mesRaw}-${String(dia).padStart(2, "0")}`;
}

function coerceTipoQuitacao(value: unknown): TipoQuitacao {
  const normalized = asString(value)?.toUpperCase();
  if (normalized === CAFE_TIPO_QUITACAO.PARCIAL) return CAFE_TIPO_QUITACAO.PARCIAL;
  if (normalized === CAFE_TIPO_QUITACAO.CARTAO_CONEXAO) return CAFE_TIPO_QUITACAO.CARTAO_CONEXAO;
  if (normalized === CAFE_TIPO_QUITACAO.CONTA_INTERNA) return CAFE_TIPO_QUITACAO.CONTA_INTERNA;
  if (normalized === CAFE_TIPO_QUITACAO.CONTA_INTERNA_COLABORADOR) {
    return CAFE_TIPO_QUITACAO.CONTA_INTERNA_COLABORADOR;
  }
  return CAFE_TIPO_QUITACAO.IMEDIATA;
}

function coerceTipoComprador(value: unknown): TipoComprador {
  const normalized = asString(value)?.toUpperCase();
  if (normalized === CAFE_TIPO_COMPRADOR.NAO_IDENTIFICADO) return CAFE_TIPO_COMPRADOR.NAO_IDENTIFICADO;
  if (normalized === CAFE_TIPO_COMPRADOR.PESSOA_AVULSA) return CAFE_TIPO_COMPRADOR.PESSOA_AVULSA;
  if (normalized === CAFE_TIPO_COMPRADOR.ALUNO) return CAFE_TIPO_COMPRADOR.ALUNO;
  if (normalized === CAFE_TIPO_COMPRADOR.COLABORADOR) return CAFE_TIPO_COMPRADOR.COLABORADOR;
  if (normalized === CAFE_TIPO_COMPRADOR.CARGO_SETOR) return CAFE_TIPO_COMPRADOR.NAO_IDENTIFICADO;
  return CAFE_TIPO_COMPRADOR.NAO_IDENTIFICADO;
}

function isContaInternaFormaPagamento(value: unknown) {
  const normalized = asString(value)?.toUpperCase();
  return (
    normalized === "CONTA_INTERNA" ||
    normalized === "CARTAO_CONEXAO_COLABORADOR" ||
    normalized === "CARTAO_CONEXAO_COLAB" ||
    normalized === CAFE_FORMAS_PAGAMENTO.CONTA_INTERNA_COLABORADOR ||
    normalized === CAFE_FORMAS_PAGAMENTO.CONTA_INTERNA ||
    normalized === CAFE_FORMAS_PAGAMENTO.CREDIARIO_COLAB
  );
}

function coerceFormaPagamento(value: unknown): string | null {
  const normalized = asString(value)?.toUpperCase();
  if (!normalized) return null;
  if (normalized === "CONTA_INTERNA") {
    return CAFE_FORMAS_PAGAMENTO.CONTA_INTERNA_COLABORADOR;
  }
  if (normalized === "CARTAO_CONEXAO_COLABORADOR") return CAFE_FORMAS_PAGAMENTO.CARTAO_CONEXAO_COLABORADOR;
  if (normalized === "CARTAO_CONEXAO_COLAB") return CAFE_FORMAS_PAGAMENTO.CARTAO_CONEXAO_COLAB;
  if (normalized in CAFE_FORMAS_PAGAMENTO) return normalized;
  return normalized;
}

function isFutureBillingFormaPagamento(value: unknown) {
  const normalized = asString(value)?.toUpperCase();
  return (
    normalized === CAFE_FORMAS_PAGAMENTO.CONTA_INTERNA_COLABORADOR ||
    normalized === CAFE_FORMAS_PAGAMENTO.CONTA_INTERNA ||
    normalized === CAFE_FORMAS_PAGAMENTO.CREDIARIO_COLAB ||
    normalized === CAFE_FORMAS_PAGAMENTO.CARTAO_CONEXAO_ALUNO ||
    normalized === CAFE_FORMAS_PAGAMENTO.CARTAO_CONEXAO_COLABORADOR ||
    normalized === CAFE_FORMAS_PAGAMENTO.CARTAO_CONEXAO_COLAB
  );
}

function mapTipoCompradorParaFinanceiro(value: TipoComprador) {
  if (value === CAFE_TIPO_COMPRADOR.ALUNO) return CAFE_COMPRADOR_TIPO_FINANCEIRO.ALUNO;
  if (value === CAFE_TIPO_COMPRADOR.COLABORADOR) return CAFE_COMPRADOR_TIPO_FINANCEIRO.COLABORADOR;
  if (value === CAFE_TIPO_COMPRADOR.PESSOA_AVULSA) return CAFE_COMPRADOR_TIPO_FINANCEIRO.PESSOA_AVULSA;
  return CAFE_COMPRADOR_TIPO_FINANCEIRO.NAO_IDENTIFICADO;
}

function resolveStatus(valorTotal: number, valorPago: number, tipoQuitacao: TipoQuitacao): StatusPagamento {
  const pago = Math.max(0, valorPago);
  const aberto = Math.max(valorTotal - pago, 0);
  if (tipoQuitacao === CAFE_TIPO_QUITACAO.CONTA_INTERNA_COLABORADOR) {
    return aberto > 0 ? CAFE_STATUS_PAGAMENTO.FATURADO : CAFE_STATUS_PAGAMENTO.PAGO;
  }
  if (aberto <= 0) return CAFE_STATUS_PAGAMENTO.PAGO;
  if (pago > 0) return CAFE_STATUS_PAGAMENTO.PARCIAL;
  return CAFE_STATUS_PAGAMENTO.PENDENTE;
}

async function resolveCafeCentroCustoId(supabase: any): Promise<number | null> {
  const { data, error } = await supabase
    .from("centros_custo")
    .select("id,codigo,nome,contextos_aplicaveis,ativo")
    .eq("ativo", true);

  if (error) throw error;

  const upper = (value: unknown) =>
    typeof value === "string"
      ? value
          .trim()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toUpperCase()
      : "";

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const found =
    rows.find((row) => upper(row.codigo) === "CAF") ??
    rows.find((row) => upper(row.codigo).includes("CAFE")) ??
    rows.find((row) => upper(row.nome).includes("CAFE")) ??
    rows.find((row) => Array.isArray(row.contextos_aplicaveis) && row.contextos_aplicaveis.some((item) => upper(item) === "CAFE"));

  return asInt(found?.id ?? null);
}

async function ensureContaInternaColaborador(supabase: any, colaboradorPessoaId: number) {
  const { data: existente, error: existenteError } = await supabase
    .from("credito_conexao_contas")
    .select("id,pessoa_titular_id,tipo_conta,dia_fechamento,dia_vencimento,ativo")
    .eq("pessoa_titular_id", colaboradorPessoaId)
    .eq("tipo_conta", "COLABORADOR")
    .order("ativo", { ascending: false })
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existenteError) throw existenteError;
  if (existente?.id) {
    return {
      id: Number(existente.id),
      dia_fechamento: asInt(existente.dia_fechamento) ?? 10,
      dia_vencimento: asInt(existente.dia_vencimento) ?? 12,
    };
  }

  const { data: created, error: createError } = await supabase
    .from("credito_conexao_contas")
    .insert({
      pessoa_titular_id: colaboradorPessoaId,
      tipo_conta: "COLABORADOR",
      dia_fechamento: 10,
      dia_vencimento: 12,
      ativo: true,
      descricao_exibicao: "Conta Interna COLABORADOR",
    })
    .select("id,dia_fechamento,dia_vencimento")
    .single();

  if (createError || !created?.id) {
    throw createError ?? new Error("falha_criar_conta_interna_colaborador");
  }

  return {
    id: Number(created.id),
    dia_fechamento: asInt(created.dia_fechamento) ?? 10,
    dia_vencimento: asInt(created.dia_vencimento) ?? 12,
  };
}

async function ensureFaturaAbertaCompetencia(
  supabase: any,
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
    const status = asString(existente.status)?.toUpperCase();
    if (status === "FECHADA" || status === "PAGA") {
      throw new Error("competencia_fechada_para_conta_interna");
    }
    return Number(existente.id);
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

async function enrichVendas(supabase: any, vendas: VendaRow[]) {
  const pessoaIds = Array.from(
    new Set(
      vendas
        .flatMap((item) => [asInt(item.pagador_pessoa_id), asInt(item.colaborador_pessoa_id)])
        .filter((value): value is number => typeof value === "number" && value > 0),
    ),
  );

  const cobrancaIds = Array.from(
    new Set(vendas.map((item) => asInt(item.cobranca_id)).filter((value): value is number => typeof value === "number" && value > 0)),
  );

  const nomePessoa = new Map<number, string>();
  if (pessoaIds.length > 0) {
    const { data: pessoas, error: pessoasError } = await supabase.from("pessoas").select("id,nome").in("id", pessoaIds);
    if (pessoasError) throw pessoasError;
    for (const pessoa of pessoas ?? []) {
      const id = asInt((pessoa as Record<string, unknown>).id);
      if (id) nomePessoa.set(id, asString((pessoa as Record<string, unknown>).nome) ?? `Pessoa #${id}`);
    }
  }

  const faturaPorCobranca = new Map<number, Record<string, unknown>>();
  if (cobrancaIds.length > 0) {
    const { data: lancamentos, error: lancamentosError } = await supabase
      .from("credito_conexao_lancamentos")
      .select("id,cobranca_id")
      .in("cobranca_id", cobrancaIds);

    if (lancamentosError) throw lancamentosError;

    const lancamentosRows = (lancamentos ?? []) as Array<Record<string, unknown>>;
    const lancamentoIds = lancamentosRows
      .map((item: Record<string, unknown>) => asInt(item.id))
      .filter((value): value is number => typeof value === "number" && value > 0);

    const cobrancaPorLancamento = new Map<number, number>();
    for (const lancamento of lancamentosRows) {
      const id = asInt(lancamento.id);
      const cobrancaId = asInt(lancamento.cobranca_id);
      if (id && cobrancaId) cobrancaPorLancamento.set(id, cobrancaId);
    }

    if (lancamentoIds.length > 0) {
      const { data: vinculos, error: vinculosError } = await supabase
        .from("credito_conexao_fatura_lancamentos")
        .select("fatura_id,lancamento_id")
        .in("lancamento_id", lancamentoIds);

      if (vinculosError) throw vinculosError;

      const vinculosRows = (vinculos ?? []) as Array<Record<string, unknown>>;
      const faturaIds = Array.from(
        new Set(
          vinculosRows
            .map((item: Record<string, unknown>) => asInt(item.fatura_id))
            .filter((value): value is number => typeof value === "number" && value > 0),
        ),
      );

      const metaFatura = new Map<number, Record<string, unknown>>();
      if (faturaIds.length > 0) {
        const { data: faturas, error: faturasError } = await supabase
          .from("credito_conexao_faturas")
          .select("id,periodo_referencia,status,folha_pagamento_id")
          .in("id", faturaIds);

        if (faturasError) throw faturasError;
        for (const fatura of (faturas ?? []) as Array<Record<string, unknown>>) {
          const faturaId = asInt(fatura.id);
          if (faturaId) metaFatura.set(faturaId, fatura);
        }
      }

      for (const vinculo of vinculosRows) {
        const lancamentoId = asInt(vinculo.lancamento_id);
        const faturaId = asInt(vinculo.fatura_id);
        const cobrancaId = lancamentoId ? cobrancaPorLancamento.get(lancamentoId) : null;
        if (!cobrancaId || !faturaId || faturaPorCobranca.has(cobrancaId)) continue;
        faturaPorCobranca.set(cobrancaId, metaFatura.get(faturaId) ?? { id: faturaId });
      }
    }
  }

  return vendas.map((venda) => {
    const pagadorId = asInt(venda.pagador_pessoa_id);
    const colaboradorPessoaId = asInt(venda.colaborador_pessoa_id);
    const cobrancaId = asInt(venda.cobranca_id);
    return {
      ...venda,
      pagador_nome: pagadorId ? nomePessoa.get(pagadorId) ?? `Pessoa #${pagadorId}` : null,
      colaborador_nome:
        colaboradorPessoaId ? nomePessoa.get(colaboradorPessoaId) ?? `Pessoa #${colaboradorPessoaId}` : null,
      fatura: cobrancaId ? faturaPorCobranca.get(cobrancaId) ?? null : null,
    };
  });
}

async function parseItensVenda(supabase: any, payload: Record<string, unknown>): Promise<ParsedItem[]> {
  const rawItens = payload.itens ?? payload.items ?? payload.venda_itens;
  console.log("[CAFE_CAIXA][ITENS] validando payload de itens");
  if (!Array.isArray(rawItens) || rawItens.length === 0) {
    throw new Error("itens_obrigatorios");
  }

  const parsed: ParsedItem[] = [];
  for (const item of rawItens) {
    if (!isRecord(item)) throw new Error("itens_invalidos");
    const produtoId = pickInt(item, ["produto_id", "produtoId", "produto"]);
    const quantidade = pickInt(item, ["quantidade", "qtd", "qtde", "quantity"]) ?? 1;
    if (!produtoId || quantidade <= 0) throw new Error("itens_invalidos");
    parsed.push({
      produto_id: produtoId,
      quantidade,
      valor_unitario_centavos: pickCentavos(item, [
        "valor_unitario_centavos",
        "valorUnitarioCentavos",
        "preco_unitario_centavos",
        "precoUnitarioCentavos",
        "preco",
      ]) ?? 0,
      valor_total_centavos: 0,
      descricao_snapshot: asString(item.descricao_snapshot ?? item.descricao) ?? null,
    });
  }

  if (parsed.length === 0) throw new Error("itens_invalidos");
  console.log("[CAFE_CAIXA][ITENS] itens parseados:", parsed.length);

  const produtoIds = Array.from(new Set(parsed.map((item) => item.produto_id)));
  const { data: produtos, error: produtosError } = await supabase
    .from("cafe_produtos")
    .select("id,nome,preco_venda_centavos,ativo,preparado,insumo_direto_id")
    .in("id", produtoIds);

  if (produtosError) throw produtosError;
  const produtoMap = new Map<number, Record<string, unknown>>();
  for (const produto of produtos ?? []) {
    const id = asInt((produto as Record<string, unknown>).id);
    if (id) produtoMap.set(id, produto as Record<string, unknown>);
  }

  if (produtoMap.size !== produtoIds.length) throw new Error("produto_nao_encontrado");

  return parsed.map((item) => {
    const produto = produtoMap.get(item.produto_id)!;
    if ((produto.ativo as boolean) === false) {
      throw new Error("produto_inativo");
    }
    const valorUnitario = item.valor_unitario_centavos > 0
      ? item.valor_unitario_centavos
      : asInt(produto.preco_venda_centavos) ?? 0;
    return {
      ...item,
      valor_unitario_centavos: valorUnitario,
      valor_total_centavos: valorUnitario * item.quantidade,
      descricao_snapshot: item.descricao_snapshot ?? asString(produto.nome),
    };
  });
}

async function aplicarConsumoEstoque(params: {
  supabase: any;
  vendaId: number;
  itens: ParsedItem[];
  createdBy: string | null;
}) {
  const { supabase, vendaId, itens, createdBy } = params;
  const produtoIds = Array.from(new Set(itens.map((item) => item.produto_id)));
  const { data: produtos, error: produtosError } = await supabase
    .from("cafe_produtos")
    .select("id,preparado,insumo_direto_id")
    .in("id", produtoIds);
  if (produtosError) throw produtosError;

  const { data: receitas, error: receitasError } = await supabase
    .from("cafe_produto_receitas")
    .select("produto_id,insumo_id,quantidade")
    .eq("ativo", true)
    .in("produto_id", produtoIds);
  if (receitasError) throw receitasError;

  const produtoMap = new Map<number, Record<string, unknown>>();
  for (const produto of produtos ?? []) {
    const id = asInt((produto as Record<string, unknown>).id);
    if (id) produtoMap.set(id, produto as Record<string, unknown>);
  }

  const receitasMap = new Map<number, Array<Record<string, unknown>>>();
  for (const receita of receitas ?? []) {
    const produtoId = asInt((receita as Record<string, unknown>).produto_id);
    if (!produtoId) continue;
    const list = receitasMap.get(produtoId) ?? [];
    list.push(receita as Record<string, unknown>);
    receitasMap.set(produtoId, list);
  }

  const consumoMap = new Map<number, number>();
  for (const item of itens) {
    const produto = produtoMap.get(item.produto_id);
    if (!produto) continue;
    const preparado = produto.preparado !== false;
    const receitasProduto = receitasMap.get(item.produto_id) ?? [];

    if (preparado && receitasProduto.length > 0) {
      for (const receita of receitasProduto) {
        const insumoId = asInt(receita.insumo_id);
        const quantidadeBase = Number(receita.quantidade ?? 0);
        if (!insumoId || !Number.isFinite(quantidadeBase) || quantidadeBase <= 0) continue;
        consumoMap.set(insumoId, (consumoMap.get(insumoId) ?? 0) + quantidadeBase * item.quantidade);
      }
      continue;
    }

    const insumoDiretoId = asInt(produto.insumo_direto_id);
    if (insumoDiretoId) {
      consumoMap.set(insumoDiretoId, (consumoMap.get(insumoDiretoId) ?? 0) + item.quantidade);
    }
  }

  if (consumoMap.size === 0) return [] as Array<{ insumoId: number; saldoAnterior: number }>;

  const insumoIds = Array.from(consumoMap.keys());
  const { data: insumos, error: insumosError } = await supabase
    .from("cafe_insumos")
    .select("id,nome,saldo_atual")
    .in("id", insumoIds);
  if (insumosError) throw insumosError;

  const saldoAtual = new Map<number, number>();
  for (const insumo of insumos ?? []) {
    const id = asInt((insumo as Record<string, unknown>).id);
    if (id) saldoAtual.set(id, Number((insumo as Record<string, unknown>).saldo_atual ?? 0));
  }

  for (const [insumoId, consumo] of consumoMap.entries()) {
    const saldo = saldoAtual.get(insumoId);
    if (saldo === undefined) throw new Error("insumo_nao_encontrado");
    if (saldo - consumo < 0) throw new Error("saldo_insuficiente");
  }

  const rollback: Array<{ insumoId: number; saldoAnterior: number }> = [];
  for (const [insumoId, consumo] of consumoMap.entries()) {
    const saldo = saldoAtual.get(insumoId)!;
    rollback.push({ insumoId, saldoAnterior: saldo });
    const { error: movimentoError } = await supabase.from("cafe_insumo_movimentos").insert({
      insumo_id: insumoId,
      tipo: "SAIDA",
      quantidade: consumo,
      origem: "VENDA",
      referencia_id: vendaId,
      observacoes: `Venda Cafe #${vendaId}`,
      created_by: createdBy,
    });
    if (movimentoError) throw movimentoError;

    const { error: updateError } = await supabase
      .from("cafe_insumos")
      .update({ saldo_atual: saldo - consumo })
      .eq("id", insumoId);
    if (updateError) throw updateError;
  }

  return rollback;
}

async function registrarRecebimentoReal(params: {
  supabase: any;
  vendaId: number;
  dataOperacao: string;
  valorCentavos: number;
  metodoPagamento: string | null;
  observacoes: string | null;
  usuarioId: string | null;
}) {
  const { supabase, vendaId, dataOperacao, valorCentavos, metodoPagamento, observacoes, usuarioId } = params;
  if (valorCentavos <= 0) return null;

  const centroCustoId = await resolveCafeCentroCustoId(supabase);
  const dataPagamento = isIsoDate(dataOperacao) ? `${dataOperacao}T00:00:00` : nowIso();

  const { data: recebimento, error: recebimentoError } = await supabase
    .from("recebimentos")
    .insert({
      cobranca_id: null,
      centro_custo_id: centroCustoId,
      valor_centavos: valorCentavos,
      data_pagamento: dataPagamento,
      metodo_pagamento: metodoPagamento ?? "DINHEIRO",
      forma_pagamento_codigo: metodoPagamento ?? "DINHEIRO",
      origem_sistema: "CAFE_CAIXA",
      observacoes: observacoes ?? `Caixa do cafe - venda #${vendaId}`,
    })
    .select("id")
    .single();

  if (recebimentoError) throw recebimentoError;

  const { error: movimentoError } = await supabase.from("movimento_financeiro").insert({
    tipo: "RECEITA",
    centro_custo_id: centroCustoId,
    valor_centavos: valorCentavos,
    data_movimento: dataPagamento,
    origem: "RECEBIMENTO",
    origem_id: asInt(recebimento?.id),
    descricao: `Recebimento cafe - venda #${vendaId}`,
    usuario_id: usuarioId,
  });

  if (movimentoError) {
    await supabase.from("recebimentos").delete().eq("id", asInt(recebimento?.id));
    throw movimentoError;
  }
  return recebimento;
}

async function buscarVenda(supabase: any, vendaId: number): Promise<VendaRow> {
  const { data, error } = await supabase.from("cafe_vendas").select("*").eq("id", vendaId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("venda_nao_encontrada");
  return data as VendaRow;
}

async function findCafeCobrancaCompetencia(supabase: any, pessoaId: number, competencia: string, currentId?: number | null) {
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
    .eq("origem_subtipo", "CONTA_INTERNA_COLABORADOR")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return asInt(data?.id);
}

async function recalcFaturasPorLancamento(supabase: any, lancamentoId: number) {
  const { data: vinculos, error: vinculosError } = await supabase
    .from("credito_conexao_fatura_lancamentos")
    .select("fatura_id")
    .eq("lancamento_id", lancamentoId);

  if (vinculosError) throw vinculosError;

  const vinculosRows = (vinculos ?? []) as Array<Record<string, unknown>>;
  const faturaIds = Array.from(
    new Set(
      vinculosRows
        .map((row: Record<string, unknown>) => asInt(row.fatura_id))
        .filter((value): value is number => typeof value === "number" && value > 0),
    ),
  );

  for (const faturaId of faturaIds) {
    await recalcularComprasFatura(supabase, faturaId);

    const { data: fatura, error: faturaError } = await supabase
      .from("credito_conexao_faturas")
      .select("id,folha_pagamento_id")
      .eq("id", faturaId)
      .maybeSingle();
    if (faturaError) throw faturaError;
    if (fatura?.folha_pagamento_id) {
      await supabase.rpc("sync_credito_fatura_para_folha", { p_fatura_id: faturaId });
    }
  }
}

export async function sincronizarContaInternaCafe(params: {
  supabase: any;
  vendaId: number;
  colaboradorPessoaId: number;
  competencia: string;
}) {
  const { supabase, vendaId, colaboradorPessoaId, competencia } = params;
  if (!isCompetencia(competencia)) throw new Error("competencia_invalida");

  const conta = await ensureContaInternaColaborador(supabase, colaboradorPessoaId);

  const { data: vendasRaw, error: vendasError } = await supabase
    .from("cafe_vendas")
    .select("id,data_operacao,valor_total_centavos,valor_pago_centavos,valor_em_aberto_centavos,observacoes_internas,cobranca_id,status_pagamento")
    .eq("colaborador_pessoa_id", colaboradorPessoaId)
    .eq("data_competencia", competencia)
    .eq("tipo_quitacao", CAFE_TIPO_QUITACAO.CONTA_INTERNA_COLABORADOR)
    .neq("status_pagamento", CAFE_STATUS_PAGAMENTO.CANCELADO)
    .order("id", { ascending: true });

  if (vendasError) throw vendasError;

  const vendas = (vendasRaw ?? []) as Array<Record<string, unknown>>;
  const totalAberto = vendas.reduce((acc, item) => acc + Math.max(asInt(item.valor_em_aberto_centavos) ?? 0, 0), 0);
  const currentVenda = vendas.find((item) => asInt(item.id) === vendaId);
  const cobrancaAtualId = asInt(currentVenda?.cobranca_id ?? null);
  const cobrancaExistenteId = await findCafeCobrancaCompetencia(
    supabase,
    colaboradorPessoaId,
    competencia,
    cobrancaAtualId,
  );

  const descricao = `Cafe colaborador - competencia ${competencia}`;
  const observacoes = `Origem: CAFE; competencia=${competencia}; colaborador_pessoa_id=${colaboradorPessoaId}`;
  const vencimento = buildVencimentoFromCompetencia(competencia, conta.dia_vencimento);
  const centroCustoId = await resolveCafeCentroCustoId(supabase);

  let cobrancaId = cobrancaExistenteId;
  if (!cobrancaId && totalAberto <= 0) {
    return { cobrancaId: null, lancamentoId: null, faturaId: null };
  }

  if (cobrancaId) {
    const { error: updateError } = await supabase
      .from("cobrancas")
      .update({
        descricao,
        valor_centavos: totalAberto,
        vencimento,
        competencia_ano_mes: competencia,
        status: totalAberto > 0 ? "PENDENTE" : "PAGO",
        metodo_pagamento: "CARTEIRA_INTERNA",
        origem_tipo: "CAFE",
        origem_subtipo: "CONTA_INTERNA_COLABORADOR",
        observacoes,
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
        pessoa_id: colaboradorPessoaId,
        descricao,
        valor_centavos: totalAberto,
        moeda: "BRL",
        vencimento,
        competencia_ano_mes: competencia,
        status: totalAberto > 0 ? "PENDENTE" : "PAGO",
        metodo_pagamento: "CARTEIRA_INTERNA",
        origem_tipo: "CAFE",
        origem_subtipo: "CONTA_INTERNA_COLABORADOR",
        observacoes,
        centro_custo_id: centroCustoId,
        created_at: nowIso(),
        updated_at: nowIso(),
        data_pagamento: totalAberto > 0 ? null : `${todayIso()}T00:00:00`,
      })
      .select("id")
      .single();

    if (createError || !created?.id) throw createError ?? new Error("falha_criar_cobranca_cafe");
    cobrancaId = Number(created.id);
  }

  const vendaIds = vendas
    .map((item) => asInt(item.id))
    .filter((value): value is number => typeof value === "number" && value > 0);

  if (vendaIds.length > 0) {
    const { error: vincularError } = await supabase
      .from("cafe_vendas")
      .update({ cobranca_id: cobrancaId, updated_at: nowIso() })
      .in("id", vendaIds);
    if (vincularError) throw vincularError;
  }

  const lancamento = await upsertLancamentoPorCobranca({
    cobrancaId,
    contaConexaoId: conta.id,
    competencia,
    valorCentavos: totalAberto,
    descricao,
    origemSistema: "CAFE",
    origemId: cobrancaId,
    composicaoJson: {
      origem: "CAFE",
      tipo_quitacao: CAFE_TIPO_QUITACAO.CONTA_INTERNA_COLABORADOR,
      competencia,
      colaborador_pessoa_id: colaboradorPessoaId,
      venda_ids: vendaIds,
      total_aberto_centavos: totalAberto,
    },
    supabase,
  });

  if (totalAberto > 0) {
    const faturaId = await ensureFaturaAbertaCompetencia(supabase, conta.id, competencia, conta.dia_vencimento);
    const vinculo = await vincularLancamentoNaFatura(supabase, faturaId, lancamento.id);
    if (!vinculo.ok) {
      throw vinculo.error ?? new Error("falha_vincular_lancamento_fatura");
    }
    await recalcularComprasFatura(supabase, faturaId);

    const { data: fatura, error: faturaError } = await supabase
      .from("credito_conexao_faturas")
      .select("id,folha_pagamento_id")
      .eq("id", faturaId)
      .maybeSingle();
    if (faturaError) throw faturaError;
    if (fatura?.folha_pagamento_id) {
      await supabase.rpc("sync_credito_fatura_para_folha", { p_fatura_id: faturaId });
    }

    return { cobrancaId, lancamentoId: lancamento.id, faturaId };
  }

  await recalcFaturasPorLancamento(supabase, lancamento.id);
  return { cobrancaId, lancamentoId: lancamento.id, faturaId: null };
}

export async function listarComandasCafe(supabase: any, filters: URLSearchParams) {
  console.log("[CAFE_CAIXA][LISTAR] filtros:", Object.fromEntries(filters.entries()));
  let query = supabase
    .from("cafe_vendas")
    .select("*, cafe_venda_itens(*)")
    .order("data_operacao", { ascending: false })
    .order("id", { ascending: false })
    .limit(100);

  const dataInicial = filters.get("data_inicial");
  const dataFinal = filters.get("data_final");
  const colaboradorPessoaId = asInt(filters.get("colaborador_pessoa_id"));
  const statusPagamento = asString(filters.get("status_pagamento"));
  const competencia = asString(filters.get("competencia"));

  if (isIsoDate(dataInicial)) query = query.gte("data_operacao", dataInicial);
  if (isIsoDate(dataFinal)) query = query.lte("data_operacao", dataFinal);
  if (colaboradorPessoaId) query = query.eq("colaborador_pessoa_id", colaboradorPessoaId);
  if (statusPagamento) query = query.eq("status_pagamento", statusPagamento);
  if (isCompetencia(competencia)) query = query.eq("data_competencia", competencia);

  const { data, error } = await query;
  if (error) throw error;
  console.log("[CAFE_CAIXA][LISTAR] comandas encontradas:", Array.isArray(data) ? data.length : 0);

  return enrichVendas(supabase, ((data ?? []) as VendaRow[]));
}

export async function detalharComandaCafe(supabase: any, vendaId: number) {
  const { data, error } = await supabase
    .from("cafe_vendas")
    .select("*, cafe_venda_itens(*)")
    .eq("id", vendaId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("venda_nao_encontrada");

  const enriched = await enrichVendas(supabase, [data as VendaRow]);
  return enriched[0];
}

export async function criarComandaCafe(params: {
  supabase: any;
  body: unknown;
  userId: string | null;
}) {
  const { supabase, body, userId } = params;
  console.log("[CAFE_CAIXA][CRIAR] iniciando criacao de comanda");
  if (!isRecord(body)) throw new Error("payload_invalido");

  const tipoComprador = coerceTipoComprador(body.tipo_comprador ?? body.tipoComprador ?? "SEM_VINCULO");
  const tipoCompradorFinanceiro = mapTipoCompradorParaFinanceiro(tipoComprador);
  const origemOperacao = upper(body.origem_operacao ?? body.origemOperacao) === "PDV" ? "PDV" : "CAIXA_ADMIN";
  const rawFormaPagamento =
    body.forma_pagamento ?? body.formaPagamento ?? body.metodo_pagamento ?? body.metodoPagamento;
  const formaPagamentoId = asInt(body.forma_pagamento_id ?? body.formaPagamentoId);
  const metodoPagamento = coerceFormaPagamento(
    body.metodo_pagamento ?? body.metodoPagamento ?? body.forma_pagamento ?? body.formaPagamento,
  );
  const faturamentoFuturoSolicitado =
    isFutureBillingFormaPagamento(rawFormaPagamento) ||
    isFutureBillingFormaPagamento(body.forma_pagamento_codigo ?? body.formaPagamentoCodigo);
  const tipoQuitacao =
    isContaInternaFormaPagamento(rawFormaPagamento) ||
    coerceTipoQuitacao(body.tipo_quitacao ?? body.tipoQuitacao) === CAFE_TIPO_QUITACAO.CONTA_INTERNA_COLABORADOR
      ? CAFE_TIPO_QUITACAO.CONTA_INTERNA_COLABORADOR
      : faturamentoFuturoSolicitado
        ? CAFE_TIPO_QUITACAO.CARTAO_CONEXAO
        : coerceTipoQuitacao(body.tipo_quitacao ?? body.tipoQuitacao);
  // Conta interna como liquidacao principal ja nasce vinculada a cobranca da
  // competencia escolhida. A conversao posterior fica reservada para saldo
  // aberto de comandas registradas originalmente em outro fluxo.
  const contaInternaSolicitada = tipoQuitacao === CAFE_TIPO_QUITACAO.CONTA_INTERNA_COLABORADOR;
  const rawDataOperacao = asString(body.data_operacao ?? body.dataOperacao);
  const dataOperacao = isIsoDate(rawDataOperacao) ? rawDataOperacao : todayIso();
  const rawCompetencia = asString(body.data_competencia ?? body.competencia ?? body.dataCompetencia);
  const compradorPessoaId = asInt(
    body.comprador_id ??
      body.compradorId ??
      body.comprador_pessoa_id ??
      body.compradorPessoaId ??
      body.pagador_pessoa_id ??
      body.cliente_pessoa_id,
  );
  const colaboradorPessoaId =
    asInt(body.colaborador_pessoa_id ?? body.colaboradorPessoaId) ??
    (tipoComprador === CAFE_TIPO_COMPRADOR.COLABORADOR ? compradorPessoaId : null);

  if (tipoComprador === CAFE_TIPO_COMPRADOR.COLABORADOR && !colaboradorPessoaId) {
    throw new Error("colaborador_pessoa_id_obrigatorio");
  }

  if (contaInternaSolicitada && !colaboradorPessoaId) {
    throw new Error("conta_interna_exige_colaborador");
  }

  if (contaInternaSolicitada && !rawCompetencia) {
    throw new Error("competencia_obrigatoria_para_conta_interna");
  }

  if (!faturamentoFuturoSolicitado && !metodoPagamento && !formaPagamentoId) {
    throw new Error("forma_pagamento_obrigatoria");
  }

  if (!body.itens && !body.items && !body.venda_itens) {
    throw new Error("itens_obrigatorios");
  }

  const itens = await parseItensVenda(supabase, body);
  const valorTotal = itens.reduce((acc, item) => acc + item.valor_total_centavos, 0);
  const competencia = faturamentoFuturoSolicitado
    ? rawCompetencia
    : isCompetencia(rawCompetencia)
      ? rawCompetencia
      : competenciaFromDate(dataOperacao);
  const valorPagoInformado = pickCentavos(body, ["valor_pago_centavos", "valorPagoCentavos", "valor_pago", "valorPago"]) ?? 0;
  const valorPagoCentavos = faturamentoFuturoSolicitado
    ? 0
    : Math.max(0, Math.min(valorTotal, valorPagoInformado));

  if (contaInternaSolicitada && !isCompetencia(competencia)) {
    throw new Error("competencia_invalida");
  }
  if (contaInternaSolicitada && valorTotal - valorPagoCentavos <= 0) {
    throw new Error("saldo_em_aberto_obrigatorio_para_conta_interna");
  }

  const statusPagamento = resolveStatus(valorTotal, valorPagoCentavos, tipoQuitacao);
  const valorEmAberto = Math.max(valorTotal - valorPagoCentavos, 0);
  const pagadorPessoaId = asInt(
    body.cliente_pessoa_id ??
      body.pagador_pessoa_id ??
      body.comprador_pessoa_id ??
      body.clientePessoaId ??
      compradorPessoaId,
  );
  const consumidorPessoaId = asInt(body.consumidor_pessoa_id ?? body.consumidorPessoaId);
  const observacoesInternas = asString(body.observacoes_internas ?? body.observacoesInternas);
  const observacoes = asString(body.observacoes);
  console.log("[CAFE_CAIXA][CRIAR] payload normalizado:", {
    tipoComprador,
    tipoQuitacao,
    dataOperacao,
    competencia,
    compradorPessoaId,
    colaboradorPessoaId,
    itens: itens.length,
    valorTotal,
    valorPagoCentavos,
    valorEmAberto,
  });

  console.log("[CAFE_CAIXA][CRIAR] inserindo comanda principal");
  const { data: venda, error: vendaError } = await supabase
    .from("cafe_vendas")
    .insert({
      pagador_pessoa_id: pagadorPessoaId,
      comprador_pessoa_id: tipoComprador === CAFE_TIPO_COMPRADOR.COLABORADOR ? colaboradorPessoaId : pagadorPessoaId,
      comprador_tipo: tipoCompradorFinanceiro,
      consumidor_pessoa_id: consumidorPessoaId,
      colaborador_pessoa_id: colaboradorPessoaId,
      data_operacao: dataOperacao,
      data_competencia: faturamentoFuturoSolicitado ? competencia : null,
      competencia_ano_mes: faturamentoFuturoSolicitado ? competencia : null,
      tipo_quitacao: tipoQuitacao,
      status_pagamento: statusPagamento,
      status_financeiro: "PENDENTE",
      valor_total_centavos: valorTotal,
      valor_pago_centavos: valorPagoCentavos,
      valor_em_aberto_centavos: valorEmAberto,
      forma_pagamento:
        contaInternaSolicitada
          ? CAFE_FORMAS_PAGAMENTO.CONTA_INTERNA_COLABORADOR
          : metodoPagamento ?? asString(body.forma_pagamento_codigo ?? body.formaPagamentoCodigo) ?? null,
      forma_pagamento_id: formaPagamentoId,
      observacoes,
      observacoes_internas: observacoesInternas,
      created_by: userId,
      updated_at: nowIso(),
      created_at: nowIso(),
    })
    .select("id")
    .single();

  if (vendaError || !venda?.id) throw vendaError ?? new Error("falha_criar_venda_cafe");
  const vendaId = Number(venda.id);
  let estoqueRollback: Array<{ insumoId: number; saldoAnterior: number }> = [];

  try {
    console.log("[CAFE_CAIXA][CRIAR] inserindo itens da comanda");
    const { error: itensError } = await supabase.from("cafe_venda_itens").insert(
      itens.map((item) => ({
        venda_id: vendaId,
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario_centavos: item.valor_unitario_centavos,
        total_centavos: item.valor_total_centavos,
        valor_unitario_centavos: item.valor_unitario_centavos,
        valor_total_centavos: item.valor_total_centavos,
        descricao_snapshot: item.descricao_snapshot,
      })),
    );
    if (itensError) throw itensError;

    estoqueRollback = await aplicarConsumoEstoque({ supabase, vendaId, itens, createdBy: userId });

    console.log("[CAFE_CAIXA][CRIAR] aplicando fluxo financeiro integrado");
    await aplicarFluxoFinanceiroVendaCafe({
      supabase,
      vendaId,
      dataOperacao,
      valorTotalCentavos: valorTotal,
      valorPagoCentavos,
      compradorPessoaId: pagadorPessoaId,
      colaboradorPessoaId,
      compradorTipoInformado: tipoCompradorFinanceiro,
      formaPagamentoId,
      formaPagamentoCodigo:
        metodoPagamento ?? asString(body.forma_pagamento_codigo ?? body.formaPagamentoCodigo) ?? null,
      competenciaAnoMes: faturamentoFuturoSolicitado ? competencia : null,
      observacoes: observacoesInternas ?? observacoes,
      usuarioId: userId,
      origemOperacao,
    });
    console.log("[CAFE_CAIXA][CRIAR] comanda criada com sucesso:", vendaId);
  } catch (error) {
    console.error("[CAFE_CAIXA][CRIAR][ERRO] rollback da comanda:", error);
    for (const item of estoqueRollback) {
      await supabase.from("cafe_insumos").update({ saldo_atual: item.saldoAnterior }).eq("id", item.insumoId);
    }
    await supabase.from("cafe_insumo_movimentos").delete().eq("origem", "VENDA").eq("referencia_id", vendaId);
    await supabase.from("cafe_venda_itens").delete().eq("venda_id", vendaId);
    await supabase.from("cafe_vendas").delete().eq("id", vendaId);
    throw error;
  }

  return detalharComandaCafe(supabase, vendaId);
}

async function possuiFaturaFechadaPorCobranca(supabase: any, cobrancaId: number) {
  const { data: lancamentos, error: lancamentosError } = await supabase
    .from("credito_conexao_lancamentos")
    .select("id")
    .eq("cobranca_id", cobrancaId);
  if (lancamentosError) throw lancamentosError;

  const lancamentosRows = (lancamentos ?? []) as Array<Record<string, unknown>>;
  const lancamentoIds = lancamentosRows
    .map((item: Record<string, unknown>) => asInt(item.id))
    .filter((value): value is number => typeof value === "number" && value > 0);
  if (lancamentoIds.length === 0) return false;

  const { data: vinculos, error: vinculosError } = await supabase
    .from("credito_conexao_fatura_lancamentos")
    .select("fatura_id")
    .in("lancamento_id", lancamentoIds);
  if (vinculosError) throw vinculosError;

  const vinculosRows = (vinculos ?? []) as Array<Record<string, unknown>>;
  const faturaIds = Array.from(
    new Set(
      vinculosRows
        .map((item: Record<string, unknown>) => asInt(item.fatura_id))
        .filter((value): value is number => typeof value === "number" && value > 0),
    ),
  );
  if (faturaIds.length === 0) return false;

  const { data: faturas, error: faturasError } = await supabase
    .from("credito_conexao_faturas")
    .select("id,status")
    .in("id", faturaIds);
  if (faturasError) throw faturasError;

  return ((faturas ?? []) as Array<Record<string, unknown>>).some((fatura: Record<string, unknown>) => {
    const status = asString(fatura.status)?.toUpperCase();
    return status === "FECHADA" || status === "PAGA";
  });
}

export async function atualizarComandaCafe(params: {
  supabase: any;
  vendaId: number;
  body: unknown;
}) {
  const { supabase, vendaId, body } = params;
  if (!isRecord(body)) throw new Error("payload_invalido");

  const venda = await buscarVenda(supabase, vendaId);
  if (venda.cobranca_id && (await possuiFaturaFechadaPorCobranca(supabase, venda.cobranca_id))) {
    throw new Error("fatura_ja_fechada_para_esta_comanda");
  }

  const nextDataOperacao = isIsoDate(asString(body.data_operacao ?? body.dataOperacao))
    ? asString(body.data_operacao ?? body.dataOperacao)!
    : venda.data_operacao;
  const nextTipoComprador = coerceTipoComprador(body.tipo_comprador ?? body.tipoComprador);
  const nextObservacoesInternas =
    body.observacoes_internas !== undefined || body.observacoesInternas !== undefined
      ? asString(body.observacoes_internas ?? body.observacoesInternas)
      : venda.observacoes_internas;
  const nextObservacoes = body.observacoes !== undefined ? asString(body.observacoes) : venda.observacoes;
  const nextCompradorPessoaId =
    body.comprador_id !== undefined ||
    body.compradorId !== undefined ||
    body.comprador_pessoa_id !== undefined ||
    body.compradorPessoaId !== undefined ||
    body.pagador_pessoa_id !== undefined
      ? asInt(
          body.comprador_id ??
            body.compradorId ??
            body.comprador_pessoa_id ??
            body.compradorPessoaId ??
            body.pagador_pessoa_id,
        )
      : venda.pagador_pessoa_id;
  const nextColaboradorPessoaId =
    body.colaborador_pessoa_id !== undefined || body.colaboradorPessoaId !== undefined
      ? asInt(body.colaborador_pessoa_id ?? body.colaboradorPessoaId)
      : body.tipo_comprador !== undefined || body.tipoComprador !== undefined
        ? nextTipoComprador === CAFE_TIPO_COMPRADOR.COLABORADOR
          ? nextCompradorPessoaId
          : null
      : venda.colaborador_pessoa_id;
  const nextCompetencia =
    body.data_competencia !== undefined || body.competencia !== undefined || body.dataCompetencia !== undefined
      ? asString(body.data_competencia ?? body.competencia ?? body.dataCompetencia)
      : venda.data_competencia;
  const nextFormaPagamento =
    body.forma_pagamento !== undefined ||
    body.metodo_pagamento !== undefined ||
    body.metodoPagamento !== undefined
      ? coerceFormaPagamento(
          body.forma_pagamento ?? body.metodo_pagamento ?? body.metodoPagamento,
        )
      : venda.forma_pagamento;

  if (venda.status_pagamento === CAFE_STATUS_PAGAMENTO.FATURADO) {
    if (
      nextColaboradorPessoaId !== venda.colaborador_pessoa_id ||
      nextCompetencia !== venda.data_competencia
    ) {
      throw new Error("nao_eh_possivel_alterar_vinculo_apos_faturamento");
    }
  }

  const { error: updateError } = await supabase
    .from("cafe_vendas")
    .update({
      data_operacao: nextDataOperacao,
      observacoes: nextObservacoes,
      observacoes_internas: nextObservacoesInternas,
      pagador_pessoa_id: nextCompradorPessoaId,
      colaborador_pessoa_id: nextColaboradorPessoaId,
      data_competencia: nextCompetencia,
      forma_pagamento: nextFormaPagamento,
      updated_at: nowIso(),
    })
    .eq("id", vendaId);

  if (updateError) throw updateError;
  return detalharComandaCafe(supabase, vendaId);
}

export async function registrarBaixaCafe(params: {
  supabase: any;
  vendaId: number;
  body: unknown;
  userId: string | null;
}) {
  const { supabase, vendaId, body, userId } = params;
  if (!isRecord(body)) throw new Error("payload_invalido");

  const venda = await buscarVenda(supabase, vendaId);
  if (venda.status_pagamento === CAFE_STATUS_PAGAMENTO.CANCELADO) throw new Error("comanda_cancelada");
  if (venda.valor_em_aberto_centavos <= 0) throw new Error("comanda_ja_quitada");

  const valorBaixa = pickCentavos(body, ["valor_centavos", "valorCentavos", "valor_pago_centavos", "valorPagoCentavos"]);
  const metodoPagamento = asString(body.metodo_pagamento ?? body.metodoPagamento ?? body.forma_pagamento);
  const dataPagamento = isIsoDate(asString(body.data_pagamento ?? body.dataPagamento))
    ? asString(body.data_pagamento ?? body.dataPagamento)!
    : venda.data_operacao;

  if (!valorBaixa || valorBaixa <= 0) throw new Error("valor_baixa_invalido");
  if (valorBaixa > venda.valor_em_aberto_centavos) throw new Error("valor_baixa_maior_que_aberto");

  await registrarRecebimentoReal({
    supabase,
    vendaId,
    dataOperacao: dataPagamento,
    valorCentavos: valorBaixa,
    metodoPagamento,
    observacoes: asString(body.observacoes),
    usuarioId: userId,
  });

  const novoValorPago = venda.valor_pago_centavos + valorBaixa;
  const novoValorAberto = Math.max(venda.valor_total_centavos - novoValorPago, 0);
  const novoStatus = novoValorAberto <= 0 ? CAFE_STATUS_PAGAMENTO.PAGO : CAFE_STATUS_PAGAMENTO.PARCIAL;
  const fluxoFuturoExistente =
    upper(venda.origem_financeira) === CAFE_FLUXO_FINANCEIRO.CARTAO_CONEXAO_ALUNO ||
    upper(venda.origem_financeira) === CAFE_FLUXO_FINANCEIRO.CARTAO_CONEXAO_COLABORADOR ||
    upper(venda.origem_financeira) === CAFE_FLUXO_FINANCEIRO.CONTA_INTERNA;

  const { error: updateError } = await supabase
    .from("cafe_vendas")
    .update({
      valor_pago_centavos: novoValorPago,
      valor_em_aberto_centavos: novoValorAberto,
      status_pagamento: novoStatus,
      status_financeiro: fluxoFuturoExistente
        ? venda.status_financeiro ?? "PENDENTE"
        : novoValorPago > 0
          ? "PAGO_IMEDIATO"
          : "PENDENTE",
      updated_at: nowIso(),
    })
    .eq("id", vendaId);
  if (updateError) throw updateError;

  if (fluxoFuturoExistente && (venda.competencia_ano_mes ?? venda.data_competencia)) {
    const centroCustoId = asInt(venda.centro_custo_id) ?? (await resolveCafeCentroCustoId(supabase));
    if (!centroCustoId) throw new Error("centro_custo_cafe_nao_encontrado");

    await criarCobrancaCafe({
      supabase,
      vendaId,
      competenciaAnoMes: venda.competencia_ano_mes ?? venda.data_competencia ?? competenciaFromDate(venda.data_operacao),
      compradorTipo:
        upper(venda.comprador_tipo) === CAFE_COMPRADOR_TIPO_FINANCEIRO.ALUNO
          ? CAFE_COMPRADOR_TIPO_FINANCEIRO.ALUNO
          : CAFE_COMPRADOR_TIPO_FINANCEIRO.COLABORADOR,
      compradorPessoaId: venda.comprador_pessoa_id ?? venda.pagador_pessoa_id,
      colaboradorPessoaId: venda.colaborador_pessoa_id,
      origemFinanceira:
        upper(venda.origem_financeira) === CAFE_FLUXO_FINANCEIRO.CARTAO_CONEXAO_ALUNO
          ? CAFE_FLUXO_FINANCEIRO.CARTAO_CONEXAO_ALUNO
          : upper(venda.origem_financeira) === CAFE_FLUXO_FINANCEIRO.CARTAO_CONEXAO_COLABORADOR
            ? CAFE_FLUXO_FINANCEIRO.CARTAO_CONEXAO_COLABORADOR
            : CAFE_FLUXO_FINANCEIRO.CONTA_INTERNA,
      centroCustoId,
      contaConexaoId: asInt(venda.conta_conexao_id),
    });
  }

  return detalharComandaCafe(supabase, vendaId);
}

export async function enviarComandaParaContaInterna(params: {
  supabase: any;
  vendaId: number;
  body: unknown;
}) {
  const { supabase, vendaId, body } = params;
  if (!isRecord(body)) throw new Error("payload_invalido");

  const venda = await buscarVenda(supabase, vendaId);
  if (venda.status_pagamento === CAFE_STATUS_PAGAMENTO.CANCELADO) throw new Error("comanda_cancelada");
  if (venda.valor_em_aberto_centavos <= 0) throw new Error("saldo_em_aberto_inexistente");

  const colaboradorPessoaId = asInt(body.colaborador_pessoa_id ?? body.colaboradorPessoaId ?? venda.colaborador_pessoa_id);
  const competencia = isCompetencia(asString(body.data_competencia ?? body.competencia ?? body.dataCompetencia))
    ? asString(body.data_competencia ?? body.competencia ?? body.dataCompetencia)!
    : venda.data_competencia ?? competenciaFromDate(venda.data_operacao);

  if (!colaboradorPessoaId) throw new Error("colaborador_pessoa_id_obrigatorio");
  if (!isCompetencia(competencia)) throw new Error("competencia_invalida");
  const centroCustoId = asInt(venda.centro_custo_id) ?? (await resolveCafeCentroCustoId(supabase));
  if (!centroCustoId) throw new Error("centro_custo_cafe_nao_encontrado");

  const { error: updateError } = await supabase
    .from("cafe_vendas")
    .update({
      colaborador_pessoa_id: colaboradorPessoaId,
      comprador_tipo: CAFE_COMPRADOR_TIPO_FINANCEIRO.COLABORADOR,
      comprador_pessoa_id: colaboradorPessoaId,
      origem_financeira: CAFE_FLUXO_FINANCEIRO.CONTA_INTERNA,
      competencia_ano_mes: competencia,
      data_competencia: competencia,
      tipo_quitacao: CAFE_TIPO_QUITACAO.CONTA_INTERNA_COLABORADOR,
      status_pagamento: CAFE_STATUS_PAGAMENTO.FATURADO,
      status_financeiro: "EM_CONTA_INTERNA",
      updated_at: nowIso(),
    })
    .eq("id", vendaId);
  if (updateError) throw updateError;

  await criarCobrancaCafe({
    supabase,
    vendaId,
    competenciaAnoMes: competencia,
    compradorTipo: CAFE_COMPRADOR_TIPO_FINANCEIRO.COLABORADOR,
    compradorPessoaId: colaboradorPessoaId,
    colaboradorPessoaId,
    origemFinanceira: CAFE_FLUXO_FINANCEIRO.CONTA_INTERNA,
    centroCustoId,
    contaConexaoId: asInt(venda.conta_conexao_id),
  });

  return detalharComandaCafe(supabase, vendaId);
}
