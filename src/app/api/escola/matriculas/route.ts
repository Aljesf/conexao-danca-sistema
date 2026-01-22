import { NextResponse, type NextRequest } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import { formatUnidadeExecucaoLabel } from "@/lib/escola/formatters/unidadeExecucaoLabel";
import { requireUser } from "@/lib/supabase/api-auth";

export const dynamic = "force-dynamic";

type MatriculaRow = {
  id: number;
  pessoa_id: number;
  responsavel_financeiro_id: number | null;
  ano_referencia: number | null;
  status: string | null;
  vinculo_id: number | null;
  servico_id?: number | null;
  produto_id?: number | null;
  created_at: string | null;
};

type UnidadeExecucaoRow = {
  unidade_execucao_id: number;
  denominacao: string | null;
  nome: string | null;
  origem_id: number | null;
  origem_tipo: string | null;
};

type TurmaRow = {
  turma_id: number;
  produto_id: number | null;
  nome: string | null;
};

type ApiErrorCode = "bad_request" | "unauthorized" | "server_error";

type ApiError = {
  ok: false;
  error: ApiErrorCode;
  message: string;
  details?: Record<string, unknown> | null;
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

function buildPessoaNome(pessoa?: { nome?: string | null } | null, fallbackId?: number | null): string {
  const nome = pessoa?.nome?.trim();
  if (nome) return nome;
  return fallbackId ? `Pessoa #${fallbackId}` : "-";
}

function okJson<T>(payload: T, status = 200) {
  return NextResponse.json(payload, { status });
}

function errJson(code: ApiErrorCode, message: string, status: number, details?: Record<string, unknown> | null) {
  return okJson({ ok: false, error: code, message, details: details ?? null } satisfies ApiError, status);
}

async function fetchMatriculas(admin: ReturnType<typeof getSupabaseAdmin>, params: {
  ano: number;
  pessoaId?: number | null;
  servicoId?: number | null;
  pessoaIdsQuery?: number[];
  includeProduto: boolean;
}) {
  const selectBase = [
    "id",
    "pessoa_id",
    "responsavel_financeiro_id",
    "ano_referencia",
    "status",
    "vinculo_id",
    "servico_id",
    "created_at",
  ];
  if (params.includeProduto) selectBase.push("produto_id");

  let query = admin
    .from("matriculas")
    .select(selectBase.join(","))
    .eq("ano_referencia", params.ano)
    .eq("status", "ATIVA");

  if (params.pessoaId) {
    query = query.eq("pessoa_id", params.pessoaId);
  }

  if (params.servicoId) {
    if (params.includeProduto) {
      query = query.or(`servico_id.eq.${params.servicoId},produto_id.eq.${params.servicoId}`);
    } else {
      query = query.eq("servico_id", params.servicoId);
    }
  }

  if (params.pessoaIdsQuery && params.pessoaIdsQuery.length > 0) {
    const ids = params.pessoaIdsQuery.join(",");
    query = query.or(`pessoa_id.in.(${ids}),responsavel_financeiro_id.in.(${ids})`);
  }

  return query.order("id", { ascending: false }).limit(200);
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if ("response" in auth) return auth.response;

    const url = new URL(request.url);
    const ano = Number(url.searchParams.get("ano") || "");
    const query = (url.searchParams.get("query") || "").trim();
    const pessoaId = toPositiveNumber(url.searchParams.get("pessoa_id"));
    const servicoId = toPositiveNumber(url.searchParams.get("servico_id"));

    if (!Number.isFinite(ano) || ano <= 0) {
      return errJson("bad_request", "Ano invalido.", 400, { ano });
    }

    const admin = getSupabaseAdmin();

    let pessoaIdsQuery: number[] = [];
    if (query) {
      let pessoas: unknown[] | null = null;
      let pessoasErr: PostgrestError | null = null;

      ({ data: pessoas, error: pessoasErr } = await admin
        .from("pessoas")
        .select("id,nome")
        .or(`nome.ilike.%${query}%,nome_fantasia.ilike.%${query}%`)
        .limit(50));

      if (pessoasErr && isSchemaMissing(pessoasErr)) {
        ({ data: pessoas, error: pessoasErr } = await admin
          .from("pessoas")
          .select("id,nome")
          .ilike("nome", `%${query}%`)
          .limit(50));
      }

      if (pessoasErr) {
        return errJson("server_error", "Falha ao buscar pessoas para o filtro.", 500, { pessoasErr });
      }

      pessoaIdsQuery = normalizeNumberArray((pessoas ?? []).map((p) => toPositiveNumber((p as { id?: number }).id)));
      if (pessoaIdsQuery.length === 0) {
        return okJson({ ok: true, data: [] }, 200);
      }
    }

    let rows: MatriculaRow[] = [];
    let includeProduto = true;

    let { data, error } = await fetchMatriculas(admin, {
      ano,
      pessoaId,
      servicoId,
      pessoaIdsQuery,
      includeProduto,
    });

    if (error && isSchemaMissing(error)) {
      includeProduto = false;
      ({ data, error } = await fetchMatriculas(admin, {
        ano,
        pessoaId,
        servicoId,
        pessoaIdsQuery,
        includeProduto,
      }));
    }

    if (error) {
      return errJson("server_error", "Falha ao listar matriculas.", 500, { error });
    }

    rows = (data ?? []) as MatriculaRow[];

    const turmaIds = normalizeNumberArray(rows.map((r) => toPositiveNumber(r.vinculo_id)));
    const turmaMap = new Map<number, TurmaRow>();
    if (turmaIds.length > 0) {
      const { data: turmas, error: turmasErr } = await admin
        .from("turmas")
        .select("turma_id,produto_id,nome")
        .in("turma_id", turmaIds);
      if (turmasErr && !isSchemaMissing(turmasErr)) {
        return errJson("server_error", "Falha ao carregar turmas.", 500, { turmasErr });
      }
      (turmas ?? []).forEach((t) => {
        const row = t as TurmaRow;
        if (row.turma_id) turmaMap.set(Number(row.turma_id), row);
      });
    }

    const ueMap = new Map<number, UnidadeExecucaoRow>();
    if (turmaIds.length > 0) {
      const { data: ues, error: uesErr } = await admin
        .from("escola_unidades_execucao")
        .select("unidade_execucao_id,denominacao,nome,origem_id,origem_tipo")
        .eq("origem_tipo", "TURMA")
        .in("origem_id", turmaIds);

      if (uesErr && !isSchemaMissing(uesErr)) {
        return errJson("server_error", "Falha ao carregar unidades de execucao.", 500, { uesErr });
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
      const { data: servicos, error: servicosErr } = await admin
        .from("escola_produtos_educacionais")
        .select("id,titulo")
        .in("id", uniqueServicoIds);
      if (servicosErr && !isSchemaMissing(servicosErr)) {
        return errJson("server_error", "Falha ao carregar servicos.", 500, { servicosErr });
      }
      (servicos ?? []).forEach((s) => {
        const row = s as { id?: number; titulo?: string | null };
        const id = toPositiveNumber(row.id);
        if (id) servicoMap.set(id, { id, titulo: row.titulo ?? null });
      });
    }

    const pessoasIds = normalizeNumberArray(
      rows.flatMap((r) => [toPositiveNumber(r.pessoa_id), toPositiveNumber(r.responsavel_financeiro_id)]),
    );
    const pessoasMap = new Map<number, { id: number; nome?: string | null }>();
    if (pessoasIds.length > 0) {
      const { data: pessoas, error: pessoasErr } = await admin
        .from("pessoas")
        .select("id,nome")
        .in("id", pessoasIds);
      if (pessoasErr && !isSchemaMissing(pessoasErr)) {
        return errJson("server_error", "Falha ao carregar pessoas.", 500, { pessoasErr });
      }
      (pessoas ?? []).forEach((p) => {
        const row = p as { id?: number; nome?: string | null };
        const id = toPositiveNumber(row.id);
        if (id) pessoasMap.set(id, { id, nome: row.nome ?? null });
      });
    }

    const mapped = rows.map((row) => {
      const turmaId = toPositiveNumber(row.vinculo_id);
      const turma = turmaId ? turmaMap.get(turmaId) : undefined;
      const servicoIdResolved = toPositiveNumber(row.servico_id ?? row.produto_id ?? turma?.produto_id);
      const servico = servicoIdResolved ? servicoMap.get(servicoIdResolved) : undefined;
      const ue = turmaId ? ueMap.get(turmaId) : undefined;
      const aluno = pessoasMap.get(toPositiveNumber(row.pessoa_id) ?? -1);
      const responsavelId = toPositiveNumber(row.responsavel_financeiro_id);
      const responsavel = responsavelId ? pessoasMap.get(responsavelId) : undefined;

      const unidadeExecucaoLabel = ue
        ? formatUnidadeExecucaoLabel({
            unidadeExecucaoId: toPositiveNumber(ue.unidade_execucao_id),
            origemTipo: ue.origem_tipo,
            turmaId,
            turmaNome: turma?.nome ?? null,
            unidadeDenominacao: ue.denominacao,
            unidadeNome: ue.nome,
          })
        : "-";

      const servicoNome = servico?.titulo?.trim() ?? null;
      return {
        id: row.id,
        pessoa_id: row.pessoa_id,
        responsavel_id: row.responsavel_financeiro_id,
        aluno_nome: buildPessoaNome(aluno, row.pessoa_id),
        responsavel_nome: responsavelId ? buildPessoaNome(responsavel, responsavelId) : null,
        ano_referencia: row.ano_referencia,
        status: row.status,
        servico_id: servicoIdResolved,
        servico_nome: servicoNome ?? (servicoIdResolved ? `Servico #${servicoIdResolved}` : null),
        unidade_execucao_id: ue ? toPositiveNumber(ue.unidade_execucao_id) : null,
        unidade_execucao_label: ue ? unidadeExecucaoLabel : null,
        created_at: row.created_at,
      };
    });

    return okJson({ items: mapped }, 200);
  } catch (e: unknown) {
    return errJson("server_error", "Erro inesperado ao listar matriculas.", 500, {
      message: e instanceof Error ? e.message : String(e),
    });
  }
}
