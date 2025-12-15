import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ResumoCentroCusto = {
  centro_custo_id: number | null;
  centro_custo_codigo?: string | null;
  centro_custo_nome?: string | null;
  receitas_centavos: number;
  despesas_centavos: number;
  saldo_centavos: number;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[/api/financeiro/dashboard] Variaveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao definidas."
  );
}

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

function json(status: number, payload: any) {
  return NextResponse.json(payload, { status });
}

function parseDate(param: string | null, endOfDay = false) {
  if (!param) return null;
  const hasTime = param.includes("T");
  if (hasTime) return param;
  return `${param}T${endOfDay ? "23:59:59" : "00:00:00"}`;
}

function toNumber(value: any) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(req: NextRequest) {
  if (!supabaseAdmin) {
    return json(500, { ok: false, error: "Configuracao do Supabase ausente." });
  }

  const { searchParams } = new URL(req.url);
  const dataInicio = parseDate(searchParams.get("data_inicio"));
  const dataFim = parseDate(searchParams.get("data_fim"), true);

  const centroCustoParam = searchParams.get("centro_custo_id");
  const centroCustoId = centroCustoParam ? Number(centroCustoParam) : null;

  try {
    // Contas a pagar pendentes
    let pagarQuery = supabaseAdmin
      .from("contas_pagar")
      .select("total:sum(valor_centavos)")
      .neq("status", "PAGO");

    if (centroCustoId !== null && !Number.isNaN(centroCustoId)) {
      pagarQuery = pagarQuery.eq("centro_custo_id", centroCustoId);
    }
    if (dataInicio) pagarQuery = pagarQuery.gte("vencimento", dataInicio);
    if (dataFim) pagarQuery = pagarQuery.lte("vencimento", dataFim);

    const { data: pagarData, error: pagarError } = await pagarQuery.single();
    if (pagarError) throw pagarError;
    const pagar_pendente_centavos = toNumber((pagarData as any)?.total);

    // Contas a receber pendentes
    let receberQuery = supabaseAdmin
      .from("cobrancas")
      .select("total:sum(valor_centavos)")
      .neq("status", "RECEBIDO")
      .neq("status", "PAGO"); // compat: cobrancas usam PAGO no fluxo atual

    if (centroCustoId !== null && !Number.isNaN(centroCustoId)) {
      receberQuery = receberQuery.eq("centro_custo_id", centroCustoId);
    }
    if (dataInicio) receberQuery = receberQuery.gte("vencimento", dataInicio);
    if (dataFim) receberQuery = receberQuery.lte("vencimento", dataFim);

    const { data: receberData, error: receberError } = await receberQuery.single();
    if (receberError) throw receberError;
    const receber_pendente_centavos = toNumber((receberData as any)?.total);

    // Movimentacao por centro de custo (receitas/entradas e despesas/saidas)
    const tiposReceita = ["ENTRADA", "RECEITA"];
    const tiposDespesa = ["SAIDA", "DESPESA"];
    const tiposAceitos = [...tiposReceita, ...tiposDespesa];

    let movimentoQuery = supabaseAdmin
      .from("movimento_financeiro")
      .select("centro_custo_id, tipo, total:sum(valor_centavos)")
      .in("tipo", tiposAceitos)
      .group("centro_custo_id, tipo");

    if (centroCustoId !== null && !Number.isNaN(centroCustoId)) {
      movimentoQuery = movimentoQuery.eq("centro_custo_id", centroCustoId);
    }
    if (dataInicio) movimentoQuery = movimentoQuery.gte("data_movimento", dataInicio);
    if (dataFim) movimentoQuery = movimentoQuery.lte("data_movimento", dataFim);

    const { data: movimentosData, error: movimentosError } = await movimentoQuery;
    if (movimentosError) throw movimentosError;

    let receitasTotal = 0;
    let despesasTotal = 0;
    const resumoMap = new Map<string, ResumoCentroCusto>();

    (movimentosData || []).forEach((row: any) => {
      const tipo = String(row?.tipo || "").toUpperCase();
      const total = toNumber((row as any)?.total);
      const centroId = row?.centro_custo_id ?? null;
      const key = centroId === null ? "sem-centro" : String(centroId);

      const base: ResumoCentroCusto =
        resumoMap.get(key) ??
        {
          centro_custo_id: centroId,
          receitas_centavos: 0,
          despesas_centavos: 0,
          saldo_centavos: 0,
        };

      if (tiposReceita.includes(tipo)) {
        base.receitas_centavos += total;
        receitasTotal += total;
      } else if (tiposDespesa.includes(tipo)) {
        base.despesas_centavos += total;
        despesasTotal += total;
      }

      base.saldo_centavos = base.receitas_centavos - base.despesas_centavos;
      resumoMap.set(key, base);
    });

    const resumoPorCentro = Array.from(resumoMap.values());
    const resumoIds = Array.from(
      new Set(
        resumoPorCentro
          .map((item) => item.centro_custo_id)
          .filter((id): id is number => typeof id === "number" && Number.isFinite(id))
      )
    );

    if (resumoIds.length > 0) {
      const { data: centros, error: centrosError } = await supabaseAdmin
        .from("centros_custo")
        .select("id, codigo, nome")
        .in("id", resumoIds);

      if (centrosError) {
        console.warn("[/api/financeiro/dashboard] Falha ao buscar nomes de centros:", centrosError);
      } else {
        const map = new Map<number, { codigo?: string | null; nome?: string | null }>();
        (centros || []).forEach((c: any) => {
          map.set(Number(c.id), { codigo: c.codigo ?? null, nome: c.nome ?? null });
        });

        resumoPorCentro.forEach((item) => {
          if (typeof item.centro_custo_id === "number") {
            const meta = map.get(item.centro_custo_id);
            item.centro_custo_codigo = meta?.codigo ?? null;
            item.centro_custo_nome = meta?.nome ?? null;
          }
        });
      }
    }

    const saldo_periodo_centavos = receitasTotal - despesasTotal;

    return json(200, {
      ok: true,
      pagar_pendente_centavos,
      receber_pendente_centavos,
      saldo_periodo_centavos,
      resumo_por_centro_custo: resumoPorCentro,
    });
  } catch (err) {
    console.error("[/api/financeiro/dashboard] Erro ao montar dashboard:", err);
    return json(500, {
      ok: false,
      error: "Erro ao carregar dashboard financeiro.",
    });
  }
}
