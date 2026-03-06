import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { formatBRLFromCents } from "@/lib/formatters/money";
import {
  agruparCobrancasPorCompetencia,
  classificarStatusOperacionalCobranca,
  formatarCompetenciaLabel,
  inferirNeofinStatusCobranca,
  montarNeofinLabel,
  montarPessoaLabel,
  type CobrancasMensaisResponse,
  type CobrancaOperacionalItem,
} from "@/lib/financeiro/creditoConexao/cobrancas";

type FaturaAlunoRow = {
  id: number;
  periodo_referencia: string | null;
  status: string | null;
  data_vencimento: string | null;
  cobranca_id: number | null;
  neofin_invoice_id: string | null;
  conta: {
    id: number;
    tipo_conta: string | null;
    pessoa_titular_id: number | null;
  } | null;
};

type CobrancaOperacionalRow = {
  cobranca_id: number;
  pessoa_id: number | null;
  pessoa_nome: string | null;
  competencia_ano_mes: string | null;
  data_vencimento: string | null;
  status_cobranca: string | null;
  origem_tipo: string | null;
  origem_subtipo: string | null;
  origem_id: number | null;
  descricao: string | null;
  valor_centavos: number | null;
  valor_pago_centavos: number | null;
  saldo_aberto_centavos: number | null;
  dias_atraso: number | null;
  data_pagamento: string | null;
  neofin_charge_id: string | null;
  link_pagamento: string | null;
  linha_digitavel: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const ORIGEM_TIPOS_COMPATIVEIS = ["FATURA_CREDITO_CONEXAO", "CREDITO_CONEXAO_FATURA"];

function toInt(value: string | null, fallback: number): number {
  const parsed = value ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function toNumber(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : 0;
}

function toText(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function isCompetencia(value: string | null): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}$/.test(value);
}

function resolverCompetencia(
  competencia: string | null,
  competenciaFatura: string | null,
  dataVencimento: string | null,
): string {
  if (isCompetencia(competencia)) return competencia;
  if (isCompetencia(competenciaFatura)) return competenciaFatura;
  if (typeof dataVencimento === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dataVencimento)) {
    return dataVencimento.slice(0, 7);
  }

  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 7);
}

function buildOrigemReferenciaLabel(fatura: FaturaAlunoRow, cobranca: CobrancaOperacionalRow, competencia: string): string {
  const descricao = toText(cobranca.descricao);
  if (descricao) return descricao;
  if (Number.isFinite(fatura.id)) return `Fatura #${fatura.id} - Competencia ${competencia}`;
  if (cobranca.origem_tipo && typeof cobranca.origem_id === "number") {
    return `${cobranca.origem_tipo} #${cobranca.origem_id}`;
  }
  return "Cobranca operacional";
}

function buildFiltroNeofin(item: CobrancaOperacionalItem, filtro: string): boolean {
  if (filtro === "COM_NEOFIN") return item.neofin_status !== "SEM_NEOFIN";
  if (filtro === "SEM_NEOFIN") return item.neofin_status === "SEM_NEOFIN";
  return true;
}

function buildFiltroStatus(item: CobrancaOperacionalItem, filtro: string): boolean {
  if (filtro === "TODOS") return true;
  return item.status_operacional === filtro;
}

function matchesQuery(item: CobrancaOperacionalItem, query: string): boolean {
  if (!query) return true;

  const normalized = query.toLowerCase();
  return [
    item.pessoa_nome,
    item.pessoa_label,
    item.origem_referencia_label,
    item.competencia_ano_mes,
    item.neofin_charge_id ?? "",
    item.status_cobranca ?? "",
    item.fatura_id ? String(item.fatura_id) : "",
    String(item.cobranca_id),
    item.pessoa_id ? String(item.pessoa_id) : "",
  ].some((value) => value.toLowerCase().includes(normalized));
}

