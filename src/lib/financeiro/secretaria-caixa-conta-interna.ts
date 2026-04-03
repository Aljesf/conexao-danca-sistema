import { buildDescricaoCobranca } from "@/lib/financeiro/cobranca/descricao";
import { resolverContaInternaDoAlunoOuResponsavel } from "@/lib/financeiro/conta-interna";
import { getCobrancaProvider } from "@/lib/financeiro/cobranca/providers";
import { getOrCreateCobrancaCanonicaFatura } from "@/lib/credito-conexao/getOrCreateCobrancaCanonicaFatura";
import { markNeofinBillingAsPaid } from "@/lib/neofinClient";
import {
  extractNeofinBillingDetails,
  firstNonEmptyString,
  looksLikeNeofinBillingNumber,
} from "@/lib/neofinBilling";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>;

type PessoaResumo = {
  id: number;
  nome: string | null;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
};

type ContaInternaBase = {
  id: number;
  pessoa_titular_id: number;
  responsavel_financeiro_pessoa_id: number | null;
  tipo_conta: string;
  descricao_exibicao: string | null;
  centro_custo_principal_id: number | null;
  dia_vencimento: number | null;
};

type FaturaBase = {
  id: number;
  conta_conexao_id: number;
  periodo_referencia: string;
  data_fechamento: string | null;
  data_vencimento: string | null;
  valor_total_centavos: number;
  status: string;
  cobranca_id: number | null;
  neofin_invoice_id: string | null;
};

type LancamentoBase = {
  id: number;
  conta_conexao_id: number;
  cobranca_id: number | null;
  origem_sistema: string;
  origem_id: number | null;
  descricao: string | null;
  data_lancamento: string | null;
  valor_centavos: number;
  status: string;
  referencia_item: string | null;
  composicao_json: Record<string, unknown> | null;
  centro_custo_id: number | null;
  aluno_id: number | null;
  matricula_id: number | null;
  cancelado_em: string | null;
  cancelado_por_user_id: string | null;
  motivo_cancelamento: string | null;
};

type CobrancaBase = {
  id: number;
  pessoa_id: number;
  descricao: string;
  valor_centavos: number;
  status: string;
  vencimento: string;
  neofin_charge_id: string | null;
  link_pagamento: string | null;
  linha_digitavel: string | null;
  neofin_payload: Record<string, unknown> | null;
};

type SecretariaPagamentoRow = {
  id: number;
  alvo_tipo: string;
  alvo_id: number;
  conta_interna_id: number;
  fatura_id: number | null;
  lancamento_id: number | null;
  valor_informado_centavos: number;
  forma_pagamento_codigo: string;
  conta_financeira_id: number | null;
  data_pagamento: string;
  observacao: string | null;
  operador_user_id: string | null;
  integracao_externa_status: string;
  integracao_externa_payload: Record<string, unknown> | null;
  created_at: string;
};

export type SecretariaContaOrigemTotal = {
  origem: string;
  valor_em_aberto_centavos: number;
  quantidade_lancamentos: number;
};

export type SecretariaContaFaturaResumo = {
  id: number;
  competencia: string;
  status: string;
  status_operacional: string;
  valor_original_centavos: number;
  valor_pago_centavos: number;
  saldo_restante_centavos: number;
  data_vencimento: string | null;
  cobranca_externa_vinculada: {
    cobranca_id: number | null;
    status: string | null;
    valor_centavos: number | null;
    neofin_charge_id: string | null;
    neofin_invoice_id: string | null;
    link_pagamento: string | null;
  } | null;
};

export type SecretariaContaLancamentoResumo = {
  id: number;
  fatura_id: number | null;
  origem_sistema: string;
  origem_id: number | null;
  descricao: string;
  data_lancamento: string | null;
  valor_original_centavos: number;
  valor_pago_centavos: number;
  saldo_restante_centavos: number;
  status_operacional: string;
  referencia_item: string | null;
  aluno_nome: string | null;
  status_base: string;
  motivo_cancelamento: string | null;
  cancelado_em: string | null;
  cancelado_por_user_id: string | null;
  possui_recebimento: boolean;
  pode_receber: boolean;
  pode_cancelar: boolean;
};

export type SecretariaContaFaturaAgrupada = SecretariaContaFaturaResumo & {
  lancamentos: SecretariaContaLancamentoResumo[];
};

export type SecretariaContaInternaDetalhe = {
  conta_id: number;
  tipo_conta: string;
  tipo_titular: string | null;
  descricao_exibicao: string | null;
  pessoa_titular: PessoaResumo | null;
  responsavel_financeiro: PessoaResumo | null;
  alunos_relacionados: PessoaResumo[];
  saldo_total_em_aberto_centavos: number;
  total_vencido_centavos: number;
  total_a_vencer_centavos: number;
  proxima_fatura: SecretariaContaFaturaResumo | null;
  totais_por_origem: SecretariaContaOrigemTotal[];
  faturas: SecretariaContaFaturaAgrupada[];
  lancamentos_sem_fatura: SecretariaContaLancamentoResumo[];
  possui_lancamentos_sem_fatura: boolean;
  total_lancamentos_monitorados: number;
};

export type SecretariaContaInternaResumo = {
  pessoa: PessoaResumo | null;
  responsavel_financeiro: PessoaResumo | null;
  conta_conexao_id: number;
  tipo_conta: string;
  tipo_titular: string | null;
  descricao_exibicao: string | null;
  saldo_total_em_aberto_centavos: number;
  total_vencido_centavos: number;
  total_a_vencer_centavos: number;
  proxima_fatura: SecretariaContaFaturaResumo | null;
  alunos_relacionados: PessoaResumo[];
  faturas_resumidas: SecretariaContaFaturaResumo[];
  lancamentos_resumidos: SecretariaContaLancamentoResumo[];
  totais_por_origem: SecretariaContaOrigemTotal[];
};

export type SecretariaPagamentoInput = {
  alvo_tipo: "FATURA" | "LANCAMENTO";
  alvo_id: number;
  valor_pagamento_centavos: number;
  forma_pagamento_codigo: string;
  conta_financeira_id: number;
  data_pagamento: string;
  observacao?: string | null;
  operador_user_id: string | null;
};

export type SecretariaPagamentoResult = {
  pagamento: SecretariaPagamentoRow | null;
  detalhe: SecretariaContaInternaDetalhe;
  integracao_externa: {
    status: "NAO_AVALIADA" | "SINCRONIZADA" | "REVISAO_MANUAL" | "IGNORADA" | "ERRO";
    detalhe: string;
    payload: Record<string, unknown> | null;
  };
  redirecionamento: {
    recebimento_id: number | null;
    documento_emitido_id: number | null;
    preview_url: string | null;
    documento_url: string | null;
    rota_sugerida: string | null;
  };
};

export type SecretariaCancelamentoInput = {
  lancamento_id: number;
  motivo_cancelamento: string;
  operador_user_id: string | null;
};

export type SecretariaCancelamentoResult = {
  detalhe: SecretariaContaInternaDetalhe;
  lancamento: SecretariaContaLancamentoResumo | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function toInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Math.trunc(Number(value));
  }
  return null;
}

function toText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function upper(value: unknown): string {
  return toText(value)
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase() ?? "";
}

