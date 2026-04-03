import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/supabase/api-auth";

type Supa = SupabaseClient;

type ProfessorVinculoRow = {
  id: number;
  turma_id: number;
  colaborador_id: number;
  funcao_id: number;
  principal: boolean;
  ativo: boolean;
  data_inicio: string | null;
  data_fim: string | null;
  observacoes: string | null;
  colaborador?: {
    id?: number | null;
    pessoa?: { id?: number | null; nome?: string | null } | null;
  } | null;
  funcao?: {
    id?: number | null;
    nome?: string | null;
    codigo?: string | null;
    grupo?: string | null;
  } | null;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function parsePositiveInt(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseOptionalDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

function parseOptionalText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseOptionalBoolean(value: unknown): boolean | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "sim") return true;
    if (normalized === "false" || normalized === "0" || normalized === "nao" || normalized === "não") return false;
  }
  return null;
}

async function listarVinculosTurma(supabase: Supa, turmaId: number) {
  const { data, error } = await supabase
    .from("turma_professores")
    .select(
      `
        id,
        turma_id,
        colaborador_id,
        funcao_id,
        principal,
        ativo,
        data_inicio,
        data_fim,
        observacoes,
        colaborador:colaboradores!turma_professores_colaborador_id_fkey (
          id,
          pessoa:pessoas!colaboradores_pessoa_id_fkey (
            id,
            nome
          )
        ),
        funcao:funcoes_colaborador!turma_professores_funcao_id_fkey (
          id,
          nome,
          codigo,
          grupo
        )
      `,
    )
    .eq("turma_id", turmaId)
    .order("ativo", { ascending: false })
    .order("principal", { ascending: false })
    .order("data_inicio", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const rows = ((data as ProfessorVinculoRow[] | null) ?? []).map((row) => ({
    id: Number(row.id),
    turma_id: Number(row.turma_id),
    colaborador_id: Number(row.colaborador_id),
    colaborador_nome: row.colaborador?.pessoa?.nome ?? `Colaborador ${row.colaborador_id}`,
    pessoa_id: row.colaborador?.pessoa?.id ?? null,
    funcao_id: Number(row.funcao_id),
    funcao_nome: row.funcao?.nome ?? "Funcao nao informada",
    funcao_codigo: row.funcao?.codigo ?? null,
    funcao_grupo: row.funcao?.grupo ?? null,
    principal: Boolean(row.principal),
    ativo: Boolean(row.ativo),
    data_inicio: row.data_inicio ?? null,
    data_fim: row.data_fim ?? null,
    observacoes: row.observacoes ?? null,
  }));

  return {
    atuais: rows.filter((row) => row.ativo).sort((a, b) => Number(b.principal) - Number(a.principal) || (a.data_inicio ?? "").localeCompare(b.data_inicio ?? "")),
    historico: rows
      .filter((row) => !row.ativo)
      .sort((a, b) => (b.data_fim ?? "").localeCompare(a.data_fim ?? "") || (b.data_inicio ?? "").localeCompare(a.data_inicio ?? "")),
  };
}

async function listarColaboradoresDisponiveis(supabase: Supa) {
  const { data, error } = await supabase
    .from("vw_professores")
    .select("id,nome,pode_lecionar,vinculo_ativo")
    .eq("vinculo_ativo", true)
    .eq("pode_lecionar", true)
    .order("nome", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data as Array<{ id: number | null; nome: string | null }> | null) ?? [])
    .filter((row) => Number.isInteger(row.id) && (row.nome ?? "").trim().length > 0)
    .map((row) => ({
      colaborador_id: Number(row.id),
      nome: row.nome ?? `Colaborador ${row.id}`,
    }));
}

