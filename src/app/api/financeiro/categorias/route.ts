import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { guardApiByRole } from "@/lib/auth/roleGuard";

type CategoriaPayload = {
  id?: number;
  tipo?: string;
  codigo?: string;
  nome?: string;
  plano_conta_id?: number | null;
  ativo?: boolean;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[/api/financeiro/categorias] Variaveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao definidas."
  );
}

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

function json(status: number, payload: any) {
  return NextResponse.json(payload, { status });
}

export async function GET(_req: NextRequest) {
  const denied = await guardApiByRole(_req as any);
  if (denied) return denied as any;
  if (!supabaseAdmin) {
    return json(500, { ok: false, error: "Configuracao do Supabase ausente." });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("categorias_financeiras")
      .select("id, codigo, nome, tipo, ativo, plano_conta_id")
      .order("tipo", { ascending: true })
      .order("codigo", { ascending: true });

    if (error) throw error;

    return json(200, { ok: true, data: data ?? [] });
  } catch (err) {
    console.error("[GET /api/financeiro/categorias] Erro:", err);
    return json(500, { ok: false, error: "Erro ao listar categorias financeiras." });
  }
}

export async function POST(req: NextRequest) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  if (!supabaseAdmin) {
    return json(500, { ok: false, error: "Configuracao do Supabase ausente." });
  }

  try {
    const body: CategoriaPayload = await req.json();
    const tipo = (body.tipo ?? "").trim();
    const codigo = (body.codigo ?? "").trim();
    const nome = (body.nome ?? "").trim();
    const plano_conta_id =
      body?.plano_conta_id === null || body?.plano_conta_id === undefined
        ? null
        : Number(body.plano_conta_id);
    const ativo = body.ativo ?? true;

    if (!tipo || !codigo || !nome) {
      return json(400, { ok: false, error: "campos_obrigatorios" });
    }

    const { data, error } = await supabaseAdmin
      .from("categorias_financeiras")
      .insert({
        tipo,
        codigo,
        nome,
        plano_conta_id,
        ativo,
      })
      .select("id, tipo, codigo, nome, plano_conta_id, ativo")
      .single();

    if (error) throw error;

    return json(201, { ok: true, data });
  } catch (err) {
    console.error("[POST /api/financeiro/categorias] Erro:", err);
    return json(500, { ok: false, error: "erro_criar_categoria_financeira" });
  }
}

export async function PUT(req: NextRequest) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  if (!supabaseAdmin) {
    return json(500, { ok: false, error: "Configuracao do Supabase ausente." });
  }

  try {
    const body: CategoriaPayload = await req.json();
    const id = body.id;
    if (!id) return json(400, { ok: false, error: "id_obrigatorio" });

    const updates: Record<string, any> = {};
    if (body.tipo !== undefined) updates.tipo = (body.tipo ?? "").trim();
    if (body.codigo !== undefined) updates.codigo = (body.codigo ?? "").trim();
    if (body.nome !== undefined) updates.nome = (body.nome ?? "").trim();
    if (body.ativo !== undefined) updates.ativo = !!body.ativo;
    if (body.plano_conta_id !== undefined) {
      updates.plano_conta_id =
        body.plano_conta_id === null || body.plano_conta_id === undefined
          ? null
          : Number(body.plano_conta_id);
    }

    const { data, error } = await supabaseAdmin
      .from("categorias_financeiras")
      .update(updates)
      .eq("id", id)
      .select("id, tipo, codigo, nome, plano_conta_id, ativo")
      .single();

    if (error) throw error;

    return json(200, { ok: true, data });
  } catch (err) {
    console.error("[PUT /api/financeiro/categorias] Erro:", err);
    return json(500, { ok: false, error: "erro_atualizar_categoria_financeira" });
  }
}