function uniqueNumbers(values: Array<number | null | undefined>): number[] {
  return Array.from(
    new Set(values.filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0)),
  );
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function sanitizeCpf(rawCpf: string | null): string | null {
  if (!rawCpf) return null;
  const digits = rawCpf.replace(/\D/g, "");
  return digits.length === 11 ? digits : null;
}

function valueIsNull(value: number | null): value is null {
  return value === null;
}

function resumoPessoa(row: Record<string, unknown> | null | undefined): PessoaResumo | null {
  const id = toInt(row?.id);
  if (!id) return null;

  return {
    id,
    nome: toText(row?.nome),
    cpf: toText(row?.cpf),
    email: toText(row?.email),
    telefone: toText(row?.telefone),
  };
}

function statusPagamentoOperacional(params: {
  saldoRestanteCentavos: number;
  valorPagoCentavos: number;
  dataVencimento: string | null;
  statusBase: string | null;
}): string {
  const statusBase = upper(params.statusBase);
  if (statusBase.includes("CANCEL")) return "CANCELADO";
  if (params.saldoRestanteCentavos <= 0 && (params.valorPagoCentavos > 0 || statusBase === "PAGO")) {
    return "QUITADO";
  }
  if (params.valorPagoCentavos > 0 && params.saldoRestanteCentavos > 0) {
    return "PARCIAL";
  }
  if (params.dataVencimento && params.dataVencimento < todayIso()) {
    return "EM_ATRASO";
  }
  return "EM_ABERTO";
}

function isStatusCancelado(statusBase: string | null): boolean {
  return upper(statusBase).includes("CANCEL");
}

function parseConta(row: Record<string, unknown>): ContaInternaBase | null {
  const id = toInt(row.id);
  const pessoaTitularId = toInt(row.pessoa_titular_id);
  const tipoConta = toText(row.tipo_conta);
  if (!id || !pessoaTitularId || !tipoConta) return null;

  return {
    id,
    pessoa_titular_id: pessoaTitularId,
    responsavel_financeiro_pessoa_id: toInt(row.responsavel_financeiro_pessoa_id),
    tipo_conta: tipoConta,
    descricao_exibicao: toText(row.descricao_exibicao),
    centro_custo_principal_id: toInt(row.centro_custo_principal_id),
    dia_vencimento: toInt(row.dia_vencimento),
  };
}

function parseFatura(row: Record<string, unknown>): FaturaBase | null {
  const id = toInt(row.id);
  const contaId = toInt(row.conta_conexao_id);
  const periodo = toText(row.periodo_referencia);
  const valor = toInt(row.valor_total_centavos);
  const status = toText(row.status);
  if (!id || !contaId || !periodo || valueIsNull(valor) || !status) return null;

  return {
    id,
    conta_conexao_id: contaId,
    periodo_referencia: periodo,
    data_fechamento: toText(row.data_fechamento),
    data_vencimento: toText(row.data_vencimento),
    valor_total_centavos: valor,
    status,
    cobranca_id: toInt(row.cobranca_id),
    neofin_invoice_id: toText(row.neofin_invoice_id),
  };
}

function parseLancamento(row: Record<string, unknown>): LancamentoBase | null {
  const id = toInt(row.id);
  const contaId = toInt(row.conta_conexao_id);
  const origemSistema = toText(row.origem_sistema);
  const valor = toInt(row.valor_centavos);
  const status = toText(row.status);
  if (!id || !contaId || !origemSistema || valueIsNull(valor) || !status) return null;

  return {
    id,
    conta_conexao_id: contaId,
    cobranca_id: toInt(row.cobranca_id),
    origem_sistema: origemSistema,
    origem_id: toInt(row.origem_id),
    descricao: toText(row.descricao),
    data_lancamento: toText(row.data_lancamento),
    valor_centavos: valor,
    status,
    referencia_item: toText(row.referencia_item),
    composicao_json: asRecord(row.composicao_json),
    centro_custo_id: toInt(row.centro_custo_id),
    aluno_id: toInt(row.aluno_id),
    matricula_id: toInt(row.matricula_id),
    cancelado_em: toText(row.cancelado_em),
    cancelado_por_user_id: toText(row.cancelado_por_user_id),
    motivo_cancelamento: toText(row.motivo_cancelamento),
  };
}

function parseCobranca(row: Record<string, unknown>): CobrancaBase | null {
  const id = toInt(row.id);
  const pessoaId = toInt(row.pessoa_id);
  const descricao = toText(row.descricao);
  const valorCentavos = toInt(row.valor_centavos);
  const status = toText(row.status);
  const vencimento = toText(row.vencimento);
  if (!id || !pessoaId || !descricao || valueIsNull(valorCentavos) || !status || !vencimento) {
    return null;
  }

  return {
    id,
    pessoa_id: pessoaId,
    descricao,
    valor_centavos: valorCentavos,
    status,
    vencimento,
    neofin_charge_id: toText(row.neofin_charge_id),
    link_pagamento: toText(row.link_pagamento),
    linha_digitavel: toText(row.linha_digitavel),
    neofin_payload: asRecord(row.neofin_payload),
  };
}

function parsePagamentoSecretaria(row: Record<string, unknown>): SecretariaPagamentoRow | null {
  const id = toInt(row.id);
  const alvoId = toInt(row.alvo_id);
  const contaId = toInt(row.conta_interna_id);
  const valor = toInt(row.valor_informado_centavos);
  const alvoTipo = toText(row.alvo_tipo);
  const formaCodigo = toText(row.forma_pagamento_codigo);
  const dataPagamento = toText(row.data_pagamento);
  const integracaoStatus = toText(row.integracao_externa_status);

  if (!id || !alvoId || !contaId || valueIsNull(valor) || !alvoTipo || !formaCodigo || !dataPagamento || !integracaoStatus) {
    return null;
  }

  return {
    id,
    alvo_tipo: alvoTipo,
    alvo_id: alvoId,
    conta_interna_id: contaId,
    fatura_id: toInt(row.fatura_id),
    lancamento_id: toInt(row.lancamento_id),
    valor_informado_centavos: valor,
    forma_pagamento_codigo: formaCodigo,
    conta_financeira_id: toInt(row.conta_financeira_id),
    data_pagamento: dataPagamento,
    observacao: toText(row.observacao),
    operador_user_id: toText(row.operador_user_id),
    integracao_externa_status: integracaoStatus,
    integracao_externa_payload: asRecord(row.integracao_externa_payload),
    created_at: toText(row.created_at) ?? dataPagamento,
  };
}

async function carregarContaInterna(
  supabase: SupabaseAdmin,
  contaId: number,
): Promise<ContaInternaBase | null> {
  const { data, error } = await supabase
    .from("credito_conexao_contas")
    .select(
      "id,pessoa_titular_id,responsavel_financeiro_pessoa_id,tipo_conta,descricao_exibicao,centro_custo_principal_id,dia_vencimento",
    )
    .eq("id", contaId)
    .eq("ativo", true)
    .maybeSingle();

  if (error) {
    throw new Error(`erro_carregar_conta_interna:${error.message}`);
  }

  return data ? parseConta(data as Record<string, unknown>) : null;
}

