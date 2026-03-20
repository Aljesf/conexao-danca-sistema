import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingExpurgoColumnError, logExpurgoMigrationWarning } from "@/lib/financeiro/expurgo-compat";
import {
  montarCobrancaOperacionalBase,
  type CobrancaOperacionalItem,
  type CobrancaOperacionalViewBase,
} from "@/lib/financeiro/creditoConexao/cobrancas";
import type { Database } from "@/types/supabase.generated";

type FlatCarteiraRow = {
  cobranca_id: number;
  competencia_ano_mes: string | null;
  status_cobranca: string | null;
};

type CobrancaElegibilidadeRow = {
  id: number;
  status: string | null;
  descricao: string | null;
  origem_tipo: string | null;
  origem_subtipo: string | null;
  competencia_ano_mes: string | null;
  expurgada?: boolean | null;
};

type CobrancaOperacionalViewRow = CobrancaOperacionalViewBase & {
  origem_tipo: string | null;
  origem_subtipo: string | null;
  conta_conexao_id: number | null;
  cobranca_origem_id: number | null;
  created_at: string | null;
  updated_at: string | null;
  descricao: string | null;
};

type StatusNeofinFiltro = "TODOS" | "VINCULADA" | "NAO_VINCULADA" | "FALHA_INTEGRACAO";

export type ResolverCarteiraOperacionalPorCompetenciaInput = {
  competencia?: string | null;
  statusOperacional?: string | null;
  statusNeofin?: StatusNeofinFiltro;
  today?: Date;
};

const FLAT_SELECT =
  "cobranca_id,competencia_ano_mes,status_cobranca";

const OPERACIONAL_SELECT = [
  "cobranca_id",
  "cobranca_fonte",
  "pessoa_id",
  "pessoa_nome",
  "pessoa_label",
  "competencia_ano_mes",
  "competencia_label",
  "tipo_cobranca",
  "data_vencimento",
  "valor_centavos",
  "valor_pago_centavos",
  "saldo_centavos",
  "saldo_aberto_centavos",
  "status_cobranca",
  "status_bruto",
  "status_operacional",
  "neofin_charge_id",
  "neofin_invoice_id",
  "neofin_situacao_operacional",
  "origem_tipo",
  "origem_subtipo",
  "origem_referencia_label",
  "dias_atraso",
  "fatura_id",
  "fatura_competencia",
  "fatura_status",
  "tipo_conta",
  "tipo_conta_label",
  "permite_vinculo_manual",
  "data_pagamento",
  "link_pagamento",
  "linha_digitavel",
  "descricao",
  "cobranca_origem_id",
  "conta_conexao_id",
  "created_at",
  "updated_at",
].join(",");

function toText(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function upper(value: string | null | undefined): string {
  return toText(value)?.toUpperCase() ?? "";
}

function isCancelada(value: string | null | undefined): boolean {
  return upper(value) === "CANCELADA";
}

function chunkNumbers(values: number[], chunkSize = 200): number[][] {
  const unique = Array.from(new Set(values.filter((value) => Number.isFinite(value) && value > 0)));
  if (unique.length === 0) return [];

  const chunks: number[][] = [];
  for (let index = 0; index < unique.length; index += chunkSize) {
    chunks.push(unique.slice(index, index + chunkSize));
  }
  return chunks;
}

function normalizarStatusNeofin(value: StatusNeofinFiltro | null | undefined): StatusNeofinFiltro {
  switch (value) {
    case "VINCULADA":
    case "NAO_VINCULADA":
    case "FALHA_INTEGRACAO":
      return value;
    default:
      return "TODOS";
  }
}

function statusOperacionalValido(value: string | null | undefined): value is CobrancaOperacionalItem["status_operacional"] {
  return value === "PAGO" || value === "PENDENTE_A_VENCER" || value === "PENDENTE_VENCIDO";
}

function compareIsoAsc(a: string | null | undefined, b: string | null | undefined): number {
  const av = toText(a) ?? "9999-12-31";
  const bv = toText(b) ?? "9999-12-31";
  return av.localeCompare(bv);
}

function compareOperacional(a: CobrancaOperacionalItem, b: CobrancaOperacionalItem): number {
  const byCompetencia = b.competencia_ano_mes.localeCompare(a.competencia_ano_mes);
  if (byCompetencia !== 0) return byCompetencia;

  const byDue = compareIsoAsc(a.data_vencimento, b.data_vencimento);
  if (byDue !== 0) return byDue;

  return b.cobranca_id - a.cobranca_id;
}

async function carregarFlatRows(
  supabase: SupabaseClient<Database>,
  competencia?: string | null,
): Promise<FlatCarteiraRow[]> {
  let query = supabase
    .from("vw_financeiro_contas_receber_flat")
    .select(FLAT_SELECT)
    .order("competencia_ano_mes", { ascending: false, nullsFirst: false })
    .order("cobranca_id", { ascending: false })
    .not("status_cobranca", "ilike", "CANCELADA");

  if (toText(competencia)) {
    query = query.eq("competencia_ano_mes", competencia as string);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`erro_buscar_carteira_real:${error.message}`);
  }

  return ((data ?? []) as unknown[]).map((raw) => {
    const row = raw as Record<string, unknown>;
    return {
      cobranca_id: typeof row.cobranca_id === "number" ? row.cobranca_id : Number(row.cobranca_id ?? 0),
      competencia_ano_mes: toText(typeof row.competencia_ano_mes === "string" ? row.competencia_ano_mes : null),
      status_cobranca: toText(typeof row.status_cobranca === "string" ? row.status_cobranca : null),
    };
  });
}

