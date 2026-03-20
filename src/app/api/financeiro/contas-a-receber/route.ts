import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import {
  listarContasReceberAuditoria,
  listarContasReceberAuditoriaFallback,
  listarPerdasCancelamentoDetalhadas,
  validarContasReceberInput,
  type ContasReceberAuditoriaInput,
} from "@/lib/financeiro/contas-receber-auditoria";
import { montarPayloadContasReceberVencidasCanonico } from "@/lib/financeiro/contas-receber-canonico";
import {
  normalizeContasReceberOrdenacao,
  normalizeContasReceberTipoPeriodo,
  normalizeContasReceberVisao,
} from "@/lib/financeiro/contas-receber-view-config";
import { isMissingExpurgoColumnError, logExpurgoMigrationWarning } from "@/lib/financeiro/expurgo-compat";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

const BUCKETS_VALIDOS = new Set([
  "VENCIDA",
  "A_VENCER_7",
  "A_VENCER_30",
  "FUTURA",
  "SEM_VENCIMENTO",
  "QUITADA_OU_ZERO",
]);

const SITUACOES_VALIDAS = new Set(["QUITADA", "EM_ABERTO", "VENCIDA"]);
const CONTEXTOS_VALIDOS = new Set(["ESCOLA", "CAFE", "LOJA", "OUTRO"]);

function buildMonthRange(ano: string, mes: string): { inicio: string; fim: string } {
  const startDate = new Date(Date.UTC(Number(ano), Number(mes) - 1, 1));
  const endDate = new Date(Date.UTC(Number(ano), Number(mes), 0));
  return {
    inicio: startDate.toISOString().slice(0, 10),
    fim: endDate.toISOString().slice(0, 10),
  };
}

function buildYearRange(ano: string): { inicio: string; fim: string } {
  return {
    inicio: `${ano}-01-01`,
    fim: `${ano}-12-31`,
  };
}

function parsePositiveInt(value: string | null, fallback: number, min = 1, max = 200): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), min), max);
}

function summarizeError(error: unknown): { message: string; stack: string | null } {
  if (!(error instanceof Error)) {
    return { message: "erro_desconhecido", stack: null };
  }

  return {
    message: error.message,
    stack: error.stack
      ? error.stack
          .split("\n")
          .slice(0, 4)
          .map((line) => line.trim())
          .join(" | ")
      : null,
  };
}

function logRouteError(stage: string, error: unknown) {
  const summary = summarizeError(error);
  console.error("[/api/financeiro/contas-a-receber]", {
    route: "/api/financeiro/contas-a-receber",
    stage,
    message: summary.message,
    stack: summary.stack,
  });
}

export async function GET(req: NextRequest) {
  const denied = await guardApiByRole(req);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const visao = normalizeContasReceberVisao(searchParams.get("visao"));
  const tipoPeriodo = normalizeContasReceberTipoPeriodo(searchParams.get("tipo_periodo"));
  const ordenacao = normalizeContasReceberOrdenacao(searchParams.get("ordenacao"), visao);
  const situacao = searchParams.get("situacao");
  const status = searchParams.get("status");
  const bucket = searchParams.get("bucket");
  const contexto = (searchParams.get("contexto") ?? "").toUpperCase();
  const ano = searchParams.get("ano") ?? undefined;
  const mes = searchParams.get("mes") ?? undefined;
  const competenciaInicio = searchParams.get("competencia_inicio") ?? undefined;
  const competenciaFim = searchParams.get("competencia_fim") ?? undefined;
  let vencimentoInicio = searchParams.get("vencimento_inicio") ?? undefined;
  let vencimentoFim = searchParams.get("vencimento_fim") ?? undefined;
  let competencia = searchParams.get("competencia") ?? undefined;

  if (bucket && !BUCKETS_VALIDOS.has(bucket)) {
    return NextResponse.json({ ok: false, error: "bucket_invalido" }, { status: 400 });
  }

  if (situacao && !SITUACOES_VALIDAS.has(situacao)) {
    return NextResponse.json({ ok: false, error: "situacao_invalida" }, { status: 400 });
  }

  if (contexto && contexto !== "TODOS" && !CONTEXTOS_VALIDOS.has(contexto)) {
    return NextResponse.json({ ok: false, error: "contexto_invalido" }, { status: 400 });
  }

  if (tipoPeriodo === "MES_ANO" && ano && mes) {
    const range = buildMonthRange(ano, mes);
    vencimentoInicio = range.inicio;
    vencimentoFim = range.fim;
  }

  if (tipoPeriodo === "ANO_INTEIRO" && ano) {
    const range = buildYearRange(ano);
    vencimentoInicio = range.inicio;
    vencimentoFim = range.fim;
  }

  if (tipoPeriodo === "COMPETENCIA" && competenciaInicio && competenciaFim && competenciaInicio === competenciaFim) {
    competencia = competenciaInicio;
  }

  const input: ContasReceberAuditoriaInput = {
    visao,
    tipoPeriodo,
    ordenacao,
    situacao: situacao ?? undefined,
    status: status ?? undefined,
    bucket: bucket ?? undefined,
    contexto: contexto && contexto !== "TODOS" ? contexto : undefined,
    competencia,
    competenciaInicio,
    competenciaFim,
    ano,
    mes,
    vencimentoInicio,
    vencimentoFim,
    somenteAbertas: searchParams.get("somente_abertas") === "1",
    q: searchParams.get("q") ?? undefined,
    page: parsePositiveInt(searchParams.get("page"), 1, 1, 10000),
    pageSize: parsePositiveInt(searchParams.get("page_size"), 50, 1, 200),
    detalheCobrancaId: searchParams.get("detalhe_cobranca_id")
      ? parsePositiveInt(searchParams.get("detalhe_cobranca_id"), 0, 1, 100000000)
      : null,
  };

  const validationError = validarContasReceberInput(input);
  if (validationError) {
    return NextResponse.json({ ok: false, error: validationError }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const payload =
      visao === "VENCIDAS"
        ? await montarPayloadContasReceberVencidasCanonico(
            supabase,
            input,
            await listarPerdasCancelamentoDetalhadas(supabase).catch(() => []),
          )
        : await listarContasReceberAuditoria(supabase, input);

    return NextResponse.json({
      ok: true,
      ...payload,
    });
  } catch (error: unknown) {
    if (isMissingExpurgoColumnError(error)) {
      logExpurgoMigrationWarning("/api/financeiro/contas-a-receber", error);
    }
    logRouteError("payload_principal", error);

    try {
      const supabase = getSupabaseAdmin();
      const payload = await listarContasReceberAuditoriaFallback(supabase, input);

      return NextResponse.json({
        ok: true,
        degraded: true,
        warning: "contas_receber_em_fallback_legacy",
        ...payload,
      });
    } catch (fallbackError: unknown) {
      logRouteError("payload_fallback", fallbackError);
      return NextResponse.json({ ok: false, error: "erro_listar_contas_receber" }, { status: 500 });
    }
  }
}
