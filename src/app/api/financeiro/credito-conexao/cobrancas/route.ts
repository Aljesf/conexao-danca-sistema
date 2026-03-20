import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import {
  agruparCobrancasPorCompetencia,
  type CobrancasMensaisResponse,
  type CobrancaFonteOperacional,
  type CobrancaOperacionalItem,
} from "@/lib/financeiro/creditoConexao/cobrancas";
import { resolverCarteiraOperacionalPorCompetencia } from "@/lib/financeiro/competenciaAtiva/resolverCarteiraOperacionalPorCompetencia";
import { requireUser } from "@/lib/supabase/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type FaturaSugestaoRow = {
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
    descricao_exibicao: string | null;
  } | null;
};

const DEFAULT_LIMITE = 24;
const MAX_LIMITE = 36;

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

function normalizarFiltroNeofin(value: string): "TODOS" | "VINCULADA" | "NAO_VINCULADA" | "FALHA_INTEGRACAO" {
  const normalized = value.trim().toUpperCase();
  if (normalized === "COM_NEOFIN") return "VINCULADA";
  if (normalized === "SEM_NEOFIN") return "NAO_VINCULADA";
  if (normalized === "VINCULADA" || normalized === "NAO_VINCULADA" || normalized === "FALHA_INTEGRACAO") {
    return normalized;
  }
  return "TODOS";
}

