import { NextRequest, NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseServiceRole } from "@/lib/supabaseServer";

type CentroCustoPayload = {
  id?: number;
  codigo?: string;
  nome?: string;
  ativo?: boolean;
  contextos_aplicaveis?: string[];
};

let supabaseAdmin = null as ReturnType<typeof getSupabaseServiceRole> | null;

function getAdminClient() {
  if (!supabaseAdmin) {
    supabaseAdmin = getSupabaseServiceRole();
  }
  return supabaseAdmin;
}

function json(status: number, payload: any) {
  return NextResponse.json(payload, { status });
}

export async function GET(_req: NextRequest) {
  const denied = await guardApiByRole(_req as any);
  if (denied) return denied as any;
  const admin = getAdminClient();

  try {
    const { data, error } = await admin
      .from("centros_custo")
      .select("id, nome, codigo, ativo, contextos_aplicaveis")
      .order("nome", { ascending: true });

    if (error) throw error;

    return json(200, { ok: true, data: data ?? [] });
  } catch (err) {
    console.error("[GET /api/financeiro/centros-custo] Erro:", err);
    return json(500, { ok: false, error: "Erro ao listar centros de custo." });
  }
}

export async function POST(req: NextRequest) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const admin = getAdminClient();

  try {
    const body: CentroCustoPayload = await req.json();
    const codigo = (body.codigo ?? "").trim();
    const nome = (body.nome ?? "").trim();
    const ativo = body.ativo ?? true;
    const contextos = Array.isArray(body.contextos_aplicaveis) ? body.contextos_aplicaveis : [];

    if (!codigo || !nome) {
      return json(400, { ok: false, error: "codigo_e_nome_obrigatorios" });
    }

    const { data, error } = await admin
      .from("centros_custo")
      .insert({ codigo, nome, ativo, contextos_aplicaveis: contextos })
      .select("id, codigo, nome, ativo, contextos_aplicaveis")
      .single();

    if (error) throw error;

    return json(201, { ok: true, data });
  } catch (err) {
    console.error("[POST /api/financeiro/centros-custo] Erro:", err);
    return json(500, { ok: false, error: "erro_criar_centro_custo" });
  }
}

export async function PUT(req: NextRequest) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const admin = getAdminClient();

  try {
    const body: CentroCustoPayload = await req.json();
    const id = body.id;
    if (!id) return json(400, { ok: false, error: "id_obrigatorio" });

    const updates: Record<string, any> = {};
    if (body.codigo !== undefined) updates.codigo = (body.codigo ?? "").trim();
    if (body.nome !== undefined) updates.nome = (body.nome ?? "").trim();
    if (body.ativo !== undefined) updates.ativo = !!body.ativo;
    if (body.contextos_aplicaveis !== undefined) {
      updates.contextos_aplicaveis = Array.isArray(body.contextos_aplicaveis) ? body.contextos_aplicaveis : [];
    }

    const { data, error } = await admin
      .from("centros_custo")
      .update(updates)
      .eq("id", id)
      .select("id, codigo, nome, ativo, contextos_aplicaveis")
      .single();

    if (error) throw error;

    return json(200, { ok: true, data });
  } catch (err) {
    console.error("[PUT /api/financeiro/centros-custo] Erro:", err);
    return json(500, { ok: false, error: "erro_atualizar_centro_custo" });
  }
}
