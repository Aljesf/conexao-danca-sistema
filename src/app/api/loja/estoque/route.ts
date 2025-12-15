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

async function getCentroCustoLojaId(supabase: any) {
  const envId = Number(process.env.CENTRO_CUSTO_LOJA_ID);
  if (Number.isFinite(envId) && envId > 0) return envId;

  const codigosPreferidos = ["LOJA", "AJ_LOJA", "AJDANCE_LOJA", "AJ_DANCE_STORE"];
  const byCodigo = await supabase
    .from("centros_custo")
    .select("id, codigo, nome")
    .in("codigo", codigosPreferidos)
    .order("id", { ascending: true })
    .limit(1);

  if (!byCodigo.error && byCodigo.data && byCodigo.data.length > 0) {
    return Number(byCodigo.data[0].id);
  }

  const byNome = await supabase
    .from("centros_custo")
    .select("id, codigo, nome")
    .ilike("nome", "%loja%")
    .order("id", { ascending: true })
    .limit(1);

  if (!byNome.error && byNome.data && byNome.data.length > 0) {
    return Number(byNome.data[0].id);
  }

  return null;
}

async function obterCustoUnitarioCentavos(supabase: any, produtoId: number) {
  // Preferir preços de fornecedor (historico)
  const { data: precoFornecedor, error: precoFornecedorErr } = await supabase
    .from("loja_fornecedor_precos")
    .select("preco_custo_centavos, data_referencia, created_at")
    .eq("produto_id", produtoId)
    .order("data_referencia", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!precoFornecedorErr) {
    const v = Number(precoFornecedor?.preco_custo_centavos ?? 0);
    if (Number.isFinite(v) && v > 0) return v;
  }

  // Fallback: coluna eventual no produto
  const { data: prodInfo } = await supabase
    .from("loja_produtos")
    .select("preco_custo_centavos")
    .eq("id", produtoId)
    .maybeSingle();

  const vProd = Number((prodInfo as any)?.preco_custo_centavos ?? 0);
  if (Number.isFinite(vProd) && vProd > 0) return vProd;

  return 0;
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
  const motivoRaw =
    typeof body?.motivo === "string" && body.motivo.trim()
      ? body.motivo.trim().toUpperCase()
      : null;
  const motivo_perda =
    operacao === "SAIDA" && motivoRaw && ["PERDA", "EXTRAVIO", "AVARIA"].includes(motivoRaw)
      ? motivoRaw
      : null;

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
    const warnings: any[] = [];

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

    const { data: produtoInfo } = await supabase
      .from("loja_produtos")
      .select("id, nome")
      .eq("id", produto_id)
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
      motivo: motivo_perda ?? null,
      referencia_id: null,
      quantidade,
      saldo_antes,
      saldo_depois,
      observacao: observacoes ?? null,
      created_by: null,
    };

    const movRes = await supabase
      .from("loja_estoque_movimentos")
      .insert(movPayload)
      .select("id")
      .maybeSingle();

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

    if (operacao === "SAIDA" && motivo_perda) {
      const centroLojaId = await getCentroCustoLojaId(supabase);
      const custoUnitario = await obterCustoUnitarioCentavos(supabase, produto_id);
      const custoUnitarioValido = Number(custoUnitario) || 0;
      const valorPerda = Math.round(custoUnitarioValido * quantidade);
      const descricaoPerda = `Perda de estoque (custo) - ${
        (produtoInfo as any)?.nome ?? `Produto #${produto_id}`
      }${variante?.id ? ` / SKU ${variante?.id}` : ""}`;

      if (!centroLojaId) {
        warnings.push({ type: "FIN_CENTRO_INDEFINIDO", message: "Centro de custo da Loja nao encontrado" });
      } else if (valorPerda > 0) {
        const { error: movFinError } = await supabase.from("movimento_financeiro").insert({
          tipo: "DESPESA",
          centro_custo_id: centroLojaId,
          valor_centavos: valorPerda,
          data_movimento: new Date().toISOString(),
          origem: "PERDA_ESTOQUE",
          origem_id: movRes.data?.id ?? null,
          descricao: descricaoPerda,
        });

        if (movFinError) {
          console.error("[/api/loja/estoque] falha ao registrar movimento financeiro de perda:", movFinError);
          warnings.push({
            type: "FIN_MOVIMENTO_FALHOU",
            message: movFinError.message ?? "Falha ao registrar perda financeira",
            details: movFinError,
          });
        }
      } else {
        warnings.push({
          type: "PERDA_CUSTO_ZERADO",
          message: "Perda registrada com custo unitario 0 (valor financeiro nao gerado).",
        });
      }
    }

    return json(200, { ok: true, variante: varianteAtualizada, movimento: movPayload, warnings });
  } catch (err) {
    console.error("[POST /api/loja/estoque] Erro inesperado:", err);
    return json(500, { ok: false, error: "Erro inesperado ao ajustar estoque." });
  }
}
