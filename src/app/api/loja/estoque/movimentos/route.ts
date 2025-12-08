import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ApiResponse<T = any> = {
  ok: boolean;
  error?: string;
  data?: T;
};

type MovimentoEstoque = {
  id: number;
  produto_id: number;
  tipo: "ENTRADA" | "SAIDA" | "AJUSTE";
  quantidade: number;
  origem: string;
  referencia_id?: number | null;
  observacao?: string | null;
  created_at: string;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[/api/loja/estoque/movimentos] Variaveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao definidas."
  );
}

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

function json<T>(status: number, payload: ApiResponse<T>) {
  return NextResponse.json(payload, { status });
}

// GET /api/loja/estoque/movimentos?produto_id=...&limit=...
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
    const produtoId = Number(searchParams.get("produto_id"));
    const limit = Number(searchParams.get("limit") ?? 20);
    const dias = Number(searchParams.get("dias") ?? 0);

    if (!produtoId || Number.isNaN(produtoId)) {
      return json(400, { ok: false, error: "produto_id obrigatorio." });
    }

    let query = supabaseAdmin
      .from("loja_estoque_movimentos")
      .select("*")
      .eq("produto_id", produtoId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (dias > 0) {
      const dataInicial = new Date();
      dataInicial.setDate(dataInicial.getDate() - dias);
      query = query.gte("created_at", dataInicial.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error(
        "[GET /api/loja/estoque/movimentos] Erro Supabase:",
        error
      );
      return json(500, {
        ok: false,
        error: "Erro ao listar movimentos de estoque.",
      });
    }

    return json<MovimentoEstoque[]>(200, { ok: true, data: data ?? [] });
  } catch (err) {
    console.error("[GET /api/loja/estoque/movimentos] Erro inesperado:", err);
    return json(500, {
      ok: false,
      error: "Erro inesperado ao listar movimentos de estoque.",
    });
  }
}

// POST /api/loja/estoque/movimentos
// Registro de ajuste manual (entrada/saida) + atualizacao de estoque_atual
export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return json(500, {
      ok: false,
      error:
        "Configuracao do Supabase ausente. Verifique NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
    });
  }

  try {
    const body = await req.json();
    const produto_id = Number(body?.produto_id);
    const tipo = (body?.tipo as string | undefined)?.toUpperCase();
    const quantidade = Number(body?.quantidade);
    const observacao = body?.observacao ?? null;

    if (!produto_id || Number.isNaN(produto_id)) {
      return json(400, { ok: false, error: "produto_id obrigatorio." });
    }
    if (!tipo || (tipo !== "ENTRADA" && tipo !== "SAIDA")) {
      return json(400, { ok: false, error: "tipo deve ser ENTRADA ou SAIDA." });
    }
    if (!quantidade || quantidade <= 0) {
      return json(400, {
        ok: false,
        error: "Quantidade deve ser maior que zero.",
      });
    }

    // Busca estoque atual
    const { data: prodRow, error: prodErr } = await supabaseAdmin
      .from("loja_produtos")
      .select("estoque_atual")
      .eq("id", produto_id)
      .maybeSingle();

    if (prodErr) {
      console.error("[POST /api/loja/estoque/movimentos] Erro produto:", prodErr);
      return json(500, { ok: false, error: "Erro ao buscar produto." });
    }
    if (!prodRow) {
      return json(404, { ok: false, error: "Produto nao encontrado." });
    }

    const estoqueAtual = Number(prodRow.estoque_atual) || 0;
    const novoEstoque =
      tipo === "ENTRADA"
        ? estoqueAtual + quantidade
        : Math.max(estoqueAtual - quantidade, 0);

    // 1) registra movimento
    const { data: movData, error: movErr } = await supabaseAdmin
      .from("loja_estoque_movimentos")
      .insert({
        produto_id,
        tipo,
        quantidade,
        origem: "AJUSTE_MANUAL",
        referencia_id: null,
        observacao,
      })
      .select("*")
      .single();

    if (movErr) {
      console.error(
        "[POST /api/loja/estoque/movimentos] Erro ao criar movimento:",
        movErr
      );
      return json(500, { ok: false, error: "Erro ao registrar movimento." });
    }

    // 2) atualiza estoque_atual
    const { error: updErr } = await supabaseAdmin
      .from("loja_produtos")
      .update({ estoque_atual: novoEstoque })
      .eq("id", produto_id);

    if (updErr) {
      console.error(
        "[POST /api/loja/estoque/movimentos] Erro ao atualizar estoque:",
        updErr
      );
      return json(500, {
        ok: false,
        error: "Movimento registrado, mas falhou ao atualizar estoque.",
      });
    }

    return json(200, {
      ok: true,
      data: { movimento: movData, estoque_atual: novoEstoque },
    });
  } catch (err) {
    console.error("[POST /api/loja/estoque/movimentos] Erro inesperado:", err);
    return json(500, {
      ok: false,
      error: "Erro inesperado ao registrar movimento de estoque.",
    });
  }
}
