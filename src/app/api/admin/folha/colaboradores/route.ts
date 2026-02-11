import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type FolhaRow = {
  id: number;
  competencia_ano_mes: string;
  colaborador_id: number;
  colaborador_nome?: string | null;
  status: string;
  data_fechamento: string | null;
  data_pagamento: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
};

type ColaboradorMeta = {
  id: number;
  pessoa_id: number | null;
};

type PessoaMeta = {
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
  const status = searchParams.get("status");
  const colaboradorIdRaw = searchParams.get("colaborador_id");

  if (!competencia || !isCompetencia(competencia)) {
    return NextResponse.json({ ok: false, error: "competencia_invalida" }, { status: 400 });
  }

  let query = supabase
    .from("folha_pagamento_colaborador")
    .select(
      "id,competencia_ano_mes,colaborador_id,status,data_fechamento,data_pagamento,observacoes,created_at,updated_at",
    )
    .eq("competencia_ano_mes", competencia)
    .order("id", { ascending: false });

  const colaboradorId = toInt(colaboradorIdRaw);
  if (colaboradorId) {
    query = query.eq("colaborador_id", colaboradorId);
  }

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { ok: false, error: "falha_listar_folhas", detail: error.message },
      { status: 500 },
    );
  }

  const folhas = (data ?? []) as FolhaRow[];
  const colaboradorIds = Array.from(new Set(folhas.map((r) => r.colaborador_id)));
  const nomeMap = new Map<number, string>();

  if (colaboradorIds.length > 0) {
    const { data: colaboradores, error: colaboradoresError } = await supabase
      .from("colaboradores")
      .select("id,pessoa_id")
      .in("id", colaboradorIds);

    if (colaboradoresError) {
      return NextResponse.json(
        { ok: false, error: "falha_listar_colaboradores", detail: colaboradoresError.message },
        { status: 500 },
      );
    }

    const colaboradoresRows = (colaboradores ?? []) as ColaboradorMeta[];
    const pessoaIds = Array.from(
      new Set(colaboradoresRows.map((row) => row.pessoa_id).filter((v): v is number => typeof v === "number")),
    );

    let pessoasMap = new Map<number, PessoaMeta>();
    if (pessoaIds.length > 0) {
      const { data: pessoas, error: pessoasError } = await supabase
        .from("pessoas")
        .select("id,nome")
        .in("id", pessoaIds);

      if (pessoasError) {
        return NextResponse.json(
          { ok: false, error: "falha_listar_pessoas", detail: pessoasError.message },
          { status: 500 },
        );
      }

      pessoasMap = new Map((pessoas ?? []).map((p) => [p.id, p as PessoaMeta]));
    }

    for (const row of colaboradoresRows) {
      const nome = row.pessoa_id ? (pessoasMap.get(row.pessoa_id)?.nome ?? null) : null;
      if (nome) {
        nomeMap.set(row.id, nome);
      }
    }
  }

  const rows = folhas.map((folha) => ({
    ...folha,
    colaborador_nome: nomeMap.get(folha.colaborador_id) ?? null,
  }));

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
    return NextResponse.json({ ok: true, data: existing as FolhaRow, exists: true });
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

  return NextResponse.json({ ok: true, data: created as FolhaRow });
}
