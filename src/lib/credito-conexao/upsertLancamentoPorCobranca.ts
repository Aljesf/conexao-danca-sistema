"use server";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase.generated";
import { verificarLimiteCreditoConexao } from "@/lib/credito-conexao/verificarLimiteCreditoConexao";

type SupabaseLike = Pick<SupabaseClient<Database>, "from">;

type UpsertLancamentoPorCobrancaInput = {
  cobrancaId?: number | null;
  existingLancamentoId?: number | null;
  contaConexaoId: number;
  competencia: string; // YYYY-MM
  valorCentavos: number;
  centroCustoId?: number | null;
  alunoId?: number | null;
  matriculaId?: number | null;
  descricao?: string | null;
  origemSistema?: string;
  origemId?: number | null;
  composicaoJson?: Record<string, unknown> | null;
  referenciaItem?: string | null;
  supabase?: SupabaseLike | null;
};

type CentroCustoCache = {
  escolaId: number | null;
  cafeId: number | null;
  lojaId: number | null;
};

const STATUSS_CANCELADOS = new Set([
  "CANCELADO",
  "CANCELADA",
  "CANCELED",
  "CANCELLED",
  "INATIVO",
  "INATIVA",
  "VOID",
]);

let centroCustoCache: CentroCustoCache | null = null;

function textOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function upper(value: unknown): string {
  return textOrNull(value)
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase() ?? "";
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : null;
}

function isCancelado(value: unknown) {
  return STATUSS_CANCELADOS.has(upper(value));
}

async function validarOrigemFinanceiraAtiva(
  supabase: SupabaseLike,
  input: UpsertLancamentoPorCobrancaInput,
  cobrancaId: number | null,
) {
  let matriculaIdResolvida =
    typeof input.matriculaId === "number" && Number.isFinite(input.matriculaId) && input.matriculaId > 0
      ? Math.trunc(input.matriculaId)
      : null;

  let cobrancaOrigem:
    | {
        origem_id: number | null;
        origem_item_id: number | null;
        origem_item_tipo: string | null;
        origem_tipo: string | null;
      }
    | null = null;

  if (cobrancaId) {
    const { data: cobranca, error: cobrancaError } = await (supabase as any)
      .from("cobrancas")
      .select("id,status,expurgada,cancelada_em,origem_tipo,origem_id,origem_item_tipo,origem_item_id")
      .eq("id", cobrancaId)
      .maybeSingle();

    if (cobrancaError) throw cobrancaError;
    if (!cobranca?.id) {
      throw new Error("cobranca_nao_encontrada");
    }
    if (Boolean(cobranca.expurgada) || textOrNull(cobranca.cancelada_em) || isCancelado(cobranca.status)) {
      throw new Error("cobranca_cancelada_ou_expurgada");
    }

    cobrancaOrigem = {
      origem_id: numberOrNull(cobranca.origem_id),
      origem_item_id: numberOrNull(cobranca.origem_item_id),
      origem_item_tipo: textOrNull(cobranca.origem_item_tipo),
      origem_tipo: textOrNull(cobranca.origem_tipo),
    };
  }

  const origemSistema = upper(input.origemSistema);
  if (!matriculaIdResolvida && origemSistema.startsWith("MATRICULA") && numberOrNull(input.origemId)) {
    matriculaIdResolvida = numberOrNull(input.origemId);
  }

  if (!matriculaIdResolvida && upper(cobrancaOrigem?.origem_item_tipo) === "MATRICULA") {
    matriculaIdResolvida = numberOrNull(cobrancaOrigem?.origem_item_id);
  }

  if (!matriculaIdResolvida && upper(cobrancaOrigem?.origem_item_tipo) === "MATRICULA_ITEM") {
    const matriculaItemId = numberOrNull(cobrancaOrigem?.origem_item_id);
    if (matriculaItemId) {
      const { data: matriculaItem, error: matriculaItemError } = await (supabase as any)
        .from("matricula_itens")
        .select("id,matricula_id,status")
        .eq("id", matriculaItemId)
        .maybeSingle();

      if (matriculaItemError) throw matriculaItemError;
      if (!matriculaItem?.id) {
        throw new Error("matricula_item_orfao_para_lancamento");
      }
      if (isCancelado(matriculaItem.status)) {
        throw new Error("matricula_item_cancelado_nao_pode_gerar_lancamento");
      }

      matriculaIdResolvida = numberOrNull(matriculaItem.matricula_id);
    }
  }

  if (!matriculaIdResolvida && upper(cobrancaOrigem?.origem_tipo).startsWith("MATRICULA")) {
    matriculaIdResolvida = numberOrNull(cobrancaOrigem?.origem_id);
  }

  if (matriculaIdResolvida) {
    const { data: matricula, error: matriculaError } = await (supabase as any)
      .from("matriculas")
      .select("id,status")
      .eq("id", matriculaIdResolvida)
      .maybeSingle();

    if (matriculaError) throw matriculaError;
    if (!matricula?.id) {
      throw new Error("matricula_orfa_para_lancamento");
    }
    if (upper(matricula.status) === "CANCELADA") {
      throw new Error("matricula_cancelada_nao_pode_gerar_lancamento");
    }
  }

  return { matriculaIdResolvida };
}

