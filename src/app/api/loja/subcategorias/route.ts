import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { guardApiByRole } from "@/lib/auth/roleGuard";

type ApiResponse<T> = { ok: boolean; error?: string; data?: T };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

function json<T>(status: number, payload: ApiResponse<T>) {
  return NextResponse.json(payload, { status });
}

function normalizeCodigoSub(nome: string): string {
  const base = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return base.slice(0, 40) || "SUBCATEGORIA";
}

type SubcategoriaRow = {
  id: number;
  categoria_id: number;
  nome: string;
  codigo: string | null;
  ativo: boolean;
};

export async function GET(req: NextRequest) {
  const denied = await guardApiByRole(req as unknown as Request);
  if (denied) return denied as unknown as NextResponse;

  if (!supabaseAdmin) {
    return json(500, { ok: false, error: "Supabase nao configurado." });
  }

  const categoriaIdRaw = req.nextUrl.searchParams.get("categoria_id");
  const categoria_id = categoriaIdRaw ? Number(categoriaIdRaw) : NaN;
  if (!categoriaIdRaw || Number.isNaN(categoria_id)) {
    return json(400, { ok: false, error: "categoria_id_obrigatorio" });
  }

  const { data, error } = await supabaseAdmin
    .from("loja_produto_categoria_subcategoria")
    .select("id,categoria_id,nome,codigo,ativo")
    .eq("categoria_id", categoria_id)
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (error) return json(500, { ok: false, error: error.message });
  return json(200, { ok: true, data: (data ?? []) as SubcategoriaRow[] });
}

export async function POST(req: NextRequest) {
  const denied = await guardApiByRole(req as unknown as Request);
  if (denied) return denied as unknown as NextResponse;

  if (!supabaseAdmin) {
    return json(500, { ok: false, error: "Supabase nao configurado." });
  }

  const body: unknown = await req.json().catch(() => ({}));
  const categoria_id =
    typeof (body as { categoria_id?: unknown }).categoria_id === "number"
      ? (body as { categoria_id: number }).categoria_id
      : Number((body as { categoria_id?: unknown }).categoria_id);

  const nome =
    typeof (body as { nome?: unknown }).nome === "string"
      ? (body as { nome: string }).nome.trim()
      : "";
  const codigoRaw =
    typeof (body as { codigo?: unknown }).codigo === "string"
      ? (body as { codigo: string }).codigo.trim()
      : "";

  if (!categoria_id || Number.isNaN(categoria_id)) {
    return json(400, { ok: false, error: "categoria_id_obrigatorio" });
  }
  if (!nome) return json(400, { ok: false, error: "nome_obrigatorio" });

  const codigo = codigoRaw ? codigoRaw : normalizeCodigoSub(nome);

  const { data, error } = await supabaseAdmin
    .from("loja_produto_categoria_subcategoria")
    .insert({ categoria_id, nome, codigo, ativo: true })
    .select("id,categoria_id,nome,codigo,ativo")
    .single();

  if (error) return json(500, { ok: false, error: error.message });
  return json(201, { ok: true, data: data as SubcategoriaRow });
}