function criarResumoGeral(items: CobrancaOperacionalItem[]): CobrancasMensaisResponse["resumo_geral"] {
  return items.reduce<CobrancasMensaisResponse["resumo_geral"]>(
    (acc, item) => {
      acc.total_registros += 1;
      acc.total_valor_centavos += toNumber(item.valor_centavos);
      acc.total_pago_centavos += toNumber(item.valor_pago_centavos);
      acc.total_pendente_centavos += toNumber(item.saldo_aberto_centavos);

      if (item.status_operacional === "PENDENTE_VENCIDO") {
        acc.total_vencido_centavos += toNumber(item.saldo_aberto_centavos);
      }

      if (item.status_operacional === "PENDENTE_A_VENCER") {
        acc.total_a_vencer_centavos += toNumber(item.saldo_aberto_centavos);
      }

      if (item.neofin_status !== "SEM_NEOFIN" && item.saldo_aberto_centavos > 0) {
        acc.total_neofin_centavos += toNumber(item.saldo_aberto_centavos);
      }

      return acc;
    },
    {
      total_registros: 0,
      total_valor_centavos: 0,
      total_pago_centavos: 0,
      total_pendente_centavos: 0,
      total_vencido_centavos: 0,
      total_a_vencer_centavos: 0,
      total_neofin_centavos: 0,
    },
  );
}

function escolherCobrancaCanonica(
  fatura: FaturaAlunoRow,
  porId: Map<number, CobrancaOperacionalRow>,
  porFaturaOrigem: Map<number, CobrancaOperacionalRow[]>,
): CobrancaOperacionalRow | null {
  if (typeof fatura.cobranca_id === "number" && Number.isFinite(fatura.cobranca_id)) {
    const direta = porId.get(fatura.cobranca_id);
    if (direta) return direta;
  }

  const candidatas = porFaturaOrigem.get(fatura.id) ?? [];
  return candidatas[0] ?? null;
}

