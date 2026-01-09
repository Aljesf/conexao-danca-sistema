import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { guardApiByRole } from "@/lib/auth/roleGuard";

type PlanoContaPayload = {
  id?: number;
  codigo?: string;
  nome?: string;
  tipo?: string;
  parent_id?: number | null;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[/api/financeiro/plano-contas] Variaveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao definidas."
  );
}

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

function json(status: number, payload: any) {
  return NextResponse.json(payload, { status });
}

export async function GET(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  if (!supabaseAdmin) {
    return json(500, { ok: false, error: "Configuracao do Supabase ausente." });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("plano_contas")
      .select("id, codigo, nome, tipo, parent_id")
      .order("tipo", { ascending: true })
      .order("codigo", { ascending: true });

    if (error) throw error;

    return json(200, { ok: true, data: data ?? [] });
  } catch (err) {
    console.error("[GET /api/financeiro/plano-contas] Erro:", err);
    return json(500, { ok: false, error: "Erro ao listar plano de contas." });
  }
}

export async function POST(req: NextRequest) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  if (!supabaseAdmin) {
    return json(500, { ok: false, error: "Configuracao do Supabase ausente." });
  }

  try {
    const body: PlanoContaPayload = await req.json();
    const codigo = (body.codigo ?? "").trim();
    const nome = (body.nome ?? "").trim();
    const tipo = (body.tipo ?? "").trim();
    const parent_id = body.parent_id === undefined ? null : body.parent_id;

    if (!codigo || !nome || !tipo) {
      return json(400, { ok: false, error: "campos_obrigatorios" });
    }

    const { data, error } = await supabaseAdmin
      .from("plano_contas")
      .insert({ codigo, nome, tipo, parent_id })
      .select("id, codigo, nome, tipo, parent_id")
      .single();

    if (error) throw error;

    return json(201, { ok: true, data });
  } catch (err) {
    console.error("[POST /api/financeiro/plano-contas] Erro:", err);
    return json(500, { ok: false, error: "erro_criar_plano_conta" });
  }
}

export async function PUT(req: NextRequest) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  if (!supabaseAdmin) {
    return json(500, { ok: false, error: "Configuracao do Supabase ausente." });
  }

  try {
    const body: PlanoContaPayload = await req.json();
    const id = body.id;
    if (!id) return json(400, { ok: false, error: "id_obrigatorio" });

    const updates: Record<string, any> = {};
    if (body.codigo !== undefined) updates.codigo = (body.codigo ?? "").trim();
    if (body.nome !== undefined) updates.nome = (body.nome ?? "").trim();
    if (body.tipo !== undefined) updates.tipo = (body.tipo ?? "").trim();
    if (body.parent_id !== undefined) updates.parent_id = body.parent_id ?? null;

    const { data, error } = await supabaseAdmin
      .from("plano_contas")
      .update(updates)
      .eq("id", id)
      .select("id, codigo, nome, tipo, parent_id")
      .single();

    if (error) throw error;

    return json(200, { ok: true, data });
  } catch (err) {
    console.error("[PUT /api/financeiro/plano-contas] Erro:", err);
    return json(500, { ok: false, error: "erro_atualizar_plano_conta" });
  }
}