function resolveTipoTitularConta(params: {
  conta: ContaInternaBase;
  alunosRelacionados: PessoaResumo[];
  pessoaPreferencialId?: number | null;
}): string | null {
  const tipoConta = upper(params.conta.tipo_conta);

  if (tipoConta === "COLABORADOR") {
    return "COLABORADOR";
  }

  const titularId = params.conta.pessoa_titular_id;
  const pessoaPreferencialId = params.pessoaPreferencialId ?? null;
  const possuiAlunoAssociado = params.alunosRelacionados.some((item) => item.id !== titularId);

  if (
    pessoaPreferencialId &&
    pessoaPreferencialId !== titularId &&
    params.conta.responsavel_financeiro_pessoa_id === pessoaPreferencialId
  ) {
    return "RESPONSAVEL_FINANCEIRO";
  }

  if (
    params.conta.responsavel_financeiro_pessoa_id &&
    params.conta.responsavel_financeiro_pessoa_id === titularId
  ) {
    return "RESPONSAVEL_FINANCEIRO";
  }

  if (possuiAlunoAssociado) {
    return "RESPONSAVEL_FINANCEIRO";
  }

  return "ALUNO";
}

async function carregarFaturas(
  supabase: SupabaseAdmin,
  contaId: number,
): Promise<FaturaBase[]> {
  const { data, error } = await supabase
    .from("credito_conexao_faturas")
    .select(
      "id,conta_conexao_id,periodo_referencia,data_fechamento,data_vencimento,valor_total_centavos,status,cobranca_id,neofin_invoice_id",
    )
    .eq("conta_conexao_id", contaId)
    .order("periodo_referencia", { ascending: true })
    .order("data_vencimento", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`erro_carregar_faturas_secretaria:${error.message}`);
  }

  return ((data ?? []) as Array<Record<string, unknown>>)
    .map((row) => parseFatura(row))
    .filter((row): row is FaturaBase => Boolean(row));
}

async function carregarLancamentos(
  supabase: SupabaseAdmin,
  contaId: number,
): Promise<LancamentoBase[]> {
  const { data, error } = await supabase
    .from("credito_conexao_lancamentos")
    .select(
      "id,conta_conexao_id,cobranca_id,origem_sistema,origem_id,descricao,data_lancamento,valor_centavos,status,referencia_item,composicao_json,centro_custo_id,aluno_id,matricula_id,cancelado_em,cancelado_por_user_id,motivo_cancelamento",
    )
    .eq("conta_conexao_id", contaId)
    .order("data_lancamento", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`erro_carregar_lancamentos_secretaria:${error.message}`);
  }

  return ((data ?? []) as Array<Record<string, unknown>>)
    .map((row) => parseLancamento(row))
    .filter((row): row is LancamentoBase => Boolean(row));
}

async function carregarVinculosFaturas(
  supabase: SupabaseAdmin,
  lancamentoIds: number[],
): Promise<Map<number, number>> {
  if (lancamentoIds.length === 0) return new Map<number, number>();

  const { data, error } = await supabase
    .from("credito_conexao_fatura_lancamentos")
    .select("fatura_id,lancamento_id")
    .in("lancamento_id", lancamentoIds);

  if (error) {
    throw new Error(`erro_carregar_vinculos_fatura_secretaria:${error.message}`);
  }

  const map = new Map<number, number>();
  for (const row of (data ?? []) as Array<Record<string, unknown>>) {
    const lancamentoId = toInt(row.lancamento_id);
    const faturaId = toInt(row.fatura_id);
    if (lancamentoId && faturaId) {
      map.set(lancamentoId, faturaId);
    }
  }
  return map;
}

async function carregarRecebimentosPorCobranca(
  supabase: SupabaseAdmin,
  cobrancaIds: number[],
): Promise<Map<number, number>> {
  if (cobrancaIds.length === 0) return new Map<number, number>();

  const { data, error } = await supabase
    .from("recebimentos")
    .select("cobranca_id,valor_centavos")
    .in("cobranca_id", cobrancaIds);

  if (error) {
    throw new Error(`erro_carregar_recebimentos_secretaria:${error.message}`);
  }

  const map = new Map<number, number>();
  for (const row of (data ?? []) as Array<Record<string, unknown>>) {
    const cobrancaId = toInt(row.cobranca_id);
    const valor = toInt(row.valor_centavos) ?? 0;
    if (!cobrancaId) continue;
    map.set(cobrancaId, (map.get(cobrancaId) ?? 0) + valor);
  }
  return map;
}

async function atualizarStatusFaturaPosRecebimento(
  supabase: SupabaseAdmin,
  faturaId: number,
): Promise<void> {
  // Buscar a fatura e seus lançamentos vinculados
  const { data: fatura } = await supabase
    .from("credito_conexao_faturas")
    .select("id,status,valor_total_centavos")
    .eq("id", faturaId)
    .maybeSingle();

  if (!fatura) return;

  const statusAtual = upper((fatura as Record<string, unknown>).status as string | null);
  if (statusAtual === "PAGA" || statusAtual === "CANCELADA") return;

  // Buscar lançamentos vinculados a essa fatura
  const { data: vinculos } = await supabase
    .from("credito_conexao_fatura_lancamentos")
    .select("lancamento_id")
    .eq("fatura_id", faturaId);

  const lancamentoIds = (vinculos ?? [])
    .map((v: Record<string, unknown>) => toInt(v.lancamento_id))
    .filter((id): id is number => id !== null);

  if (lancamentoIds.length === 0) return;

  // Buscar os lançamentos para verificar cobranca_ids
  const { data: lancamentos } = await supabase
    .from("credito_conexao_lancamentos")
    .select("id,cobranca_id,valor_centavos,status,cancelado_em")
    .in("id", lancamentoIds);

  if (!lancamentos || lancamentos.length === 0) return;

  // Calcular saldo restante de cada lançamento
  const cobrancaIds = (lancamentos as Array<Record<string, unknown>>)
    .map((l) => toInt(l.cobranca_id))
    .filter((id): id is number => id !== null);

  const recebimentosMap = cobrancaIds.length > 0
    ? await carregarRecebimentosPorCobranca(supabase, cobrancaIds)
    : new Map<number, number>();

  let todosQuitados = true;
  for (const lancamento of lancamentos as Array<Record<string, unknown>>) {
    // Lançamentos cancelados não contam para o cálculo
    if (lancamento.cancelado_em) continue;

    const cobrancaId = toInt(lancamento.cobranca_id);
    const valorLancamento = toInt(lancamento.valor_centavos) ?? 0;
    const totalRecebido = cobrancaId ? recebimentosMap.get(cobrancaId) ?? 0 : 0;
    const saldoRestante = Math.max(valorLancamento - totalRecebido, 0);

    if (saldoRestante > 0) {
      todosQuitados = false;
      break;
    }
  }

  if (todosQuitados) {
    await supabase
      .from("credito_conexao_faturas")
      .update({ status: "PAGA", updated_at: new Date().toISOString() })
      .eq("id", faturaId);
  }
}

