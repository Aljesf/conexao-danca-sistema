"use server";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase.generated";

type SupabaseLike = Pick<SupabaseClient<Database>, "from">;

type UpsertLancamentoPorCobrancaInput = {
  cobrancaId?: number | null;
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

  const queryExistente = supabase.from("credito_conexao_lancamentos").select("id");
  const { data: existente, error: errFind } = cobrancaId
    ? await queryExistente.eq("cobranca_id", cobrancaId).maybeSingle()
    : await queryExistente.eq("referencia_item", referenciaItem).maybeSingle();

  if (errFind) throw errFind;

  const centroCustoId = await resolveCentroCustoId(supabase, input);

  const payload = {
    conta_conexao_id: input.contaConexaoId,
    cobranca_id: cobrancaId,
    competencia: input.competencia,
    referencia_item: referenciaItem,
    valor_centavos: input.valorCentavos,
    aluno_id: input.alunoId ?? null,
    matricula_id: input.matriculaId ?? null,
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