async function carregarCobrancasElegiveis(
  supabase: SupabaseClient<Database>,
  cobrancaIds: number[],
): Promise<Map<number, CobrancaElegibilidadeRow>> {
  const rows: CobrancaElegibilidadeRow[] = [];

  for (const chunk of chunkNumbers(cobrancaIds)) {
    try {
      const { data, error } = await supabase
        .from("cobrancas")
        .select("id,status,descricao,origem_tipo,origem_subtipo,competencia_ano_mes,expurgada")
        .in("id", chunk);

      if (error) throw error;
      rows.push(...(((data ?? []) as unknown[]) as CobrancaElegibilidadeRow[]));
    } catch (error) {
      if (!isMissingExpurgoColumnError(error)) {
        throw new Error(
          `erro_buscar_cobrancas_elegiveis:${error instanceof Error ? error.message : "erro_desconhecido"}`,
        );
      }

      logExpurgoMigrationWarning("competencia-ativa", error);

      const { data, error: fallbackError } = await supabase
        .from("cobrancas")
        .select("id,status,descricao,origem_tipo,origem_subtipo,competencia_ano_mes")
        .in("id", chunk);

      if (fallbackError) {
        throw new Error(`erro_buscar_cobrancas_elegiveis:${fallbackError.message}`);
      }

      rows.push(
        ...((((data ?? []) as unknown[]) as CobrancaElegibilidadeRow[]).map((row) => ({
          ...row,
          expurgada: false,
        }))),
      );
    }
  }

  return new Map(rows.map((row) => [row.id, row] as const));
}

function cobrancaVisivelNaCarteiraReal(
  cobranca: CobrancaElegibilidadeRow | undefined,
  flatRow: FlatCarteiraRow,
): boolean {
  if (!cobranca) {
    return !isCancelada(flatRow.status_cobranca);
  }

  if (cobranca.expurgada === true) return false;
  if (isCancelada(cobranca.status)) return false;
  return true;
}

async function carregarCobrancasOperacionais(
  supabase: SupabaseClient<Database>,
  cobrancaIds: number[],
  competencia?: string | null,
): Promise<CobrancaOperacionalViewRow[]> {
  const rows: CobrancaOperacionalViewRow[] = [];

  for (const chunk of chunkNumbers(cobrancaIds)) {
    let query = supabase
      .from("vw_financeiro_cobrancas_operacionais")
      .select(OPERACIONAL_SELECT)
      .eq("tipo_conta", "ALUNO")
      .eq("cobranca_fonte", "COBRANCA")
      .in("cobranca_id", chunk)
      .order("competencia_ano_mes", { ascending: false, nullsFirst: false })
      .order("data_vencimento", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false, nullsFirst: false });

    if (toText(competencia)) {
      query = query.eq("competencia_ano_mes", competencia as string);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`erro_buscar_carteira_operacional:${error.message}`);
    }

    rows.push(...((((data ?? []) as unknown[]) as CobrancaOperacionalViewRow[])));
  }

  return rows;
}

function normalizarTipoContaLabelExibicao(value: string | null | undefined): string | null {
  switch (upper(value)) {
    case "CONTA INTERNA ALUNO":
      return "Conta interna do aluno";
    case "CONTA INTERNA COLABORADOR":
      return "Conta interna do colaborador";
    default:
      return toText(value);
  }
}

export async function resolverCarteiraOperacionalPorCompetencia(
  supabase: SupabaseClient<Database>,
  input: ResolverCarteiraOperacionalPorCompetenciaInput,
): Promise<CobrancaOperacionalItem[]> {
  const competencia = toText(input.competencia);
  const statusOperacional = statusOperacionalValido(input.statusOperacional) ? input.statusOperacional : null;
  const statusNeofin = normalizarStatusNeofin(input.statusNeofin);
  const today = input.today ?? new Date();

  const flatRows = await carregarFlatRows(supabase, competencia);
  if (flatRows.length === 0) return [];

  const cobrancaIds = flatRows.map((row) => row.cobranca_id);
  const cobrancasMap = await carregarCobrancasElegiveis(supabase, cobrancaIds);
  const idsElegiveis = flatRows
    .filter((row) => cobrancaVisivelNaCarteiraReal(cobrancasMap.get(row.cobranca_id), row))
    .map((row) => row.cobranca_id);

  if (idsElegiveis.length === 0) return [];

  const operacionais = await carregarCobrancasOperacionais(supabase, idsElegiveis, competencia);
  const idsElegiveisSet = new Set(idsElegiveis);

  return operacionais
    .filter((row) => idsElegiveisSet.has(row.cobranca_id))
    .map((row) => {
      const item = montarCobrancaOperacionalBase(row, today);
      return {
        ...item,
        tipo_conta_label: normalizarTipoContaLabelExibicao(item.tipo_conta_label),
      };
    })
    .filter((item) => (statusOperacional ? item.status_operacional === statusOperacional : true))
    .filter((item) => (statusNeofin === "TODOS" ? true : item.neofin_situacao_operacional === statusNeofin))
    .sort(compareOperacional);
}