async function carregarCentroCustoCache(supabase: SupabaseLike): Promise<CentroCustoCache> {
  if (centroCustoCache) return centroCustoCache;

  const [configResult, centrosResult] = await Promise.all([
    supabase
      .from("escola_config_financeira")
      .select("id,centro_custo_padrao_escola_id")
      .eq("id", 1)
      .maybeSingle(),
    supabase.from("centros_custo").select("id,codigo,nome,ativo").eq("ativo", true),
  ]);

  if (configResult.error) throw configResult.error;
  if (centrosResult.error) throw centrosResult.error;

  const centroEscolaConfigId = numberOrNull(configResult.data?.centro_custo_padrao_escola_id);
  const centros = (centrosResult.data ?? []).map((row) => ({
    id: numberOrNull(row.id),
    codigo: textOrNull(row.codigo),
    nome: textOrNull(row.nome),
  }));

  centroCustoCache = {
    escolaId:
      centroEscolaConfigId ??
      centros.find((row) => upper(row.codigo) === "ESCOLA")?.id ??
      null,
    cafeId:
      centros.find((row) => upper(row.codigo) === "CAFE")?.id ??
      centros.find((row) => upper(row.nome).includes("CAFE"))?.id ??
      null,
    lojaId: centros.find((row) => upper(row.codigo) === "LOJA")?.id ?? null,
  };

  return centroCustoCache;
}

async function resolveCentroCustoId(
  supabase: SupabaseLike,
  input: UpsertLancamentoPorCobrancaInput,
): Promise<number | null> {
  if (typeof input.centroCustoId === "number" && Number.isFinite(input.centroCustoId) && input.centroCustoId > 0) {
    return Math.trunc(input.centroCustoId);
  }

  const origemSistema = upper(input.origemSistema);
  const centros = await carregarCentroCustoCache(supabase);

  if (["MATRICULA", "MATRICULA_REPROCESSAR", "MATRICULA_MENSAL", "MENSALIDADE", "ESCOLA"].includes(origemSistema)) {
    return centros.escolaId;
  }
  if (origemSistema === "CAFE") return centros.cafeId;
  if (origemSistema === "LOJA" || origemSistema === "LOJA_VENDA") return centros.lojaId;
  return null;
}

export async function upsertLancamentoPorCobranca(input: UpsertLancamentoPorCobrancaInput) {
  const supabase = (input.supabase ?? (await createClient())) as SupabaseLike;
  const cobrancaId =
    typeof input.cobrancaId === "number" && Number.isFinite(input.cobrancaId) && input.cobrancaId > 0
      ? Math.trunc(input.cobrancaId)
      : null;
  const referenciaItem =
    typeof input.referenciaItem === "string" && input.referenciaItem.trim()
      ? input.referenciaItem.trim()
      : cobrancaId
        ? `cobranca:${cobrancaId}`
        : null;

  if (!cobrancaId && !referenciaItem) {
    throw new Error("cobranca_ou_referencia_item_obrigatorio");
  }

  const origemValidada = await validarOrigemFinanceiraAtiva(supabase, input, cobrancaId);

  const queryExistente = supabase.from("credito_conexao_lancamentos").select("id");
  let existente: { id: number } | null = null;

  if (typeof input.existingLancamentoId === "number" && Number.isFinite(input.existingLancamentoId) && input.existingLancamentoId > 0) {
    existente = { id: Math.trunc(input.existingLancamentoId) };
  }

  if (!existente?.id && cobrancaId) {
    const { data, error } = await queryExistente.eq("cobranca_id", cobrancaId).maybeSingle();
    if (error) throw error;
    existente = data;
  }

  if (!existente?.id && referenciaItem) {
    const { data, error } = await queryExistente.eq("referencia_item", referenciaItem).maybeSingle();
    if (error) throw error;
    existente = data;
  }

  const centroCustoId = await resolveCentroCustoId(supabase, input);

  // A4: Verificar limite de crédito antes de criar novo lançamento
  if (!existente?.id) {
    const limiteCheck = await verificarLimiteCreditoConexao(
      supabase as unknown as SupabaseClient,
      input.contaConexaoId,
      input.valorCentavos,
    );
    if (!limiteCheck.permitido) {
      throw new Error(limiteCheck.mensagem ?? "limite_credito_excedido");
    }
  }

  const payload = {
    conta_conexao_id: input.contaConexaoId,
    cobranca_id: cobrancaId,
    competencia: input.competencia,
    referencia_item: referenciaItem,
    valor_centavos: input.valorCentavos,
    aluno_id: input.alunoId ?? null,
    matricula_id: origemValidada.matriculaIdResolvida ?? input.matriculaId ?? null,
    descricao: input.descricao ?? null,
    origem_sistema: input.origemSistema ?? "COBRANCA",
    origem_id: input.origemId ?? null,
    composicao_json: input.composicaoJson ?? null,
    centro_custo_id: centroCustoId,
    status: "PENDENTE_FATURA",
    data_lancamento: new Date().toISOString().slice(0, 10),
  };

  if (!existente?.id) {
    const { data: inserted, error: errIns } = await supabase
      .from("credito_conexao_lancamentos")
      .insert(payload)
      .select("id")
      .single();
    if (errIns) throw errIns;
    return { id: inserted.id, created: true };
  }

  const { data: updated, error: errUpd } = await supabase
    .from("credito_conexao_lancamentos")
    .update(payload)
    .eq("id", existente.id)
    .select("id")
    .single();
  if (errUpd) throw errUpd;

  return { id: updated.id, created: false };
}
