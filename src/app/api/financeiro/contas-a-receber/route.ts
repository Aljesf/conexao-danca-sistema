import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import {
  listarContasReceberAuditoria,
  validarContasReceberInput,
  type ContasReceberAuditoriaInput,
} from "@/lib/financeiro/contas-receber-auditoria";
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
const VISOES_VALIDAS = new Set(["VENCIDAS", "AVENCER", "RECEBIDAS", "INCONSISTENCIAS"]);

function parsePositiveInt(value: string | null, fallback: number, min = 1, max = 200): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), min), max);
}

export async function GET(req: NextRequest) {
  const denied = await guardApiByRole(req);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const visao = (searchParams.get("visao") ?? "VENCIDAS").toUpperCase();
  const situacao = searchParams.get("situacao");
  const status = searchParams.get("status");
  const bucket = searchParams.get("bucket");

  if (bucket && !BUCKETS_VALIDOS.has(bucket)) {
    return NextResponse.json({ ok: false, error: "bucket_invalido" }, { status: 400 });
  }

  if (situacao && !SITUACOES_VALIDAS.has(situacao)) {
    return NextResponse.json({ ok: false, error: "situacao_invalida" }, { status: 400 });
  }

  const input: ContasReceberAuditoriaInput = {
    visao: VISOES_VALIDAS.has(visao) ? visao : "VENCIDAS",
    situacao: situacao ?? undefined,
    status: status ?? undefined,
    bucket: bucket ?? undefined,
    competencia: searchParams.get("competencia") ?? undefined,
    vencimentoInicio: searchParams.get("vencimento_inicio") ?? undefined,
    vencimentoFim: searchParams.get("vencimento_fim") ?? undefined,
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
    const payload = await listarContasReceberAuditoria(supabase, input);

    return NextResponse.json({
      ok: true,
      ...payload,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "erro_listar_contas_receber";
    return NextResponse.json({ ok: false, error: "erro_listar_contas_receber", details: message }, { status: 500 });
  }
}
