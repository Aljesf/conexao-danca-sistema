import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ApiResponse = {
  ok: boolean;
  error?: string;
  data?: any;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[/api/loja/estoque/entrada] Variáveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidas."
  );
}

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

function json(status: number, payload: ApiResponse) {
  return NextResponse.json(payload, { status });
}

function normalizeCategoriaSubId(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

/**
 * POST /api/loja/estoque/entrada
 *
 * Fluxo A — Produto novo (sem produto_id):
 *   - Cria produto em loja_produtos com preco_venda_centavos = 0 (aguardando preço).
 *   - Soma estoque_atual = quantidade.
 *   - Opcionalmente registra preço de custo em loja_fornecedor_precos.
 *
 * Fluxo B — Reposição de produto existente (com produto_id):
 *   - Atualiza estoque_atual = estoque_atual + quantidade.
 *   - Não altera preco_venda_centavos.
 *   - Opcionalmente registra preço de custo em loja_fornecedor_precos.
 *
 * Body esperado (exemplos):
 *
 * 1) Produto novo:
 * {
 *   "nome": "Sapatilha meia ponta infantil",
 *   "codigo": "SAP-MP-INF-001",
 *   "categoria": "calçados",
 *   "unidade": "PAR",
 *   "quantidade": 5,
 *   "fornecedor_id": 1,
 *   "preco_custo_centavos": 12000,
 *   "observacoes_produto": "Números 30 a 34",
 *   "observacoes_entrada": "Primeira compra da coleção 2026"
 * }
 *
 * 2) Reposição:
 * {
 *   "produto_id": 10,
 *   "quantidade": 3,
 *   "fornecedor_id": 1,
 *   "preco_custo_centavos": 12500,
 *   "observacoes_entrada": "Reposição normal"
 * }
 */
export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return json(500, {
      ok: false,
      error:
        "Configuração do Supabase ausente. Verifique NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
    });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, error: "Body JSON inválido." });
  }

  const {
    // Comum
    quantidade,
    fornecedor_id,
    preco_custo_centavos,
    observacoes_entrada,

    // Produto novo
    nome,
    codigo,
    unidade,
    categoria_subcategoria_id,

    observacoes_produto,

    // Produto existente
    produto_id,
  } = body ?? {};

  // Validação básica de quantidade
  const qtd = Number(quantidade);
  if (!Number.isFinite(qtd) || qtd <= 0) {
    return json(400, {
      ok: false,
      error: "Campo 'quantidade' é obrigatório e deve ser maior que zero.",
    });
  }

  // Decide fluxo: novo produto x reposição
  const isReposicao = typeof produto_id === "number";
  const categoriaSubId = normalizeCategoriaSubId(categoria_subcategoria_id);

  // Se tiver fornecedor, validar se existe
  let fornecedor = null;
  if (typeof fornecedor_id === "number") {
    const { data, error } = await supabaseAdmin
      .from("loja_fornecedores")
      .select("id, pessoa_id, ativo")
      .eq("id", fornecedor_id)
      .maybeSingle();

    if (error) {
      console.error(
        "[POST /api/loja/estoque/entrada] Erro ao buscar fornecedor:",
        error
      );
      return json(500, {
        ok: false,
        error: "Erro ao buscar fornecedor informado.",
      });
    }

    if (!data) {
      return json(404, {
        ok: false,
        error: "Fornecedor não encontrado.",
      });
    }

    fornecedor = data;
  }

  // Função auxiliar para normalizar preco_custo_centavos (opcional)
  const resolvePrecoCustoCentavos = (): number | null => {
    if (
      typeof preco_custo_centavos === "number" &&
      Number.isFinite(preco_custo_centavos)
    ) {
      return Math.round(preco_custo_centavos);
    }

    if (typeof preco_custo_centavos === "string") {
      const v = parseInt(preco_custo_centavos, 10);
      if (!Number.isNaN(v)) return v;
    }

    return null;
  };

  const custoCentavos = resolvePrecoCustoCentavos();

  try {
    if (isReposicao) {
      // ===========================================
      // Fluxo B — Reposição de produto existente
      // ===========================================
      // 1) Buscar produto
      const { data: produtoAtual, error: erroProduto } = await supabaseAdmin
        .from("loja_produtos")
        .select("*")
        .eq("id", produto_id)
        .maybeSingle();

      if (erroProduto) {
        console.error(
          "[POST /api/loja/estoque/entrada] Erro ao buscar produto:",
          erroProduto
        );
        return json(500, {
          ok: false,
          error: "Erro ao buscar produto para reposição.",
        });
      }

      if (!produtoAtual) {
        return json(404, {
          ok: false,
          error: "Produto não encontrado para reposição de estoque.",
        });
      }

      const novoEstoque =
        (Number(produtoAtual.estoque_atual) || 0) + qtd;

      // 2) Atualizar estoque
      const { data: produtoAtualizado, error: erroUpdate } =
        await supabaseAdmin
          .from("loja_produtos")
          .update({
            estoque_atual: novoEstoque,
            updated_at: new Date().toISOString(),
          })
          .eq("id", produto_id)
          .select("*")
          .single();

      if (erroUpdate) {
        console.error(
          "[POST /api/loja/estoque/entrada] Erro ao atualizar estoque:",
          erroUpdate
        );
        return json(500, {
          ok: false,
          error: "Erro ao atualizar estoque do produto.",
        });
      }

      // 3) Registrar preço de custo (se informado e houver fornecedor)
      let historicoPreco = null;
      if (fornecedor && custoCentavos !== null) {
        const { data, error } = await supabaseAdmin
          .from("loja_fornecedor_precos")
          .insert({
            fornecedor_id: fornecedor_id,
            produto_id: produto_id,
            preco_custo_centavos: custoCentavos,
            data_referencia: new Date().toISOString().slice(0, 10),
            observacoes: observacoes_entrada || null,
          })
          .select("*")
          .single();

        if (error) {
          console.error(
            "[POST /api/loja/estoque/entrada] Erro ao registrar histórico de preço (reposicao):",
            error
          );
          // Não quebra a operação principal (estoque já foi atualizado)
        } else {
          historicoPreco = data;
        }
      }

      return json(200, {
        ok: true,
        data: {
          tipo: "REPOSICAO",
          produto: produtoAtualizado,
          fornecedor_preco: historicoPreco,
        },
      });
    }

    // ===========================================
    // Fluxo A — Produto novo (pré-cadastro)
    // ===========================================
    if (!nome || typeof nome !== "string" || nome.trim().length === 0) {
      return json(400, {
        ok: false,
        error:
          "Campo 'nome' é obrigatório para criação de novo produto (quando 'produto_id' não é enviado).",
      });
    }

    const unidadeFinal =
      typeof unidade === "string" && unidade.trim().length > 0
        ? unidade.trim()
        : "UN";

    // 1) Criar produto novo com preco_venda_centavos = 0
    const { data: produtoNovo, error: erroInsertProduto } =
      await supabaseAdmin
        .from("loja_produtos")
        .insert({
          codigo: codigo || null,
          nome: nome.trim(),
          descricao: observacoes_produto || null,
          categoria: null,
          categoria_subcategoria_id: categoriaSubId,
          preco_venda_centavos: 0, // aguardando definição de preço (admin)
          unidade: unidadeFinal,
          estoque_atual: qtd,
          ativo: true,
          observacoes: null,
        })
        .select("*")
        .single();

    if (erroInsertProduto) {
      console.error(
        "[POST /api/loja/estoque/entrada] Erro ao criar novo produto:",
        erroInsertProduto
      );
      return json(500, {
        ok: false,
        error: "Erro ao criar novo produto na Loja.",
      });
    }

    // 2) Registrar preço de custo (se informado e houver fornecedor)
    let historicoPreco = null;
    if (fornecedor && custoCentavos !== null) {
      const { data, error } = await supabaseAdmin
        .from("loja_fornecedor_precos")
        .insert({
          fornecedor_id: fornecedor_id,
          produto_id: produtoNovo.id,
          preco_custo_centavos: custoCentavos,
          data_referencia: new Date().toISOString().slice(0, 10),
          observacoes: observacoes_entrada || null,
        })
        .select("*")
        .single();

      if (error) {
        console.error(
          "[POST /api/loja/estoque/entrada] Erro ao registrar histórico de preço (novo produto):",
          error
        );
        // Não quebra a operação principal (produto já foi criado)
      } else {
        historicoPreco = data;
      }
    }

    return json(201, {
      ok: true,
      data: {
        tipo: "NOVO_PRODUTO",
        produto: produtoNovo,
        fornecedor_preco: historicoPreco,
      },
    });
  } catch (e) {
    console.error(
      "[POST /api/loja/estoque/entrada] Erro inesperado na entrada de estoque:",
      e
    );
    return json(500, {
      ok: false,
      error: "Erro inesperado na entrada de estoque.",
    });
  }
}
