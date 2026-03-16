import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type RouteContext = { params: Promise<{ id: string }> };

function toInt(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.trunc(parsed);
}

function origemKey(origem: string | null | undefined): "CAFE" | "LOJA" | "ESCOLA" | "OUTROS" {
  const normalized = (origem ?? "").trim().toUpperCase();
  if (normalized === "CAFE") return "CAFE";
  if (normalized === "LOJA") return "LOJA";
  if (normalized === "ESCOLA" || normalized === "MATRICULA" || normalized === "MATRICULAS") return "ESCOLA";
  return "OUTROS";
}

export async function GET(request: NextRequest, ctx: RouteContext) {
  const denied = await guardApiByRole(request as any);
  if (denied) return denied as any;

  const { id } = await ctx.params;
  const colaboradorId = toInt(id);
  if (!colaboradorId) {
    return NextResponse.json({ ok: false, error: "colaborador_id_invalido" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: colaborador, error: colaboradorError } = await supabase
    .from("colaboradores")
    .select("id,pessoa_id")
    .eq("id", colaboradorId)
    .maybeSingle();

  if (colaboradorError || !colaborador?.pessoa_id) {
    return NextResponse.json({ ok: false, error: "colaborador_nao_encontrado" }, { status: 404 });
  }

  const { data: conta } = await supabase
    .from("credito_conexao_contas")
    .select("id,tipo_conta")
    .eq("pessoa_titular_id", Number(colaborador.pessoa_id))
    .eq("tipo_conta", "COLABORADOR")
    .order("ativo", { ascending: false })
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!conta?.id) {
    return NextResponse.json(
      {
        ok: true,
        competencias: [],
        referencias: { conta_interna_id: null },
      },
      { status: 200 },
    );
  }

  const { data: faturas } = await supabase
    .from("credito_conexao_faturas")
    .select("id,periodo_referencia,valor_total_centavos,status,folha_pagamento_id,cobranca_id,data_vencimento")
    .eq("conta_conexao_id", Number(conta.id))
    .order("periodo_referencia", { ascending: false })
    .order("id", { ascending: false })
    .limit(24);

  const faturasRows = (faturas ?? []) as Array<Record<string, unknown>>;
  const faturaIds = faturasRows
    .map((item) => Number(item.id))
    .filter((value) => Number.isFinite(value) && value > 0);

  const { data: vinculos } = faturaIds.length
    ? await supabase.from("credito_conexao_fatura_lancamentos").select("fatura_id,lancamento_id").in("fatura_id", faturaIds)
    : { data: [] as Array<Record<string, unknown>> };

  const lancamentoIds = Array.from(
    new Set((vinculos ?? []).map((item) => Number((item as Record<string, unknown>).lancamento_id)).filter((value) => Number.isFinite(value) && value > 0)),
  );

  const { data: lancamentos } = lancamentoIds.length
    ? await supabase
        .from("credito_conexao_lancamentos")
        .select("id,origem_sistema,valor_centavos,descricao,status,cobranca_id,competencia")
        .in("id", lancamentoIds)
    : { data: [] as Array<Record<string, unknown>> };

  const lancamentosMap = new Map<number, Record<string, unknown>>();
  for (const lancamento of lancamentos ?? []) {
    const lancamentoId = Number((lancamento as Record<string, unknown>).id);
    if (Number.isFinite(lancamentoId) && lancamentoId > 0) {
      lancamentosMap.set(lancamentoId, lancamento as Record<string, unknown>);
    }
  }

  const folhasRows = (
    await supabase
      .from("folha_pagamento_colaborador")
      .select("id,competencia_ano_mes,status,data_fechamento,data_pagamento")
      .eq("colaborador_id", colaboradorId)
      .order("competencia_ano_mes", { ascending: false })
      .order("id", { ascending: false })
  ).data ?? [];

  const folhaPorCompetencia = new Map<string, Record<string, unknown>>();
  for (const folha of folhasRows as Array<Record<string, unknown>>) {
    const competencia = String(folha.competencia_ano_mes ?? "");
    if (competencia && !folhaPorCompetencia.has(competencia)) {
      folhaPorCompetencia.set(competencia, folha);
    }
  }

  const competencias = faturasRows.map((fatura) => {
    const faturaId = Number(fatura.id);
    const competencia = String(fatura.periodo_referencia ?? "");
    const folha = folhaPorCompetencia.get(competencia) ?? null;
    const origens = {
      CAFE: { quantidade: 0, total_centavos: 0 },
      LOJA: { quantidade: 0, total_centavos: 0 },
      ESCOLA: { quantidade: 0, total_centavos: 0 },
      OUTROS: { quantidade: 0, total_centavos: 0 },
    };

    for (const vinculo of vinculos ?? []) {
      if (Number((vinculo as Record<string, unknown>).fatura_id) !== faturaId) continue;
      const lancamento = lancamentosMap.get(Number((vinculo as Record<string, unknown>).lancamento_id));
      const origem = origemKey(String(lancamento?.origem_sistema ?? ""));
      origens[origem].quantidade += 1;
      origens[origem].total_centavos += Math.max(Number(lancamento?.valor_centavos ?? 0), 0);
    }

    return {
      competencia,
      valor_total_centavos: Math.max(Number(fatura.valor_total_centavos ?? 0), 0),
      origens,
      status_fatura: String(fatura.status ?? ""),
      status_importacao_folha: folha ? String(folha.status ?? "") : "NAO_IMPORTADA",
      espelho_disponivel: !folha || String(folha.status ?? "").toUpperCase() === "ABERTA",
      referencia_fatura_id: faturaId,
      referencia_cobranca_id: Number(fatura.cobranca_id ?? 0) || null,
      folha_pagamento_colaborador_id: folha ? Number(folha.id ?? 0) || null : null,
      data_vencimento: fatura.data_vencimento ?? null,
    };
  });

  return NextResponse.json(
    {
      ok: true,
      competencias,
      referencias: {
        conta_interna_id: Number(conta.id),
        colaborador_id: colaboradorId,
      },
    },
    { status: 200 },
  );
}