async function carregarCobrancas(
  supabase: SupabaseAdmin,
  cobrancaIds: number[],
): Promise<Map<number, CobrancaBase>> {
  if (cobrancaIds.length === 0) return new Map<number, CobrancaBase>();

  const { data, error } = await supabase
    .from("cobrancas")
    .select(
      "id,pessoa_id,descricao,valor_centavos,status,vencimento,neofin_charge_id,link_pagamento,linha_digitavel,neofin_payload",
    )
    .in("id", cobrancaIds);

  if (error) {
    throw new Error(`erro_carregar_cobrancas_secretaria:${error.message}`);
  }

  const map = new Map<number, CobrancaBase>();
  for (const row of (data ?? []) as Array<Record<string, unknown>>) {
    const parsed = parseCobranca(row);
    if (parsed) map.set(parsed.id, parsed);
  }
  return map;
}

async function carregarPessoas(
  supabase: SupabaseAdmin,
  pessoaIds: number[],
): Promise<Map<number, PessoaResumo>> {
  if (pessoaIds.length === 0) return new Map<number, PessoaResumo>();

  const { data, error } = await supabase
    .from("pessoas")
    .select("id,nome,cpf,email,telefone")
    .in("id", pessoaIds);

  if (error) {
    throw new Error(`erro_carregar_pessoas_secretaria:${error.message}`);
  }

  const map = new Map<number, PessoaResumo>();
  for (const row of (data ?? []) as Array<Record<string, unknown>>) {
    const pessoa = resumoPessoa(row);
    if (pessoa) map.set(pessoa.id, pessoa);
  }
  return map;
}

function extrairAlunoIds(lancamentos: LancamentoBase[]): number[] {
  const ids = new Set<number>();

  for (const lancamento of lancamentos) {
    if (lancamento.aluno_id) ids.add(lancamento.aluno_id);

    const itens = Array.isArray(lancamento.composicao_json?.itens)
      ? (lancamento.composicao_json?.itens as unknown[])
      : [];
    for (const item of itens) {
      const registro = asRecord(item);
      const alunoId = toInt(registro?.aluno_id) ?? toInt(registro?.aluno_pessoa_id);
      if (alunoId) ids.add(alunoId);
    }
  }

  return Array.from(ids);
}

function buildLancamentoResumo(params: {
  lancamento: LancamentoBase;
  faturaId: number | null;
  valorPagoCentavos: number;
  alunoNome: string | null;
  dataVencimentoFatura: string | null;
}): SecretariaContaLancamentoResumo {
  const cancelado = isStatusCancelado(params.lancamento.status);
  const saldo = cancelado ? 0 : Math.max(params.lancamento.valor_centavos - params.valorPagoCentavos, 0);
  const possuiRecebimento = params.valorPagoCentavos > 0;

  return {
    id: params.lancamento.id,
    fatura_id: params.faturaId,
    origem_sistema: params.lancamento.origem_sistema,
    origem_id: params.lancamento.origem_id,
    descricao: params.lancamento.descricao ?? "Lancamento da conta interna",
    data_lancamento: params.lancamento.data_lancamento,
    valor_original_centavos: params.lancamento.valor_centavos,
    valor_pago_centavos: params.valorPagoCentavos,
    saldo_restante_centavos: saldo,
    status_operacional: statusPagamentoOperacional({
      saldoRestanteCentavos: saldo,
      valorPagoCentavos: params.valorPagoCentavos,
      dataVencimento: params.dataVencimentoFatura,
      statusBase: params.lancamento.status,
    }),
    referencia_item: params.lancamento.referencia_item,
    aluno_nome: params.alunoNome,
    status_base: params.lancamento.status,
    motivo_cancelamento: params.lancamento.motivo_cancelamento,
    cancelado_em: params.lancamento.cancelado_em,
    cancelado_por_user_id: params.lancamento.cancelado_por_user_id,
    possui_recebimento: possuiRecebimento,
    pode_receber: saldo > 0 && !cancelado,
    pode_cancelar: !cancelado && !possuiRecebimento,
  };
}

function buildFaturaResumo(params: {
  fatura: FaturaBase;
  lancamentos: SecretariaContaLancamentoResumo[];
  cobrancaExterna: CobrancaBase | null;
}): SecretariaContaFaturaResumo {
  const lancamentosAtivos = params.lancamentos.filter((item) => item.status_operacional !== "CANCELADO");
  const valorOriginal = lancamentosAtivos.reduce((acc, item) => acc + item.valor_original_centavos, 0);
  const valorPago = lancamentosAtivos.reduce((acc, item) => acc + item.valor_pago_centavos, 0);
  const valorOriginalBase =
    params.lancamentos.length > 0 ? valorOriginal : Math.max(params.fatura.valor_total_centavos, valorOriginal);
  const saldo = Math.max(valorOriginalBase - valorPago, 0);

  return {
    id: params.fatura.id,
    competencia: params.fatura.periodo_referencia,
    status: params.fatura.status,
    status_operacional: statusPagamentoOperacional({
      saldoRestanteCentavos: saldo,
      valorPagoCentavos: valorPago,
      dataVencimento: params.fatura.data_vencimento,
      statusBase: params.fatura.status,
    }),
    valor_original_centavos: valorOriginalBase,
    valor_pago_centavos: valorPago,
    saldo_restante_centavos: saldo,
    data_vencimento: params.fatura.data_vencimento,
    cobranca_externa_vinculada: params.cobrancaExterna
      ? {
          cobranca_id: params.cobrancaExterna.id,
          status: params.cobrancaExterna.status,
          valor_centavos: params.cobrancaExterna.valor_centavos,
          neofin_charge_id: params.cobrancaExterna.neofin_charge_id,
          neofin_invoice_id: params.fatura.neofin_invoice_id,
          link_pagamento: params.cobrancaExterna.link_pagamento,
        }
      : null,
  };
}