function matchesQuery(item: CobrancaOperacionalItem, query: string): boolean {
  if (!query) return true;

  const normalized = query.toLowerCase();
  return [
    item.pessoa_nome,
    item.pessoa_label,
    item.origem_referencia_label,
    item.competencia_ano_mes,
    item.tipo_cobranca_label,
    item.neofin_label,
    item.neofin_situacao_label,
    item.neofin_charge_id ?? "",
    item.neofin_invoice_id ?? "",
    item.status_cobranca ?? "",
    item.status_bruto ?? "",
    item.fatura_id ? String(item.fatura_id) : "",
    item.cobranca_key,
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

      if (item.neofin_situacao_operacional === "VINCULADA" && item.saldo_aberto_centavos > 0) {
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

function competenciaToIndex(competencia: string): number {
  const [yearRaw, monthRaw] = competencia.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return Number.MAX_SAFE_INTEGER;
  return year * 12 + (month - 1);
}

function distanciaCompetencia(base: string, target: string): number {
  return Math.abs(competenciaToIndex(base) - competenciaToIndex(target));
}

function prioridadeStatusFatura(status: string | null): number {
  switch (toText(status)?.toUpperCase()) {
    case "ABERTA":
      return 0;
    case "FECHADA":
      return 1;
    case "EM_ATRASO":
      return 2;
    case "PAGA":
      return 3;
    case "CANCELADA":
      return 4;
    default:
      return 9;
  }
}

function competenciaAtualIso(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 7);
}

function buildFaturaSuggestions(
  item: CobrancaOperacionalItem,
  faturasPessoa: FaturaSugestaoRow[],
): number[] {
  if (!item.pessoa_id || faturasPessoa.length === 0) return [];

  const ordenadas = [...faturasPessoa]
    .filter((fatura) => typeof fatura.id === "number" && Number.isFinite(fatura.id))
    .sort((a, b) => {
      const aCompetencia = isCompetencia(a.periodo_referencia)
        ? a.periodo_referencia
        : a.data_vencimento?.slice(0, 7) ?? item.competencia_ano_mes;
      const bCompetencia = isCompetencia(b.periodo_referencia)
        ? b.periodo_referencia
        : b.data_vencimento?.slice(0, 7) ?? item.competencia_ano_mes;
      const aMesmaCompetencia = aCompetencia === item.competencia_ano_mes ? 0 : 1;
      const bMesmaCompetencia = bCompetencia === item.competencia_ano_mes ? 0 : 1;
      if (aMesmaCompetencia !== bMesmaCompetencia) return aMesmaCompetencia - bMesmaCompetencia;

      const byDistance = distanciaCompetencia(item.competencia_ano_mes, aCompetencia)
        - distanciaCompetencia(item.competencia_ano_mes, bCompetencia);
      if (byDistance !== 0) return byDistance;

      const byStatus = prioridadeStatusFatura(a.status) - prioridadeStatusFatura(b.status);
      if (byStatus !== 0) return byStatus;

      return b.id - a.id;
    });

  const ids = new Set<number>();
  for (const fatura of ordenadas) {
    ids.add(fatura.id);
    if (ids.size >= 3) break;
  }

  return Array.from(ids);
}

function buildCobrancaUrl(item: {
  cobranca_fonte: CobrancaFonteOperacional;
  cobranca_id: number;
}): string | null {
  if (item.cobranca_fonte === "COBRANCA_AVULSA") {
    return `/administracao/financeiro/cobrancas-avulsas/${item.cobranca_id}`;
  }
  return `/admin/governanca/cobrancas/${item.cobranca_id}`;
}

export async function GET(req: NextRequest) {
  const denied = await guardApiByRole(req as Request);
  if (denied) return denied;

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const supabase = getSupabaseAdmin();
  const url = new URL(req.url);

  const q = (url.searchParams.get("q") ?? "").trim();
  const competencia = (url.searchParams.get("competencia") ?? "").trim();
  const statusOperacional = (url.searchParams.get("status_operacional") ?? "TODOS").trim().toUpperCase();
  const statusNeofin = normalizarFiltroNeofin(url.searchParams.get("status_neofin") ?? "TODOS");
  const pagina = Math.max(1, toInt(url.searchParams.get("page"), 1));
  const limite = Math.min(
    Math.max(toInt(url.searchParams.get("limite") ?? url.searchParams.get("page_size"), DEFAULT_LIMITE), 1),
    MAX_LIMITE,
  );

  if (competencia && !isCompetencia(competencia)) {
    return NextResponse.json({ ok: false, error: "competencia_invalida" }, { status: 400 });
  }

  const faturasQuery = supabase
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
        pessoa_titular_id,
        descricao_exibicao
      )
      `,
    )
    .eq("conta.tipo_conta", "ALUNO")
    .order("periodo_referencia", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false });

  let itens: CobrancaOperacionalItem[] = [];
  let faturasData: unknown[] | null = null;
  let faturasError: { message: string } | null = null;

  try {
    [itens, { data: faturasData, error: faturasError }] = await Promise.all([
      resolverCarteiraOperacionalPorCompetencia(supabase, {
        competencia,
        statusOperacional,
        statusNeofin,
      }),
      faturasQuery,
    ]);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "erro_buscar_carteira_operacional",
        detail: error instanceof Error ? error.message : "erro_desconhecido",
      },
      { status: 500 },
    );
  }

  if (faturasError) {
    return NextResponse.json(
      { ok: false, error: "erro_buscar_faturas_aluno", detail: faturasError.message },
      { status: 500 },
    );
  }

  const faturas = ((faturasData ?? []) as unknown[]) as FaturaSugestaoRow[];
  const faturasPorPessoa = new Map<number, FaturaSugestaoRow[]>();

  for (const fatura of faturas) {
    const pessoaId = fatura.conta?.pessoa_titular_id;
    if (typeof pessoaId !== "number" || !Number.isFinite(pessoaId)) continue;
    const existente = faturasPorPessoa.get(pessoaId) ?? [];
    existente.push(fatura);
    faturasPorPessoa.set(pessoaId, existente);
  }

  const itensEnriquecidos = itens.map((item) => {
    item.cobranca_url = buildCobrancaUrl({
      cobranca_fonte: item.cobranca_fonte,
      cobranca_id: item.cobranca_id,
    });
    item.sugestao_fatura_ids = buildFaturaSuggestions(item, faturasPorPessoa.get(item.pessoa_id ?? -1) ?? []);
    return item;
  });

  const itensFiltrados = itensEnriquecidos.filter((item) => matchesQuery(item, q));
  const resumoGeral = criarResumoGeral(itensFiltrados);
  const mesesAgrupados = agruparCobrancasPorCompetencia(itensFiltrados);
  const totalCompetencias = mesesAgrupados.length;
  const inicio = (pagina - 1) * limite;
  const mesesPaginados = mesesAgrupados.slice(inicio, inicio + limite);
  const competenciasDisponiveis = mesesAgrupados
    .map((mes) => ({
      competencia: mes.competencia,
      competencia_label: mes.competencia_label,
    }))
    .sort((a, b) => a.competencia.localeCompare(b.competencia));
  const competenciaAtual = competenciaAtualIso();
  const competenciaAtivaPadrao =
    competenciasDisponiveis.find((item) => item.competencia === competenciaAtual)?.competencia ??
    competenciasDisponiveis[0]?.competencia ??
    null;

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
      competencia_ativa_padrao: competenciaAtivaPadrao,
    } satisfies CobrancasMensaisResponse & { ok: true },
    { status: 200 },
  );
}
