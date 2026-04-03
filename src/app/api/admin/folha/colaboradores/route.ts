import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type FolhaRow = {
  id: number | null;
  competencia_ano_mes: string;
  colaborador_id: number;
  colaborador_nome: string | null;
  status: string;
  data_fechamento: string | null;
  data_pagamento: string | null;
  observacoes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ColaboradorRow = {
  id: number;
  pessoa_id: number | null;
  ativo: boolean | null;
};

type PessoaRow = {
  id: number;
  nome: string | null;
};

function isCompetencia(value: string): boolean {
  return /^[0-9]{4}-[0-9]{2}$/.test(value);
}

function toInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Math.trunc(Number(value));
  }
  return null;
}

export async function GET(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;

  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(req.url);
  const competencia = searchParams.get("competencia");
  const status = String(searchParams.get("status") ?? "").trim().toUpperCase();
  const colaboradorIdRaw = searchParams.get("colaborador_id");

  if (!competencia || !isCompetencia(competencia)) {
    return NextResponse.json({ ok: false, error: "competencia_invalida" }, { status: 400 });
  }

  const colaboradorIdFiltro = toInt(colaboradorIdRaw);

  const [{ data: colaboradoresData, error: colaboradoresError }, { data: folhasData, error: folhasError }] =
    await Promise.all([
      supabase.from("colaboradores").select("id,pessoa_id,ativo"),
      supabase
        .from("folha_pagamento_colaborador")
        .select(
          "id,competencia_ano_mes,colaborador_id,status,data_fechamento,data_pagamento,observacoes,created_at,updated_at",
        )
        .eq("competencia_ano_mes", competencia),
    ]);

  if (colaboradoresError) {
    return NextResponse.json(
      { ok: false, error: "falha_listar_colaboradores", detail: colaboradoresError.message },
      { status: 500 },
    );
  }

  if (folhasError) {
    return NextResponse.json(
      { ok: false, error: "falha_listar_folhas", detail: folhasError.message },
      { status: 500 },
    );
  }

  const colaboradores = (colaboradoresData ?? []) as ColaboradorRow[];
  const folhas = (folhasData ?? []) as Array<{
    id: number;
    competencia_ano_mes: string;
    colaborador_id: number;
    status: string | null;
    data_fechamento: string | null;
    data_pagamento: string | null;
    observacoes: string | null;
    created_at: string | null;
    updated_at: string | null;
  }>;

  const pessoaIds = Array.from(
    new Set(colaboradores.map((row) => row.pessoa_id).filter((value): value is number => typeof value === "number")),
  );

  const [{ data: pessoasData }, { data: configData }, { data: pagamentosData }] = await Promise.all([
    pessoaIds.length
      ? supabase.from("pessoas").select("id,nome").in("id", pessoaIds)
      : Promise.resolve({ data: [] as PessoaRow[] }),
    supabase.from("colaborador_config_financeira").select("colaborador_id,gera_folha"),
    supabase
      .from("colaborador_pagamentos")
      .select("colaborador_id")
      .eq("competencia_ano_mes", competencia),
  ]);

  const pessoasById = new Map<number, string>();
  for (const pessoa of (pessoasData ?? []) as PessoaRow[]) {
    pessoasById.set(pessoa.id, pessoa.nome?.trim() || `Pessoa #${pessoa.id}`);
  }

  const configByColaboradorId = new Map<number, boolean>();
  for (const row of (configData ?? []) as Array<{ colaborador_id: number; gera_folha: boolean | null }>) {
    configByColaboradorId.set(row.colaborador_id, Boolean(row.gera_folha));
  }

  const folhaByColaboradorId = new Map<number, (typeof folhas)[number]>();
  for (const folha of folhas) {
    if (!folhaByColaboradorId.has(folha.colaborador_id)) {
      folhaByColaboradorId.set(folha.colaborador_id, folha);
    }
  }

  const pagamentosCompetenciaIds = new Set(
    ((pagamentosData ?? []) as Array<{ colaborador_id: number }>).map((row) => row.colaborador_id),
  );

  const colaboradorPessoaMap = new Map<number, number>();
  for (const colaborador of colaboradores) {
    if (typeof colaborador.pessoa_id === "number") {
      colaboradorPessoaMap.set(colaborador.id, colaborador.pessoa_id);
    }
  }

  const pessoaTitularIds = Array.from(colaboradorPessoaMap.values());
  const { data: contasData } = pessoaTitularIds.length
    ? await supabase
        .from("credito_conexao_contas")
        .select("id,pessoa_titular_id")
        .eq("tipo_conta", "COLABORADOR")
        .eq("ativo", true)
        .in("pessoa_titular_id", pessoaTitularIds)
    : { data: [] as Array<{ id: number; pessoa_titular_id: number | null }> };

  const contaIds = (contasData ?? [])
    .map((row) => Number(row.id))
    .filter((value) => Number.isFinite(value) && value > 0);
  const contaByPessoaId = new Map<number, number>();
  for (const conta of (contasData ?? []) as Array<{ id: number; pessoa_titular_id: number | null }>) {
    if (typeof conta.pessoa_titular_id === "number" && !contaByPessoaId.has(conta.pessoa_titular_id)) {
      contaByPessoaId.set(conta.pessoa_titular_id, conta.id);
    }
  }

  const { data: faturasData } = contaIds.length
    ? await supabase
        .from("credito_conexao_faturas")
        .select("conta_conexao_id,periodo_referencia")
        .eq("periodo_referencia", competencia)
        .in("conta_conexao_id", contaIds)
    : { data: [] as Array<{ conta_conexao_id: number; periodo_referencia: string | null }> };

  const contaIdsComFaturaCompetencia = new Set(
    ((faturasData ?? []) as Array<{ conta_conexao_id: number }>).map((row) => row.conta_conexao_id),
  );

  const rows = colaboradores
    .filter((colaborador) => (colaboradorIdFiltro ? colaborador.id === colaboradorIdFiltro : true))
    .filter((colaborador) => {
      const folha = folhaByColaboradorId.get(colaborador.id);
      const pessoaId = colaboradorPessoaMap.get(colaborador.id) ?? null;
      const contaId = pessoaId ? contaByPessoaId.get(pessoaId) ?? null : null;
      const temMovimentoCompetencia =
        Boolean(folha) ||
        pagamentosCompetenciaIds.has(colaborador.id) ||
        Boolean(contaId && contaIdsComFaturaCompetencia.has(contaId));
      const elegivel = Boolean(colaborador.ativo !== false) && (configByColaboradorId.get(colaborador.id) ?? false);
      return temMovimentoCompetencia || elegivel;
    })
    .map((colaborador) => {
      const folha = folhaByColaboradorId.get(colaborador.id) ?? null;
      const nome =
        (typeof colaborador.pessoa_id === "number" ? pessoasById.get(colaborador.pessoa_id) : null) ??
        `Colaborador #${colaborador.id}`;

      const row: FolhaRow = {
        id: folha?.id ?? null,
        competencia_ano_mes: competencia,
        colaborador_id: colaborador.id,
        colaborador_nome: nome,
        status: folha?.status ?? "NAO_INICIADA",
        data_fechamento: folha?.data_fechamento ?? null,
        data_pagamento: folha?.data_pagamento ?? null,
        observacoes: folha?.observacoes ?? null,
        created_at: folha?.created_at ?? null,
        updated_at: folha?.updated_at ?? null,
      };

      return row;
    })
    .filter((row) => (status ? row.status === status : true))
    .sort((a, b) => a.colaborador_nome?.localeCompare(b.colaborador_nome ?? "", "pt-BR") ?? 0);

  return NextResponse.json({ ok: true, data: rows });
}