export async function GET(req: NextRequest) {
  const denied = await guardApiByRole(req as Request);
  if (denied) return denied;

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;
  const url = new URL(req.url);

  const q = (url.searchParams.get("q") ?? "").trim();
  const competencia = (url.searchParams.get("competencia") ?? "").trim();
  const statusOperacional = (url.searchParams.get("status_operacional") ?? "TODOS").trim().toUpperCase();
  const statusNeofin = (url.searchParams.get("status_neofin") ?? "TODOS").trim().toUpperCase();
  const pagina = Math.max(1, toInt(url.searchParams.get("page"), 1));
  const limite = Math.min(
    Math.max(toInt(url.searchParams.get("limite") ?? url.searchParams.get("page_size"), 6), 1),
    24,
  );

  if (competencia && !isCompetencia(competencia)) {
    return NextResponse.json({ ok: false, error: "competencia_invalida" }, { status: 400 });
  }

  let faturasQuery = supabase
    .from("credito_conexao_faturas")
    .select(
      `
      id,
      periodo_referencia,
      status,
      data_vencimento,
      cobranca_id,
      neofin_invoice_id,
      conta:credito_conexao_contas!inner(
        id,
        tipo_conta,
        pessoa_titular_id
      )
      `,
    )
    .eq("conta.tipo_conta", "ALUNO")
    .order("periodo_referencia", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false });

  if (competencia) {
    faturasQuery = faturasQuery.eq("periodo_referencia", competencia);
  }

  const { data: faturasData, error: faturasError } = await faturasQuery;

  if (faturasError) {
    return NextResponse.json(
      { ok: false, error: "erro_buscar_faturas_aluno", detail: faturasError.message },
      { status: 500 },
    );
  }

  const faturas = ((faturasData ?? []) as unknown[]) as FaturaAlunoRow[];

  if (faturas.length === 0) {
    return NextResponse.json(
      {
        ok: true,
        resumo_geral: criarResumoGeral([]),
        meses: [],
        paginacao: {
          pagina,
          limite,
          total: 0,
        },
        competencias_disponiveis: [],
      } satisfies CobrancasMensaisResponse & { ok: true },
      { status: 200 },
    );
  }

  const faturaIds = faturas.map((fatura) => fatura.id).filter((id) => Number.isFinite(id));
  const cobrancaIdsDiretos = Array.from(
    new Set(
      faturas
        .map((fatura) => fatura.cobranca_id)
        .filter((id): id is number => typeof id === "number" && Number.isFinite(id)),
    ),
  );

  const camposOperacionais = [
    "cobranca_id",
    "pessoa_id",
    "pessoa_nome",
    "competencia_ano_mes",
    "data_vencimento",
    "status_cobranca",
    "origem_tipo",
    "origem_subtipo",
    "origem_id",
    "descricao",
    "valor_centavos",
    "valor_pago_centavos",
    "saldo_aberto_centavos",
    "dias_atraso",
    "data_pagamento",
    "neofin_charge_id",
    "link_pagamento",
    "linha_digitavel",
    "created_at",
    "updated_at",
  ].join(",");

  const cobrancasPorId = new Map<number, CobrancaOperacionalRow>();
  const cobrancasPorFaturaOrigem = new Map<number, CobrancaOperacionalRow[]>();

  if (cobrancaIdsDiretos.length > 0) {
    const { data: cobrancasDiretas, error: cobrancasDiretasError } = await supabase
      .from("vw_financeiro_cobrancas_operacionais")
      .select(camposOperacionais)
      .in("cobranca_id", cobrancaIdsDiretos);

    if (cobrancasDiretasError) {
      return NextResponse.json(
        { ok: false, error: "erro_buscar_cobrancas_diretas", detail: cobrancasDiretasError.message },
        { status: 500 },
      );
    }

    for (const raw of (cobrancasDiretas ?? []) as unknown[]) {
      const row = raw as CobrancaOperacionalRow;
      cobrancasPorId.set(row.cobranca_id, row);
    }
  }

  if (faturaIds.length > 0) {
    const { data: cobrancasPorOrigem, error: cobrancasPorOrigemError } = await supabase
      .from("vw_financeiro_cobrancas_operacionais")
      .select(camposOperacionais)
      .in("origem_tipo", ORIGEM_TIPOS_COMPATIVEIS)
      .in("origem_id", faturaIds)
      .order("created_at", { ascending: false, nullsFirst: false })
      .order("cobranca_id", { ascending: false });

    if (cobrancasPorOrigemError) {
      return NextResponse.json(
        { ok: false, error: "erro_buscar_cobrancas_origem", detail: cobrancasPorOrigemError.message },
        { status: 500 },
      );
    }

    for (const raw of (cobrancasPorOrigem ?? []) as unknown[]) {
      const row = raw as CobrancaOperacionalRow;
      cobrancasPorId.set(row.cobranca_id, row);

      if (typeof row.origem_id === "number" && Number.isFinite(row.origem_id)) {
        const existente = cobrancasPorFaturaOrigem.get(row.origem_id) ?? [];
        existente.push(row);
        cobrancasPorFaturaOrigem.set(row.origem_id, existente);
      }
    }
  }

  const today = new Date();
  const itens: CobrancaOperacionalItem[] = [];

  for (const fatura of faturas) {
    const cobranca = escolherCobrancaCanonica(fatura, cobrancasPorId, cobrancasPorFaturaOrigem);
    if (!cobranca) continue;

    const pessoaId = typeof cobranca.pessoa_id === "number" && Number.isFinite(cobranca.pessoa_id)
      ? cobranca.pessoa_id
      : fatura.conta?.pessoa_titular_id ?? null;
    const pessoaNomeReal = toText(cobranca.pessoa_nome);
    const pessoaNome = pessoaNomeReal ?? (pessoaId ? `Pessoa #${pessoaId}` : "Pessoa nao identificada");
    const competenciaFinal = resolverCompetencia(
      cobranca.competencia_ano_mes,
      fatura.periodo_referencia,
      cobranca.data_vencimento ?? fatura.data_vencimento,
    );
    const valorCentavos = toNumber(cobranca.valor_centavos);
    const valorPagoCentavos = toNumber(cobranca.valor_pago_centavos);
    const saldoAbertoCentavos = toNumber(cobranca.saldo_aberto_centavos);
    const statusOperacionalItem = classificarStatusOperacionalCobranca(
      {
        status_cobranca: cobranca.status_cobranca,
        data_vencimento: cobranca.data_vencimento ?? fatura.data_vencimento,
        valor_centavos: valorCentavos,
        valor_pago_centavos: valorPagoCentavos,
        saldo_aberto_centavos: saldoAbertoCentavos,
      },
      today,
    );
    const neofinStatus = inferirNeofinStatusCobranca(
      cobranca.neofin_charge_id ?? fatura.neofin_invoice_id,
      statusOperacionalItem,
    );

    itens.push({
      cobranca_id: cobranca.cobranca_id,
      pessoa_id: pessoaId,
      pessoa_nome: pessoaNome,
      pessoa_label: montarPessoaLabel(pessoaNomeReal ?? pessoaNome, pessoaId),
      competencia_ano_mes: competenciaFinal,
      competencia_label: formatarCompetenciaLabel(competenciaFinal),
      data_vencimento: cobranca.data_vencimento ?? fatura.data_vencimento,
      valor_centavos: valorCentavos,
      valor_pago_centavos: valorPagoCentavos,
      saldo_aberto_centavos: saldoAbertoCentavos,
      valor_formatado: formatBRLFromCents(valorCentavos),
      status_cobranca: cobranca.status_cobranca,
      status_operacional: statusOperacionalItem,
      neofin_status: neofinStatus,
      neofin_label: montarNeofinLabel(neofinStatus),
      neofin_charge_id: cobranca.neofin_charge_id ?? fatura.neofin_invoice_id,
      origem_tipo: cobranca.origem_tipo,
      origem_subtipo: cobranca.origem_subtipo,
      origem_referencia_label: buildOrigemReferenciaLabel(fatura, cobranca, competenciaFinal),
      dias_em_atraso: toNumber(cobranca.dias_atraso),
      fatura_id: fatura.id,
      cobranca_url: `/admin/governanca/cobrancas/${cobranca.cobranca_id}`,
      fatura_url: `/admin/financeiro/credito-conexao/faturas/${fatura.id}`,
      data_pagamento: cobranca.data_pagamento,
      link_pagamento: cobranca.link_pagamento,
      linha_digitavel: cobranca.linha_digitavel,
    });
  }

  const itensFiltrados = itens.filter((item) => {
    const filtroCompetencia = !competencia || item.competencia_ano_mes === competencia;
    const filtroStatus = buildFiltroStatus(item, statusOperacional);
    const filtroNeofin = buildFiltroNeofin(item, statusNeofin);
    const filtroBusca = matchesQuery(item, q);
    return filtroCompetencia && filtroStatus && filtroNeofin && filtroBusca;
  });

  const resumoGeral = criarResumoGeral(itensFiltrados);
  const mesesAgrupados = agruparCobrancasPorCompetencia(itensFiltrados);
  const totalCompetencias = mesesAgrupados.length;
  const inicio = (pagina - 1) * limite;
  const mesesPaginados = mesesAgrupados.slice(inicio, inicio + limite);
  const competenciasDisponiveis = mesesAgrupados.map((mes) => ({
    competencia: mes.competencia,
    competencia_label: mes.competencia_label,
  }));

  return NextResponse.json(
    {
      ok: true,
      resumo_geral: resumoGeral,
      meses: mesesPaginados,
      paginacao: {
        pagina,
        limite,
        total: totalCompetencias,
      },
      competencias_disponiveis: competenciasDisponiveis,
    } satisfies CobrancasMensaisResponse & { ok: true },
    { status: 200 },
  );
}