async function montarDetalheContaInterna(
  supabase: SupabaseAdmin,
  conta: ContaInternaBase,
): Promise<SecretariaContaInternaDetalhe> {
  const [faturas, lancamentos] = await Promise.all([
    carregarFaturas(supabase, conta.id),
    carregarLancamentos(supabase, conta.id),
  ]);

  const vinculosFaturaMap = await carregarVinculosFaturas(
    supabase,
    lancamentos.map((item) => item.id),
  );

  const cobrancaIds = uniqueNumbers([
    ...lancamentos.map((item) => item.cobranca_id),
    ...faturas.map((item) => item.cobranca_id),
  ]);

  const [recebimentosMap, cobrancasMap] = await Promise.all([
    carregarRecebimentosPorCobranca(supabase, cobrancaIds),
    carregarCobrancas(supabase, cobrancaIds),
  ]);

  const faturaById = new Map<number, FaturaBase>(faturas.map((item) => [item.id, item]));
  const pessoasMap = await carregarPessoas(
    supabase,
    uniqueNumbers([
      conta.pessoa_titular_id,
      conta.responsavel_financeiro_pessoa_id,
      ...extrairAlunoIds(lancamentos),
    ]),
  );

  const lancamentosResumo = lancamentos.map((lancamento) => {
    const alunoNome =
      (lancamento.aluno_id ? pessoasMap.get(lancamento.aluno_id)?.nome : null) ??
      (conta.tipo_conta === "ALUNO" ? pessoasMap.get(conta.pessoa_titular_id)?.nome ?? null : null);
    const valorPago = lancamento.cobranca_id ? recebimentosMap.get(lancamento.cobranca_id) ?? 0 : 0;
    const faturaId = vinculosFaturaMap.get(lancamento.id) ?? null;
    const dataVencimentoFatura = faturaId ? faturaById.get(faturaId)?.data_vencimento ?? null : null;

    return buildLancamentoResumo({
      lancamento,
      faturaId,
      valorPagoCentavos: valorPago,
      alunoNome,
      dataVencimentoFatura,
    });
  });

  const lancamentosPorFatura = new Map<number, SecretariaContaLancamentoResumo[]>();
  for (const lancamento of lancamentosResumo) {
    if (!lancamento.fatura_id) continue;
    const atual = lancamentosPorFatura.get(lancamento.fatura_id) ?? [];
    atual.push(lancamento);
    lancamentosPorFatura.set(lancamento.fatura_id, atual);
  }

  const faturasResumo = faturas.map((fatura) => {
    const lancamentosDaFatura = lancamentosPorFatura.get(fatura.id) ?? [];
    return {
      ...buildFaturaResumo({
        fatura,
        lancamentos: lancamentosDaFatura,
        cobrancaExterna: fatura.cobranca_id ? cobrancasMap.get(fatura.cobranca_id) ?? null : null,
      }),
      lancamentos: lancamentosDaFatura,
    };
  });

  const lancamentosSemFatura = lancamentosResumo.filter((item) => !item.fatura_id);
  const lancamentosAtivos = [...faturasResumo.flatMap((item) => item.lancamentos), ...lancamentosSemFatura].filter(
    (item) => item.status_operacional !== "CANCELADO",
  );

  const saldoTotal = lancamentosAtivos.reduce((acc, item) => acc + item.saldo_restante_centavos, 0);
  const totalVencido = faturasResumo
    .filter((item) => item.saldo_restante_centavos > 0 && item.data_vencimento && item.data_vencimento < todayIso())
    .reduce((acc, item) => acc + item.saldo_restante_centavos, 0);
  const totalAVencer = Math.max(saldoTotal - totalVencido, 0);

  const proximaFatura = [...faturasResumo]
    .filter((item) => item.saldo_restante_centavos > 0)
    .sort((left, right) => {
      const leftKey = left.data_vencimento ?? "9999-12-31";
      const rightKey = right.data_vencimento ?? "9999-12-31";
      return leftKey.localeCompare(rightKey);
    })[0] ?? null;

  const totaisPorOrigemMap = new Map<string, SecretariaContaOrigemTotal>();
  for (const lancamento of lancamentosAtivos) {
    const origem = upper(lancamento.origem_sistema) || "OUTRO";
    const atual = totaisPorOrigemMap.get(origem) ?? {
      origem,
      valor_em_aberto_centavos: 0,
      quantidade_lancamentos: 0,
    };
    atual.valor_em_aberto_centavos += lancamento.saldo_restante_centavos;
    atual.quantidade_lancamentos += 1;
    totaisPorOrigemMap.set(origem, atual);
  }

  const alunosRelacionados = uniqueNumbers(lancamentos.map((item) => item.aluno_id))
    .map((alunoId) => pessoasMap.get(alunoId) ?? null)
    .filter((item): item is PessoaResumo => Boolean(item));
  const tipoTitular = resolveTipoTitularConta({
    conta,
    alunosRelacionados,
  });

  return {
    conta_id: conta.id,
    tipo_conta: conta.tipo_conta,
    tipo_titular: tipoTitular,
    descricao_exibicao: conta.descricao_exibicao,
    pessoa_titular: pessoasMap.get(conta.pessoa_titular_id) ?? null,
    responsavel_financeiro: conta.responsavel_financeiro_pessoa_id
      ? pessoasMap.get(conta.responsavel_financeiro_pessoa_id) ?? null
      : null,
    alunos_relacionados: alunosRelacionados,
    saldo_total_em_aberto_centavos: saldoTotal,
    total_vencido_centavos: totalVencido,
    total_a_vencer_centavos: totalAVencer,
    proxima_fatura: proximaFatura,
    totais_por_origem: Array.from(totaisPorOrigemMap.values()).sort(
      (left, right) => right.valor_em_aberto_centavos - left.valor_em_aberto_centavos,
    ),
    faturas: faturasResumo,
    lancamentos_sem_fatura: lancamentosSemFatura,
    possui_lancamentos_sem_fatura: lancamentosSemFatura.length > 0,
    total_lancamentos_monitorados: lancamentosResumo.length,
  };
}

function flattenLancamentosDetalhe(
  detalhe: SecretariaContaInternaDetalhe,
): SecretariaContaLancamentoResumo[] {
  return [...detalhe.faturas.flatMap((item) => item.lancamentos), ...detalhe.lancamentos_sem_fatura];
}

async function resolverContaIdsParaPessoa(
  supabase: SupabaseAdmin,
  pessoaId: number,
): Promise<number[]> {
  const contaIds = new Set<number>();

  const { data: diretas, error: diretasError } = await supabase
    .from("credito_conexao_contas")
    .select("id")
    .eq("ativo", true)
    .or(`pessoa_titular_id.eq.${pessoaId},responsavel_financeiro_pessoa_id.eq.${pessoaId}`);

  if (diretasError) {
    throw new Error(`erro_buscar_contas_diretas_secretaria:${diretasError.message}`);
  }

  for (const row of (diretas ?? []) as Array<Record<string, unknown>>) {
    const contaId = toInt(row.id);
    if (contaId) contaIds.add(contaId);
  }

  const resolvida = await resolverContaInternaDoAlunoOuResponsavel({
    supabase,
    alunoPessoaId: pessoaId,
  });
  if (resolvida.elegivel && resolvida.conta_id) {
    contaIds.add(resolvida.conta_id);
  }

  const { data: dependentes, error: dependentesError } = await supabase
    .from("pessoa_responsavel_financeiro_vinculos")
    .select("dependente_pessoa_id")
    .eq("responsavel_pessoa_id", pessoaId)
    .eq("ativo", true)
    .limit(20);

  if (dependentesError) {
    throw new Error(`erro_buscar_dependentes_secretaria:${dependentesError.message}`);
  }

  for (const row of (dependentes ?? []) as Array<Record<string, unknown>>) {
    const dependenteId = toInt(row.dependente_pessoa_id);
    if (!dependenteId) continue;
    const contaDependente = await resolverContaInternaDoAlunoOuResponsavel({
      supabase,
      alunoPessoaId: dependenteId,
    });
    if (contaDependente.elegivel && contaDependente.conta_id) {
      contaIds.add(contaDependente.conta_id);
    }
  }

  return Array.from(contaIds);
}

async function carregarPessoaPorId(
  supabase: SupabaseAdmin,
  pessoaId: number,
): Promise<PessoaResumo | null> {
  const pessoas = await carregarPessoas(supabase, [pessoaId]);
  return pessoas.get(pessoaId) ?? null;
}

