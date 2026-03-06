import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { formatBRLFromCents } from "@/lib/formatters/money";
import {
  calcularResumoMensalFinanceiro,
  classificarStatusOperacionalCobranca,
  formatarCompetenciaLabel,
  inferirNeofinStatusCobranca,
  montarNeofinLabel,
  montarPessoaLabel,
  type CobrancaOperacionalItem,
  type DashboardFinanceiroMensalResponse,
} from "@/lib/financeiro/creditoConexao/cobrancas";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type DashboardOperacionalRow = {
  cobranca_id: number;
  pessoa_id: number | null;
  pessoa_nome: string | null;
  competencia_ano_mes: string | null;
  data_vencimento: string | null;
  status_cobranca: string | null;
  origem_tipo: string | null;
  origem_subtipo: string | null;
  descricao: string | null;
  valor_centavos: number | null;
  valor_pago_centavos: number | null;
  saldo_aberto_centavos: number | null;
  dias_atraso: number | null;
  data_pagamento: string | null;
  neofin_charge_id: string | null;
  link_pagamento: string | null;
  linha_digitavel: string | null;
};

function toInt(value: string | null, fallback: number): number {
  const parsed = value ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function toNumber(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : 0;
}

function isCompetencia(value: string | null): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}$/.test(value);
}

function competenciaAtual(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 7);
}

