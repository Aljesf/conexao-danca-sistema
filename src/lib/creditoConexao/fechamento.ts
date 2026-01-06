import type { SupabaseClient } from "@supabase/supabase-js";

type FecharFaturaInput = {
  supabase: SupabaseClient;
  contaConexaoId: number;
  competencia: string;
};

type FecharFaturaOk = {
  ok: true;
  data: {
    fatura_id: number;
    created_links: number;
    total_centavos: number;
    total_itens: number;
    created: boolean;
    message?: string;
  };
};

type FecharFaturaErr = {
  ok: false;
  error: string;
  detail?: string;
};

export type FecharFaturaResult = FecharFaturaOk | FecharFaturaErr;

const COMPETENCIA_RE = /^\d{4}-\d{2}$/;

export function isCompetencia(value: string): boolean {
  return COMPETENCIA_RE.test(value);
}

function toPositiveNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function fecharFaturaPorCompetencia(input: FecharFaturaInput): Promise<FecharFaturaResult> {
  const { supabase, contaConexaoId, competencia } = input;

  if (!toPositiveNumber(contaConexaoId) || !isCompetencia(competencia)) {
    return { ok: false, error: "campos_obrigatorios_invalidos" };
  }

  const { data: conta, error: contaErr } = await supabase
    .from("credito_conexao_contas")
    .select("id, dia_vencimento")
    .eq("id", contaConexaoId)
    .maybeSingle();

  if (contaErr || !conta) {
    return { ok: false, error: "conta_nao_encontrada", detail: contaErr?.message };
  }

  const { data: faturaExistente, error: fatErr } = await supabase
    .from("credito_conexao_faturas")
    .select("id, valor_total_centavos, status")
    .eq("conta_conexao_id", contaConexaoId)
    .eq("periodo_referencia", competencia)
    .maybeSingle();

  if (fatErr) {
    return { ok: false, error: "falha_buscar_fatura", detail: fatErr.message };
  }

  let faturaId: number;
  let created = false;

  if (faturaExistente?.id) {
    faturaId = Number(faturaExistente.id);
  } else {
    const { data: createdFat, error: createErr } = await supabase
      .from("credito_conexao_faturas")
      .insert({
        conta_conexao_id: contaConexaoId,
        periodo_referencia: competencia,
        data_fechamento: new Date().toISOString().slice(0, 10),
        data_vencimento: null,
        valor_total_centavos: 0,
        status: "ABERTA",
      })
      .select("id")
      .single();

    if (createErr || !createdFat) {
      return {
        ok: false,
        error: "falha_criar_fatura",
        detail: createErr?.message ?? "sem_retorno",
      };
    }

    faturaId = Number(createdFat.id);
    created = true;
  }

  const { data: lancs, error: lancErr } = await supabase
    .from("credito_conexao_lancamentos")
    .select("id, valor_centavos")
    .eq("conta_conexao_id", contaConexaoId)
    .eq("competencia", competencia)
    .not("cobranca_id", "is", null)
    .eq("status", "PENDENTE_FATURA");

  if (lancErr) {
    return { ok: false, error: "falha_buscar_lancamentos", detail: lancErr.message };
  }

  const lista = lancs ?? [];
  if (lista.length === 0) {
    return {
      ok: true,
      data: {
        fatura_id: faturaId,
        created_links: 0,
        total_centavos: 0,
        total_itens: 0,
        created,
        message: "Sem lancamentos pendentes nesta competencia.",
      },
    };
  }

  const lancamentoIds = lista.map((l) => Number(l.id)).filter((id) => Number.isFinite(id));

  const { data: jaLinks, error: jaLinksErr } = await supabase
    .from("credito_conexao_fatura_lancamentos")
    .select("lancamento_id")
    .eq("fatura_id", faturaId)
    .in("lancamento_id", lancamentoIds);

  if (jaLinksErr) {
    return { ok: false, error: "falha_verificar_links", detail: jaLinksErr.message };
  }

  const jaSet = new Set((jaLinks ?? []).map((x) => Number(x.lancamento_id)));
  const novos = lancamentoIds.filter((id) => !jaSet.has(id));

  if (novos.length > 0) {
    const payloadLinks = novos.map((id) => ({ fatura_id: faturaId, lancamento_id: id }));
    const { error: linkErr } = await supabase.from("credito_conexao_fatura_lancamentos").insert(payloadLinks);

    if (linkErr) {
      return { ok: false, error: "falha_criar_links", detail: linkErr.message };
    }
  }

  const { error: updErr } = await supabase
    .from("credito_conexao_lancamentos")
    .update({ status: "FATURADO" })
    .eq("conta_conexao_id", contaConexaoId)
    .eq("competencia", competencia)
    .in("id", lancamentoIds);

  if (updErr) {
    return { ok: false, error: "falha_atualizar_lancamentos", detail: updErr.message };
  }

  const { data: itensFat, error: itensErr } = await supabase
    .from("credito_conexao_fatura_lancamentos")
    .select("lancamento_id, credito_conexao_lancamentos(valor_centavos)")
    .eq("fatura_id", faturaId);

  if (itensErr) {
    return { ok: false, error: "falha_recalcular_total", detail: itensErr.message };
  }

  const total = (itensFat ?? []).reduce((acc, row) => {
    const record = row as { credito_conexao_lancamentos?: { valor_centavos?: number } | null };
    const v = record.credito_conexao_lancamentos?.valor_centavos;
    return acc + (typeof v === "number" ? v : 0);
  }, 0);

  const { error: fatUpdErr } = await supabase
    .from("credito_conexao_faturas")
    .update({ valor_total_centavos: total })
    .eq("id", faturaId);

  if (fatUpdErr) {
    return { ok: false, error: "falha_atualizar_total_fatura", detail: fatUpdErr.message };
  }

  return {
    ok: true,
    data: {
      fatura_id: faturaId,
      created_links: novos.length,
      total_centavos: total,
      total_itens: itensFat?.length ?? 0,
      created,
    },
  };
}
