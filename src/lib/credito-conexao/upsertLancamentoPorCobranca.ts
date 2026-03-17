"use server";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

type UpsertLancamentoPorCobrancaInput = {
  cobrancaId?: number | null;
  contaConexaoId: number;
  competencia: string; // YYYY-MM
  valorCentavos: number;
  descricao?: string | null;
  origemSistema?: string;
  origemId?: number | null;
  composicaoJson?: Record<string, unknown> | null;
  referenciaItem?: string | null;
  supabase?: Pick<SupabaseClient, "from"> | null;
};

export async function upsertLancamentoPorCobranca(input: UpsertLancamentoPorCobrancaInput) {
  const supabase = input.supabase ?? (await createClient());
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

  const payload = {
    conta_conexao_id: input.contaConexaoId,
    cobranca_id: cobrancaId,
    competencia: input.competencia,
    referencia_item: referenciaItem,
    valor_centavos: input.valorCentavos,
    descricao: input.descricao ?? null,
    origem_sistema: input.origemSistema ?? "COBRANCA",
    origem_id: input.origemId ?? null,
    composicao_json: input.composicaoJson ?? null,
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
