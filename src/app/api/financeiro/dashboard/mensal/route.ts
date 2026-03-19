import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { formatBRLFromCents } from "@/lib/formatters/money";
import {
  formatarCompetenciaLabel,
  montarCobrancaOperacionalBase,
  type CobrancaOperacionalViewBase,
} from "@/lib/financeiro/creditoConexao/cobrancas";
import {
  addCompetenciaMonths,
  montarDashboardFinanceiroComposicaoItem,
  montarDashboardFinanceiroMensalPayload,
  type DashboardFinanceiroMensalResponse,
} from "@/lib/financeiro/dashboardMensalContaInterna";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type DashboardOperacionalRow = CobrancaOperacionalViewBase & {
  origem_tipo: string | null;
  origem_subtipo: string | null;
  origem_id: number | null;
  conta_conexao_id: number | null;
  descricao: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function toInt(value: string | null, fallback: number): number {
  const parsed = value ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function isCompetencia(value: string | null): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}$/.test(value);
}

function competenciaAtual(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 7);
}

function criarDestaques(
  competencia: string,
  cards: DashboardFinanceiroMensalResponse["cards"],
): DashboardFinanceiroMensalResponse["destaques"] {
  const competenciaLabel = formatarCompetenciaLabel(competencia);
  const destaques: DashboardFinanceiroMensalResponse["destaques"] = [];

  if (cards.previsto_mes_centavos <= 0) {
    return [
      {
        tipo: "INFO",
        titulo: `Sem carteira prevista em ${competenciaLabel}`,
        descricao: "Nao ha cobrancas operacionais previstas para a competencia selecionada.",
        acao_sugerida: "Revisar a geracao de mensalidades, avulsas e vinculos do periodo.",
      },
    ];
  }

  if (cards.inadimplencia_mes_percentual >= 20) {
    destaques.push({
      tipo: "ALERTA",
      titulo: "Inadimplencia mensal acima do limite operacional",
      descricao: `A competencia ${competenciaLabel} concentra ${cards.inadimplencia_mes_percentual.toFixed(1)}% do previsto em atraso.`,
      acao_sugerida: "Priorizar a carteira vencida e conferir cobrancas sem vinculo NeoFin.",
    });
  }

  if (cards.neofin_mes_centavos > 0) {
    destaques.push({
      tipo: "INFO",
      titulo: "Carteira em cobranca NeoFin ativa no mes",
      descricao: `Ha ${formatBRLFromCents(cards.neofin_mes_centavos)} ainda em cobranca NeoFin nesta competencia.`,
      acao_sugerida: "Acompanhar a conversao dos titulos vinculados e o retorno operacional do provedor.",
    });
  }

  if (cards.pendente_mes_centavos > 0 && cards.pago_mes_centavos < cards.previsto_mes_centavos * 0.7) {
    destaques.push({
      tipo: "ALERTA",
      titulo: "Cobertura de recebimento abaixo da meta",
      descricao: "O volume recebido ainda esta abaixo de 70% do previsto para o mes.",
      acao_sugerida: "Atuar em vencidos, a vencer e cobrancas avulsas sem vinculo ainda no mesmo ciclo.",
    });
  }

  if (destaques.length === 0) {
    destaques.push({
      tipo: "INFO",
      titulo: "Leitura mensal sob controle",
      descricao: "Previsto, pago, pendente e NeoFin estao em faixa operacional sem alerta critico nesta competencia.",
      acao_sugerida: "Manter a rotina de cobranca e revisar a carteira NeoFin diariamente.",
    });
  }

  return destaques.slice(0, 3);
}

export async function GET(req: NextRequest) {
  const denied = await guardApiByRole(req as Request);
  if (denied) return denied;

  const supabase = getSupabaseAdmin();
  const url = new URL(req.url);
  const competencia = (url.searchParams.get("competencia") ?? "").trim();
  const limite = Math.min(Math.max(toInt(url.searchParams.get("limite"), 6), 1), 12);
  const tipoConta = (url.searchParams.get("tipo_conta") ?? "ALUNO").trim().toUpperCase();
  const competenciaBase = competenciaAtual();
  const competenciaSelecionada = isCompetencia(competencia) ? competencia : competenciaBase;
  const competenciaInicio = addCompetenciaMonths(competenciaSelecionada, -(limite - 1));

  if (competencia && !isCompetencia(competencia)) {
    return NextResponse.json({ ok: false, error: "competencia_invalida" }, { status: 400 });
  }

  if (tipoConta !== "ALUNO" && tipoConta !== "COLABORADOR" && tipoConta !== "TODOS") {
    return NextResponse.json({ ok: false, error: "tipo_conta_invalido" }, { status: 400 });
  }

  let query = supabase
    .from("vw_financeiro_cobrancas_operacionais")
    .select(
      [
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
        "origem_id",
        "origem_referencia_label",
        "dias_atraso",
        "fatura_id",
        "fatura_competencia",
        "fatura_status",
        "conta_conexao_id",
        "tipo_conta",
        "tipo_conta_label",
        "permite_vinculo_manual",
        "data_pagamento",
        "link_pagamento",
        "linha_digitavel",
        "descricao",
        "created_at",
        "updated_at",
      ].join(","),
    )
    .order("competencia_ano_mes", { ascending: false, nullsFirst: false })
    .order("data_vencimento", { ascending: false, nullsFirst: false });

  if (tipoConta !== "TODOS") {
    query = query.eq("tipo_conta", tipoConta);
  }

  query = query.gte("competencia_ano_mes", competenciaInicio);
  query = query.lte("competencia_ano_mes", competenciaSelecionada);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { ok: false, error: "erro_buscar_dashboard_mensal", detail: error.message },
      { status: 500 },
    );
  }

  const today = new Date();
  const itens = ((data ?? []) as unknown[]).map((raw) => {
    const row = raw as DashboardOperacionalRow;
    const item = montarCobrancaOperacionalBase(row, today);
    item.cobranca_url = item.cobranca_fonte === "COBRANCA_AVULSA"
      ? `/administracao/financeiro/cobrancas-avulsas/${item.cobranca_id}`
      : `/admin/governanca/cobrancas/${item.cobranca_id}`;
    return montarDashboardFinanceiroComposicaoItem({
      ...item,
      conta_conexao_id: row.conta_conexao_id,
      origem_id: row.origem_id,
      descricao: row.descricao,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  });

  const payloadBase = montarDashboardFinanceiroMensalPayload({
    items: itens,
    competenciaSelecionada,
    competenciaInicio,
    competenciaFim: competenciaSelecionada,
    limite,
    tipoConta,
    competenciaAtualReal: competenciaBase,
  });
  const payload: DashboardFinanceiroMensalResponse = {
    ...payloadBase,
    destaques: criarDestaques(competenciaSelecionada, payloadBase.cards),
  };

  return NextResponse.json({ ok: true, ...payload }, { status: 200 });
}
