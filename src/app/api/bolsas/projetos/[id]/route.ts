import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type ProjetoSocialRow = {
  id: number;
  escola_id: number | null;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

type ProjetoSocialPutBody = {
  escola_id?: number | null;
  nome?: string;
  descricao?: string | null;
  ativo?: boolean;
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
      .from("projetos_sociais")
      .select("id,escola_id,nome,descricao,ativo,created_at,updated_at")
      .eq("id", id)
      .maybeSingle();

    if (error) return jsonError(500, "erro_buscar_projeto_social", error.message);
    if (!data) return jsonError(404, "projeto_social_nao_encontrado");

    return NextResponse.json({ ok: true, data: data as ProjetoSocialRow });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "erro_desconhecido";
    return jsonError(500, "erro_buscar_projeto_social", detail);
  }
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardApiByRole(req);
  if (denied) return denied;

  try {
    const { id: rawId } = await ctx.params;
    const id = toInt(rawId);
    if (!id || id <= 0) return jsonError(400, "id_invalido");

    const body = (await req.json().catch(() => null)) as ProjetoSocialPutBody | null;
    if (!body) return jsonError(400, "payload_invalido");

    const patch: {
      escola_id?: number | null;
      nome?: string;
      descricao?: string | null;
      ativo?: boolean;
    } = {};

    if ("nome" in body) {
      const nome = asString(body.nome)?.trim() ?? "";
      if (!nome) return jsonError(400, "nome_invalido");
      patch.nome = nome;
    }

    if ("descricao" in body) patch.descricao = asString(body.descricao) ?? null;
    if (typeof body.ativo === "boolean") patch.ativo = body.ativo;

    if ("escola_id" in body) {
      const escolaId = toInt(body.escola_id);
      if (body.escola_id !== null && body.escola_id !== undefined && (!escolaId || escolaId <= 0)) {
        return jsonError(400, "escola_id_invalido");
      }
      patch.escola_id = escolaId ?? null;
    }

    if (Object.keys(patch).length === 0) return jsonError(400, "nada_para_atualizar");

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("projetos_sociais")
      .update(patch)
      .eq("id", id)
      .select("id,escola_id,nome,descricao,ativo,created_at,updated_at")
      .maybeSingle();

    if (error) return jsonError(500, "erro_atualizar_projeto_social", error.message);
    if (!data) return jsonError(404, "projeto_social_nao_encontrado");

    return NextResponse.json({ ok: true, data: data as ProjetoSocialRow });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "erro_desconhecido";
    return jsonError(500, "erro_atualizar_projeto_social", detail);
  }
}
