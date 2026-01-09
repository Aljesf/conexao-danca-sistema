import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { guardApiByRole } from "@/lib/auth/roleGuard";

type TipoCadastro = "marcas" | "cores" | "numeracoes" | "tamanhos" | "modelos";

type ApiResponse<T = any> = {
  ok: boolean;
  error?: string;
  items?: T;
  tipo?: TipoCadastro;
  item?: any;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[/api/loja/cadastros] Variaveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao definidas."
  );
}

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      })
    : null;

function json<T>(status: number, payload: ApiResponse<T>) {
  return NextResponse.json(payload, { status });
}

function mapTipoToTable(tipo: TipoCadastro) {
  switch (tipo) {
    case "marcas":
      return "loja_marcas";
    case "cores":
      return "loja_cores";
    case "numeracoes":
      return "loja_numeracoes";
    case "tamanhos":
      return "loja_tamanhos";
    case "modelos":
      return "loja_modelos";
    default:
      return null;
  }
}

function getTipoFromUrl(req: NextRequest): TipoCadastro | null {
  const { searchParams } = new URL(req.url);
  const tipo = (searchParams.get("tipo") || "").trim().toLowerCase();
  if (
    tipo === "marcas" ||
    tipo === "cores" ||
    tipo === "numeracoes" ||
    tipo === "tamanhos" ||
    tipo === "modelos"
  ) {
    return tipo;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  if (!supabaseAdmin) {
    return json(500, { ok: false, error: "supabase_config_missing" });
  }

  try {
    const tipo = getTipoFromUrl(req);
    if (!tipo) return json(400, { ok: false, error: "tipo_invalido" });

    const table = mapTipoToTable(tipo);
    if (!table) return json(400, { ok: false, error: "tipo_invalido" });

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const ativo = searchParams.get("ativo"); // "true" | "false" | null

    let query = supabaseAdmin.from(table).select("*");

    if (tipo === "numeracoes") {
      if (q) {
        const n = Number(q);
        if (Number.isFinite(n)) query = query.eq("valor", n);
      }
      if (ativo === "true") query = query.eq("ativo", true);
      if (ativo === "false") query = query.eq("ativo", false);
      query = query.order("tipo", { ascending: true }).order("valor", { ascending: true });
    } else if (tipo === "tamanhos") {
      if (q) query = query.ilike("nome", `%${q}%`);
      if (ativo === "true") query = query.eq("ativo", true);
      if (ativo === "false") query = query.eq("ativo", false);
      query = query
        .order("tipo", { ascending: true })
        .order("ordem", { ascending: true })
        .order("nome", { ascending: true });
    } else if (tipo === "cores") {
      if (q) query = query.ilike("nome", `%${q}%`);
      if (ativo === "true") query = query.eq("ativo", true);
      if (ativo === "false") query = query.eq("ativo", false);
      query = query.order("nome", { ascending: true });
    } else {
      if (q) query = query.ilike("nome", `%${q}%`);
      if (ativo === "true") query = query.eq("ativo", true);
      if (ativo === "false") query = query.eq("ativo", false);
      query = query.order("nome", { ascending: true });
    }

    const { data, error } = await query;
    if (error) {
      console.error("Erro GET /api/loja/cadastros", error);
      return json(500, { ok: false, error: "erro_listar" });
    }

    return json(200, { ok: true, tipo, items: data ?? [] });
  } catch (e: any) {
    console.error("Erro inesperado GET /api/loja/cadastros", e);
    return json(500, { ok: false, error: e?.message || "erro_interno" });
  }
}

export async function POST(req: NextRequest) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  if (!supabaseAdmin) {
    return json(500, { ok: false, error: "supabase_config_missing" });
  }

  try {
    const tipo = getTipoFromUrl(req);
    if (!tipo) return json(400, { ok: false, error: "tipo_invalido" });

    const table = mapTipoToTable(tipo);
    if (!table) return json(400, { ok: false, error: "tipo_invalido" });

    const body = await req.json().catch(() => null);
    if (!body) return json(400, { ok: false, error: "body_invalido" });

    const ativo = body.ativo === undefined ? true : !!body.ativo;
    const payload: Record<string, any> = { ativo, updated_at: new Date().toISOString() };

    if (tipo === "numeracoes") {
      const valor = Number(body.valor);
      const tipoNum = String(body.tipo || "CALCADO").trim().toUpperCase();
      if (!Number.isFinite(valor) || valor <= 0) return json(400, { ok: false, error: "valor_obrigatorio" });
      if (!tipoNum) return json(400, { ok: false, error: "tipo_obrigatorio" });
      payload.valor = valor;
      payload.tipo = tipoNum;
    } else if (tipo === "tamanhos") {
      const nome = String(body.nome || "").trim();
      const tipoTam = String(body.tipo || "ROUPA").trim().toUpperCase();
      const ordem = body.ordem === undefined ? 0 : Number(body.ordem);
      if (!nome) return json(400, { ok: false, error: "nome_obrigatorio" });
      if (!tipoTam) return json(400, { ok: false, error: "tipo_obrigatorio" });
      if (!Number.isFinite(ordem)) return json(400, { ok: false, error: "ordem_invalida" });
      payload.nome = nome;
      payload.tipo = tipoTam;
      payload.ordem = ordem;
    } else if (tipo === "cores") {
      const nome = String(body.nome || "").trim();
      const codigo = body.codigo ? String(body.codigo).trim() : null;
      const hex = body.hex ? String(body.hex).trim() : null;
      if (!nome) return json(400, { ok: false, error: "nome_obrigatorio" });
      payload.nome = nome;
      payload.codigo = codigo || null;
      payload.hex = hex || null;
    } else {
      const nome = String(body.nome || "").trim();
      if (!nome) return json(400, { ok: false, error: "nome_obrigatorio" });
      payload.nome = nome;
    }

    const { data, error } = await supabaseAdmin.from(table).insert(payload).select("*").single();
    if (error) {
      console.error("Erro POST /api/loja/cadastros", error);
      return json(500, { ok: false, error: error.message });
    }

    return json(201, { ok: true, tipo, item: data });
  } catch (e: any) {
    console.error("Erro inesperado POST /api/loja/cadastros", e);
    return json(500, { ok: false, error: e?.message || "erro_interno" });
  }
}
