import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReciboPagamentoItem, ReciboPagamentoSnapshot } from "@/lib/documentos/recibos/contrato-recibo";
import { mapearVariaveisRecibo, type VariaveisReciboDocumento } from "@/lib/documentos/recibos/mapear-variaveis-recibo";

type RecebimentoRow = {
  id: number;
  cobranca_id: number | null;
  centro_custo_id: number | null;
  valor_centavos: number | null;
  data_pagamento: string | null;
  metodo_pagamento: string | null;
  forma_pagamento_codigo: string | null;
  observacoes: string | null;
  origem_sistema: string | null;
};

type CobrancaRow = {
  id: number;
  pessoa_id: number | null;
  descricao: string | null;
  valor_centavos: number | null;
  competencia_ano_mes: string | null;
  vencimento: string | null;
  status: string | null;
  origem_tipo: string | null;
  origem_subtipo: string | null;
  origem_id: number | null;
  centro_custo_id: number | null;
};

type PessoaRow = {
  id: number;
  nome: string | null;
  cpf: string | null;
  cnpj: string | null;
};

type MatriculaRow = {
  id: number;
  pessoa_id: number | null;
  responsavel_financeiro_id: number | null;
  status: string | null;
  data_matricula: string | null;
};

type OperacionalRow = {
  cobranca_id: number;
  pessoa_id: number | null;
  pessoa_nome: string | null;
  competencia_ano_mes: string | null;
  origem_tipo: string | null;
  origem_referencia_label: string | null;
  conta_conexao_id: number | null;
  tipo_conta: string | null;
  tipo_conta_label: string | null;
};

type CentroCustoRow = {
  id: number;
  nome: string | null;
};

type EscolaContext = {
  nome: string;
  cidade: string;
};

export type MontagemReciboPorRecebimento = {
  snapshot: ReciboPagamentoSnapshot;
  variaveis: VariaveisReciboDocumento;
  gaps: string[];
};

