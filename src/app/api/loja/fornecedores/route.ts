import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { guardApiByRole } from "@/lib/auth/roleGuard";

type ApiResponse<T = any> = {
  ok: boolean;
  error?: string;
  data?: T;
};

type Fornecedor = {
  id: number;
  pessoa_id: number;
  codigo_interno: string | null;
  ativo: boolean;
  observacoes: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  pessoa_nome?: string | null;
  pessoa_documento?: string | null;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[/api/loja/fornecedores] Variaveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao definidas."
  );
}

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

function json<T>(status: number, payload: ApiResponse<T>) {
  return NextResponse.json(payload, { status });
}

// ==============================
// GET /api/loja/fornecedores
// Lista fornecedores (opcional filtro q)
// ==============================
export async function GET(req: NextRequest) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  if (!supabaseAdmin) {
    return json(500, {
      ok: false,
      error:
        "Configuracao do Supabase ausente. Verifique NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
    });
  }

  const { q } = Object.fromEntries(req.nextUrl.searchParams);
  const termo = (q || "").trim();

  try {
    let query = supabaseAdmin
      .from("loja_fornecedores")
      .select(
        `
        id,
        pessoa_id,
        codigo_interno,
        ativo,
        observacoes,
        created_at,
        updated_at,
        pessoas:pessoa_id (
          nome,
          cpf,
          cnpj
        )
      `
      )
      .order("id", { ascending: true });

    if (termo) {
      query = query.or(
        `codigo_interno.ilike.%${termo}%,pessoas.nome.ilike.%${termo}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("[GET /api/loja/fornecedores] Erro Supabase:", error);
      return json(500, { ok: false, error: "Erro ao listar fornecedores." });
    }

    const rows: Fornecedor[] =
      (data as any[] | null | undefined)?.map((f) => ({
        id: f.id,
        pessoa_id: f.pessoa_id,
        codigo_interno: f.codigo_interno,
        ativo: f.ativo,
        observacoes: f.observacoes,
        created_at: f.created_at,
        updated_at: f.updated_at,
        pessoa_nome: f.pessoas?.nome ?? null,
        pessoa_documento: f.pessoas?.cnpj || f.pessoas?.cpf || null,
      })) ?? [];

    return json(200, { ok: true, data: rows });
  } catch (e) {
    console.error("[GET /api/loja/fornecedores] Erro inesperado:", e);
    return json(500, { ok: false, error: "Erro inesperado ao listar fornecedores." });
  }
}

// ==============================
// POST /api/loja/fornecedores
// Cria fornecedor
// ==============================
export async function POST(req: NextRequest) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  if (!supabaseAdmin) {
    return json(500, {
      ok: false,
      error:
        "Configuracao do Supabase ausente. Verifique NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
    });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, error: "Body JSON invalido." });
  }

  const { pessoa_id, codigo_interno, ativo = true, observacoes } = body ?? {};

  if (!pessoa_id || typeof pessoa_id !== "number") {
    return json(400, { ok: false, error: "Campo 'pessoa_id' e obrigatorio e deve ser numerico." });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("loja_fornecedores")
      .insert({
        pessoa_id,
        codigo_interno: codigo_interno || null,
        ativo: Boolean(ativo),
        observacoes: observacoes || null,
      })
      .select(
        `
        id,
        pessoa_id,
        codigo_interno,
        ativo,
        observacoes,
        created_at,
        updated_at,
        pessoas:pessoa_id (nome, cpf, cnpj)
      `
      )
      .single();

    if (error) {
      console.error("[POST /api/loja/fornecedores] Erro Supabase:", error);
      return json(500, { ok: false, error: "Erro ao criar fornecedor." });
    }

    const row: Fornecedor = {
      id: data.id,
      pessoa_id: data.pessoa_id,
      codigo_interno: data.codigo_interno,
      ativo: data.ativo,
      observacoes: data.observacoes,
      created_at: data.created_at,
      updated_at: data.updated_at,
      pessoa_nome: data.pessoas?.nome ?? null,
      pessoa_documento: data.pessoas?.cnpj || data.pessoas?.cpf || null,
    };

    return json(201, { ok: true, data: row });
  } catch (e) {
    console.error("[POST /api/loja/fornecedores] Erro inesperado:", e);
    return json(500, { ok: false, error: "Erro inesperado ao criar fornecedor." });
  }
}

// ==============================
// PUT /api/loja/fornecedores
// Atualiza dados basicos (codigo_interno, ativo, observacoes)
// ==============================
export async function PUT(req: NextRequest) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  if (!supabaseAdmin) {
    return json(500, {
      ok: false,
      error:
        "Configuracao do Supabase ausente. Verifique NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
    });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, error: "Body JSON invalido." });
  }

  const { id, codigo_interno, ativo, observacoes } = body ?? {};

  if (!id || typeof id !== "number") {
    return json(400, { ok: false, error: "Campo 'id' e obrigatorio e deve ser numerico." });
  }

  const updatePayload: Record<string, any> = {};

  if (typeof codigo_interno !== "undefined") {
    updatePayload.codigo_interno = codigo_interno || null;
  }
  if (typeof ativo !== "undefined") {
    updatePayload.ativo = Boolean(ativo);
  }
  if (typeof observacoes !== "undefined") {
    updatePayload.observacoes = observacoes || null;
  }

  if (Object.keys(updatePayload).length === 0) {
    return json(400, { ok: false, error: "Nenhum campo valido para atualizar." });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("loja_fornecedores")
      .update(updatePayload)
      .eq("id", id)
      .select(
        `
        id,
        pessoa_id,
        codigo_interno,
        ativo,
        observacoes,
        created_at,
        updated_at,
        pessoas:pessoa_id (nome, cpf, cnpj)
      `
      )
      .single();

    if (error) {
      console.error("[PUT /api/loja/fornecedores] Erro Supabase:", error);
      return json(500, { ok: false, error: "Erro ao atualizar fornecedor." });
    }

    const row: Fornecedor = {
      id: data.id,
      pessoa_id: data.pessoa_id,
      codigo_interno: data.codigo_interno,
      ativo: data.ativo,
      observacoes: data.observacoes,
      created_at: data.created_at,
      updated_at: data.updated_at,
      pessoa_nome: data.pessoas?.nome ?? null,
      pessoa_documento: data.pessoas?.cnpj || data.pessoas?.cpf || null,
    };

    return json(200, { ok: true, data: row });
  } catch (e) {
    console.error("[PUT /api/loja/fornecedores] Erro inesperado:", e);
    return json(500, { ok: false, error: "Erro inesperado ao atualizar fornecedor." });
  }
}