function addMonths(competencia: string, offset: number): string {
  const [yearRaw, monthRaw] = competencia.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const date = new Date(year, month - 1 + offset, 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function criarResumoVazio(competencia: string) {
  return {
    competencia,
    competencia_label: formatarCompetenciaLabel(competencia),
    previsto_centavos: 0,
    pago_centavos: 0,
    pendente_centavos: 0,
    a_vencer_centavos: 0,
    vencido_centavos: 0,
    neofin_centavos: 0,
  };
}

function roundPercent(value: number): number {
  return Math.round(value * 10) / 10;
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
        descricao: "Nao ha cobrancas previstas para a competencia selecionada.",
        acao_sugerida: "Revisar a programacao de lancamentos e a competencia ativa.",
      },
    ];
  }

  if (cards.inadimplencia_mes_percentual >= 20) {
    destaques.push({
      tipo: "ALERTA",
      titulo: "Inadimplencia mensal acima do limite operacional",
      descricao: `A competencia ${competenciaLabel} ja concentra ${cards.inadimplencia_mes_percentual.toFixed(1)}% do previsto em atraso.`,
      acao_sugerida: "Priorizar cobranca ativa dos titulos vencidos antes de abrir novo ciclo.",
    });
  }

  if (cards.neofin_mes_centavos > 0) {
    destaques.push({
      tipo: "INFO",
      titulo: "Carteira em cobranca NeoFin ativa no mes",
      descricao: `Ha ${formatBRLFromCents(cards.neofin_mes_centavos)} ainda em cobranca NeoFin nesta competencia.`,
      acao_sugerida: "Acompanhar retorno operacional e conversao dos titulos integrados.",
    });
  }

  if (cards.pendente_mes_centavos > 0 && cards.pago_mes_centavos < cards.previsto_mes_centavos * 0.7) {
    destaques.push({
      tipo: "ALERTA",
      titulo: "Cobertura de recebimento abaixo da meta",
      descricao: "O volume recebido ainda esta abaixo de 70% do previsto para o mes.",
      acao_sugerida: "Concentrar follow-up em vencidos e titulos a vencer da semana.",
    });
  }

  if (destaques.length === 0) {
    destaques.push({
      tipo: "INFO",
      titulo: "Leitura mensal sob controle",
      descricao: "Previsto, pago e pendente estao em faixa operacional sem alerta critico nesta competencia.",
      acao_sugerida: "Manter rotina de cobranca e revisar a carteira NeoFin diariamente.",
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
  const competenciaBase = competenciaAtual();
  const competenciaSelecionada = isCompetencia(competencia) ? competencia : competenciaBase;

  if (competencia && !isCompetencia(competencia)) {
    return NextResponse.json({ ok: false, error: "competencia_invalida" }, { status: 400 });
  }

  let query = supabase
    .from("vw_financeiro_cobrancas_operacionais")
    .select(
      [
        "cobranca_id",
        "pessoa_id",
        "pessoa_nome",
        "competencia_ano_mes",
        "data_vencimento",
        "status_cobranca",
        "origem_tipo",
        "origem_subtipo",
        "descricao",
        "valor_centavos",
        "valor_pago_centavos",
        "saldo_aberto_centavos",
        "dias_atraso",
        "data_pagamento",
        "neofin_charge_id",
        "link_pagamento",
        "linha_digitavel",
      ].join(","),
    )
    .order("competencia_ano_mes", { ascending: false, nullsFirst: false })
    .order("data_vencimento", { ascending: false, nullsFirst: false });

  if (isCompetencia(competencia)) {
    query = query.eq("competencia_ano_mes", competencia);
  } else {
    query = query.gte("competencia_ano_mes", addMonths(competenciaBase, -(limite - 1)));
  }

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
    const competenciaItem = isCompetencia(row.competencia_ano_mes)
      ? row.competencia_ano_mes
      : row.data_vencimento?.slice(0, 7) ?? competenciaSelecionada;
    const valorCentavos = toNumber(row.valor_centavos);
    const valorPagoCentavos = toNumber(row.valor_pago_centavos);
    const saldoAbertoCentavos = toNumber(row.saldo_aberto_centavos);
    const statusOperacional = classificarStatusOperacionalCobranca(
      {
        status_cobranca: row.status_cobranca,
        data_vencimento: row.data_vencimento,
        valor_centavos: valorCentavos,
        valor_pago_centavos: valorPagoCentavos,
        saldo_aberto_centavos: saldoAbertoCentavos,
      },
      today,
    );
    const neofinStatus = inferirNeofinStatusCobranca(row.neofin_charge_id, statusOperacional);

    return {
      cobranca_id: row.cobranca_id,
      pessoa_id: row.pessoa_id,
      pessoa_nome: row.pessoa_nome ?? (row.pessoa_id ? `Pessoa #${row.pessoa_id}` : "Pessoa nao identificada"),
      pessoa_label: montarPessoaLabel(row.pessoa_nome, row.pessoa_id),
      competencia_ano_mes: competenciaItem,
      competencia_label: formatarCompetenciaLabel(competenciaItem),
      data_vencimento: row.data_vencimento,
      valor_centavos: valorCentavos,
      valor_pago_centavos: valorPagoCentavos,
      saldo_aberto_centavos: saldoAbertoCentavos,
      valor_formatado: formatBRLFromCents(valorCentavos),
      status_cobranca: row.status_cobranca,
      status_operacional: statusOperacional,
      neofin_status: neofinStatus,
      neofin_label: montarNeofinLabel(neofinStatus),
      neofin_charge_id: row.neofin_charge_id,
      origem_tipo: row.origem_tipo,
      origem_subtipo: row.origem_subtipo,
      origem_referencia_label: row.descricao ?? "Cobranca financeira",
      dias_em_atraso: toNumber(row.dias_atraso),
      fatura_id: null,
      cobranca_url: null,
      fatura_url: null,
      data_pagamento: row.data_pagamento,
      link_pagamento: row.link_pagamento,
      linha_digitavel: row.linha_digitavel,
    } satisfies CobrancaOperacionalItem;
  });

  const resumos = calcularResumoMensalFinanceiro(itens);
  const resumoSelecionado =
    resumos.find((item) => item.competencia === competenciaSelecionada) ?? criarResumoVazio(competenciaSelecionada);

  const cards: DashboardFinanceiroMensalResponse["cards"] = {
    previsto_mes_centavos: resumoSelecionado.previsto_centavos,
    pago_mes_centavos: resumoSelecionado.pago_centavos,
    pendente_mes_centavos: resumoSelecionado.pendente_centavos,
    neofin_mes_centavos: resumoSelecionado.neofin_centavos,
    inadimplencia_mes_percentual:
      resumoSelecionado.previsto_centavos > 0
        ? roundPercent((resumoSelecionado.vencido_centavos / resumoSelecionado.previsto_centavos) * 100)
        : 0,
  };

  const payload: DashboardFinanceiroMensalResponse = {
    competencia_atual: competenciaSelecionada,
    cards,
    meses: resumos.slice(0, limite).map((resumo) => ({
      competencia: resumo.competencia,
      previsto_centavos: resumo.previsto_centavos,
      pago_centavos: resumo.pago_centavos,
      pendente_centavos: resumo.pendente_centavos,
      vencido_centavos: resumo.vencido_centavos,
      neofin_centavos: resumo.neofin_centavos,
    })),
    destaques: criarDestaques(competenciaSelecionada, cards),
  };

  return NextResponse.json({ ok: true, ...payload }, { status: 200 });
}
