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

type ConcessaoPutBody = Partial<{
  bolsa_tipo_id: number;
  turma_id: number | null;
  matricula_id: number | null;
  data_inicio: string;
  data_fim: string | null;
  status: BolsaConcessaoStatus;
  motivo: string | null;
  observacoes: string | null;
}>;

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

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardApiByRole(req);
  if (denied) return denied;

  try {
    const { id: rawId } = await ctx.params;
    const id = toInt(rawId);
    if (!id || id <= 0) return jsonError(400, "id_invalido");

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("bolsa_concessoes")
      .select(
        "id,projeto_social_id,bolsa_tipo_id,pessoa_id,matricula_id,turma_id,data_inicio,data_fim,status,motivo,observacoes,created_at,updated_at",
      )
      .eq("id", id)
      .maybeSingle();

    if (error) return jsonError(500, "erro_buscar_concessao", error.message);
    if (!data) return jsonError(404, "concessao_nao_encontrada");

    return NextResponse.json({ ok: true, data: data as BolsaConcessaoRow });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "erro_desconhecido";
    return jsonError(500, "erro_buscar_concessao", detail);
  }
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardApiByRole(req);
  if (denied) return denied;

  try {
    const { id: rawId } = await ctx.params;
    const id = toInt(rawId);
    if (!id || id <= 0) return jsonError(400, "id_invalido");

    const body = (await req.json().catch(() => null)) as ConcessaoPutBody | null;
    if (!body) return jsonError(400, "payload_invalido");

    const supabase = getSupabaseAdmin();
    const { data: atual, error: atualErr } = await supabase
      .from("bolsa_concessoes")
      .select("id,projeto_social_id,bolsa_tipo_id,data_inicio")
      .eq("id", id)
      .maybeSingle();

    if (atualErr) return jsonError(500, "erro_buscar_concessao", atualErr.message);
    if (!atual) return jsonError(404, "concessao_nao_encontrada");

    const patch: {
      bolsa_tipo_id?: number;
      turma_id?: number | null;
      matricula_id?: number | null;
      data_inicio?: string;
      data_fim?: string | null;
      status?: BolsaConcessaoStatus;
      motivo?: string | null;
      observacoes?: string | null;
    } = {};

    const dataInicioFinal = "data_inicio" in body ? body.data_inicio : (atual.data_inicio as string);
    const dataFimFinal = "data_fim" in body ? asString(body.data_fim) : undefined;

    if (dataInicioFinal && !isIsoDate(dataInicioFinal)) return jsonError(400, "data_inicio_invalida");
    if (dataFimFinal && !isIsoDate(dataFimFinal)) return jsonError(400, "data_fim_invalida");
    if (dataInicioFinal && dataFimFinal && dataFimFinal < dataInicioFinal) {
      return jsonError(400, "data_fim_menor_que_data_inicio");
    }

    if ("bolsa_tipo_id" in body) {
      const bolsaTipoId = toInt(body.bolsa_tipo_id);
      if (!bolsaTipoId || bolsaTipoId <= 0) return jsonError(400, "bolsa_tipo_id_invalido");

      const { data: bolsaTipo, error: bolsaTipoErr } = await supabase
        .from("bolsa_tipos")
        .select("id,projeto_social_id")
        .eq("id", bolsaTipoId)
        .maybeSingle();

      if (bolsaTipoErr) return jsonError(500, "erro_validar_bolsa_tipo", bolsaTipoErr.message);
      if (!bolsaTipo) return jsonError(404, "bolsa_tipo_nao_encontrado");
      if ((bolsaTipo.projeto_social_id as number) !== (atual.projeto_social_id as number)) {
        return jsonError(409, "bolsa_tipo_nao_pertence_ao_projeto");
      }

      patch.bolsa_tipo_id = bolsaTipoId;
    }

    if ("turma_id" in body) {
      const turmaId = toInt(body.turma_id);
      if (body.turma_id !== null && body.turma_id !== undefined && (!turmaId || turmaId <= 0)) {
        return jsonError(400, "turma_id_invalido");
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
      patch.turma_id = turmaId ?? null;
    }

    if ("matricula_id" in body) {
      const matriculaId = toInt(body.matricula_id);
      if (body.matricula_id !== null && body.matricula_id !== undefined && (!matriculaId || matriculaId <= 0)) {
        return jsonError(400, "matricula_id_invalida");
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
      patch.matricula_id = matriculaId ?? null;
    }

    if ("data_inicio" in body) patch.data_inicio = dataInicioFinal;
    if ("data_fim" in body) patch.data_fim = dataFimFinal ?? null;

    if ("status" in body) {
      if (!isBolsaConcessaoStatus(body.status)) return jsonError(400, "status_invalido");
      patch.status = body.status;
    }

    if ("motivo" in body) patch.motivo = asString(body.motivo) ?? null;
    if ("observacoes" in body) patch.observacoes = asString(body.observacoes) ?? null;

    if (Object.keys(patch).length === 0) return jsonError(400, "nada_para_atualizar");

    const { data, error } = await supabase
      .from("bolsa_concessoes")
      .update(patch)
      .eq("id", id)
      .select(
        "id,projeto_social_id,bolsa_tipo_id,pessoa_id,matricula_id,turma_id,data_inicio,data_fim,status,motivo,observacoes,created_at,updated_at",
      )
      .maybeSingle();

    if (error) return jsonError(500, "erro_atualizar_concessao", error.message);
    if (!data) return jsonError(404, "concessao_nao_encontrada");

    return NextResponse.json({ ok: true, data: data as BolsaConcessaoRow });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "erro_desconhecido";
    return jsonError(500, "erro_atualizar_concessao", detail);
  }
}
