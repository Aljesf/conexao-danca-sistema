import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";
import { guardApiByRole } from "@/lib/auth/roleGuard";

type FaturaAlunoRow = {
  id: number;
  periodo_referencia: string;
  status: string;
  data_fechamento: string | null;
  data_vencimento: string | null;
  conta: {
    id: number;
    tipo_conta: string;
    pessoa_titular_id: number | null;
    titular: { id: number; nome: string | null } | null;
  } | null;
};

type CobrancaOrigemRow = {
  id: number;
  origem_id: number | null;
  origem_tipo: string | null;
  status: string;
  vencimento: string | null;
  valor_centavos: number | null;
  neofin_charge_id: string | null;
  link_pagamento: string | null;
  linha_digitavel: string | null;
  created_at: string;
};

type Item = {
  fatura_id: number;
  periodo: string;
  fatura_status: string;
  data_fechamento: string | null;
  data_vencimento: string | null;
  pessoa_id: number | null;
  pessoa_nome: string | null;
  cobranca_id: number;
  cobranca_status: string;
  vencimento: string | null;
  valor_centavos: number | null;
  neofin_charge_id: string;
  link_pagamento: string | null;
  linha_digitavel: string | null;
  created_at: string;
};

const ORIGEM_TIPOS_COMPATIVEIS = ["FATURA_CREDITO_CONEXAO", "CREDITO_CONEXAO_FATURA"];

function toInt(v: string | null, fallback: number) {
  const n = v ? Number(v) : Number.NaN;
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export async function GET(req: NextRequest) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const statusCobranca = (url.searchParams.get("status") ?? "TODOS").toUpperCase();
  const statusFatura = (url.searchParams.get("fatura_status") ?? "TODOS").toUpperCase();
  const page = Math.max(1, toInt(url.searchParams.get("page"), 1));
  const pageSize = Math.min(Math.max(toInt(url.searchParams.get("page_size"), 25), 10), 100);

  // Passo 1: faturas do Cartao Conexao ALUNO.
  let faturasQuery = supabase
    .from("credito_conexao_faturas")
    .select(
      `
      id,
      periodo_referencia,
      status,
      data_fechamento,
      data_vencimento,
      conta:credito_conexao_contas!inner(
        id,
        tipo_conta,
        pessoa_titular_id,
        titular:pessoas(
          id,
          nome
        )
      )
      `,
    )
    .eq("conta.tipo_conta", "ALUNO")
    .order("data_fechamento", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false });

  if (statusFatura !== "TODOS") {
    faturasQuery = faturasQuery.eq("status", statusFatura);
  }

  const { data: faturasData, error: faturasErr } = await faturasQuery;
  if (faturasErr) {
    return NextResponse.json({ ok: false, error: "erro_buscar_faturas", detail: faturasErr.message }, { status: 500 });
  }

  const faturas = (faturasData ?? []) as FaturaAlunoRow[];
  if (faturas.length === 0) {
    return NextResponse.json({ ok: true, page, page_size: pageSize, total: 0, items: [] as Item[] }, { status: 200 });
  }

  const faturaIds = faturas.map((f) => Number(f.id)).filter((id) => Number.isFinite(id));

  // Passo 2: cobrancas por origem (somente consolidadas: neofin_charge_id nao nulo).
  let cobrancasQuery = supabase
    .from("cobrancas")
    .select(
      `
      id,
      origem_id,
      origem_tipo,
      status,
      vencimento,
      valor_centavos,
      neofin_charge_id,
      link_pagamento,
      linha_digitavel,
      created_at
      `,
    )
    .in("origem_tipo", ORIGEM_TIPOS_COMPATIVEIS)
    .in("origem_id", faturaIds)
    .not("neofin_charge_id", "is", null)
    .order("created_at", { ascending: false });

  if (statusCobranca !== "TODOS") {
    cobrancasQuery = cobrancasQuery.eq("status", statusCobranca);
  }

  const { data: cobrancasData, error: cobrancasErr } = await cobrancasQuery;
  if (cobrancasErr) {
    return NextResponse.json({ ok: false, error: "erro_buscar_cobrancas", detail: cobrancasErr.message }, { status: 500 });
  }

  const cobrancas = (cobrancasData ?? []) as CobrancaOrigemRow[];
  const cobrancaPorFatura = new Map<number, CobrancaOrigemRow>();
  for (const cobranca of cobrancas) {
    const origemId = Number(cobranca.origem_id);
    if (!Number.isFinite(origemId)) continue;
    // Mantem a mais recente por fatura (ordenacao created_at desc).
    if (!cobrancaPorFatura.has(origemId)) cobrancaPorFatura.set(origemId, cobranca);
  }

  let items: Item[] = [];
  for (const fatura of faturas) {
    const cobranca = cobrancaPorFatura.get(Number(fatura.id));
    if (!cobranca?.neofin_charge_id) continue;

    items.push({
      fatura_id: Number(fatura.id),
      periodo: fatura.periodo_referencia,
      fatura_status: fatura.status,
      data_fechamento: fatura.data_fechamento,
      data_vencimento: fatura.data_vencimento,
      pessoa_id: fatura.conta?.titular?.id ?? fatura.conta?.pessoa_titular_id ?? null,
      pessoa_nome: fatura.conta?.titular?.nome ?? null,
      cobranca_id: Number(cobranca.id),
      cobranca_status: cobranca.status,
      vencimento: cobranca.vencimento,
      valor_centavos: cobranca.valor_centavos,
      neofin_charge_id: String(cobranca.neofin_charge_id),
      link_pagamento: cobranca.link_pagamento,
      linha_digitavel: cobranca.linha_digitavel,
      created_at: cobranca.created_at,
    });
  }

  if (q) {
    items = items.filter((row) => {
      const pessoaNome = (row.pessoa_nome ?? "").toLowerCase();
      const periodo = (row.periodo ?? "").toLowerCase();
      const charge = (row.neofin_charge_id ?? "").toLowerCase();
      return (
        pessoaNome.includes(q) ||
        periodo.includes(q) ||
        charge.includes(q) ||
        String(row.fatura_id).includes(q) ||
        String(row.cobranca_id).includes(q)
      );
    });
  }

  const total = items.length;
  const from = (page - 1) * pageSize;
  const to = from + pageSize;
  const pagedItems = items.slice(from, to);

  return NextResponse.json(
    {
      ok: true,
      page,
      page_size: pageSize,
      total,
      items: pagedItems,
    },
    { status: 200 },
  );
}

