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

type ProjetoSocialPostBody = {
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

export async function GET(req: Request) {
  const denied = await guardApiByRole(req);
  if (denied) return denied;

  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const ativoParam = searchParams.get("ativo");
    const escolaIdParam = searchParams.get("escola_id");
    const escolaId = escolaIdParam ? toInt(escolaIdParam) : null;

    if (escolaIdParam && (!escolaId || escolaId <= 0)) {
      return jsonError(400, "escola_id_invalido");
    }

    let query = supabase
      .from("projetos_sociais")
      .select("id,escola_id,nome,descricao,ativo,created_at,updated_at")
      .order("nome", { ascending: true });

    if (ativoParam === "true") query = query.eq("ativo", true);
    if (ativoParam === "false") query = query.eq("ativo", false);
    if (escolaId) query = query.eq("escola_id", escolaId);

    const { data, error } = await query;
    if (error) return jsonError(500, "erro_listar_projetos_sociais", error.message);

    return NextResponse.json({ ok: true, data: (data ?? []) as ProjetoSocialRow[] });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "erro_desconhecido";
    return jsonError(500, "erro_listar_projetos_sociais", detail);
  }
}

export async function POST(req: Request) {
  const denied = await guardApiByRole(req);
  if (denied) return denied;

  try {
    const supabase = getSupabaseAdmin();
    const body = (await req.json().catch(() => null)) as ProjetoSocialPostBody | null;
    if (!body) return jsonError(400, "payload_invalido");

    const nome = asString(body.nome)?.trim() ?? "";
    const escolaId = toInt(body.escola_id);

    if (!nome) return jsonError(400, "nome_obrigatorio");
    if (body.escola_id !== undefined && body.escola_id !== null && (!escolaId || escolaId <= 0)) {
      return jsonError(400, "escola_id_invalido");
    }

    const { data, error } = await supabase
      .from("projetos_sociais")
      .insert({
        escola_id: escolaId ?? null,
        nome,
        descricao: asString(body.descricao) ?? null,
        ativo: body.ativo ?? true,
      })
      .select("id,escola_id,nome,descricao,ativo,created_at,updated_at")
      .single();

    if (error) return jsonError(500, "erro_criar_projeto_social", error.message);
    return NextResponse.json({ ok: true, data: data as ProjetoSocialRow }, { status: 201 });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "erro_desconhecido";
    return jsonError(500, "erro_criar_projeto_social", detail);
  }
}
