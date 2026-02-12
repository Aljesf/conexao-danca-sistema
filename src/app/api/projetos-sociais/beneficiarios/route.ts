import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type BeneficiarioRow = {
  id: number;
  projeto_social_id: number;
  pessoa_id: number;
  status: "ATIVO" | "INATIVO" | "SUSPENSO";
  data_inicio: string;
  data_fim: string | null;
  origem_legado: string | null;
  legado_payload: Record<string, unknown> | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
};

type PostBody = {
  projeto_social_id?: number;
  pessoa_id?: number;
  status?: "ATIVO" | "INATIVO" | "SUSPENSO";
  data_inicio?: string;
  data_fim?: string | null;
  origem_legado?: string | null;
  legado_payload?: Record<string, unknown> | null;
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

function isStatus(value: unknown): value is BeneficiarioRow["status"] {
  return value === "ATIVO" || value === "INATIVO" || value === "SUSPENSO";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

    const projetoSocialId = toInt(searchParams.get("projeto_social_id"));
    if (!projetoSocialId || projetoSocialId <= 0) return jsonError(400, "projeto_social_id_obrigatorio");

    const status = searchParams.get("status");
    if (status && !isStatus(status)) return jsonError(400, "status_invalido");

    let query = supabase
      .from("projetos_sociais_beneficiarios")
      .select(
        "id,projeto_social_id,pessoa_id,status,data_inicio,data_fim,origem_legado,legado_payload,observacoes,created_at,updated_at"
      )
      .eq("projeto_social_id", projetoSocialId)
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return jsonError(500, "erro_listar_beneficiarios", error.message);

    return NextResponse.json({ ok: true, data: (data ?? []) as BeneficiarioRow[] });
  } catch (e) {
    const detail = e instanceof Error ? e.message : "erro_desconhecido";
    return jsonError(500, "erro_listar_beneficiarios", detail);
  }
}

export async function POST(req: Request) {
  const denied = await guardApiByRole(req);
  if (denied) return denied;

  try {
    const supabase = getSupabaseAdmin();
    const body = (await req.json().catch(() => null)) as PostBody | null;
    if (!body) return jsonError(400, "payload_invalido");

    const projetoSocialId = toInt(body.projeto_social_id);
    const pessoaId = toInt(body.pessoa_id);

    if (!projetoSocialId || projetoSocialId <= 0) return jsonError(400, "projeto_social_id_obrigatorio");
    if (!pessoaId || pessoaId <= 0) return jsonError(400, "pessoa_id_obrigatorio");

    const status = body.status ?? "ATIVO";
    if (!isStatus(status)) return jsonError(400, "status_invalido");

    const dataInicio = body.data_inicio ?? new Date().toISOString().slice(0, 10);
    if (!isIsoDate(dataInicio)) return jsonError(400, "data_inicio_invalida");

    const dataFim = asString(body.data_fim);
    if (dataFim && !isIsoDate(dataFim)) return jsonError(400, "data_fim_invalida");
    if (dataFim && dataFim < dataInicio) return jsonError(400, "data_fim_menor_que_data_inicio");

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

    const payload = {
      projeto_social_id: projetoSocialId,
      pessoa_id: pessoaId,
      status,
      data_inicio: dataInicio,
      data_fim: dataFim ?? null,
      origem_legado: asString(body.origem_legado),
      legado_payload: isRecord(body.legado_payload) ? body.legado_payload : null,
      observacoes: asString(body.observacoes),
    };

    const { data, error } = await supabase
      .from("projetos_sociais_beneficiarios")
      .insert(payload)
      .select(
        "id,projeto_social_id,pessoa_id,status,data_inicio,data_fim,origem_legado,legado_payload,observacoes,created_at,updated_at"
      )
      .single();

    if (error) {
      if (error.code === "23505") return jsonError(409, "beneficiario_ja_vinculado_ao_projeto");
      return jsonError(500, "erro_criar_beneficiario", error.message);
    }

    return NextResponse.json({ ok: true, data: data as BeneficiarioRow }, { status: 201 });
  } catch (e) {
    const detail = e instanceof Error ? e.message : "erro_desconhecido";
    return jsonError(500, "erro_criar_beneficiario", detail);
  }
}
