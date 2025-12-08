import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ApiResponse<T = any> = {
  ok: boolean;
  error?: string;
  data?: T;
};

type ProdutoEstoqueResumo = {
  id: number;
  nome: string;
  codigo: string | null;
  categoria: string | null;
  estoque_atual: number;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[/api/loja/estoque] Variaveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao definidas."
  );
}

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

function json<T>(status: number, payload: ApiResponse<T>) {
  return NextResponse.json(payload, { status });
}

// GET /api/loja/estoque
// Lista produtos com saldo atual
export async function GET(req: NextRequest) {
  if (!supabaseAdmin) {
    return json(500, {
      ok: false,
      error:
        "Configuracao do Supabase ausente. Verifique NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
    });
  }

  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();

    let query = supabaseAdmin
      .from("loja_produtos")
      .select("id, nome, codigo, categoria, estoque_atual")
      .order("nome", { ascending: true });

    if (q) {
      const like = `%${q}%`;
      query = query.or(
        [
          `nome.ilike.${like}`,
          `codigo.ilike.${like}`,
          `categoria.ilike.${like}`,
        ].join(",")
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("[GET /api/loja/estoque] Erro Supabase:", error);
      return json(500, { ok: false, error: "Erro ao listar estoque." });
    }

    return json<ProdutoEstoqueResumo[]>(200, {
      ok: true,
      data: data ?? [],
    });
  } catch (err) {
    console.error("[GET /api/loja/estoque] Erro inesperado:", err);
    return json(500, { ok: false, error: "Erro inesperado ao listar estoque." });
  }
}
