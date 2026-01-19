import { NextResponse } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { formatUnidadeExecucaoLabel } from "@/lib/escola/formatters/unidadeExecucaoLabel";

type RouteCtx = { params: Promise<{ id?: string }> };

type MatriculaRow = {
  id: number;
  pessoa_id: number;
  responsavel_financeiro_id: number | null;
  ano_referencia: number | null;
  status: string | null;
  created_at: string | null;
  servico_id?: number | null;
  produto_id?: number | null;
  vinculo_id?: number | null;
};

type TurmaRow = {
  turma_id: number;
  produto_id: number | null;
  nome: string | null;
};

type UnidadeExecucaoRow = {
  unidade_execucao_id: number;
  denominacao: string | null;
  nome: string | null;
  origem_id: number | null;
  origem_tipo: string | null;
};

function isSchemaMissing(err: unknown): boolean {
  const e = err as PostgrestError | null;
  return !!e && typeof e.code === "string" && (e.code === "42P01" || e.code === "42703");
}

function toPositiveNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizeNumberArray(values: Array<number | null | undefined>): number[] {
  return Array.from(new Set(values.map((v) => Number(v)).filter((v) => Number.isFinite(v) && v > 0)));
}

export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const pessoaId = Number(id);
    if (!Number.isFinite(pessoaId) || pessoaId <= 0) {
      return NextResponse.json({ error: "ID invalido." }, { status: 400 });
    }

    const supabase = await getSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Usuario nao autenticado." }, { status: 401 });
    }

    let data: unknown[] | null = null;
    let error: PostgrestError | null = null;

    ({ data, error } = await supabase
      .from("matriculas")
      .select("id,pessoa_id,responsavel_financeiro_id,ano_referencia,status,created_at,servico_id,vinculo_id,produto_id")
      .or(`pessoa_id.eq.${pessoaId},responsavel_financeiro_id.eq.${pessoaId}`)
      .order("ano_referencia", { ascending: false })
      .order("created_at", { ascending: false }));

    if (error && isSchemaMissing(error)) {
      ({ data, error } = await supabase
        .from("matriculas")
        .select("id,pessoa_id,responsavel_financeiro_id,ano_referencia,status,created_at,servico_id,vinculo_id")
        .or(`pessoa_id.eq.${pessoaId},responsavel_financeiro_id.eq.${pessoaId}`)
        .order("ano_referencia", { ascending: false })
        .order("created_at", { ascending: false }));
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data ?? []) as MatriculaRow[];
    const turmaIds = normalizeNumberArray(rows.map((r) => toPositiveNumber(r.vinculo_id)));

    const turmaMap = new Map<number, TurmaRow>();
    if (turmaIds.length > 0) {
      const { data: turmas, error: turmasErr } = await supabase
        .from("turmas")
        .select("turma_id,produto_id,nome")
        .in("turma_id", turmaIds);
      if (turmasErr && !isSchemaMissing(turmasErr)) {
        return NextResponse.json({ error: turmasErr.message }, { status: 500 });
      }
      (turmas ?? []).forEach((t) => {
        const row = t as TurmaRow;
        if (row.turma_id) turmaMap.set(Number(row.turma_id), row);
      });
    }

    const ueMap = new Map<number, UnidadeExecucaoRow>();
    if (turmaIds.length > 0) {
      const { data: ues, error: uesErr } = await supabase
        .from("escola_unidades_execucao")
        .select("unidade_execucao_id,denominacao,nome,origem_id,origem_tipo")
        .eq("origem_tipo", "TURMA")
        .in("origem_id", turmaIds);
      if (uesErr && !isSchemaMissing(uesErr)) {
        return NextResponse.json({ error: uesErr.message }, { status: 500 });
      }
      (ues ?? []).forEach((u) => {
        const row = u as UnidadeExecucaoRow;
        const origemId = toPositiveNumber(row.origem_id);
        if (origemId) ueMap.set(origemId, row);
      });
    }

    const servicoIds = normalizeNumberArray(
      rows.map((r) => toPositiveNumber(r.servico_id ?? r.produto_id)),
    );
    turmaMap.forEach((t) => {
      const servico = toPositiveNumber(t.produto_id);
      if (servico) servicoIds.push(servico);
    });
    const uniqueServicoIds = Array.from(new Set(servicoIds));

    const servicoMap = new Map<number, { id: number; titulo?: string | null }>();
    if (uniqueServicoIds.length > 0) {
      const { data: servicos, error: servicosErr } = await supabase
        .from("escola_produtos_educacionais")
        .select("id,titulo")
        .in("id", uniqueServicoIds);
      if (servicosErr && !isSchemaMissing(servicosErr)) {
        return NextResponse.json({ error: servicosErr.message }, { status: 500 });
      }
      (servicos ?? []).forEach((s) => {
        const row = s as { id?: number; titulo?: string | null };
        const id = toPositiveNumber(row.id);
        if (id) servicoMap.set(id, { id, titulo: row.titulo ?? null });
      });
    }

    const items = rows.map((row) => {
      const turmaId = toPositiveNumber(row.vinculo_id);
      const turma = turmaId ? turmaMap.get(turmaId) : undefined;
      const servicoId = toPositiveNumber(row.servico_id ?? row.produto_id ?? turma?.produto_id);
      const servicoNome = servicoId ? servicoMap.get(servicoId)?.titulo?.trim() ?? null : null;
      const ue = turmaId ? ueMap.get(turmaId) : undefined;
      const unidadeExecucaoLabel = ue
        ? formatUnidadeExecucaoLabel({
            unidadeExecucaoId: toPositiveNumber(ue.unidade_execucao_id),
            origemTipo: ue.origem_tipo,
            turmaId,
            turmaNome: turma?.nome ?? null,
            unidadeDenominacao: ue.denominacao,
            unidadeNome: ue.nome,
          })
        : null;

      return {
        id: row.id,
        pessoa_id: row.pessoa_id,
        responsavel_financeiro_id: row.responsavel_financeiro_id ?? null,
        ano_referencia: row.ano_referencia,
        status: row.status ?? null,
        created_at: row.created_at,
        servico_id: servicoId,
        unidade_execucao_id: ue ? toPositiveNumber(ue.unidade_execucao_id) : null,
        servico_nome: servicoNome,
        unidade_execucao_label: unidadeExecucaoLabel,
      };
    });

    return NextResponse.json({ items }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro inesperado.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
