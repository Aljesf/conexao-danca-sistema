import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { formatBRLFromCents } from "@/lib/formatters/money";
import {
  classificarStatusOperacionalCobranca,
  formatarCompetenciaLabel,
  inferirNeofinStatusCobranca,
  montarCobrancaOperacionalBase,
  montarNeofinLabel,
  montarPessoaLabel,
  type CobrancaOperacionalViewBase,
  type NeofinSituacaoOperacional,
  type StatusOperacionalCobranca,
} from "@/lib/financeiro/creditoConexao/cobrancas";
import {
  addCompetenciaMonths,
  addIsoDays,
  compareCompetenciaAsc,
  montarDashboardFinanceiroComposicaoItem,
  montarDashboardFinanceiroRecebimentoItem,
  montarDashboardFinanceiroMensalPayload,
  startOfCompetencia,
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

type CobrancaMetaRow = {
  id: number;
  status: string | null;
  cancelada_em: string | null;
  cancelamento_motivo: string | null;
  cancelada_motivo: string | null;
  expurgada: boolean | null;
  expurgo_motivo: string | null;
};

type CobrancaAvulsaMetaRow = {
  id: number;
  status: string | null;
  pago_em: string | null;
  forma_pagamento: string | null;
  valor_centavos: number | null;
  valor_pago_centavos: number | null;
  vencimento: string | null;
  pessoa_id: number | null;
  origem_tipo: string | null;
  origem_id: number | null;
  observacao: string | null;
  motivo_excecao: string | null;
  criado_em: string | null;
  atualizado_em: string | null;
};

type ContaConexaoDashboardRow = {
  id: number;
  pessoa_titular_id: number | null;
  responsavel_financeiro_pessoa_id: number | null;
  tipo_conta: string | null;
  descricao_exibicao: string | null;
  ativo: boolean | null;
};

type PessoaRow = {
  id: number;
  nome: string | null;
};

type LancamentoDashboardRow = {
  id: number;
  conta_conexao_id: number;
  competencia: string | null;
  data_lancamento: string | null;
  descricao: string | null;
  valor_centavos: number | null;
  status: string | null;
  origem_sistema: string | null;
  origem_id: number | null;
  referencia_item: string | null;
  cobranca_id: number | null;
  created_at: string | null;
  updated_at: string | null;
};

type LancamentoFaturaPivotRow = {
  lancamento_id: number;
  fatura_id: number;
};

type FaturaDashboardRow = {
  id: number;
  conta_conexao_id: number;
  periodo_referencia: string | null;
  data_vencimento: string | null;
  status: string | null;
  neofin_invoice_id: string | null;
};

type RecebimentoDashboardRow = {
  id: number;
  cobranca_id: number | null;
  centro_custo_id: number | null;
  valor_centavos: number | null;
  data_pagamento: string | null;
  metodo_pagamento: string | null;
  forma_pagamento_codigo: string | null;
  origem_sistema: string | null;
  observacoes: string | null;
  created_at: string | null;
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

function competenciaFimAno(competencia: string): string {
  return `${competencia.slice(0, 4)}-12`;
}

function countCompetenciasInclusive(inicio: string, fim: string): number {
  return compareCompetenciaAsc(fim, inicio) >= 0 ? compareCompetenciaAsc(fim, inicio) + 1 : 0;
}

function textOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function upper(value: unknown): string {
  return textOrNull(typeof value === "string" ? value : null)
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase() ?? "";
}

function isStatusCanceladoLike(value: unknown): boolean {
  const normalized = upper(value);
  return normalized === "CANCELADO" || normalized === "CANCELADA";
}

function calcularDiasAtraso(vencimento: string | null): number {
  const due = textOrNull(vencimento);
  if (!due || !/^\d{4}-\d{2}-\d{2}$/.test(due)) return 0;
  const todayIso = dataAtualIso();
  if (due >= todayIso) return 0;
  const diffMs = new Date(`${todayIso}T00:00:00`).getTime() - new Date(`${due}T00:00:00`).getTime();
  return Math.max(Math.floor(diffMs / 86_400_000), 0);
}

function dataAtualIso(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function belongsToTipoConta(
  pessoaId: number | null,
  tipoConta: string,
  tiposContaPorPessoa: Map<number, Set<string>>,
): boolean {
  if (typeof pessoaId !== "number" || !Number.isFinite(pessoaId)) return false;
  if (tipoConta === "TODOS") return tiposContaPorPessoa.has(pessoaId);
  const tipos = tiposContaPorPessoa.get(pessoaId);
  return Boolean(tipos?.has(tipoConta));
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
        descricao: "Nao ha lancamentos elegiveis para a competencia selecionada.",
        acao_sugerida: "Revisar geracao de mensalidades, conta interna e cancelamentos operacionais.",
      },
    ];
  }

  if (cards.inadimplencia_mes_percentual >= 20) {
    destaques.push({
      tipo: "ALERTA",
      titulo: "Inadimplencia mensal acima do limite operacional",
      descricao: `A competencia ${competenciaLabel} concentra ${cards.inadimplencia_mes_percentual.toFixed(1)}% do previsto em atraso.`,
      acao_sugerida: "Priorizar vencidos elegiveis e conferir a carteira sem vinculo NeoFin.",
    });
  }

  if (cards.neofin_mes_centavos > 0) {
    destaques.push({
      tipo: "INFO",
      titulo: "Carteira NeoFin ativa no mes",
      descricao: `Ha ${formatBRLFromCents(cards.neofin_mes_centavos)} ainda em cobranca NeoFin nesta competencia.`,
      acao_sugerida: "Acompanhar retorno operacional antes de reconhecer qualquer recebido.",
    });
  }

  if (cards.pendente_mes_centavos > 0 && cards.pago_mes_centavos < cards.previsto_mes_centavos * 0.7) {
    destaques.push({
      tipo: "ALERTA",
      titulo: "Cobertura de recebimento abaixo da meta",
      descricao: "O volume recebido ainda esta abaixo de 70% do previsto elegivel para o mes.",
      acao_sugerida: "Atuar em itens vencidos, a vencer e sem vinculacao NeoFin no mesmo ciclo.",
    });
  }

  if (destaques.length === 0) {
    destaques.push({
      tipo: "INFO",
      titulo: "Leitura mensal sob controle",
      descricao: "Previsto, recebido, pendente e NeoFin estao em faixa operacional sem alerta critico nesta competencia.",
      acao_sugerida: "Manter a rotina de cobranca e validar os lancamentos futuros ja gerados.",
    });
  }

  return destaques.slice(0, 3);
}

