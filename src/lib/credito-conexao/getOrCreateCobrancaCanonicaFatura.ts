import type { SupabaseClient } from "@supabase/supabase-js";

const ORIGEM_TIPO_CANONICA = "FATURA_CREDITO_CONEXAO";
const ORIGEM_TIPO_LEGADA = "CREDITO_CONEXAO_FATURA";

type SupabaseFromClient = Pick<SupabaseClient, "from">;

export type CobrancaCanonicaFatura = {
  id: number;
  neofin_charge_id: string | null;
  status: string | null;
  origem_tipo: string | null;
  origem_subtipo: string | null;
  origem_id: number | null;
  metodo_pagamento: string | null;
  descricao: string | null;
  link_pagamento: string | null;
  linha_digitavel: string | null;
  neofin_payload: Record<string, unknown> | null;
};

type GetOrCreateCobrancaCanonicaFaturaInput = {
  supabase: SupabaseFromClient;
  faturaId: number;
  pessoaId: number;
  descricao: string;
  valorCentavos: number;
  vencimentoIso: string;
};

type GetOrCreateCobrancaCanonicaFaturaResult = {
  cobranca: CobrancaCanonicaFatura;
  created: boolean;
  reusedLegacy: boolean;
};

export class DuplicidadeCobrancaCanonicaError extends Error {
  readonly faturaId: number;
  readonly cobrancaIds: number[];

  constructor(faturaId: number, cobrancaIds: number[]) {
    super(`duplicidade_cobranca_canonica:fatura_${faturaId}:ids_${cobrancaIds.join(",")}`);
    this.name = "DuplicidadeCobrancaCanonicaError";
    this.faturaId = faturaId;
    this.cobrancaIds = cobrancaIds;
  }
}

function toPositiveNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : null;
}

async function buscarCobrancasAtivas(
  supabase: SupabaseFromClient,
  origemTipo: string,
  faturaId: number,
): Promise<CobrancaCanonicaFatura[]> {
  const { data, error } = await supabase
    .from("cobrancas")
    .select("id, neofin_charge_id, status, origem_tipo, origem_subtipo, origem_id, metodo_pagamento, descricao, link_pagamento, linha_digitavel, neofin_payload")
    .eq("origem_tipo", origemTipo)
    .eq("origem_id", faturaId)
    .neq("status", "CANCELADA")
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`erro_buscar_cobranca_canonica:${error.message}`);
  }

  return (data ?? [])
    .map((row) => ({
      id: toPositiveNumber((row as { id?: unknown }).id) ?? 0,
      neofin_charge_id:
        typeof (row as { neofin_charge_id?: unknown }).neofin_charge_id === "string"
          ? String((row as { neofin_charge_id?: unknown }).neofin_charge_id)
          : null,
      status:
        typeof (row as { status?: unknown }).status === "string"
          ? String((row as { status?: unknown }).status)
          : null,
      origem_tipo:
        typeof (row as { origem_tipo?: unknown }).origem_tipo === "string"
          ? String((row as { origem_tipo?: unknown }).origem_tipo)
          : null,
      origem_subtipo:
        typeof (row as { origem_subtipo?: unknown }).origem_subtipo === "string"
          ? String((row as { origem_subtipo?: unknown }).origem_subtipo)
          : null,
      origem_id: toPositiveNumber((row as { origem_id?: unknown }).origem_id),
      metodo_pagamento:
        typeof (row as { metodo_pagamento?: unknown }).metodo_pagamento === "string"
          ? String((row as { metodo_pagamento?: unknown }).metodo_pagamento)
          : null,
      descricao:
        typeof (row as { descricao?: unknown }).descricao === "string"
          ? String((row as { descricao?: unknown }).descricao)
          : null,
      link_pagamento:
        typeof (row as { link_pagamento?: unknown }).link_pagamento === "string"
          ? String((row as { link_pagamento?: unknown }).link_pagamento)
          : null,
      linha_digitavel:
        typeof (row as { linha_digitavel?: unknown }).linha_digitavel === "string"
          ? String((row as { linha_digitavel?: unknown }).linha_digitavel)
          : null,
      neofin_payload:
        (row as { neofin_payload?: unknown }).neofin_payload &&
        typeof (row as { neofin_payload?: unknown }).neofin_payload === "object"
          ? ((row as { neofin_payload?: unknown }).neofin_payload as Record<string, unknown>)
          : null,
    }))
    .filter((row) => row.id > 0);
}