async function buscarPessoaIdsPorTermo(
  supabase: SupabaseAdmin,
  termo: string,
): Promise<number[]> {
  const ids = new Set<number>();
  const termoNormalizado = termo.trim();
  const digits = termoNormalizado.replace(/\D/g, "");
  const filtros = [`nome.ilike.%${termoNormalizado}%`];

  if (digits) {
    filtros.push(`cpf.ilike.%${digits}%`);
  }

  const { data: pessoas, error: pessoasError } = await supabase
    .from("pessoas")
    .select("id")
    .or(filtros.join(","))
    .limit(12);

  if (pessoasError) {
    throw new Error(`erro_buscar_pessoas_secretaria:${pessoasError.message}`);
  }

  for (const row of (pessoas ?? []) as Array<Record<string, unknown>>) {
    const pessoaId = toInt(row.id);
    if (pessoaId) ids.add(pessoaId);
  }

  const matriculaId = toInt(termoNormalizado);
  if (matriculaId) {
    const { data: matricula, error: matriculaError } = await supabase
      .from("matriculas")
      .select("id,pessoa_id,responsavel_financeiro_id")
      .eq("id", matriculaId)
      .maybeSingle();

    if (matriculaError) {
      throw new Error(`erro_buscar_matricula_secretaria:${matriculaError.message}`);
    }

    const pessoaMatriculaId = toInt((matricula as Record<string, unknown> | null)?.pessoa_id);
    const responsavelId = toInt((matricula as Record<string, unknown> | null)?.responsavel_financeiro_id);
    if (pessoaMatriculaId) ids.add(pessoaMatriculaId);
    if (responsavelId) ids.add(responsavelId);
  }

  return Array.from(ids);
}

async function carregarPagamentoSecretaria(
  supabase: SupabaseAdmin,
  pagamentoId: number,
): Promise<SecretariaPagamentoRow | null> {
  const { data, error } = await supabase
    .from("secretaria_caixa_pagamentos")
    .select("*")
    .eq("id", pagamentoId)
    .maybeSingle();

  if (error) {
    throw new Error(`erro_carregar_pagamento_secretaria:${error.message}`);
  }

  return data ? parsePagamentoSecretaria(data as Record<string, unknown>) : null;
}

async function carregarLancamentoPorId(
  supabase: SupabaseAdmin,
  lancamentoId: number,
): Promise<LancamentoBase | null> {
  const { data, error } = await supabase
    .from("credito_conexao_lancamentos")
    .select(
      "id,conta_conexao_id,cobranca_id,origem_sistema,origem_id,descricao,data_lancamento,valor_centavos,status,referencia_item,composicao_json,centro_custo_id,aluno_id,matricula_id,cancelado_em,cancelado_por_user_id,motivo_cancelamento",
    )
    .eq("id", lancamentoId)
    .maybeSingle();

  if (error) {
    throw new Error(`erro_carregar_lancamento_secretaria:${error.message}`);
  }

  return data ? parseLancamento(data as Record<string, unknown>) : null;
}

async function carregarRedirecionamentoRecebimento(
  supabase: SupabaseAdmin,
  pagamentoId: number,
): Promise<SecretariaPagamentoResult["redirecionamento"]> {
  const { data, error } = await supabase
    .from("recebimentos")
    .select("id")
    .eq("secretaria_caixa_pagamento_id", pagamentoId)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`erro_carregar_recebimento_pagamento_secretaria:${error.message}`);
  }

  const recebimentoId = toInt((data as Record<string, unknown> | null)?.id);
  if (!recebimentoId) {
    return {
      recebimento_id: null,
      documento_emitido_id: null,
      preview_url: null,
      documento_url: null,
      rota_sugerida: null,
    };
  }

  const { data: documentoData, error: documentoError } = await supabase
    .from("documentos_emitidos")
    .select("id")
    .eq("recebimento_id", recebimentoId)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (documentoError) {
    throw new Error(`erro_carregar_documento_emitido_secretaria:${documentoError.message}`);
  }

  const documentoEmitidoId = toInt((documentoData as Record<string, unknown> | null)?.id);
  const previewUrl = `/api/documentos/recibos/recebimento/preview?recebimento_id=${recebimentoId}&render=1`;
  const documentoUrl = documentoEmitidoId ? `/admin/config/documentos/emitidos/${documentoEmitidoId}` : null;

  return {
    recebimento_id: recebimentoId,
    documento_emitido_id: documentoEmitidoId,
    preview_url: previewUrl,
    documento_url: documentoUrl,
    rota_sugerida: documentoUrl ?? previewUrl,
  };
}

async function atualizarStatusIntegracaoPagamento(
  supabase: SupabaseAdmin,
  pagamentoId: number,
  status: SecretariaPagamentoResult["integracao_externa"]["status"],
  payload: Record<string, unknown> | null,
): Promise<SecretariaPagamentoRow | null> {
  const { data, error } = await supabase
    .from("secretaria_caixa_pagamentos")
    .update({
      integracao_externa_status: status,
      integracao_externa_payload: payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pagamentoId)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(`erro_atualizar_integracao_pagamento_secretaria:${error.message}`);
  }

  return data ? parsePagamentoSecretaria(data as Record<string, unknown>) : null;
}