function pickText(...values: Array<unknown>): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function toPositiveInt(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function formatMoney(centavos: number | null): string {
  return (Number(centavos ?? 0) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDateISO(value: string | null): string | null {
  if (!value) return null;
  const iso = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
}

function inferirCompetencia(cobranca: CobrancaRow, operacional: OperacionalRow | null, dataPagamentoIso: string): string | null {
  const competencia = pickText(cobranca.competencia_ano_mes, operacional?.competencia_ano_mes);
  if (competencia && /^\d{4}-\d{2}$/.test(competencia)) return competencia;

  const vencimentoIso = formatDateISO(cobranca.vencimento);
  if (vencimentoIso) return vencimentoIso.slice(0, 7);

  return dataPagamentoIso.slice(0, 7);
}

function buildReciboNumero(recebimentoId: number, dataEmissaoIso: string): string {
  return `RCB-${dataEmissaoIso.replaceAll("-", "")}-${recebimentoId}`;
}

async function resolveEscolaContext(supabase: SupabaseClient): Promise<EscolaContext> {
  const fallback: EscolaContext = {
    nome: process.env.ESCOLA_NOME?.trim() || process.env.NEXT_PUBLIC_ESCOLA_NOME?.trim() || "Conexao Danca",
    cidade:
      process.env.ESCOLA_CIDADE?.trim() ||
      process.env.NEXT_PUBLIC_ESCOLA_CIDADE?.trim() ||
      "Salinopolis/PA",
  };

  const { data: settings } = await supabase
    .from("system_settings")
    .select("*")
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!settings || typeof settings !== "object") return fallback;

  const record = settings as Record<string, unknown>;
  return {
    nome: pickText(record.escola_nome, record.school_name, record.nome, fallback.nome) ?? fallback.nome,
    cidade: pickText(record.escola_cidade, record.school_cidade, record.cidade, fallback.cidade) ?? fallback.cidade,
  };
}

function isMatriculaOrigem(origemTipo: string | null | undefined): boolean {
  const normalized = String(origemTipo ?? "").trim().toUpperCase();
  return normalized === "MATRICULA" || normalized.startsWith("MATRICULA_");
}

async function carregarPessoa(supabase: SupabaseClient, pessoaId: number | null): Promise<PessoaRow | null> {
  if (!pessoaId) return null;
  const { data } = await supabase
    .from("pessoas")
    .select("id,nome,cpf,cnpj")
    .eq("id", pessoaId)
    .maybeSingle<PessoaRow>();
  return data ?? null;
}

async function resolverMatriculaRelacionada(
  supabase: SupabaseClient,
  cobranca: CobrancaRow,
): Promise<{ matricula: MatriculaRow | null; gaps: string[] }> {
  const gaps: string[] = [];
  const origemId = toPositiveInt(cobranca.origem_id);

  if (origemId && isMatriculaOrigem(cobranca.origem_tipo)) {
    const { data } = await supabase
      .from("matriculas")
      .select("id,pessoa_id,responsavel_financeiro_id,status,data_matricula")
      .eq("id", origemId)
      .maybeSingle<MatriculaRow>();

    if (data) return { matricula: data, gaps };
    gaps.push("matricula_origem_nao_encontrada");
    return { matricula: null, gaps };
  }

  const pessoaId = toPositiveInt(cobranca.pessoa_id);
  if (!pessoaId) {
    gaps.push("cobranca_sem_pessoa");
    return { matricula: null, gaps };
  }

  const { data: matriculas } = await supabase
    .from("matriculas")
    .select("id,pessoa_id,responsavel_financeiro_id,status,data_matricula")
    .or(`responsavel_financeiro_id.eq.${pessoaId},pessoa_id.eq.${pessoaId}`)
    .order("id", { ascending: false });

  const unicas = new Map<number, MatriculaRow>();
  for (const item of (matriculas ?? []) as MatriculaRow[]) {
    unicas.set(item.id, item);
  }

  const lista = Array.from(unicas.values());
  if (lista.length === 1) {
    return { matricula: lista[0] ?? null, gaps };
  }

  gaps.push(lista.length === 0 ? "matricula_nao_resolvida" : "matricula_ambigua_para_pessoa");
  return { matricula: null, gaps };
}

export async function montarReciboPorRecebimento(params: {
  supabase: SupabaseClient;
  recebimentoId: number;
  operadorUserId: string | null;
}): Promise<MontagemReciboPorRecebimento> {
  const { supabase, recebimentoId, operadorUserId } = params;
  const gaps: string[] = [];

  const { data: recebimento, error: recebimentoError } = await supabase
    .from("recebimentos")
    .select(
      "id,cobranca_id,centro_custo_id,valor_centavos,data_pagamento,metodo_pagamento,forma_pagamento_codigo,observacoes,origem_sistema",
    )
    .eq("id", recebimentoId)
    .maybeSingle<RecebimentoRow>();

  if (recebimentoError || !recebimento) {
    throw new Error("recebimento_nao_encontrado");
  }

  const dataPagamentoIso = formatDateISO(recebimento.data_pagamento);
  if (!dataPagamentoIso) {
    throw new Error("recebimento_nao_confirmado");
  }

  const cobrancaId = toPositiveInt(recebimento.cobranca_id);
  if (!cobrancaId) {
    throw new Error("recebimento_sem_cobranca");
  }

  const { data: cobranca, error: cobrancaError } = await supabase
    .from("cobrancas")
    .select(
      "id,pessoa_id,descricao,valor_centavos,competencia_ano_mes,vencimento,status,origem_tipo,origem_subtipo,origem_id,centro_custo_id",
    )
    .eq("id", cobrancaId)
    .maybeSingle<CobrancaRow>();

  if (cobrancaError || !cobranca) {
    throw new Error("cobranca_nao_encontrada");
  }

  const { data: operacional } = await supabase
    .from("vw_financeiro_cobrancas_operacionais")
    .select(
      "cobranca_id,pessoa_id,pessoa_nome,competencia_ano_mes,origem_tipo,origem_referencia_label,conta_conexao_id,tipo_conta,tipo_conta_label",
    )
    .eq("cobranca_id", cobrancaId)
    .maybeSingle<OperacionalRow>();

  const pessoaId = toPositiveInt(cobranca.pessoa_id) ?? toPositiveInt(operacional?.pessoa_id);
  if (!pessoaId) {
    throw new Error("pessoa_nao_resolvida");
  }
  const pessoa = await carregarPessoa(supabase, pessoaId);

  const { matricula, gaps: gapsMatricula } = await resolverMatriculaRelacionada(supabase, cobranca);
  gaps.push(...gapsMatricula);

  const aluno = await carregarPessoa(supabase, toPositiveInt(matricula?.pessoa_id));
  const responsavel = await carregarPessoa(supabase, toPositiveInt(matricula?.responsavel_financeiro_id));

  const centroCustoId = toPositiveInt(recebimento.centro_custo_id) ?? toPositiveInt(cobranca.centro_custo_id);
  const { data: centroCusto } = centroCustoId
    ? await supabase.from("centros_custo").select("id,nome").eq("id", centroCustoId).maybeSingle<CentroCustoRow>()
    : { data: null as CentroCustoRow | null };

  const { data: recebimentosDaCobranca } = await supabase
    .from("recebimentos")
    .select("id,valor_centavos,data_pagamento")
    .eq("cobranca_id", cobrancaId)
    .not("data_pagamento", "is", null)
    .order("data_pagamento", { ascending: true })
    .order("id", { ascending: true });

  let totalAteEsteRecebimento = 0;
  for (const item of (recebimentosDaCobranca ?? []) as Array<{
    id: number;
    valor_centavos: number | null;
    data_pagamento: string | null;
  }>) {
    totalAteEsteRecebimento += Number(item.valor_centavos ?? 0);
    if (item.id === recebimento.id) break;
  }

  const escola = await resolveEscolaContext(supabase);
  const dataEmissaoIso = new Date().toISOString().slice(0, 10);
  const competencia = inferirCompetencia(cobranca, operacional ?? null, dataPagamentoIso);
  const formaPagamento = pickText(recebimento.forma_pagamento_codigo, recebimento.metodo_pagamento, cobranca.status);
  const pessoaNome =
    pickText(pessoa?.nome, operacional?.pessoa_nome) ??
    (pessoaId ? `Pessoa #${pessoaId}` : "Pessoa nao identificada");
  const pessoaDocumento = pickText(pessoa?.cpf, pessoa?.cnpj);
  const valorTotalReferenciaCentavos = Number(cobranca.valor_centavos ?? 0);
  const saldoPosPagamentoCentavos = Math.max(valorTotalReferenciaCentavos - totalAteEsteRecebimento, 0);
  const origemReferenciaLabel =
    pickText(operacional?.origem_referencia_label, cobranca.descricao) ??
    `${pickText(cobranca.origem_tipo, "COBRANCA")} #${cobranca.id}`;

  const itemRecibo: ReciboPagamentoItem = {
    cobranca_id: cobranca.id,
    recebimento_id: recebimento.id,
    competencia_ano_mes: competencia,
    descricao: pickText(cobranca.descricao, origemReferenciaLabel) ?? "Recebimento financeiro",
    forma_pagamento: formaPagamento,
    data_pagamento: dataPagamentoIso,
    valor_pago_centavos: Number(recebimento.valor_centavos ?? 0),
    valor_total_referencia_centavos: valorTotalReferenciaCentavos,
    saldo_pos_pagamento_centavos: saldoPosPagamentoCentavos,
    origem_tipo: pickText(cobranca.origem_tipo, operacional?.origem_tipo),
    origem_referencia_label: origemReferenciaLabel,
    conta_interna_tipo: pickText(operacional?.tipo_conta),
    conta_interna_label: pickText(operacional?.tipo_conta_label),
  };

  const snapshot: ReciboPagamentoSnapshot = {
    tipo_recibo: "PAGAMENTO_CONFIRMADO",
    origem_recibo: "RECEBIMENTO",
    recibo_numero: buildReciboNumero(recebimento.id, dataEmissaoIso),
    data_emissao: dataEmissaoIso,
    data_pagamento: dataPagamentoIso,
    cidade_emissao: escola.cidade,
    matricula_id: toPositiveInt(matricula?.id),
    aluno_pessoa_id: toPositiveInt(matricula?.pessoa_id),
    aluno_nome: pickText(aluno?.nome),
    pessoa_id: pessoaId,
    pessoa_nome: pessoaNome,
    pessoa_documento: pessoaDocumento,
    responsavel_financeiro_nome: pickText(responsavel?.nome),
    cobranca_id: cobranca.id,
    recebimento_id: recebimento.id,
    competencia_ano_mes: competencia,
    descricao: itemRecibo.descricao,
    forma_pagamento: formaPagamento,
    valor_pago_centavos: itemRecibo.valor_pago_centavos,
    valor_pago_formatado: formatMoney(itemRecibo.valor_pago_centavos),
    valor_total_referencia_centavos: valorTotalReferenciaCentavos,
    saldo_pos_pagamento_centavos: saldoPosPagamentoCentavos,
    origem_tipo: itemRecibo.origem_tipo,
    origem_referencia_label: origemReferenciaLabel,
    centro_custo_id: centroCustoId,
    centro_custo_nome: pickText(centroCusto?.nome),
    conta_interna_tipo: itemRecibo.conta_interna_tipo,
    conta_interna_label: itemRecibo.conta_interna_label,
    observacoes: pickText(recebimento.observacoes),
    operador_nome: operadorUserId,
    usuario_emissor: operadorUserId,
    timestamp_emissao: new Date().toISOString(),
    itens: [itemRecibo],
    gaps,
  };

  const variaveis = mapearVariaveisRecibo(snapshot, {
    escola_nome: escola.nome,
  });

  return {
    snapshot,
    variaveis,
    gaps,
  };
}