export async function GET(req: NextRequest) {
  const denied = await guardApiByRole(req as Request);
  if (denied) return denied;

  const supabase = getSupabaseAdmin();
  const url = new URL(req.url);
  const competenciaParam = (url.searchParams.get("competencia") ?? "").trim();
  const tipoConta = (url.searchParams.get("tipo_conta") ?? "ALUNO").trim().toUpperCase();
  const competenciaBase = competenciaAtual();
  const competenciaSelecionada = isCompetencia(competenciaParam) ? competenciaParam : competenciaBase;

  if (competenciaParam && !isCompetencia(competenciaParam)) {
    return NextResponse.json({ ok: false, error: "competencia_invalida" }, { status: 400 });
  }
  if (!["ALUNO", "COLABORADOR", "TODOS"].includes(tipoConta)) {
    return NextResponse.json({ ok: false, error: "tipo_conta_invalido" }, { status: 400 });
  }

  const limiteAno = countCompetenciasInclusive(competenciaSelecionada, competenciaFimAno(competenciaSelecionada));
  const limiteSolicitado = Math.min(Math.max(toInt(url.searchParams.get("limite"), limiteAno), 1), 24);
  const competenciaInicio = competenciaSelecionada;
  const competenciaFimMinimo = competenciaFimAno(competenciaSelecionada);
  const competenciaFimPorLimite = addCompetenciaMonths(competenciaSelecionada, limiteSolicitado - 1);
  const competenciaFim =
    compareCompetenciaAsc(competenciaFimPorLimite, competenciaFimMinimo) < 0
      ? competenciaFimMinimo
      : competenciaFimPorLimite;
  const limite = countCompetenciasInclusive(competenciaInicio, competenciaFim);
  const hojeIso = dataAtualIso();
  const inicioCompetenciaSelecionada = startOfCompetencia(competenciaSelecionada);
  const inicioUltimos7Dias = addIsoDays(hojeIso, -6);
  const inicioRecebimentos = inicioCompetenciaSelecionada < inicioUltimos7Dias
    ? inicioCompetenciaSelecionada
    : inicioUltimos7Dias;
  const operacionalSelect = [
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
  ].join(",");

  let query = supabase
    .from("vw_financeiro_cobrancas_operacionais")
    .select(operacionalSelect)
    .gte("competencia_ano_mes", competenciaInicio)
    .lte("competencia_ano_mes", competenciaFim)
    .order("competencia_ano_mes", { ascending: true, nullsFirst: false })
    .order("data_vencimento", { ascending: true, nullsFirst: false });

  if (tipoConta !== "TODOS") {
    query = query.eq("tipo_conta", tipoConta);
  }

  const contasQuery = supabase
    .from("credito_conexao_contas")
    .select("id,pessoa_titular_id,responsavel_financeiro_pessoa_id,tipo_conta,descricao_exibicao,ativo")
    .eq("ativo", true);

  const { data: operacionalData, error: operacionalError } = await query;
  if (operacionalError) {
    return NextResponse.json(
      { ok: false, error: "erro_buscar_dashboard_mensal", detail: operacionalError.message },
      { status: 500 },
    );
  }

  const { data: contasRaw, error: contasError } = tipoConta === "TODOS"
    ? await contasQuery
    : await contasQuery.eq("tipo_conta", tipoConta);

  if (contasError) {
    return NextResponse.json(
      { ok: false, error: "erro_buscar_contas_dashboard_mensal", detail: contasError.message },
      { status: 500 },
    );
  }

  const operacionalRows = (operacionalData ?? []) as DashboardOperacionalRow[];
  const contas = ((contasRaw ?? []) as ContaConexaoDashboardRow[]).filter((item) => item.ativo !== false);
  const today = new Date();
  const tiposContaPorPessoa = new Map<number, Set<string>>();

  for (const conta of contas) {
    for (const pessoaId of [conta.responsavel_financeiro_pessoa_id, conta.pessoa_titular_id]) {
      if (typeof pessoaId !== "number" || !Number.isFinite(pessoaId) || pessoaId <= 0) continue;
      const tipos = tiposContaPorPessoa.get(pessoaId) ?? new Set<string>();
      if (textOrNull(conta.tipo_conta)) tipos.add(String(conta.tipo_conta).toUpperCase());
      tiposContaPorPessoa.set(pessoaId, tipos);
    }
  }

  const cobrancaIds = Array.from(
    new Set(
      operacionalRows
        .filter((row) => upper(String(row.cobranca_fonte ?? "")) !== "COBRANCA_AVULSA")
        .map((row) => Number(row.cobranca_id))
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  );
  const avulsaIds = Array.from(
    new Set(
      operacionalRows
        .filter((row) => upper(String(row.cobranca_fonte ?? "")) === "COBRANCA_AVULSA")
        .map((row) => Number(row.cobranca_id))
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  );
  const pessoaIds = Array.from(
    new Set(
      contas
        .flatMap((row) => [row.responsavel_financeiro_pessoa_id, row.pessoa_titular_id])
        .filter((id): id is number => typeof id === "number" && Number.isFinite(id) && id > 0),
    ),
  );

  const [recebimentosRecentesResult, avulsasPagasRecentesResult] = await Promise.all([
    cobrancaIds.length > 0
      ? supabase
        .from("recebimentos")
        .select("id,cobranca_id,centro_custo_id,valor_centavos,data_pagamento,metodo_pagamento,forma_pagamento_codigo,origem_sistema,observacoes,created_at")
        .in("cobranca_id", cobrancaIds)
        .gte("data_pagamento", `${inicioRecebimentos}T00:00:00`)
        .lte("data_pagamento", `${hojeIso}T23:59:59`)
        .order("data_pagamento", { ascending: false, nullsFirst: false })
        .order("id", { ascending: false })
      : Promise.resolve({ data: [] as RecebimentoDashboardRow[], error: null }),
    avulsaIds.length > 0
      ? supabase
        .from("financeiro_cobrancas_avulsas")
        .select("id,pessoa_id,valor_centavos,valor_pago_centavos,status,pago_em,forma_pagamento,vencimento,origem_tipo,origem_id,observacao,motivo_excecao,criado_em,atualizado_em")
        .in("id", avulsaIds)
        .not("pago_em", "is", null)
        .gte("pago_em", `${inicioRecebimentos}T00:00:00`)
        .lte("pago_em", `${hojeIso}T23:59:59`)
        .order("pago_em", { ascending: false, nullsFirst: false })
      : Promise.resolve({ data: [] as CobrancaAvulsaMetaRow[], error: null }),
  ]);

  if (recebimentosRecentesResult.error || avulsasPagasRecentesResult.error) {
    return NextResponse.json(
      {
        ok: false,
        error: "erro_buscar_recebimentos_recentes_dashboard_mensal",
        detail: recebimentosRecentesResult.error?.message ?? avulsasPagasRecentesResult.error?.message ?? "erro_desconhecido",
      },
      { status: 500 },
    );
  }

  const [cobrancasMetaResult, avulsasMetaResult, pessoasResult] = await Promise.all([
    cobrancaIds.length > 0
      ? supabase
        .from("cobrancas")
        .select("id,status,cancelada_em,cancelamento_motivo,cancelada_motivo,expurgada,expurgo_motivo")
        .in("id", cobrancaIds)
      : Promise.resolve({ data: [] as CobrancaMetaRow[], error: null }),
    avulsaIds.length > 0
      ? supabase
        .from("financeiro_cobrancas_avulsas")
        .select("id,pessoa_id,valor_centavos,valor_pago_centavos,status,pago_em,forma_pagamento,vencimento,origem_tipo,origem_id,observacao,motivo_excecao,criado_em,atualizado_em")
        .in("id", avulsaIds)
      : Promise.resolve({ data: [] as CobrancaAvulsaMetaRow[], error: null }),
    pessoaIds.length > 0
      ? supabase.from("pessoas").select("id,nome").in("id", pessoaIds)
      : Promise.resolve({ data: [] as PessoaRow[], error: null }),
  ]);

  if (cobrancasMetaResult.error || avulsasMetaResult.error || pessoasResult.error) {
    return NextResponse.json(
      {
        ok: false,
        error: "erro_buscar_metadata_dashboard_mensal",
        detail:
          cobrancasMetaResult.error?.message
          ?? avulsasMetaResult.error?.message
          ?? pessoasResult.error?.message
          ?? "erro_desconhecido",
      },
      { status: 500 },
    );
  }

  const cobrancasMetaById = new Map<number, CobrancaMetaRow>(
    ((cobrancasMetaResult.data ?? []) as CobrancaMetaRow[]).map((row) => [Number(row.id), row]),
  );
  const avulsasMetaById = new Map<number, CobrancaAvulsaMetaRow>(
    ((avulsasMetaResult.data ?? []) as CobrancaAvulsaMetaRow[]).map((row) => [Number(row.id), row]),
  );
  const pessoasById = new Map<number, string>(
    ((pessoasResult.data ?? []) as PessoaRow[])
      .filter((row) => Number.isFinite(Number(row.id)))
      .map((row) => [Number(row.id), textOrNull(row.nome) ?? `Pessoa #${row.id}`]),
  );
  const contasById = new Map<number, ContaConexaoDashboardRow>(contas.map((row) => [Number(row.id), row]));
  const recebimentosRecentes = (recebimentosRecentesResult.data ?? []) as RecebimentoDashboardRow[];
  const avulsasPagasRecentes = (avulsasPagasRecentesResult.data ?? []) as CobrancaAvulsaMetaRow[];
  const operacionalRowsCanonicos = operacionalRows.filter((row) => {
    const cobrancaId = Number(row.cobranca_id ?? 0) || null;
    const isAvulsa = upper(String(row.cobranca_fonte ?? "")) === "COBRANCA_AVULSA";

    if (!cobrancaId) return true;

    if (isAvulsa) {
      const metaAvulsa = avulsasMetaById.get(cobrancaId) ?? null;
      const statusAvulsa = metaAvulsa?.status ?? row.status_bruto ?? row.status_cobranca;
      return !isStatusCanceladoLike(statusAvulsa);
    }

    const metaCobranca = cobrancasMetaById.get(cobrancaId) ?? null;
    const statusCobranca = metaCobranca?.status ?? row.status_bruto ?? row.status_cobranca;
    if (isStatusCanceladoLike(statusCobranca)) return false;
    if (Boolean(metaCobranca?.expurgada)) return false;
    return true;
  });

  const contaIds = contas.map((row) => Number(row.id)).filter((id) => Number.isFinite(id) && id > 0);
  const { data: lancamentosRaw, error: lancamentosError } = contaIds.length > 0
    ? await supabase
      .from("credito_conexao_lancamentos")
      .select("id,conta_conexao_id,competencia,data_lancamento,descricao,valor_centavos,status,origem_sistema,origem_id,referencia_item,cobranca_id,created_at,updated_at")
      .in("conta_conexao_id", contaIds)
      .gte("competencia", competenciaInicio)
      .lte("competencia", competenciaFim)
      .in("status", ["PENDENTE_FATURA", "FATURADO"])
      .order("competencia", { ascending: true })
      .order("id", { ascending: true })
    : { data: [], error: null };

  if (lancamentosError) {
    return NextResponse.json(
      { ok: false, error: "erro_buscar_lancamentos_dashboard_mensal", detail: lancamentosError.message },
      { status: 500 },
    );
  }

  const lancamentos = ((lancamentosRaw ?? []) as LancamentoDashboardRow[]).filter((row) => !row.cobranca_id);
  const lancamentoIds = lancamentos.map((row) => Number(row.id)).filter((id) => Number.isFinite(id) && id > 0);
  const { data: pivotsRaw, error: pivotsError } = lancamentoIds.length > 0
    ? await supabase
      .from("credito_conexao_fatura_lancamentos")
      .select("lancamento_id,fatura_id")
      .in("lancamento_id", lancamentoIds)
    : { data: [], error: null };

  if (pivotsError) {
    return NextResponse.json(
      { ok: false, error: "erro_buscar_vinculos_fatura_dashboard_mensal", detail: pivotsError.message },
      { status: 500 },
    );
  }

  const pivots = (pivotsRaw ?? []) as LancamentoFaturaPivotRow[];
  const faturaIds = Array.from(
    new Set(pivots.map((row) => Number(row.fatura_id)).filter((id) => Number.isFinite(id) && id > 0)),
  );
  const { data: faturasRaw, error: faturasError } = faturaIds.length > 0
    ? await supabase
      .from("credito_conexao_faturas")
      .select("id,conta_conexao_id,periodo_referencia,data_vencimento,status,neofin_invoice_id")
      .in("id", faturaIds)
    : { data: [], error: null };

  if (faturasError) {
    return NextResponse.json(
      { ok: false, error: "erro_buscar_faturas_dashboard_mensal", detail: faturasError.message },
      { status: 500 },
    );
  }

  const faturaIdByLancamentoId = new Map<number, number>();
  for (const pivot of pivots) {
    faturaIdByLancamentoId.set(Number(pivot.lancamento_id), Number(pivot.fatura_id));
  }
  const faturasById = new Map<number, FaturaDashboardRow>(
    ((faturasRaw ?? []) as FaturaDashboardRow[]).map((row) => [Number(row.id), row]),
  );

  const itensOperacionais = operacionalRowsCanonicos.map((row) => {
    const item = montarCobrancaOperacionalBase(row, today);
    item.cobranca_url = item.cobranca_fonte === "COBRANCA_AVULSA"
      ? `/administracao/financeiro/cobrancas-avulsas/${item.cobranca_id}`
      : `/admin/governanca/cobrancas/${item.cobranca_id}`;

    const isAvulsa = upper(String(item.cobranca_fonte)) === "COBRANCA_AVULSA";
    const metaCobranca = !isAvulsa ? cobrancasMetaById.get(Number(item.cobranca_id)) ?? null : null;
    const metaAvulsa = isAvulsa ? avulsasMetaById.get(Number(item.cobranca_id)) ?? null : null;
    const statusOriginal = textOrNull(isAvulsa ? metaAvulsa?.status : metaCobranca?.status) ?? item.status_bruto ?? item.status_cobranca;

    return montarDashboardFinanceiroComposicaoItem({
      competencia: item.competencia_ano_mes,
      cobranca_id: item.cobranca_id,
      lancamento_id: null,
      cobranca_key: item.cobranca_key,
      cobranca_fonte: item.cobranca_fonte,
      pessoa_id: item.pessoa_id,
      pessoa_nome: item.pessoa_nome,
      pessoa_label: item.pessoa_label,
      conta_conexao_id: row.conta_conexao_id,
      conta_interna_id: row.conta_conexao_id,
      tipo_conta: item.tipo_conta,
      tipo_conta_label: item.tipo_conta_label,
      origem_tipo: row.origem_tipo,
      origem_subtipo: row.origem_subtipo,
      origem_id: row.origem_id,
      origem_lancamento: null,
      origem_fatura: row.fatura_status,
      descricao: row.descricao ?? item.origem_referencia_label,
      referencia: item.origem_referencia_label,
      status_operacional: item.status_operacional,
      status_bruto: item.status_bruto,
      status_original: statusOriginal,
      valor_nominal_centavos: item.valor_centavos,
      valor_recebido_confirmado_centavos: item.valor_pago_centavos,
      valor_pendente_base_centavos: item.saldo_aberto_centavos,
      data_vencimento: item.data_vencimento,
      data_pagamento: isAvulsa ? textOrNull(metaAvulsa?.pago_em) ?? item.data_pagamento : item.data_pagamento,
      neofin_status: item.neofin_status,
      neofin_label: item.neofin_label,
      neofin_situacao_operacional: item.neofin_situacao_operacional,
      fatura_id: item.fatura_id,
      fatura_competencia: item.fatura_competencia,
      fatura_status: item.fatura_status,
      cobranca_url: item.cobranca_url,
      fatura_url: item.fatura_url,
      dias_em_atraso: item.dias_em_atraso,
      created_at: row.created_at,
      updated_at: row.updated_at,
      cancelado: isAvulsa
        ? upper(statusOriginal) === "CANCELADO"
        : upper(statusOriginal) === "CANCELADA" || Boolean(textOrNull(metaCobranca?.cancelada_em)),
      expurgado: !isAvulsa && Boolean(metaCobranca?.expurgada),
      motivo_cancelamento: !isAvulsa
        ? textOrNull(metaCobranca?.cancelamento_motivo) ?? textOrNull(metaCobranca?.cancelada_motivo)
        : null,
      motivo_expurgo: !isAvulsa ? textOrNull(metaCobranca?.expurgo_motivo) : null,
      gerado_antecipadamente:
        compareCompetenciaAsc(item.competencia_ano_mes, competenciaBase) > 0 &&
        (upper(row.origem_tipo).startsWith("MATRICULA") || upper(row.origem_subtipo) === "CARTAO_CONEXAO" || upper(String(row.tipo_cobranca)) === "MENSALIDADE"),
    });
  });

  const itensLancamentosFuturos = lancamentos
    .filter((row) => {
      const competenciaLanc = textOrNull(row.competencia);
      if (!isCompetencia(competenciaLanc)) return false;
      const faturaId = faturaIdByLancamentoId.get(Number(row.id)) ?? null;
      const fatura = faturaId ? faturasById.get(faturaId) ?? null : null;
      return !["PAGA", "CANCELADA"].includes(upper(fatura?.status));
    })
    .map((row) => {
      const competenciaLanc = textOrNull(row.competencia) ?? competenciaInicio;
      const conta = contasById.get(Number(row.conta_conexao_id));
      const faturaId = faturaIdByLancamentoId.get(Number(row.id)) ?? null;
      const fatura = faturaId ? faturasById.get(faturaId) ?? null : null;
      const valorNominal = Number(row.valor_centavos ?? 0);
      const dataVencimento = textOrNull(fatura?.data_vencimento);
      const statusOperacional = classificarStatusOperacionalCobranca({
        status_cobranca: textOrNull(row.status),
        data_vencimento: dataVencimento,
        valor_centavos: valorNominal,
        valor_pago_centavos: 0,
        saldo_aberto_centavos: valorNominal,
      });
      const pessoaId = conta?.responsavel_financeiro_pessoa_id ?? conta?.pessoa_titular_id ?? null;
      const pessoaNome = pessoaId
        ? pessoasById.get(pessoaId) ?? `Pessoa #${pessoaId}`
        : textOrNull(conta?.descricao_exibicao) ?? "Pessoa nao identificada";
      const pessoaLabel = montarPessoaLabel(pessoaNome, pessoaId);
      const neofinSituacao: NeofinSituacaoOperacional =
        textOrNull(fatura?.neofin_invoice_id)
          ? "VINCULADA"
          : ["FECHADA", "EM_ATRASO"].includes(upper(fatura?.status))
            ? "FALHA_INTEGRACAO"
            : "NAO_VINCULADA";
      const neofinStatus = inferirNeofinStatusCobranca(
        textOrNull(fatura?.neofin_invoice_id),
        statusOperacional,
        neofinSituacao,
      );
      return montarDashboardFinanceiroComposicaoItem({
        competencia: competenciaLanc,
        cobranca_id: null,
        lancamento_id: Number(row.id),
        cobranca_key: `LANCAMENTO:${row.id}`,
        cobranca_fonte: "LANCAMENTO",
        pessoa_id: pessoaId,
        pessoa_nome: pessoaNome,
        pessoa_label: pessoaLabel,
        conta_conexao_id: conta?.id ?? Number(row.conta_conexao_id),
        conta_interna_id: conta?.id ?? Number(row.conta_conexao_id),
        tipo_conta: textOrNull(conta?.tipo_conta),
        tipo_conta_label: null,
        origem_tipo: upper(row.origem_sistema).startsWith("MATRICULA") ? "MATRICULA" : textOrNull(row.origem_sistema),
        origem_subtipo: upper(row.origem_sistema).startsWith("MATRICULA") ? "CARTAO_CONEXAO" : null,
        origem_id: Number(row.origem_id ?? 0) || null,
        origem_lancamento: textOrNull(row.origem_sistema),
        origem_fatura: textOrNull(fatura?.status),
        descricao: textOrNull(row.descricao) ?? "Lancamento futuro da Conta Interna",
        referencia: textOrNull(row.referencia_item) ?? `lancamento:${row.id}`,
        status_operacional: statusOperacional as StatusOperacionalCobranca,
        status_bruto: textOrNull(row.status),
        status_original: textOrNull(row.status),
        valor_nominal_centavos: valorNominal,
        valor_recebido_confirmado_centavos: 0,
        valor_pendente_base_centavos: valorNominal,
        data_vencimento: dataVencimento,
        data_pagamento: null,
        neofin_status: neofinStatus,
        neofin_label: montarNeofinLabel(neofinStatus),
        neofin_situacao_operacional: neofinSituacao,
        fatura_id: fatura?.id ?? null,
        fatura_competencia: textOrNull(fatura?.periodo_referencia) ?? competenciaLanc,
        fatura_status: textOrNull(fatura?.status),
        fatura_url: fatura?.id ? `/admin/financeiro/credito-conexao/faturas/${fatura.id}` : null,
        dias_em_atraso: calcularDiasAtraso(dataVencimento),
        created_at: textOrNull(row.created_at),
        updated_at: textOrNull(row.updated_at),
        cancelado: upper(row.status) === "CANCELADO",
        inativo: conta?.ativo === false,
        gerado_antecipadamente: compareCompetenciaAsc(competenciaLanc, competenciaBase) > 0,
      });
    });

  const itensOperacionaisPorCobrancaId = new Map(
    itensOperacionais
      .filter((item) => item.cobranca_fonte !== "COBRANCA_AVULSA" && typeof item.cobranca_id === "number")
      .map((item) => [Number(item.cobranca_id), item] as const),
  );
  const itensOperacionaisPorAvulsaId = new Map(
    itensOperacionais
      .filter((item) => item.cobranca_fonte === "COBRANCA_AVULSA" && typeof item.cobranca_id === "number")
      .map((item) => [Number(item.cobranca_id), item] as const),
  );

  const itensRecebimentosCanonicos = recebimentosRecentes
    .map((row) => {
      const cobrancaId = Number(row.cobranca_id ?? 0);
      const baseItem = itensOperacionaisPorCobrancaId.get(cobrancaId);
      const valorRecebido = Number(row.valor_centavos ?? 0);
      const dataPagamento = textOrNull(row.data_pagamento)?.slice(0, 10) ?? null;

      if (!baseItem || valorRecebido <= 0 || !dataPagamento) return null;

      return montarDashboardFinanceiroRecebimentoItem(baseItem, {
        recebimento_id: Number(row.id),
        cobranca_key: `${baseItem.cobranca_key}:RECEBIMENTO:${row.id}`,
        valor_recebido_centavos: valorRecebido,
        data_pagamento: dataPagamento,
        origem_recebimento_sistema: textOrNull(row.origem_sistema),
        forma_pagamento_codigo: textOrNull(row.forma_pagamento_codigo),
        metodo_pagamento: textOrNull(row.metodo_pagamento),
        referencia: textOrNull(row.observacoes) ?? `recebimento:${row.id}`,
      });
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const itensRecebimentosAvulsos = avulsasPagasRecentes
    .filter((row) => belongsToTipoConta(Number(row.pessoa_id ?? 0) || null, tipoConta, tiposContaPorPessoa))
    .map((row) => {
      const avulsaId = Number(row.id);
      const baseItem = itensOperacionaisPorAvulsaId.get(avulsaId);
      const valorRecebido = Number(row.valor_pago_centavos ?? 0) || Number(row.valor_centavos ?? 0);
      const dataPagamento = textOrNull(row.pago_em)?.slice(0, 10) ?? null;

      if (!baseItem || valorRecebido <= 0 || !dataPagamento) return null;

      return montarDashboardFinanceiroRecebimentoItem(baseItem, {
        recebimento_id: avulsaId,
        cobranca_key: `${baseItem.cobranca_key}:RECEBIMENTO_AVULSA:${row.id}`,
        valor_recebido_centavos: valorRecebido,
        data_pagamento: dataPagamento,
        origem_recebimento_sistema: "COBRANCA_AVULSA",
        forma_pagamento_codigo: textOrNull(row.forma_pagamento),
        metodo_pagamento: textOrNull(row.forma_pagamento),
        referencia: textOrNull(row.observacao) ?? `recebimento_avulsa:${row.id}`,
      });
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const payloadBase = montarDashboardFinanceiroMensalPayload({
    items: [...itensOperacionais, ...itensLancamentosFuturos],
    receiptItems: [...itensRecebimentosCanonicos, ...itensRecebimentosAvulsos],
    competenciaSelecionada,
    competenciaInicio,
    competenciaFim,
    limite,
    tipoConta,
    competenciaAtualReal: competenciaBase,
    todayIso: hojeIso,
  });
  const payload: DashboardFinanceiroMensalResponse = {
    ...payloadBase,
    destaques: criarDestaques(competenciaSelecionada, payloadBase.cards),
  };

  return NextResponse.json({ ok: true, ...payload }, { status: 200 });
}
