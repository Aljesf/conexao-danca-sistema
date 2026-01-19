import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { guardApiByRole } from "@/lib/auth/roleGuard";

type TipoCadastro = "marcas" | "cores" | "numeracoes" | "tamanhos" | "modelos";

type ApiResponse<T = any> = {
  ok: boolean;
  error?: string;
  item?: T;
  tipo?: TipoCadastro;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[/api/loja/cadastros/[id]] Variaveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao definidas."
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

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  if (!supabaseAdmin) {
    return json(500, { ok: false, error: "supabase_config_missing" });
  }

  try {
    const { id } = await params;
    const cadastroId = Number(id);
    if (!Number.isFinite(cadastroId) || cadastroId <= 0) {
      return json(400, { ok: false, error: "id_invalido" });
    }

    const tipo = getTipoFromUrl(req);
    if (!tipo) return json(400, { ok: false, error: "tipo_invalido" });

    const table = mapTipoToTable(tipo);
    if (!table) return json(400, { ok: false, error: "tipo_invalido" });

    const body = await req.json().catch(() => null);
    if (!body) return json(400, { ok: false, error: "body_invalido" });

    const patch: Record<string, any> = { updated_at: new Date().toISOString() };
    if (body.ativo !== undefined) patch.ativo = !!body.ativo;

    if (tipo === "numeracoes") {
      if (body.valor !== undefined) {
        const valor = Number(body.valor);
        if (!Number.isFinite(valor) || valor <= 0) return json(400, { ok: false, error: "valor_invalido" });
        patch.valor = valor;
      }
      if (body.tipo !== undefined) {
        const tipoNum = String(body.tipo).trim().toUpperCase();
        if (!tipoNum) return json(400, { ok: false, error: "tipo_invalido" });
        patch.tipo = tipoNum;
      }
    } else if (tipo === "tamanhos") {
      if (body.nome !== undefined) {
        const nome = String(body.nome).trim();
        if (!nome) return json(400, { ok: false, error: "nome_obrigatorio" });
        patch.nome = nome;
      }
      if (body.tipo !== undefined) {
        const tipoTam = String(body.tipo).trim().toUpperCase();
        if (!tipoTam) return json(400, { ok: false, error: "tipo_obrigatorio" });
        patch.tipo = tipoTam;
      }
      if (body.ordem !== undefined) {
        const ordem = Number(body.ordem);
        if (!Number.isFinite(ordem)) return json(400, { ok: false, error: "ordem_invalida" });
        patch.ordem = ordem;
      }
    } else if (tipo === "cores") {
      if (body.nome !== undefined) {
        const nome = String(body.nome).trim();
        if (!nome) return json(400, { ok: false, error: "nome_obrigatorio" });
        patch.nome = nome;
      }
      if (body.codigo !== undefined) patch.codigo = body.codigo ? String(body.codigo).trim() : null;
      if (body.hex !== undefined) patch.hex = body.hex ? String(body.hex).trim() : null;
    } else {
      if (body.nome !== undefined) {
        const nome = String(body.nome).trim();
        if (!nome) return json(400, { ok: false, error: "nome_obrigatorio" });
        patch.nome = nome;
      }
    }

    const { data, error } = await supabaseAdmin
      .from(table)
      .update(patch)
      .eq("id", cadastroId)
      .select("*")
      .single();
    if (error) {
      console.error("Erro PUT /api/loja/cadastros/[id]", error);
      return json(500, { ok: false, error: error.message });
    }

    return json(200, { ok: true, tipo, item: data });
  } catch (e: any) {
    console.error("Erro inesperado PUT /api/loja/cadastros/[id]", e);
    return json(500, { ok: false, error: e?.message || "erro_interno" });
  }
}