export async function POST(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const supabase = getSupabaseAdmin();
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;

  if (!body) {
    return NextResponse.json({ ok: false, error: "payload_invalido" }, { status: 400 });
  }

  const competenciaRaw =
    typeof body.competencia_ano_mes === "string"
      ? body.competencia_ano_mes
      : typeof body.competencia === "string"
        ? body.competencia
        : null;
  const competencia = competenciaRaw?.trim() ?? "";
  const colaboradorId = toInt(body.colaborador_id);
  const observacoes = typeof body.observacoes === "string" ? body.observacoes.trim() || null : null;

  if (!competencia || !isCompetencia(competencia)) {
    return NextResponse.json({ ok: false, error: "competencia_invalida" }, { status: 400 });
  }
  if (!colaboradorId) {
    return NextResponse.json({ ok: false, error: "colaborador_id_invalido" }, { status: 400 });
  }

  const { data: existing, error: findError } = await supabase
    .from("folha_pagamento_colaborador")
    .select(
      "id,competencia_ano_mes,colaborador_id,status,data_fechamento,data_pagamento,observacoes,created_at,updated_at",
    )
    .eq("competencia_ano_mes", competencia)
    .eq("colaborador_id", colaboradorId)
    .maybeSingle();

  if (findError) {
    return NextResponse.json(
      { ok: false, error: "falha_buscar_folha", detail: findError.message },
      { status: 500 },
    );
  }

  if (existing) {
    return NextResponse.json({ ok: true, data: existing, exists: true });
  }

  const { data: created, error } = await supabase
    .from("folha_pagamento_colaborador")
    .insert({ competencia_ano_mes: competencia, colaborador_id: colaboradorId, observacoes })
    .select(
      "id,competencia_ano_mes,colaborador_id,status,data_fechamento,data_pagamento,observacoes,created_at,updated_at",
    )
    .single();

  if (error || !created) {
    return NextResponse.json(
      { ok: false, error: "falha_criar_folha", detail: error?.message ?? "sem_retorno" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, data: created });
}