async function sincronizarCobrancaExternaFatura(params: {
  supabase: SupabaseAdmin;
  detalhe: SecretariaContaInternaDetalhe;
  faturaId: number | null;
  formaPagamentoCodigo: string;
  dataPagamento: string;
}): Promise<SecretariaPagamentoResult["integracao_externa"]> {
  const { supabase, detalhe, faturaId, formaPagamentoCodigo, dataPagamento } = params;
  const faturaAberta = faturaId ? detalhe.faturas.find((item) => item.id === faturaId) ?? null : null;

  if (!faturaAberta) {
    return {
      status: "IGNORADA",
      detalhe: "Pagamento sem fatura consolidada vinculada para sincronizacao externa.",
      payload: null,
    };
  }

  if (upper(detalhe.tipo_conta) !== "ALUNO") {
    return {
      status: "IGNORADA",
      detalhe: "Conta interna de colaborador nao exige cobranca externa.",
      payload: null,
    };
  }

  const cobrancaExternaId = faturaAberta.cobranca_externa_vinculada?.cobranca_id ?? null;
  const detalheCharge = cobrancaExternaId
    ? await carregarCobrancas(supabase, [cobrancaExternaId]).then((map) => map.get(cobrancaExternaId) ?? null)
    : null;

  const recebimentosDaCobranca = cobrancaExternaId
    ? await carregarRecebimentosPorCobranca(supabase, [cobrancaExternaId]).then((map) => map.get(cobrancaExternaId) ?? 0)
    : 0;

  if (cobrancaExternaId && recebimentosDaCobranca > 0) {
    return {
      status: "REVISAO_MANUAL",
      detalhe: "A cobranca externa consolidada ja possui recebimentos locais e exige revisao manual.",
      payload: {
        cobranca_id: cobrancaExternaId,
        recebimentos_locais_centavos: recebimentosDaCobranca,
      },
    };
  }

  const pessoaResponsavel = detalhe.responsavel_financeiro ?? detalhe.pessoa_titular;
  const cpfResponsavel = sanitizeCpf(pessoaResponsavel?.cpf ?? null);

  if (!pessoaResponsavel?.id || !cpfResponsavel) {
    return {
      status: "REVISAO_MANUAL",
      detalhe: "Titular/responsavel sem CPF valido para sincronizacao na Neofin.",
      payload: {
        pessoa_id: pessoaResponsavel?.id ?? null,
        cpf: pessoaResponsavel?.cpf ?? null,
      },
    };
  }

  const itensDescricao = flattenLancamentosDetalhe(detalhe)
    .filter((item) => item.fatura_id === faturaAberta.id)
    .map((item) => item.descricao)
    .slice(0, 4);

  const descricao = buildDescricaoCobranca({
    contexto: "FATURA_CREDITO_CONEXAO",
    faturaId: faturaAberta.id,
    periodo: faturaAberta.competencia,
    itensDescricao,
  });

  if (faturaAberta.saldo_restante_centavos <= 0) {
    if (detalheCharge?.neofin_charge_id) {
      const markPaid = await markNeofinBillingAsPaid({
        integrationIdentifier: detalheCharge.neofin_charge_id,
        paidAt: dataPagamento,
        paymentMethod: formaPagamentoCodigo,
        note: "Liquidacao presencial no Caixa da Secretaria.",
      });

      if (!markPaid.ok) {
        return {
          status: "ERRO",
          detalhe: "Falha ao marcar a cobranca consolidada da Neofin como paga.",
          payload: {
            cobranca_id: detalheCharge.id,
            neofin_charge_id: detalheCharge.neofin_charge_id,
            erro: markPaid.error,
          },
        };
      }
    }

    if (detalheCharge?.id) {
      const { error: updateChargeError } = await supabase
        .from("cobrancas")
        .update({
          valor_centavos: 0,
          status: "PAGO",
          data_pagamento: dataPagamento,
          metodo_pagamento: formaPagamentoCodigo,
          updated_at: new Date().toISOString(),
        })
        .eq("id", detalheCharge.id);

      if (updateChargeError) {
        return {
          status: "ERRO",
          detalhe: "Falha ao atualizar a cobranca local consolidada.",
          payload: {
            cobranca_id: detalheCharge.id,
            erro: updateChargeError.message,
          },
        };
      }
    }

    return {
      status: "SINCRONIZADA",
      detalhe: "Cobranca externa consolidada marcada como quitada.",
      payload: {
        fatura_id: faturaAberta.id,
        cobranca_id: detalheCharge?.id ?? null,
        saldo_restante_centavos: 0,
      },
    };
  }

  const upsertLocal = await getOrCreateCobrancaCanonicaFatura({
    supabase,
    faturaId: faturaAberta.id,
    pessoaId: pessoaResponsavel.id,
    descricao,
    valorCentavos: faturaAberta.saldo_restante_centavos,
    vencimentoIso: faturaAberta.data_vencimento ?? todayIso(),
  });

  const provider = getCobrancaProvider("NEOFIN");
  const providerResult = await provider.criarCobranca({
    pessoaId: pessoaResponsavel.id,
    descricao,
    valorCentavos: faturaAberta.saldo_restante_centavos,
    vencimentoISO: faturaAberta.data_vencimento ?? todayIso(),
    referenciaInterna: { tipo: "FATURA_CREDITO_CONEXAO", id: faturaAberta.id },
  });

  const providerDetails = extractNeofinBillingDetails(providerResult.payload ?? null, {
    identifier: providerResult.providerCobrancaId,
    integrationIdentifier: `fatura-credito-conexao-${faturaAberta.id}`,
  });

  const neofinChargeId =
    firstNonEmptyString(providerDetails.billingId, providerResult.providerCobrancaId) ??
    providerResult.providerCobrancaId;
  const neofinInvoiceId = looksLikeNeofinBillingNumber(providerDetails.billingId)
    ? providerDetails.billingId
    : null;

  const { error: updateChargeError } = await supabase
    .from("cobrancas")
    .update({
      descricao,
      valor_centavos: faturaAberta.saldo_restante_centavos,
      status: "PENDENTE",
      data_pagamento: null,
      neofin_charge_id: neofinChargeId,
      neofin_payload: providerResult.payload ?? null,
      link_pagamento: providerDetails.paymentLink ?? null,
      linha_digitavel: providerDetails.digitableLine ?? providerDetails.barcode ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", upsertLocal.cobranca.id);

  if (updateChargeError) {
    return {
      status: "ERRO",
      detalhe: "Falha ao atualizar a cobranca local restante.",
      payload: {
        cobranca_id: upsertLocal.cobranca.id,
        erro: updateChargeError.message,
      },
    };
  }

  const { error: updateFaturaError } = await supabase
    .from("credito_conexao_faturas")
    .update({
      cobranca_id: upsertLocal.cobranca.id,
      neofin_invoice_id: neofinInvoiceId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", faturaAberta.id);

  if (updateFaturaError) {
    return {
      status: "ERRO",
      detalhe: "Falha ao vincular a cobranca externa recalculada na fatura.",
      payload: {
        fatura_id: faturaAberta.id,
        erro: updateFaturaError.message,
      },
    };
  }

  return {
    status: "SINCRONIZADA",
    detalhe: "Cobranca externa recalculada para o saldo restante da fatura.",
    payload: {
      fatura_id: faturaAberta.id,
      cobranca_id: upsertLocal.cobranca.id,
      saldo_restante_centavos: faturaAberta.saldo_restante_centavos,
      neofin_charge_id: neofinChargeId,
      neofin_invoice_id: neofinInvoiceId,
    },
  };
}

export async function getSecretariaContaInternaDetalhe(
  contaId: number,
): Promise<SecretariaContaInternaDetalhe> {
  const supabase = getSupabaseAdmin();
  const conta = await carregarContaInterna(supabase, contaId);
  if (!conta) {
    throw new Error("conta_interna_nao_encontrada");
  }

  return montarDetalheContaInterna(supabase, conta);
}

export async function listarSecretariaContaInternaResumo(params: {
  pessoaId?: number | null;
  termo?: string | null;
}): Promise<SecretariaContaInternaResumo[]> {
  const supabase = getSupabaseAdmin();
  const contaIds = new Set<number>();
  const pessoaPreferencialPorConta = new Map<number, number>();

  if (params.pessoaId) {
    for (const contaId of await resolverContaIdsParaPessoa(supabase, params.pessoaId)) {
      contaIds.add(contaId);
      pessoaPreferencialPorConta.set(contaId, params.pessoaId);
    }
  }

  const termo = toText(params.termo);
  if (termo) {
    const pessoaIds = await buscarPessoaIdsPorTermo(supabase, termo);
    for (const pessoaId of pessoaIds) {
      for (const contaId of await resolverContaIdsParaPessoa(supabase, pessoaId)) {
        contaIds.add(contaId);
        if (!pessoaPreferencialPorConta.has(contaId)) {
          pessoaPreferencialPorConta.set(contaId, pessoaId);
        }
      }
    }
  }

  const resultados: SecretariaContaInternaResumo[] = [];
  for (const contaId of contaIds) {
    const detalhe = await getSecretariaContaInternaDetalhe(contaId);
    const pessoaPreferencialId = pessoaPreferencialPorConta.get(contaId) ?? null;
    const pessoaPreferencial = pessoaPreferencialId
      ? await carregarPessoaPorId(supabase, pessoaPreferencialId)
      : detalhe.alunos_relacionados[0] ?? detalhe.responsavel_financeiro ?? detalhe.pessoa_titular;

    resultados.push({
      pessoa: pessoaPreferencial,
      responsavel_financeiro: detalhe.responsavel_financeiro,
      conta_conexao_id: detalhe.conta_id,
      tipo_conta: detalhe.tipo_conta,
      tipo_titular: detalhe.tipo_titular,
      descricao_exibicao: detalhe.descricao_exibicao,
      saldo_total_em_aberto_centavos: detalhe.saldo_total_em_aberto_centavos,
      total_vencido_centavos: detalhe.total_vencido_centavos,
      total_a_vencer_centavos: detalhe.total_a_vencer_centavos,
      proxima_fatura: detalhe.proxima_fatura,
      alunos_relacionados: detalhe.alunos_relacionados,
      faturas_resumidas: detalhe.faturas.slice(0, 6),
      lancamentos_resumidos: flattenLancamentosDetalhe(detalhe).slice(0, 8),
      totais_por_origem: detalhe.totais_por_origem,
    });
  }

  return resultados.sort(
    (left, right) => right.saldo_total_em_aberto_centavos - left.saldo_total_em_aberto_centavos,
  );
}

export async function aplicarPagamentoSecretaria(
  input: SecretariaPagamentoInput,
): Promise<SecretariaPagamentoResult> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("fn_secretaria_caixa_aplicar_pagamento", {
    p_alvo_tipo: input.alvo_tipo,
    p_alvo_id: input.alvo_id,
    p_valor_pagamento_centavos: input.valor_pagamento_centavos,
    p_forma_pagamento_codigo: input.forma_pagamento_codigo,
    p_conta_financeira_id: input.conta_financeira_id,
    p_data_pagamento: input.data_pagamento,
    p_observacao: input.observacao ?? null,
    p_operador_user_id: input.operador_user_id,
  });

  if (error) {
    throw new Error(error.message);
  }

  const firstRow = Array.isArray(data) ? (data[0] as Record<string, unknown> | undefined) : undefined;
  const pagamentoId = toInt(firstRow?.pagamento_id);
  const contaInternaId = toInt(firstRow?.conta_interna_id);

  if (!pagamentoId || !contaInternaId) {
    throw new Error("pagamento_secretaria_sem_retorno");
  }

  let pagamento = await carregarPagamentoSecretaria(supabase, pagamentoId);
  let detalhe = await getSecretariaContaInternaDetalhe(contaInternaId);
  const faturaAfetadaId = pagamento?.fatura_id ?? toInt(firstRow?.fatura_id);
  let integracao: SecretariaPagamentoResult["integracao_externa"];

  try {
    integracao = await sincronizarCobrancaExternaFatura({
      supabase,
      detalhe,
      faturaId: faturaAfetadaId,
      formaPagamentoCodigo: input.forma_pagamento_codigo,
      dataPagamento: input.data_pagamento,
    });
  } catch (error) {
    integracao = {
      status: "ERRO",
      detalhe: "Falha ao sincronizar a cobranca externa vinculada.",
      payload: {
        fatura_id: faturaAfetadaId,
        error: error instanceof Error ? error.message : "erro_desconhecido",
      },
    };
  }

  pagamento = await atualizarStatusIntegracaoPagamento(
    supabase,
    pagamentoId,
    integracao.status,
    integracao.payload,
  );

  // Verificar se a fatura afetada foi totalmente quitada e atualizar o status
  if (faturaAfetadaId) {
    try {
      await atualizarStatusFaturaPosRecebimento(supabase, faturaAfetadaId);
    } catch (error) {
      console.error("[SECRETARIA][CAIXA][ATUALIZAR_STATUS_FATURA][ERRO]", {
        faturaId: faturaAfetadaId,
        message: error instanceof Error ? error.message : "erro_desconhecido",
      });
    }
  }

  detalhe = await getSecretariaContaInternaDetalhe(contaInternaId);
  let redirecionamento: SecretariaPagamentoResult["redirecionamento"] = {
    recebimento_id: null,
    documento_emitido_id: null,
    preview_url: null,
    documento_url: null,
    rota_sugerida: null,
  };

  try {
    redirecionamento = await carregarRedirecionamentoRecebimento(supabase, pagamentoId);
  } catch (error) {
    console.error("[SECRETARIA][CAIXA][REDIRECIONAMENTO_RECIBO][ERRO]", {
      pagamentoId,
      message: error instanceof Error ? error.message : "erro_desconhecido",
    });
  }

  return {
    pagamento,
    detalhe,
    integracao_externa: integracao,
    redirecionamento,
  };
}

export async function cancelarLancamentoSecretaria(
  input: SecretariaCancelamentoInput,
): Promise<SecretariaCancelamentoResult> {
  const supabase = getSupabaseAdmin();
  const motivo = toText(input.motivo_cancelamento);

  if (!motivo) {
    throw new Error("motivo_cancelamento_obrigatorio");
  }

  const lancamento = await carregarLancamentoPorId(supabase, input.lancamento_id);
  if (!lancamento) {
    throw new Error("lancamento_nao_encontrado");
  }

  if (isStatusCancelado(lancamento.status)) {
    throw new Error("lancamento_ja_cancelado");
  }

  const recebimentosMap = await carregarRecebimentosPorCobranca(
    supabase,
    uniqueNumbers([lancamento.cobranca_id]),
  );
  const totalRecebido = lancamento.cobranca_id ? recebimentosMap.get(lancamento.cobranca_id) ?? 0 : 0;
  if (totalRecebido > 0) {
    throw new Error("lancamento_ja_recebido_nao_pode_cancelar");
  }

  const vinculoFaturaMap = await carregarVinculosFaturas(supabase, [lancamento.id]);
  const faturaId = vinculoFaturaMap.get(lancamento.id) ?? null;
  const nowIso = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("credito_conexao_lancamentos")
    .update({
      status: "CANCELADO",
      cancelado_em: nowIso,
      cancelado_por_user_id: input.operador_user_id,
      motivo_cancelamento: motivo,
      updated_at: nowIso,
    })
    .eq("id", lancamento.id);

  if (updateError) {
    throw new Error(`erro_cancelar_lancamento_secretaria:${updateError.message}`);
  }

  if (lancamento.cobranca_id) {
    const { error: cobrancaError } = await supabase
      .from("cobrancas")
      .update({
        status: "CANCELADO",
        observacoes: `Cancelada no Caixa da Secretaria: ${motivo}`,
        updated_at: nowIso,
      })
      .eq("id", lancamento.cobranca_id);

    if (cobrancaError) {
      throw new Error(`erro_cancelar_cobranca_lancamento_secretaria:${cobrancaError.message}`);
    }
  }

  if (faturaId) {
    const { error: faturaStatusError } = await supabase.rpc("fn_secretaria_caixa_atualizar_status_fatura", {
      p_fatura_id: faturaId,
    });

    if (faturaStatusError) {
      throw new Error(`erro_recalcular_fatura_secretaria:${faturaStatusError.message}`);
    }
  }

  const detalhe = await getSecretariaContaInternaDetalhe(lancamento.conta_conexao_id);
  const lancamentoAtualizado =
    flattenLancamentosDetalhe(detalhe).find((item) => item.id === lancamento.id) ?? null;

  return {
    detalhe,
    lancamento: lancamentoAtualizado,
  };
}
