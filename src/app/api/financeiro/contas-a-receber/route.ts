import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type ContasReceberQuery = {
  visao?: string;
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
const VISOES_VALIDAS = new Set(["VENCIDAS", "AVENCER", "RECEBIDAS", "INCONSISTENCIAS"]);

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
    visao: searchParams.get("visao") ?? "VENCIDAS",
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

  const visao = String(q.visao ?? "VENCIDAS").toUpperCase();
  const visaoSaas = VISOES_VALIDAS.has(visao) ? visao : "VENCIDAS";

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
    .order("vencimento", { ascending: true, nullsFirst: false })
    .order("cobranca_id", { ascending: false })
    .range(from, to);

  if (q.situacao) query = query.eq("situacao_saas", q.situacao);
  if (q.status) query = query.eq("status_cobranca", q.status);
  if (q.bucket) query = query.eq("bucket_vencimento", q.bucket);
  if (q.competencia) query = query.eq("competencia_ano_mes", q.competencia);
  if (q.vencimento_inicio) query = query.gte("vencimento", q.vencimento_inicio);
  if (q.vencimento_fim) query = query.lte("vencimento", q.vencimento_fim);

  switch (visaoSaas) {
    case "VENCIDAS": {
      query = query.eq("situacao_saas", "VENCIDA").gt("saldo_aberto_centavos", 0);
      break;
    }
    case "AVENCER": {
      query = query.eq("situacao_saas", "EM_ABERTO").gt("saldo_aberto_centavos", 0);
      break;
    }
    case "RECEBIDAS": {
      query = query.eq("situacao_saas", "QUITADA");
      break;
    }
    case "INCONSISTENCIAS": {
      const { data: inconsistentes, error: inconsistentesErr } = await supabase
        .from("vw_financeiro_cobrancas_inconsistentes")
        .select("cobranca_id")
        .limit(5000);

      if (!inconsistentesErr) {
        const ids = (inconsistentes ?? [])
          .map((row: any) => Number(row?.cobranca_id))
          .filter((id: number) => Number.isFinite(id) && id > 0);

        if (ids.length === 0) {
          return NextResponse.json({
            ok: true,
            visao: visaoSaas,
            page,
            page_size: pageSize,
            total: 0,
            kpis: {
              total_aberto_centavos: 0,
            },
            itens: [],
          });
        }

        query = query.in("cobranca_id", ids);
      } else {
        query = query.gt("saldo_aberto_centavos", 0).ilike("status_cobranca", "CANCELADA");
      }
      break;
    }
    default: {
      query = query.gt("saldo_aberto_centavos", 0);
      break;
    }
  }

  if (q.somente_abertas === "1" && visaoSaas !== "RECEBIDAS") {
    query = query.gt("saldo_aberto_centavos", 0);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json(
      { ok: false, error: "erro_listar_contas_receber", details: error.message },
      { status: 500 }
    );
  }

  const pessoaIds = Array.from(
    new Set(
      (data ?? [])
        .map((row: any) => Number(row?.pessoa_id))
        .filter((id: number) => Number.isFinite(id) && id > 0)
    )
  );

  let pessoasMap: Record<string, { id: number; nome: string | null }> = {};

  if (pessoaIds.length > 0) {
    const { data: pessoas } = await supabase.from("pessoas").select("id,nome").in("id", pessoaIds);
    if (Array.isArray(pessoas)) {
      pessoasMap = pessoas.reduce((acc: Record<string, { id: number; nome: string | null }>, pessoa: any) => {
        acc[String(pessoa.id)] = { id: Number(pessoa.id), nome: pessoa.nome ?? null };
        return acc;
      }, {});
    }
  }

  const itens = (data ?? []).map((row: any) => {
    const vencimento = row?.vencimento ?? row?.data_vencimento ?? null;
    const valorCentavos = Number(row?.valor_centavos ?? row?.valor_total_centavos ?? 0);
    return {
      ...row,
      vencimento,
      data_vencimento: vencimento, // compatibilidade temporária com UI legada
      valor_centavos: valorCentavos,
      valor_total_centavos: valorCentavos, // compatibilidade temporária com UI legada
      pessoa_nome: pessoasMap[String(row?.pessoa_id)]?.nome ?? null,
    };
  });

  const totalAbertoCentavos = itens.reduce((acc: number, row: any) => {
    return acc + Number(row?.saldo_aberto_centavos ?? 0);
  }, 0);

  return NextResponse.json({
    ok: true,
    visao: visaoSaas,
    page,
    page_size: pageSize,
    total: count ?? 0,
    kpis: {
      total_aberto_centavos: totalAbertoCentavos,
    },
    itens,
  });
}
