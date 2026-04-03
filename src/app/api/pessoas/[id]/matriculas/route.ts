import { NextResponse, type NextRequest } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";
import { requireUser } from "@/lib/supabase/api-auth";
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

type MatriculaItemRow = {
  id: number;
  matricula_id: number;
  descricao: string | null;
  origem_tipo: string | null;
  status: string | null;
  turma_id_inicial: number | null;
  valor_base_centavos: number | null;
  valor_liquido_centavos: number | null;
};

type TurmaAlunoRow = {
  turma_aluno_id: number;
  matricula_id: number | null;
  matricula_item_id: number | null;
  turma_id: number | null;
  dt_inicio: string | null;
  dt_fim: string | null;
  status: string | null;
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

function toNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function dedupeStrings(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const value of values) {
    const normalized = toNonEmptyString(value);
    if (!normalized) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    ordered.push(normalized);
  }
  return ordered;
}

function summarizeLabels(values: string[]): string | null {
  if (values.length === 0) return null;
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} + ${values[1]}`;
  return `${values[0]} + ${values[1]} + ${values.length - 2} mais`;
}

function normalizeItemDescricao(descricao: string | null): string | null {
  const normalized = toNonEmptyString(descricao);
  if (!normalized) return null;
  return normalized.replace(/^Item legado\s*-\s*/i, "").trim();
}

function deriveServicoLabelFromDescricao(descricao: string | null): string | null {
  const normalized = normalizeItemDescricao(descricao);
  if (!normalized) return null;
  const parts = normalized
    .split(" - ")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts[0] ?? normalized;
}

function buildUnidadeExecucaoLabel(params: {
  turmaId: number | null;
  turmaNome: string | null;
  ue: UnidadeExecucaoRow | undefined;
}): string | null {
  const { turmaId, turmaNome, ue } = params;
  if (ue) {
    return formatUnidadeExecucaoLabel({
      unidadeExecucaoId: toPositiveNumber(ue.unidade_execucao_id),
      origemTipo: ue.origem_tipo,
      turmaId,
      turmaNome,
      unidadeDenominacao: ue.denominacao,
      unidadeNome: ue.nome,
    });
  }
  return turmaNome;
}

export async function GET(request: NextRequest, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const pessoaId = Number(id);
    if (!Number.isFinite(pessoaId) || pessoaId <= 0) {
      return NextResponse.json({ error: "ID invalido." }, { status: 400 });
    }

    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;

    const { supabase } = auth;

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
    if (rows.length === 0) {
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    const matriculaIds = rows.map((row) => row.id).filter((idValue) => Number.isFinite(idValue));

    let itensRows: MatriculaItemRow[] = [];
    const { data: itensData, error: itensErr } = await supabase
      .from("matricula_itens")
      .select(
        "id,matricula_id,descricao,origem_tipo,status,turma_id_inicial,valor_base_centavos,valor_liquido_centavos",
      )
      .in("matricula_id", matriculaIds)
      .order("id", { ascending: true });

    if (itensErr && !isSchemaMissing(itensErr)) {
      return NextResponse.json({ error: itensErr.message }, { status: 500 });
    }
    itensRows = ((itensData ?? []) as MatriculaItemRow[]) ?? [];

    let turmaAlunoRows: TurmaAlunoRow[] = [];
    const { data: turmaAlunoData, error: turmaAlunoErr } = await supabase
      .from("turma_aluno")
      .select("turma_aluno_id,matricula_id,matricula_item_id,turma_id,dt_inicio,dt_fim,status")
      .in("matricula_id", matriculaIds)
      .order("dt_inicio", { ascending: false });

    if (turmaAlunoErr && !isSchemaMissing(turmaAlunoErr)) {
      return NextResponse.json({ error: turmaAlunoErr.message }, { status: 500 });
    }
    turmaAlunoRows = ((turmaAlunoData ?? []) as TurmaAlunoRow[]) ?? [];

    const turmaIds = normalizeNumberArray([
      ...rows.map((row) => toPositiveNumber(row.vinculo_id)),
      ...itensRows.map((item) => toPositiveNumber(item.turma_id_inicial)),
      ...turmaAlunoRows.map((row) => toPositiveNumber(row.turma_id)),
    ]);

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

    const servicoIds = normalizeNumberArray([
      ...rows.map((row) => toPositiveNumber(row.servico_id ?? row.produto_id)),
      ...Array.from(turmaMap.values()).map((turma) => toPositiveNumber(turma.produto_id)),
    ]);

    const servicoMap = new Map<number, { id: number; titulo: string | null }>();
    if (servicoIds.length > 0) {
      const { data: servicos, error: servicosErr } = await supabase
        .from("escola_produtos_educacionais")
        .select("id,titulo")
        .in("id", servicoIds);
      if (servicosErr && !isSchemaMissing(servicosErr)) {
        return NextResponse.json({ error: servicosErr.message }, { status: 500 });
      }
      (servicos ?? []).forEach((s) => {
        const row = s as { id?: number; titulo?: string | null };
        const servicoId = toPositiveNumber(row.id);
        if (servicoId) {
          servicoMap.set(servicoId, {
            id: servicoId,
            titulo: toNonEmptyString(row.titulo),
          });
        }
      });
    }

    const itensByMatricula = new Map<number, MatriculaItemRow[]>();
    for (const item of itensRows) {
      const bucket = itensByMatricula.get(item.matricula_id) ?? [];
      bucket.push(item);
      itensByMatricula.set(item.matricula_id, bucket);
    }

    const turmaAlunoByMatricula = new Map<number, TurmaAlunoRow[]>();
    for (const vinculo of turmaAlunoRows) {
      const matriculaId = toPositiveNumber(vinculo.matricula_id);
      if (!matriculaId) continue;
      const bucket = turmaAlunoByMatricula.get(matriculaId) ?? [];
      bucket.push(vinculo);
      turmaAlunoByMatricula.set(matriculaId, bucket);
    }

    const turmaAlunoByItem = new Map<number, TurmaAlunoRow[]>();
    for (const vinculo of turmaAlunoRows) {
      const itemId = toPositiveNumber(vinculo.matricula_item_id);
      if (!itemId) continue;
      const bucket = turmaAlunoByItem.get(itemId) ?? [];
      bucket.push(vinculo);
      turmaAlunoByItem.set(itemId, bucket);
    }

    const items = rows.map((row) => {
      const matriculaItems = itensByMatricula.get(row.id) ?? [];
      const matriculaVinculos = turmaAlunoByMatricula.get(row.id) ?? [];

      const activeVinculos = matriculaVinculos.filter((vinculo) => !toNonEmptyString(vinculo.dt_fim));
      const vinculosPreferidos = activeVinculos.length > 0 ? activeVinculos : matriculaVinculos;

      const servicoLabels = dedupeStrings(
        matriculaItems.flatMap((item) => {
          const itemVinculos = turmaAlunoByItem.get(item.id) ?? [];
          const activeItemVinculos = itemVinculos.filter((vinculo) => !toNonEmptyString(vinculo.dt_fim));
          const vinculoAtual = (activeItemVinculos[0] ?? itemVinculos[0]) ?? null;
          const turmaAtual = toPositiveNumber(vinculoAtual?.turma_id)
            ? turmaMap.get(Number(vinculoAtual?.turma_id))
            : undefined;
          const turmaInicial = toPositiveNumber(item.turma_id_inicial)
            ? turmaMap.get(Number(item.turma_id_inicial))
            : undefined;

          const byTurmaAtual = turmaAtual?.produto_id
            ? servicoMap.get(Number(turmaAtual.produto_id))?.titulo
            : null;
          const byTurmaInicial = turmaInicial?.produto_id
            ? servicoMap.get(Number(turmaInicial.produto_id))?.titulo
            : null;
          const byDescricao = deriveServicoLabelFromDescricao(item.descricao);

          return [byTurmaAtual, byTurmaInicial, byDescricao];
        }),
      );

      const turmaLabels = dedupeStrings(
        vinculosPreferidos.map((vinculo) => {
          const turmaId = toPositiveNumber(vinculo.turma_id);
          const turma = turmaId ? turmaMap.get(turmaId) : undefined;
          const ue = turmaId ? ueMap.get(turmaId) : undefined;
          return buildUnidadeExecucaoLabel({
            turmaId,
            turmaNome: turma?.nome ?? null,
            ue,
          });
        }),
      );

      const turmaInicialLabels = dedupeStrings(
        matriculaItems.map((item) => {
          const turmaId = toPositiveNumber(item.turma_id_inicial);
          const turma = turmaId ? turmaMap.get(turmaId) : undefined;
          const ue = turmaId ? ueMap.get(turmaId) : undefined;
          return buildUnidadeExecucaoLabel({
            turmaId,
            turmaNome: turma?.nome ?? null,
            ue,
          });
        }),
      );

      const turmaIdFallback = toPositiveNumber(row.vinculo_id);
      const turmaFallback = turmaIdFallback ? turmaMap.get(turmaIdFallback) : undefined;
      const ueFallback = turmaIdFallback ? ueMap.get(turmaIdFallback) : undefined;
      const servicoFallbackId = toPositiveNumber(row.servico_id ?? row.produto_id ?? turmaFallback?.produto_id);
      const servicoFallback = servicoFallbackId
        ? servicoMap.get(servicoFallbackId)?.titulo ?? null
        : null;
      const unidadeExecucaoFallback = buildUnidadeExecucaoLabel({
        turmaId: turmaIdFallback,
        turmaNome: turmaFallback?.nome ?? null,
        ue: ueFallback,
      });

      const servicoLabelList = servicoLabels.length > 0 ? servicoLabels : dedupeStrings([servicoFallback]);
      const turmaLabelList =
        turmaLabels.length > 0
          ? turmaLabels
          : turmaInicialLabels.length > 0
            ? turmaInicialLabels
            : dedupeStrings([unidadeExecucaoFallback]);

      const servicoNome = summarizeLabels(servicoLabelList);
      const unidadeExecucaoLabel = summarizeLabels(turmaLabelList);

      return {
        id: row.id,
        pessoa_id: row.pessoa_id,
        responsavel_financeiro_id: row.responsavel_financeiro_id ?? null,
        ano_referencia: row.ano_referencia,
        status: row.status ?? null,
        created_at: row.created_at,
        servico_id: servicoFallbackId,
        unidade_execucao_id: turmaIdFallback ? toPositiveNumber(ueFallback?.unidade_execucao_id) : null,
        servico_nome: servicoNome,
        servico_nome_tooltip: servicoLabelList.join(" | ") || null,
        unidade_execucao_label: unidadeExecucaoLabel,
        unidade_execucao_tooltip: turmaLabelList.join(" | ") || null,
        itens_total: matriculaItems.length,
        itens_origem_legado: matriculaItems.every((item) => (item.origem_tipo ?? "").toUpperCase() === "LEGADO"),
      };
    });

    return NextResponse.json({ items }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro inesperado.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
