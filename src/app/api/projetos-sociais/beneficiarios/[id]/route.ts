import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type Status = "ATIVO" | "INATIVO" | "SUSPENSO";

type PutBody = Partial<{
  status: Status;
  data_inicio: string;
  data_fim: string | null;
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

function isStatus(value: unknown): value is Status {
  return value === "ATIVO" || value === "INATIVO" || value === "SUSPENSO";
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
      .from("projetos_sociais_beneficiarios")
      .select(
        "id,projeto_social_id,pessoa_id,status,data_inicio,data_fim,origem_legado,legado_payload,observacoes,created_at,updated_at"
      )
      .eq("id", id)
      .maybeSingle();

    if (error) return jsonError(500, "erro_buscar_beneficiario", error.message);
    if (!data) return jsonError(404, "beneficiario_nao_encontrado");

    return NextResponse.json({ ok: true, data });
  } catch (e) {
    const detail = e instanceof Error ? e.message : "erro_desconhecido";
    return jsonError(500, "erro_buscar_beneficiario", detail);
  }
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardApiByRole(req);
  if (denied) return denied;

  try {
    const { id: rawId } = await ctx.params;
    const id = toInt(rawId);
    if (!id || id <= 0) return jsonError(400, "id_invalido");

    const body = (await req.json().catch(() => null)) as PutBody | null;
    if (!body) return jsonError(400, "payload_invalido");

    const patch: Record<string, unknown> = {};

    if ("status" in body) {
      if (!isStatus(body.status)) return jsonError(400, "status_invalido");
      patch.status = body.status;
    }

    if ("data_inicio" in body) {
      const di = asString(body.data_inicio) ?? "";
      if (!isIsoDate(di)) return jsonError(400, "data_inicio_invalida");
      patch.data_inicio = di;
    }

    if ("data_fim" in body) {
      const df = asString(body.data_fim);
      if (df && !isIsoDate(df)) return jsonError(400, "data_fim_invalida");
      patch.data_fim = df ?? null;
    }

    if ("observacoes" in body) patch.observacoes = asString(body.observacoes) ?? null;

    if (Object.keys(patch).length === 0) return jsonError(400, "nada_para_atualizar");

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("projetos_sociais_beneficiarios")
      .update(patch)
      .eq("id", id)
      .select(
        "id,projeto_social_id,pessoa_id,status,data_inicio,data_fim,origem_legado,legado_payload,observacoes,created_at,updated_at"
      )
      .maybeSingle();

    if (error) return jsonError(500, "erro_atualizar_beneficiario", error.message);
    if (!data) return jsonError(404, "beneficiario_nao_encontrado");

    return NextResponse.json({ ok: true, data });
  } catch (e) {
    const detail = e instanceof Error ? e.message : "erro_desconhecido";
    return jsonError(500, "erro_atualizar_beneficiario", detail);
  }
}