async function listarFuncoesDisponiveis(supabase: Supa) {
  const { data, error } = await supabase
    .from("funcoes_colaborador")
    .select(
      `
        id,
        nome,
        codigo,
        grupo,
        ativo,
        grupo_ref:funcoes_grupo!funcoes_colaborador_grupo_id_fkey (
          id,
          nome,
          pode_lecionar,
          ativo
        )
      `,
    )
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data as Array<{
    id: number;
    nome: string;
    codigo: string;
    grupo: string;
    ativo: boolean;
    grupo_ref?: { id?: number | null; nome?: string | null; pode_lecionar?: boolean | null; ativo?: boolean | null } | null;
  }> | null) ?? [])
    .filter((row) => row.ativo && row.grupo_ref?.ativo !== false && Boolean(row.grupo_ref?.pode_lecionar))
    .map((row) => ({
      id: Number(row.id),
      nome: row.nome,
      codigo: row.codigo,
      grupo: row.grupo,
      grupo_nome: row.grupo_ref?.nome ?? null,
    }));
}

async function syncProfessorPrincipalAtalho(supabase: Supa, turmaId: number) {
  const { data, error } = await supabase
    .from("turma_professores")
    .select("id,colaborador_id")
    .eq("turma_id", turmaId)
    .eq("ativo", true)
    .eq("principal", true)
    .order("data_inicio", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const professorId = data?.colaborador_id ? Number(data.colaborador_id) : null;
  const { error: updateError } = await supabase
    .from("turmas")
    .update({ professor_id: professorId })
    .eq("turma_id", turmaId);

  if (updateError) {
    throw new Error(updateError.message);
  }
}

async function limparPrincipalAtivo(supabase: Supa, turmaId: number, keepVinculoId?: number) {
  let query = supabase.from("turma_professores").update({ principal: false }).eq("turma_id", turmaId).eq("ativo", true);
  if (keepVinculoId) {
    query = query.neq("id", keepVinculoId);
  }
  const { error } = await query;
  if (error) {
    throw new Error(error.message);
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await ctx.params;
  const turmaId = Number(rawId);
  if (!Number.isInteger(turmaId) || turmaId <= 0) {
    return NextResponse.json({ error: "turma_id_invalido" }, { status: 400 });
  }

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const [vinculos, colaboradores, funcoes] = await Promise.all([
      listarVinculosTurma(auth.supabase, turmaId),
      listarColaboradoresDisponiveis(auth.supabase),
      listarFuncoesDisponiveis(auth.supabase),
    ]);

    return NextResponse.json({
      turma_id: turmaId,
      atuais: vinculos.atuais,
      historico: vinculos.historico,
      colaboradores_disponiveis: colaboradores,
      funcoes_disponiveis: funcoes,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "falha_listar_professores";
    return NextResponse.json({ error: "falha_listar_professores", details: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await ctx.params;
  const turmaId = Number(rawId);
  if (!Number.isInteger(turmaId) || turmaId <= 0) {
    return NextResponse.json({ error: "turma_id_invalido" }, { status: 400 });
  }

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "payload_invalido" }, { status: 400 });
  }

  const action = parseOptionalText(body.action)?.toLowerCase() ?? "adicionar";

  if (action === "encerrar") {
    const vinculoId = parsePositiveInt(body.vinculo_id);
    const dataFim = parseOptionalDate(body.data_fim) ?? todayIso();
    const observacoes = parseOptionalText(body.observacoes);

    if (!vinculoId) {
      return NextResponse.json({ error: "vinculo_id_obrigatorio" }, { status: 400 });
    }

    const { data: vinculo, error: vinculoError } = await auth.supabase
      .from("turma_professores")
      .select("id,principal,observacoes")
      .eq("id", vinculoId)
      .eq("turma_id", turmaId)
      .maybeSingle();

    if (vinculoError) {
      return NextResponse.json({ error: "falha_buscar_vinculo", details: vinculoError.message }, { status: 500 });
    }
    if (!vinculo?.id) {
      return NextResponse.json({ error: "vinculo_nao_encontrado" }, { status: 404 });
    }

    const observacoesFinais = [vinculo.observacoes, observacoes].filter(Boolean).join(" | ") || null;
    const { error: updateError } = await auth.supabase
      .from("turma_professores")
      .update({
        ativo: false,
        principal: false,
        data_fim: dataFim,
        observacoes: observacoesFinais,
      })
      .eq("id", vinculoId)
      .eq("turma_id", turmaId);

    if (updateError) {
      return NextResponse.json({ error: "falha_encerrar_vinculo", details: updateError.message }, { status: 500 });
    }

    try {
      await syncProfessorPrincipalAtalho(auth.supabase, turmaId);
      const vinculos = await listarVinculosTurma(auth.supabase, turmaId);
      return NextResponse.json({
        ok: true,
        message: "Vinculo encerrado e historico preservado.",
        ...vinculos,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "falha_sincronizar_principal";
      return NextResponse.json({ error: "falha_sincronizar_principal", details: message }, { status: 500 });
    }
  }

  if (action === "definir_principal") {
    const vinculoId = parsePositiveInt(body.vinculo_id);
    if (!vinculoId) {
      return NextResponse.json({ error: "vinculo_id_obrigatorio" }, { status: 400 });
    }

    const { data: vinculo, error: vinculoError } = await auth.supabase
      .from("turma_professores")
      .select("id,ativo")
      .eq("id", vinculoId)
      .eq("turma_id", turmaId)
      .maybeSingle();

    if (vinculoError) {
      return NextResponse.json({ error: "falha_buscar_vinculo", details: vinculoError.message }, { status: 500 });
    }
    if (!vinculo?.id) {
      return NextResponse.json({ error: "vinculo_nao_encontrado" }, { status: 404 });
    }
    if (!vinculo.ativo) {
      return NextResponse.json({ error: "vinculo_encerrado" }, { status: 400 });
    }

    try {
      await limparPrincipalAtivo(auth.supabase, turmaId, vinculoId);

      const { error: principalError } = await auth.supabase
        .from("turma_professores")
        .update({ principal: true })
        .eq("id", vinculoId)
        .eq("turma_id", turmaId);

      if (principalError) {
        return NextResponse.json({ error: "falha_definir_principal", details: principalError.message }, { status: 500 });
      }

      await syncProfessorPrincipalAtalho(auth.supabase, turmaId);
      const vinculos = await listarVinculosTurma(auth.supabase, turmaId);
      return NextResponse.json({
        ok: true,
        message: "Professor principal atualizado.",
        ...vinculos,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "falha_sincronizar_principal";
      return NextResponse.json({ error: "falha_sincronizar_principal", details: message }, { status: 500 });
    }
  }

  const colaboradorId = parsePositiveInt(body.colaborador_id);
  const funcaoId = parsePositiveInt(body.funcao_id);
  const principal = parseOptionalBoolean(body.principal) ?? false;
  const dataInicio = parseOptionalDate(body.data_inicio) ?? todayIso();
  const observacoes = parseOptionalText(body.observacoes);

  if (!colaboradorId || !funcaoId) {
    return NextResponse.json({ error: "colaborador_e_funcao_obrigatorios" }, { status: 400 });
  }

  const [funcoesDisponiveis, colaboradoresDisponiveis] = await Promise.all([
    listarFuncoesDisponiveis(auth.supabase),
    listarColaboradoresDisponiveis(auth.supabase),
  ]);

  if (!funcoesDisponiveis.some((item) => item.id === funcaoId)) {
    return NextResponse.json({ error: "funcao_invalida_para_turma" }, { status: 400 });
  }
  if (!colaboradoresDisponiveis.some((item) => item.colaborador_id === colaboradorId)) {
    return NextResponse.json({ error: "colaborador_invalido_para_turma" }, { status: 400 });
  }

  const { data: existingActive, error: existingError } = await auth.supabase
    .from("turma_professores")
    .select("id")
    .eq("turma_id", turmaId)
    .eq("colaborador_id", colaboradorId)
    .eq("ativo", true)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: "falha_buscar_vinculo", details: existingError.message }, { status: 500 });
  }
  if (existingActive?.id) {
    return NextResponse.json({ error: "colaborador_ja_vinculado_ativo" }, { status: 400 });
  }

  try {
    if (principal) {
      await limparPrincipalAtivo(auth.supabase, turmaId);
    }

    const { error: insertError } = await auth.supabase.from("turma_professores").insert({
      turma_id: turmaId,
      colaborador_id: colaboradorId,
      funcao_id: funcaoId,
      principal,
      ativo: true,
      data_inicio: dataInicio,
      observacoes,
    });

    if (insertError) {
      return NextResponse.json({ error: "falha_adicionar_professor", details: insertError.message }, { status: 500 });
    }

    await syncProfessorPrincipalAtalho(auth.supabase, turmaId);
    const vinculos = await listarVinculosTurma(auth.supabase, turmaId);
    return NextResponse.json({
      ok: true,
      message: "Vinculo criado com historico preservado.",
      ...vinculos,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "falha_sincronizar_principal";
    return NextResponse.json({ error: "falha_sincronizar_principal", details: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await ctx.params;
  const turmaId = Number(rawId);
  if (!Number.isInteger(turmaId) || turmaId <= 0) {
    return NextResponse.json({ error: "turma_id_invalido" }, { status: 400 });
  }

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "payload_invalido" }, { status: 400 });
  }

  const vinculoId = parsePositiveInt(body.vinculo_id ?? body.id);
  if (!vinculoId) {
    return NextResponse.json({ error: "vinculo_id_obrigatorio" }, { status: 400 });
  }

  const { data: current, error: currentError } = await auth.supabase
    .from("turma_professores")
    .select("id,principal,ativo,data_inicio,data_fim,funcao_id,observacoes")
    .eq("id", vinculoId)
    .eq("turma_id", turmaId)
    .maybeSingle();

  if (currentError) {
    return NextResponse.json({ error: "falha_buscar_vinculo", details: currentError.message }, { status: 500 });
  }
  if (!current?.id) {
    return NextResponse.json({ error: "vinculo_nao_encontrado" }, { status: 404 });
  }

  const funcaoId = Object.prototype.hasOwnProperty.call(body, "funcao_id") ? parsePositiveInt(body.funcao_id) : current.funcao_id;
  const dataInicio = Object.prototype.hasOwnProperty.call(body, "data_inicio") ? parseOptionalDate(body.data_inicio) : current.data_inicio;
  const dataFim = Object.prototype.hasOwnProperty.call(body, "data_fim") ? parseOptionalDate(body.data_fim) : current.data_fim;
  const observacoes = Object.prototype.hasOwnProperty.call(body, "observacoes") ? parseOptionalText(body.observacoes) : current.observacoes;
  const principal = Object.prototype.hasOwnProperty.call(body, "principal") ? (parseOptionalBoolean(body.principal) ?? false) : current.principal;
  const ativo = Object.prototype.hasOwnProperty.call(body, "ativo")
    ? (parseOptionalBoolean(body.ativo) ?? false)
    : dataFim
      ? false
      : current.ativo;

  if (!funcaoId) {
    return NextResponse.json({ error: "funcao_id_invalida" }, { status: 400 });
  }
  if (!dataInicio) {
    return NextResponse.json({ error: "data_inicio_invalida" }, { status: 400 });
  }
  if (dataFim && dataInicio > dataFim) {
    return NextResponse.json({ error: "intervalo_datas_invalido" }, { status: 400 });
  }

  try {
    if (principal && ativo) {
      await limparPrincipalAtivo(auth.supabase, turmaId, vinculoId);
    }

    const { error: updateError } = await auth.supabase
      .from("turma_professores")
      .update({
        funcao_id: funcaoId,
        principal: principal && ativo,
        ativo,
        data_inicio: dataInicio,
        data_fim: ativo ? null : dataFim ?? todayIso(),
        observacoes,
      })
      .eq("id", vinculoId)
      .eq("turma_id", turmaId);

    if (updateError) {
      return NextResponse.json({ error: "falha_atualizar_vinculo", details: updateError.message }, { status: 500 });
    }

    await syncProfessorPrincipalAtalho(auth.supabase, turmaId);
    const vinculos = await listarVinculosTurma(auth.supabase, turmaId);
    return NextResponse.json({
      ok: true,
      message: "Vinculo atualizado com historico preservado.",
      ...vinculos,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "falha_sincronizar_principal";
    return NextResponse.json({ error: "falha_sincronizar_principal", details: message }, { status: 500 });
  }
}
