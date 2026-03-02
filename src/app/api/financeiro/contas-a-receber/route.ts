import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type ContasReceberQuery = {
  situacao?: string;
  status?: string;
  bucket?: string;
  competencia?: string;
  vencimento_inicio?: string;
  vencimento_fim?: string;
  somente_abertas?: string;
  page?: string;
  page_size?: string;
};

const BUCKETS_VALIDOS = new Set([
  "VENCIDA",
  "A_VENCER_7",
  "A_VENCER_30",
  "FUTURA",
  "SEM_VENCIMENTO",
  "QUITADA_OU_ZERO",
]);

const SITUACOES_VALIDAS = new Set(["QUITADA", "EM_ABERTO", "VENCIDA"]);

function isDateLike(value?: string): boolean {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isAnoMes(value?: string): boolean {
  return typeof value === "string" && /^\d{4}-\d{2}$/.test(value);
}

export async function GET(req: NextRequest) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;

  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(req.url);

  const q: ContasReceberQuery = {
    situacao: searchParams.get("situacao") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    bucket: searchParams.get("bucket") ?? undefined,
    competencia: searchParams.get("competencia") ?? undefined,
    vencimento_inicio: searchParams.get("vencimento_inicio") ?? undefined,
    vencimento_fim: searchParams.get("vencimento_fim") ?? undefined,
    somente_abertas: searchParams.get("somente_abertas") ?? undefined,
    page: searchParams.get("page") ?? "1",
    page_size: searchParams.get("page_size") ?? "30",
  };

  if (q.bucket && !BUCKETS_VALIDOS.has(q.bucket)) {
    return NextResponse.json({ ok: false, error: "bucket_invalido" }, { status: 400 });
  }

  if (q.situacao && !SITUACOES_VALIDAS.has(q.situacao)) {
    return NextResponse.json({ ok: false, error: "situacao_invalida" }, { status: 400 });
  }

  if (q.competencia && !isAnoMes(q.competencia)) {
    return NextResponse.json({ ok: false, error: "competencia_invalida" }, { status: 400 });
  }

  if (q.vencimento_inicio && !isDateLike(q.vencimento_inicio)) {
    return NextResponse.json({ ok: false, error: "vencimento_inicio_invalido" }, { status: 400 });
  }

  if (q.vencimento_fim && !isDateLike(q.vencimento_fim)) {
    return NextResponse.json({ ok: false, error: "vencimento_fim_invalido" }, { status: 400 });
  }

  const page = Math.max(parseInt(q.page ?? "1", 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(q.page_size ?? "30", 10) || 30, 1), 200);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("vw_financeiro_contas_receber_flat")
    .select("*", { count: "exact" })
    .order("data_vencimento", { ascending: true, nullsFirst: false })
    .order("cobranca_id", { ascending: false })
    .range(from, to);

  if (q.situacao) query = query.eq("situacao_saas", q.situacao);
  if (q.status) query = query.eq("status_cobranca", q.status);
  if (q.bucket) query = query.eq("bucket_vencimento", q.bucket);
  if (q.competencia) query = query.eq("competencia_ano_mes", q.competencia);
  if (q.vencimento_inicio) query = query.gte("data_vencimento", q.vencimento_inicio);
  if (q.vencimento_fim) query = query.lte("data_vencimento", q.vencimento_fim);
  if (q.somente_abertas === "1") query = query.gt("saldo_aberto_centavos", 0);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json(
      { ok: false, error: "erro_listar_contas_receber", details: error.message },
      { status: 500 }
    );
  }

  const totalAbertoCentavos = (data ?? []).reduce((acc: number, row: any) => {
    return acc + Number(row?.saldo_aberto_centavos ?? 0);
  }, 0);

  return NextResponse.json({
    ok: true,
    page,
    page_size: pageSize,
    total: count ?? 0,
    kpis: {
      total_aberto_centavos: totalAbertoCentavos,
    },
    itens: data ?? [],
  });
}