async function atualizarCobranca(
  supabase: SupabaseFromClient,
  cobrancaId: number,
  input: Omit<GetOrCreateCobrancaCanonicaFaturaInput, "supabase">,
): Promise<CobrancaCanonicaFatura> {
  const { data, error } = await supabase
    .from("cobrancas")
    .update({
      pessoa_id: input.pessoaId,
      descricao: input.descricao,
      valor_centavos: input.valorCentavos,
      moeda: "BRL",
      vencimento: input.vencimentoIso,
      status: "PENDENTE",
      metodo_pagamento: "BOLETO",
      origem_subtipo: "CARTAO_CONEXAO",
      origem_tipo: ORIGEM_TIPO_CANONICA,
      origem_id: input.faturaId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", cobrancaId)
    .select("id, neofin_charge_id, status, origem_tipo, origem_subtipo, origem_id, metodo_pagamento, descricao, link_pagamento, linha_digitavel, neofin_payload")
    .single();

  if (error || !data) {
    throw new Error(`erro_atualizar_cobranca_canonica:${error?.message ?? "sem_retorno"}`);
  }

  return {
    id: Number(data.id),
    neofin_charge_id: typeof data.neofin_charge_id === "string" ? data.neofin_charge_id : null,
    status: typeof data.status === "string" ? data.status : null,
    origem_tipo: typeof data.origem_tipo === "string" ? data.origem_tipo : null,
    origem_subtipo: typeof data.origem_subtipo === "string" ? data.origem_subtipo : null,
    origem_id: toPositiveNumber(data.origem_id),
    metodo_pagamento: typeof data.metodo_pagamento === "string" ? data.metodo_pagamento : null,
    descricao: typeof data.descricao === "string" ? data.descricao : null,
    link_pagamento: typeof data.link_pagamento === "string" ? data.link_pagamento : null,
    linha_digitavel: typeof data.linha_digitavel === "string" ? data.linha_digitavel : null,
    neofin_payload:
      data.neofin_payload && typeof data.neofin_payload === "object"
        ? (data.neofin_payload as Record<string, unknown>)
        : null,
  };
}

export async function getOrCreateCobrancaCanonicaFatura(
  input: GetOrCreateCobrancaCanonicaFaturaInput,
): Promise<GetOrCreateCobrancaCanonicaFaturaResult> {
  const canonicalRows = await buscarCobrancasAtivas(input.supabase, ORIGEM_TIPO_CANONICA, input.faturaId);
  const legacyRows = await buscarCobrancasAtivas(input.supabase, ORIGEM_TIPO_LEGADA, input.faturaId);
  const allRows = [...canonicalRows, ...legacyRows];
  if (allRows.length > 1) {
    throw new DuplicidadeCobrancaCanonicaError(
      input.faturaId,
      allRows.map((row) => row.id),
    );
  }

  if (canonicalRows.length === 1) {
    const cobranca = await atualizarCobranca(input.supabase, canonicalRows[0].id, {
      faturaId: input.faturaId,
      pessoaId: input.pessoaId,
      descricao: input.descricao,
      valorCentavos: input.valorCentavos,
      vencimentoIso: input.vencimentoIso,
    });

    return { cobranca, created: false, reusedLegacy: false };
  }

  if (legacyRows.length === 1) {
    const cobranca = await atualizarCobranca(input.supabase, legacyRows[0].id, {
      faturaId: input.faturaId,
      pessoaId: input.pessoaId,
      descricao: input.descricao,
      valorCentavos: input.valorCentavos,
      vencimentoIso: input.vencimentoIso,
    });

    return { cobranca, created: false, reusedLegacy: true };
  }

  const { data, error } = await input.supabase
    .from("cobrancas")
    .insert({
      pessoa_id: input.pessoaId,
      descricao: input.descricao,
      valor_centavos: input.valorCentavos,
      moeda: "BRL",
      vencimento: input.vencimentoIso,
      status: "PENDENTE",
      metodo_pagamento: "BOLETO",
      origem_subtipo: "CARTAO_CONEXAO",
      origem_tipo: ORIGEM_TIPO_CANONICA,
      origem_id: input.faturaId,
      updated_at: new Date().toISOString(),
    })
    .select("id, neofin_charge_id, status, origem_tipo, origem_subtipo, origem_id, metodo_pagamento, descricao, link_pagamento, linha_digitavel, neofin_payload")
    .single();

  if (error || !data) {
    throw new Error(`erro_criar_cobranca_canonica:${error?.message ?? "sem_retorno"}`);
  }

  return {
    cobranca: {
      id: Number(data.id),
      neofin_charge_id: typeof data.neofin_charge_id === "string" ? data.neofin_charge_id : null,
      status: typeof data.status === "string" ? data.status : null,
      origem_tipo: typeof data.origem_tipo === "string" ? data.origem_tipo : null,
      origem_subtipo: typeof data.origem_subtipo === "string" ? data.origem_subtipo : null,
      origem_id: toPositiveNumber(data.origem_id),
      metodo_pagamento: typeof data.metodo_pagamento === "string" ? data.metodo_pagamento : null,
      descricao: typeof data.descricao === "string" ? data.descricao : null,
      link_pagamento: typeof data.link_pagamento === "string" ? data.link_pagamento : null,
      linha_digitavel: typeof data.linha_digitavel === "string" ? data.linha_digitavel : null,
      neofin_payload:
        data.neofin_payload && typeof data.neofin_payload === "object"
          ? (data.neofin_payload as Record<string, unknown>)
          : null,
    },
    created: true,
    reusedLegacy: false,
  };
}
