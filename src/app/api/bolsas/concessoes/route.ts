import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import { isBolsaConcessaoStatus, type BolsaConcessaoStatus } from "@/lib/bolsas/bolsasTypes";

type BolsaConcessaoRow = {
  id: number;
  projeto_social_id: number;
  bolsa_tipo_id: number;
  pessoa_id: number;
  matricula_id: number | null;
  turma_id: number | null;
  data_inicio: string;
  data_fim: string | null;
  status: BolsaConcessaoStatus;
  motivo: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
};

type ConcessaoPostBody = {
  projeto_social_id?: number;
  bolsa_tipo_id?: number;
  pessoa_id?: number;
  turma_id?: number | null;
  matricula_id?: number | null;
  data_inicio?: string;
  data_fim?: string | null;
  status?: BolsaConcessaoStatus;
  motivo?: string | null;
  observacoes?: string | null;
};

function toInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Math.trunc(Number(value));
  }
  return null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function jsonError(status: number, error: string, detail?: string) {
  return NextResponse.json({ ok: false, error, detail: detail ?? null }, { status });
}

export async function GET(req: Request) {
  const denied = await guardApiByRole(req);
  if (denied) return denied;

  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);

    const pessoaIdParam = searchParams.get("pessoa_id");
    const projetoSocialIdParam = searchParams.get("projeto_social_id");
    const statusParam = searchParams.get("status");

    const pessoaId = pessoaIdParam ? toInt(pessoaIdParam) : null;
    const projetoSocialId = projetoSocialIdParam ? toInt(projetoSocialIdParam) : null;

    if (pessoaIdParam && (!pessoaId || pessoaId <= 0)) return jsonError(400, "pessoa_id_invalido");
    if (projetoSocialIdParam && (!projetoSocialId || projetoSocialId <= 0)) {
      return jsonError(400, "projeto_social_id_invalido");
    }

    if (statusParam && !isBolsaConcessaoStatus(statusParam)) return jsonError(400, "status_invalido");

    let query = supabase
      .from("bolsa_concessoes")
      .select(
        "id,projeto_social_id,bolsa_tipo_id,pessoa_id,matricula_id,turma_id,data_inicio,data_fim,status,motivo,observacoes,created_at,updated_at",
      )
      .order("created_at", { ascending: false });

    if (pessoaId) query = query.eq("pessoa_id", pessoaId);
    if (projetoSocialId) query = query.eq("projeto_social_id", projetoSocialId);
    if (statusParam) query = query.eq("status", statusParam);

    const { data, error } = await query;
    if (error) return jsonError(500, "erro_listar_concessoes", error.message);

    return NextResponse.json({ ok: true, data: (data ?? []) as BolsaConcessaoRow[] });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "erro_desconhecido";
    return jsonError(500, "erro_listar_concessoes", detail);
  }
}

export async function POST(req: Request) {
  const denied = await guardApiByRole(req);
  if (denied) return denied;

  try {
    const supabase = getSupabaseAdmin();
    const body = (await req.json().catch(() => null)) as ConcessaoPostBody | null;
    if (!body) return jsonError(400, "payload_invalido");

    const projetoSocialId = toInt(body.projeto_social_id);
    const bolsaTipoId = toInt(body.bolsa_tipo_id);
    const pessoaId = toInt(body.pessoa_id);
    const turmaId = toInt(body.turma_id);
    const matriculaId = toInt(body.matricula_id);
    const dataInicio = body.data_inicio ?? new Date().toISOString().slice(0, 10);
    const dataFim = asString(body.data_fim);
    const status = body.status ?? "ATIVA";

    if (!projetoSocialId || projetoSocialId <= 0) return jsonError(400, "projeto_social_id_obrigatorio");
    if (!bolsaTipoId || bolsaTipoId <= 0) return jsonError(400, "bolsa_tipo_id_obrigatorio");
    if (!pessoaId || pessoaId <= 0) return jsonError(400, "pessoa_id_obrigatorio");
    if (!isIsoDate(dataInicio)) return jsonError(400, "data_inicio_invalida");
    if (dataFim && !isIsoDate(dataFim)) return jsonError(400, "data_fim_invalida");
    if (dataFim && dataFim < dataInicio) return jsonError(400, "data_fim_menor_que_data_inicio");
    if (!isBolsaConcessaoStatus(status)) return jsonError(400, "status_invalido");

    const { data: projeto, error: projetoErr } = await supabase
      .from("projetos_sociais")
      .select("id")
      .eq("id", projetoSocialId)
      .maybeSingle();
    if (projetoErr) return jsonError(500, "erro_validar_projeto_social", projetoErr.message);
    if (!projeto) return jsonError(404, "projeto_social_nao_encontrado");

    const { data: pessoa, error: pessoaErr } = await supabase
      .from("pessoas")
      .select("id")
      .eq("id", pessoaId)
      .maybeSingle();
    if (pessoaErr) return jsonError(500, "erro_validar_pessoa", pessoaErr.message);
    if (!pessoa) return jsonError(404, "pessoa_nao_encontrada");

    const { data: bolsaTipo, error: bolsaTipoErr } = await supabase
      .from("bolsa_tipos")
      .select("id,projeto_social_id")
      .eq("id", bolsaTipoId)
      .maybeSingle();
    if (bolsaTipoErr) return jsonError(500, "erro_validar_bolsa_tipo", bolsaTipoErr.message);
    if (!bolsaTipo) return jsonError(404, "bolsa_tipo_nao_encontrado");
    if ((bolsaTipo.projeto_social_id as number) !== projetoSocialId) {
      return jsonError(409, "bolsa_tipo_nao_pertence_ao_projeto");
    }

    if (turmaId) {
      const { data: turma, error: turmaErr } = await supabase
        .from("turmas")
        .select("turma_id")
        .eq("turma_id", turmaId)
        .maybeSingle();
      if (turmaErr) return jsonError(500, "erro_validar_turma", turmaErr.message);
      if (!turma) return jsonError(404, "turma_nao_encontrada");
    }

    if (matriculaId) {
      const { data: matricula, error: matriculaErr } = await supabase
        .from("matriculas")
        .select("id")
        .eq("id", matriculaId)
        .maybeSingle();
      if (matriculaErr) return jsonError(500, "erro_validar_matricula", matriculaErr.message);
      if (!matricula) return jsonError(404, "matricula_nao_encontrada");
    }

    const { data, error } = await supabase
      .from("bolsa_concessoes")
      .insert({
        projeto_social_id: projetoSocialId,
        bolsa_tipo_id: bolsaTipoId,
        pessoa_id: pessoaId,
        turma_id: turmaId ?? null,
        matricula_id: matriculaId ?? null,
        data_inicio: dataInicio,
        data_fim: dataFim ?? null,
        status,
        motivo: asString(body.motivo) ?? null,
        observacoes: asString(body.observacoes) ?? null,
      })
      .select(
        "id,projeto_social_id,bolsa_tipo_id,pessoa_id,matricula_id,turma_id,data_inicio,data_fim,status,motivo,observacoes,created_at,updated_at",
      )
      .single();

    if (error) return jsonError(500, "erro_criar_concessao", error.message);
    return NextResponse.json({ ok: true, data: data as BolsaConcessaoRow }, { status: 201 });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "erro_desconhecido";
    return jsonError(500, "erro_criar_concessao", detail);
  }
}
