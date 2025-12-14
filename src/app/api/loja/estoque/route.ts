import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
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

function isMotivoCheck(err: any) {
  return String(err?.code || "") === "23514" && String(err?.message || "").includes("motivo_check");
}

function json<T>(status: number, payload: ApiResponse<T>) {
  return NextResponse.json(payload, { status });
}

// GET /api/loja/estoque
// Lista produtos com saldo atual
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = supabaseAdmin ?? createRouteHandlerClient({ cookies: () => cookieStore });

    if (!supabase) {
      return json(500, {
        ok: false,
        error:
          "Configuracao do Supabase ausente. Verifique NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
      });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();

    let query = supabase
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

    const produtos = (data as ProdutoEstoqueResumo[] | null | undefined) ?? [];

    // Busca estoque total pela view de variantes
    const estoqueMap = new Map<number, number>();
    if (produtos.length > 0) {
      const ids = produtos.map((p) => p.id);
      const { data: estoqueData, error: estoqueErr } = await supabase
        .from("v_loja_produtos_estoque")
        .select("produto_id, estoque_total")
        .in("produto_id", ids);

      if (estoqueErr) {
        console.error("[GET /api/loja/estoque] Erro ao buscar estoque na view:", estoqueErr);
      } else {
        (estoqueData || []).forEach((row: any) => {
          estoqueMap.set(Number(row.produto_id), Number(row.estoque_total) || 0);
        });
      }
    }

    const resposta: ProdutoEstoqueResumo[] = produtos.map((p) => ({
      ...p,
      estoque_atual: estoqueMap.get(p.id) ?? 0,
    }));

    return json<ProdutoEstoqueResumo[]>(200, {
      ok: true,
      data: resposta,
    });
  } catch (err) {
    console.error("[GET /api/loja/estoque] Erro inesperado:", err);
    return json(500, { ok: false, error: "Erro inesperado ao listar estoque." });
  }
}

// POST /api/loja/estoque
// Ajuste manual de estoque por VARIANTE
export async function POST(req: Request) {
  if (!supabaseAdmin) {
    return json(500, {
      ok: false,
      error:
        "Configuracao do Supabase ausente. Verifique NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
    });
  }

  const cookieStore = await cookies();
  const supabase = supabaseAdmin ?? createRouteHandlerClient({ cookies: () => cookieStore });

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, error: "Body JSON invalido." });
  }

  const produto_id = Number(body?.produto_id);
  const variante_id = Number(body?.variante_id);
  const operacao = String(body?.operacao || "").toUpperCase();
  const quantidade = Number(body?.quantidade);
  const observacoes = body?.observacoes ? String(body.observacoes) : null;

  if (!Number.isFinite(produto_id) || produto_id <= 0) {
    return json(400, { ok: false, error: "produto_id invalido." });
  }
  if (!Number.isFinite(variante_id) || variante_id <= 0) {
    return json(400, { ok: false, error: "variante_id invalido." });
  }
  if (operacao !== "ENTRADA" && operacao !== "SAIDA") {
    return json(400, { ok: false, error: "Operacao invalida. Use ENTRADA ou SAIDA." });
  }
  if (!Number.isFinite(quantidade) || quantidade <= 0) {
    return json(400, { ok: false, error: "Quantidade invalida." });
  }

  try {
    const getSaldoProduto = async (produto: number) => {
      const { data, error } = await supabase
        .from("v_loja_produtos_estoque")
        .select("estoque_total")
        .eq("produto_id", produto)
        .maybeSingle();
      if (error) throw error;
      return Number(data?.estoque_total ?? 0);
    };

    const { data: variante, error: varianteError } = await supabase
      .from("loja_produto_variantes")
      .select("id, produto_id, estoque_atual")
      .eq("id", variante_id)
      .maybeSingle();

    if (varianteError) {
      console.error("[POST /api/loja/estoque] erro ao buscar variante:", varianteError);
      return json(500, { ok: false, error: "erro_buscar_variante" });
    }

    if (!variante) {
      return json(404, { ok: false, error: "variante_nao_encontrada" });
    }

    if (Number(variante.produto_id) !== produto_id) {
      return json(400, { ok: false, error: "variante_nao_pertence_ao_produto" });
    }

    const saldoVarianteAntes = Number(variante.estoque_atual ?? 0) || 0;
    const delta = operacao === "ENTRADA" ? quantidade : -quantidade;
    const saldoVarianteDepois = saldoVarianteAntes + delta;

    if (saldoVarianteDepois < 0) {
      return json(400, { ok: false, error: "estoque_insuficiente", saldoAntes: saldoVarianteAntes });
    }

    const saldoProdutoAntes = await getSaldoProduto(produto_id);

    const { data: varianteAtualizada, error: updError } = await supabase
      .from("loja_produto_variantes")
      .update({ estoque_atual: saldoVarianteDepois, updated_at: new Date().toISOString() })
      .eq("id", variante_id)
      .select("*")
      .single();

    if (updError) {
      console.error("[POST /api/loja/estoque] erro ao atualizar variante:", updError);
      return json(500, { ok: false, error: "erro_atualizar_variante" });
    }

    const saldoProdutoDepois = await getSaldoProduto(produto_id);

    const saldo_antes = saldoVarianteAntes;
    const saldo_depois = saldoVarianteDepois;

    const movPayload: any = {
      produto_id,
      variante_id,
      tipo: operacao === "ENTRADA" ? "ENTRADA" : "SAIDA",
      origem: "AJUSTE_MANUAL",
      motivo: "AJUSTE_MANUAL",
      referencia_id: null,
      quantidade,
      saldo_antes,
      saldo_depois,
      observacao: observacoes ?? null,
      created_by: null,
    };

    const movRes = await supabase.from("loja_estoque_movimentos").insert(movPayload);

    if (movRes.error) {
      console.error("[/api/loja/estoque] falha ao inserir movimento", movRes.error, movPayload);

      if (isMotivoCheck(movRes.error)) {
        return NextResponse.json(
          {
            ok: true,
            warning: {
              type: "MOV_ESTOQUE_PENDENTE",
              message: movRes.error.message,
              code: movRes.error.code,
            },
            variante: { id: variante_id, estoque_atual: saldo_depois },
          },
          { status: 200 }
        );
      }

      return NextResponse.json(
        { ok: false, error: movRes.error.message, details: movRes.error },
        { status: 500 }
      );
    }

    return json(200, { ok: true, variante: varianteAtualizada, movimento: movPayload });
  } catch (err) {
    console.error("[POST /api/loja/estoque] Erro inesperado:", err);
    return json(500, { ok: false, error: "Erro inesperado ao ajustar estoque." });
  }
}
