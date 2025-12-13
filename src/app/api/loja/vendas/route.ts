import { getCentroCustoLojaId } from "@/lib/financeiro/centrosCusto";
import { ensureFaturaAberta, getPeriodoReferencia, recalcularComprasFatura, vincularLancamentoNaFatura } from "@/lib/financeiro/creditoConexaoFaturas";
import { registrarSaidaEstoque } from "@/lib/loja/estoque";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ApiResponse<T = any> = {
  ok: boolean;
  error?: string;
  data?: T;
};

type VendaTipo = "VENDA" | "CREDIARIO_INTERNO" | "ENTREGA_FIGURINO";
type StatusPagamento = "PENDENTE" | "PAGO" | "PARCIAL";
type StatusVenda = "ATIVA" | "CANCELADA";

type Venda = {
  id: number;
  cliente_pessoa_id: number;
  cliente_nome?: string | null;
  cobranca_id?: number | null;
  tipo_venda: VendaTipo;
  valor_total_centavos: number;
  desconto_centavos: number;
  forma_pagamento: string;
  status_pagamento: StatusPagamento;
  status_venda: StatusVenda;
  data_venda: string;
  data_vencimento?: string | null;
  observacoes?: string | null;
  observacao_vendedor?: string | null;
  vendedor_user_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  conta_conexao_id?: number | null;
  numero_parcelas?: number | null;
};

/**
 * NOTA DE INTEGRACAO FINANCEIRA (v0)
 *
 * - cobrancas: tabela de contas a receber (campos principais: pessoa_id, descricao,
 *   valor_centavos, vencimento, status, origem_tipo, origem_id, observacoes).
 * - recebimentos: tabela de entradas financeiras (campos principais: cobranca_id,
 *   valor_centavos, data_pagamento, metodo_pagamento, origem_sistema, observacoes).
 *
 * Padrão adotado para Loja v0:
 * - Venda AVISTA: cria cobranca com status PAGO + recebimento imediato ligado à cobranca.
 * - CREDIARIO_INTERNO: cria cobranca PENDENTE com vencimento; recebimento será criado depois.
 * - cancelamento: cancela a cobranca (status CANCELADA) e gera um recebimento de estorno
 *   negativo (origem_sistema = 'LOJA_CANCELAMENTO') para zerar o fluxo financeiro.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[/api/loja/vendas] Variaveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao definidas."
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
// GET /api/loja/vendas
// Lista vendas com filtros basicos
// ==============================
export async function GET(req: NextRequest) {
  if (!supabaseAdmin) {
    return json(500, {
      ok: false,
      error:
        "Configuracao do Supabase ausente. Verifique NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
    });
  }

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const {
    page = "1",
    pageSize = "50",
    tipo_venda,
    status_pagamento,
    status_venda,
    cliente_id,
    q,
    data_ini,
    data_fim,
  } = params;

  const pageNumber = Math.max(parseInt(page || "1", 10) || 1, 1);
  const perPage = Math.min(Math.max(parseInt(pageSize || "50", 10) || 50, 1), 200);
  const from = (pageNumber - 1) * perPage;
  const to = from + perPage - 1;

  try {
    let query = supabaseAdmin
      .from("loja_vendas")
      .select(
        `
        id,
        cliente_pessoa_id,
        tipo_venda,
        valor_total_centavos,
        desconto_centavos,
        forma_pagamento,
        status_pagamento,
        cobranca_id,
        status_venda,
        data_venda,
        data_vencimento,
        observacoes,
        observacao_vendedor,
        vendedor_user_id,
        cancelada_em,
        cancelada_por_user_id,
        motivo_cancelamento,
        created_at,
        updated_at,
        cliente:pessoas!loja_vendas_cliente_pessoa_id_fkey (
          id,
          nome,
          nome_fantasia,
          cpf,
          cnpj
        )
      `,
        { count: "exact" }
      )
      .order("data_venda", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to);

    if (tipo_venda) query = query.eq("tipo_venda", tipo_venda);
    if (status_pagamento) query = query.eq("status_pagamento", status_pagamento);
    if (status_venda) query = query.eq("status_venda", status_venda);

    if (cliente_id) {
      const idNum = parseInt(cliente_id, 10);
      if (!Number.isNaN(idNum)) query = query.eq("cliente_pessoa_id", idNum);
    }

    if (data_ini) query = query.gte("data_venda", data_ini);
    if (data_fim) query = query.lte("data_venda", data_fim);

    if (q && q.trim()) {
      const term = q.trim();
      query = query.or(
        `id.eq.${term},cliente_pessoa_id.eq.${term},cliente.nome.ilike.%${term}%,cliente.nome_fantasia.ilike.%${term}%`
      );
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[GET /api/loja/vendas] Erro Supabase:", error);
      return json(500, { ok: false, error: "Erro ao listar vendas." });
    }

    const vendas: Venda[] =
      (data as any[] | null | undefined)?.map((v) => ({
        id: v.id,
        cliente_pessoa_id: v.cliente_pessoa_id,
        cliente_nome:
          v.cliente?.nome_fantasia ||
          v.cliente?.nome ||
          v.cliente?.cpf ||
          v.cliente?.cnpj ||
          null,
        tipo_venda: v.tipo_venda,
        valor_total_centavos: v.valor_total_centavos,
        desconto_centavos: v.desconto_centavos,
        forma_pagamento: v.forma_pagamento,
        status_pagamento: v.status_pagamento,
        status_venda: v.status_venda,
        data_venda: v.data_venda,
        data_vencimento: v.data_vencimento,
        observacoes: v.observacoes,
        observacao_vendedor: v.observacao_vendedor,
        vendedor_user_id: v.vendedor_user_id,
        created_at: v.created_at,
        updated_at: v.updated_at,
      })) ?? [];

    return json(200, {
      ok: true,
      data: {
        items: vendas,
        pagination: { page: pageNumber, pageSize: perPage, total: count ?? 0 },
      },
    });
  } catch (err) {
    console.error("[GET /api/loja/vendas] Erro inesperado:", err);
    return json(500, { ok: false, error: "Erro inesperado ao listar vendas." });
  }
}

// ==============================
// POST /api/loja/vendas
// Cria cabeçalho + itens (sem integração financeira por enquanto)
// ==============================
export async function POST(req: NextRequest) {
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

  const {
    cliente_pessoa_id,
    tipo_venda,
    forma_pagamento,
    status_pagamento,
    desconto_centavos,
    data_vencimento,
  observacoes,
  observacao_vendedor,
  itens,
  cartao_maquina_id,
  cartao_bandeira_id,
  cartao_numero_parcelas,
  conta_conexao_id,
  } = body ?? {};

  if (!cliente_pessoa_id || typeof cliente_pessoa_id !== "number") {
    return json(400, { ok: false, error: "Campo 'cliente_pessoa_id' e obrigatorio." });
  }

  const tiposValidos: VendaTipo[] = ["VENDA", "CREDIARIO_INTERNO", "ENTREGA_FIGURINO"];
  if (!tipo_venda || !tiposValidos.includes(tipo_venda)) {
    return json(400, {
      ok: false,
      error: "Campo 'tipo_venda' e obrigatorio (VENDA, CREDIARIO_INTERNO, ENTREGA_FIGURINO).",
    });
  }

  if (!forma_pagamento || typeof forma_pagamento !== "string") {
    return json(400, { ok: false, error: "Campo 'forma_pagamento' e obrigatorio." });
  }

  const statusValidos: StatusPagamento[] = ["PENDENTE", "PAGO", "PARCIAL"];
  if (!status_pagamento || !statusValidos.includes(status_pagamento)) {
    return json(400, {
      ok: false,
      error: "Campo 'status_pagamento' e obrigatorio (PENDENTE, PAGO, PARCIAL).",
    });
  }

  const formaPagamentoCodigo: string | null =
    typeof body?.forma_pagamento_codigo === "string"
      ? body.forma_pagamento_codigo
      : null;

  let formaPagamentoInfo: { codigo: string; nome: string | null; tipo_base: string | null } | null =
    null;
  if (formaPagamentoCodigo) {
    const { data: fp, error: fpError } = await supabaseAdmin
      .from("formas_pagamento")
      .select("codigo, nome, tipo_base")
      .eq("codigo", formaPagamentoCodigo)
      .maybeSingle();

    if (fpError || !fp) {
      console.error(
        "[POST /api/loja/vendas] Forma de pagamento não encontrada",
        formaPagamentoCodigo,
        fpError
      );
      return json(400, { ok: false, error: "forma_pagamento_nao_encontrada" });
    }
    formaPagamentoInfo = {
      codigo: fp.codigo,
      nome: fp.nome ?? null,
      tipo_base: fp.tipo_base ?? null,
    };
  }

  const isCartaoConexao = formaPagamentoInfo?.tipo_base === "CARTAO_CONEXAO";
  const contaConexaoIdRaw = conta_conexao_id;
  const contaConexaoId =
    typeof contaConexaoIdRaw === "number" ? contaConexaoIdRaw : Number(contaConexaoIdRaw);

  if (!Array.isArray(itens) || itens.length === 0) {
    return json(400, { ok: false, error: "Envie pelo menos um item na venda." });
  }

  // Busca produtos para validar preços
  const produtoIds: number[] = Array.from(
    new Set(
      itens
        .map((i: any) => i?.produto_id)
        .filter((id: any) => typeof id === "number")
    )
  );

  const { data: produtos, error: erroProdutos } = await supabaseAdmin
    .from("loja_produtos")
    .select("id, nome, preco_venda_centavos, ativo")
    .in("id", produtoIds);

  if (erroProdutos) {
    console.error("[POST /api/loja/vendas] Erro ao buscar produtos:", erroProdutos);
    return json(500, { ok: false, error: "Erro ao validar produtos da venda." });
  }

  const mapProdutos = new Map<number, any>();
  (produtos ?? []).forEach((p) => mapProdutos.set(p.id, p));

  type ItemCalculado = {
    produto_id: number;
    quantidade: number;
    preco_unitario_centavos: number;
    total_centavos: number;
    beneficiario_pessoa_id?: number;
    observacoes?: string;
  };

  const itensCalculados: ItemCalculado[] = [];
  for (const raw of itens) {
    const { produto_id, quantidade, beneficiario_pessoa_id, observacoes } = raw ?? {};
    if (!produto_id || typeof produto_id !== "number") {
      return json(400, { ok: false, error: "Item sem produto_id valido." });
    }
    const qtd = Number(quantidade);
    if (!Number.isFinite(qtd) || qtd <= 0) {
      return json(400, { ok: false, error: "Quantidade do item deve ser maior que zero." });
    }
    const produto = mapProdutos.get(produto_id);
    if (!produto) {
      return json(404, { ok: false, error: `Produto id ${produto_id} nao encontrado.` });
    }

    let precoUnit = 0;
    if (typeof raw.preco_unitario_centavos === "number") {
      precoUnit = Math.max(Math.round(raw.preco_unitario_centavos), 0);
    } else if (typeof raw.preco_unitario_centavos === "string") {
      const v = parseInt(raw.preco_unitario_centavos, 10);
      if (!Number.isNaN(v)) precoUnit = Math.max(v, 0);
    } else {
      precoUnit = Math.max(Number(produto.preco_venda_centavos) || 0, 0);
    }

    if (tipo_venda !== "ENTREGA_FIGURINO" && precoUnit <= 0) {
      return json(400, {
        ok: false,
        error: `Preco invalido para o produto '${produto.nome}' (id ${produto_id}).`,
      });
    }

    const total = precoUnit * qtd;
    const itemCalc: ItemCalculado = {
      produto_id,
      quantidade: qtd,
      preco_unitario_centavos: precoUnit,
      total_centavos: total,
    };
    if (beneficiario_pessoa_id && typeof beneficiario_pessoa_id === "number") {
      itemCalc.beneficiario_pessoa_id = beneficiario_pessoa_id;
    }
    if (typeof observacoes === "string" && observacoes.trim()) {
      itemCalc.observacoes = observacoes.trim();
    }
    itensCalculados.push(itemCalc);
  }

  const desconto = typeof desconto_centavos === "number" ? Math.max(desconto_centavos, 0) : 0;
  const subtotal = itensCalculados.reduce((sum, i) => sum + i.total_centavos, 0);
  const valorTotalVenda =
    tipo_venda === "ENTREGA_FIGURINO" ? 0 : Math.max(subtotal - desconto, 0);
  const numeroParcelasConexao =
    isCartaoConexao && Number.isFinite(cartao_numero_parcelas) && cartao_numero_parcelas > 0
      ? Number(cartao_numero_parcelas)
      : 1;

  let contaConexaoSelecionada:
    | { id: number; pessoa_titular_id: number; tipo_conta: "ALUNO" | "COLABORADOR" }
    | null = null;

  if (isCartaoConexao) {
    let tipoConta: "ALUNO" | "COLABORADOR" = "ALUNO";
    if (formaPagamentoInfo?.codigo === "CARTAO_CONEXAO_COLAB") {
      tipoConta = "COLABORADOR";
    }

    if (!Number.isFinite(contaConexaoId) || contaConexaoId <= 0) {
      return json(400, { ok: false, error: "conta_conexao_obrigatoria" });
    }

    const { data: contaConexao, error: contaError } = await supabaseAdmin
      .from("credito_conexao_contas")
      .select("id, pessoa_titular_id, tipo_conta, ativo")
      .eq("id", contaConexaoId)
      .eq("ativo", true)
      .maybeSingle();

    if (contaError || !contaConexao) {
      console.error("Conta de Crédito Conexão não encontrada para id informado", {
        contaConexaoId,
        contaError,
      });
      return json(400, {
        ok: false,
        error: "conta_conexao_nao_encontrada",
        message:
          "Não foi encontrada conta ativa de Crédito Conexão para o titular selecionado. Verifique o cadastro antes de usar esta forma de pagamento.",
      });
    }

    if (contaConexao.pessoa_titular_id !== cliente_pessoa_id) {
      return json(400, {
        ok: false,
        error: "conta_conexao_obrigatoria",
        message: "A conta de Crédito Conexão informada não pertence a este comprador.",
      });
    }

    if (contaConexao.tipo_conta !== tipoConta) {
      return json(400, {
        ok: false,
        error: "conta_conexao_incompativel",
        message: "A conta de Crédito Conexão informada não corresponde ao tipo selecionado.",
      });
    }

    contaConexaoSelecionada = {
      id: contaConexao.id,
      pessoa_titular_id: contaConexao.pessoa_titular_id,
      tipo_conta: tipoConta,
    };
  }

  let cartaoInfo: {
    maquinaId: number;
    bandeiraId: number;
    numeroParcelas: number;
    valorBrutoCentavos: number;
    taxaOperadoraCentavos: number;
    valorLiquidoCentavos: number;
    dataPrevistaISO: string;
    contaFinanceiraId: number;
    centroCustoId: number | null;
  } | null = null;

  if (forma_pagamento === "CREDITO" && !isCartaoConexao) {
    const maquinaId = Number(cartao_maquina_id);
    const bandeiraId = Number(cartao_bandeira_id);
    if (!Number.isFinite(maquinaId) || maquinaId <= 0 || !Number.isFinite(bandeiraId) || bandeiraId <= 0) {
      return json(400, {
        ok: false,
        error: "Maquininha e bandeira sao obrigatorias para pagamento no credito.",
      });
    }

    const parcelasRaw = Number(cartao_numero_parcelas ?? 1);
    const numeroParcelas = Number.isFinite(parcelasRaw) && parcelasRaw > 0 ? parcelasRaw : 1;

    const { data: regra, error: regraError } = await supabaseAdmin
      .from("cartao_regras_operacao")
      .select(
        `
        id,
        maquina_id,
        bandeira_id,
        tipo_transacao,
        prazo_recebimento_dias,
        taxa_percentual,
        taxa_fixa_centavos,
        permitir_parcelado,
        max_parcelas,
        ativo,
        maquina:cartao_maquinas!inner (
          id,
          conta_financeira_id,
          centro_custo_id
        )
      `
      )
      .eq("maquina_id", maquinaId)
      .eq("bandeira_id", bandeiraId)
      .eq("tipo_transacao", "CREDITO")
      .eq("ativo", true)
      .maybeSingle();

    if (regraError || !regra) {
      console.error(
        "[POST /api/loja/vendas] Regra de cartao nao encontrada",
        { cartao_maquina_id, cartao_bandeira_id },
        regraError
      );
      return json(400, {
        ok: false,
        error: "Nao foi encontrada configuracao de cartao para esta maquininha/bandeira.",
      });
    }

    if (numeroParcelas > 1 && regra.permitir_parcelado === false) {
      return json(400, {
        ok: false,
        error: "Esta maquininha/bandeira nao aceita parcelamento.",
      });
    }

    const maxParcelasRegra = Number(regra.max_parcelas ?? 12);
    if (numeroParcelas > maxParcelasRegra) {
      return json(400, {
        ok: false,
        error: `Numero de parcelas excede o maximo permitido (${maxParcelasRegra}).`,
      });
    }

    if (!regra.maquina?.conta_financeira_id) {
      return json(400, {
        ok: false,
        error: "Configuracao de cartao sem conta financeira vinculada.",
      });
    }

    const valorBrutoCentavos = valorTotalVenda;
    const taxaPercentualCentavos = Math.round(
      valorBrutoCentavos * Number(regra.taxa_percentual || 0) / 100
    );
    const taxaFixaCentavos = Number(regra.taxa_fixa_centavos || 0);
    const taxaTotalCentavos = taxaPercentualCentavos + taxaFixaCentavos;
    const valorLiquidoCentavos = Math.max(valorBrutoCentavos - taxaTotalCentavos, 0);

    const prazoDias = Number(regra.prazo_recebimento_dias ?? 30);
    const dataPrevista = new Date();
    dataPrevista.setDate(dataPrevista.getDate() + prazoDias);
    const dataPrevistaISO = dataPrevista.toISOString().slice(0, 10);

    cartaoInfo = {
      maquinaId: regra.maquina_id,
      bandeiraId: regra.bandeira_id,
      numeroParcelas,
      valorBrutoCentavos,
      taxaOperadoraCentavos: taxaTotalCentavos,
      valorLiquidoCentavos,
      dataPrevistaISO,
      contaFinanceiraId: regra.maquina.conta_financeira_id,
      centroCustoId: regra.maquina.centro_custo_id ?? null,
    };
  }

  let statusPagamento: StatusPagamento =
    forma_pagamento === "CREDIARIO_INTERNO" || tipo_venda === "CREDIARIO_INTERNO"
      ? "PENDENTE"
      : status_pagamento;
  if (tipo_venda === "ENTREGA_FIGURINO") statusPagamento = "PAGO";
  if (forma_pagamento === "AVISTA" || forma_pagamento === "CREDITO") statusPagamento = "PAGO";

  const dueDate = data_vencimento && typeof data_vencimento === "string"
    ? data_vencimento
    : null;

  try {
    const { data: venda, error: erroVenda } = await supabaseAdmin
      .from("loja_vendas")
      .insert({
        cliente_pessoa_id,
        tipo_venda,
        valor_total_centavos: valorTotalVenda,
        desconto_centavos: desconto,
        forma_pagamento,
        status_pagamento: statusPagamento,
        status_venda: "ATIVA",
        data_venda: new Date().toISOString(),
        data_vencimento: dueDate,
        observacoes: observacoes || null,
        observacao_vendedor: observacao_vendedor || null,
        conta_conexao_id: isCartaoConexao ? contaConexaoSelecionada?.id ?? null : null,
        numero_parcelas: isCartaoConexao
          ? numeroParcelasConexao
          : isCredito
          ? cartaoNumeroParcelas
          : null,
      })
      .select("*")
      .single();

    if (erroVenda) {
      console.error("[POST /api/loja/vendas] Erro ao criar cabecalho da venda:", erroVenda);
      return json(500, { ok: false, error: "Erro ao criar cabecalho da venda." });
    }

    const itensInsert = itensCalculados.map((item) => ({
      venda_id: venda.id,
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      preco_unitario_centavos: item.preco_unitario_centavos,
      total_centavos: item.total_centavos,
      beneficiario_pessoa_id: item.beneficiario_pessoa_id ?? null,
      observacoes: item.observacoes ?? null,
    }));

    const { data: itensCriados, error: erroItens } = await supabaseAdmin
      .from("loja_venda_itens")
      .insert(itensInsert)
      .select("*");

    if (erroItens) {
      console.error("[POST /api/loja/vendas] Erro ao criar itens:", erroItens);
      return json(500, { ok: false, error: "Erro ao criar itens da venda." });
    }

    // Movimentos de estoque - saida por venda
    for (const item of itensCriados ?? []) {
      const qtd = Number(item.quantidade) || 0;
      if (qtd <= 0) continue;

      try {
        await registrarSaidaEstoque({
          supabase: supabaseAdmin,
          produtoId: item.produto_id,
          quantidade: qtd,
          origem: "VENDA",
          referenciaId: venda.id,
          observacao: "Saida automatica por venda no caixa",
          createdBy: null,
        });
      } catch (estoqueErr) {
        console.error("[POST /api/loja/vendas] erro ao registrar saida de estoque:", estoqueErr);
        return json(500, { ok: false, error: "erro_movimento_estoque_venda" });
      }
    }

    // Integracao Credito Conexao (forma base CARTAO_CONEXAO)
    if (isCartaoConexao) {
      try {
        if (!contaConexaoSelecionada) {
          return json(400, { ok: false, error: "conta_conexao_obrigatoria" });
        }

        const valorLancamentoCentavos = valorTotalVenda ?? 0;

        const { data: lancamentoExistente, error: lancamentoBuscaError } = await supabaseAdmin
          .from("credito_conexao_lancamentos")
          .select("id")
          .eq("origem_sistema", "LOJA")
          .eq("origem_id", venda.id)
          .maybeSingle();

        let lancamentoId: number | null = null;

        if (lancamentoBuscaError) {
          console.error(
            "[POST /api/loja/vendas] erro ao verificar lancamento de credito conexao existente",
            lancamentoBuscaError
          );
        }

        if (lancamentoExistente?.id) {
          lancamentoId = lancamentoExistente.id;
          const { error: updateLanc } = await supabaseAdmin
            .from("credito_conexao_lancamentos")
            .update({
              conta_conexao_id: contaConexaoSelecionada.id,
              valor_centavos: valorLancamentoCentavos,
              numero_parcelas: numeroParcelasConexao,
              status: "PENDENTE_FATURA",
            })
            .eq("id", lancamentoExistente.id);

          if (updateLanc) {
            console.error(
              "[POST /api/loja/vendas] erro ao atualizar lancamento credito conexao existente",
              updateLanc
            );
          } else {
            console.log("[loja] lancamento credito conexao reutilizado", {
              lancamentoId,
              vendaId: venda.id,
              contaConexaoId: contaConexaoSelecionada.id,
            });
          }
        } else {
          const { data: lancamentoCriado, error: lancamentoError } = await supabaseAdmin
            .from("credito_conexao_lancamentos")
            .insert({
              conta_conexao_id: contaConexaoSelecionada.id,
              origem_sistema: "LOJA",
              origem_id: venda.id,
              descricao: `Venda Loja #${venda.id} - Cartao Conexao`,
              valor_centavos: valorLancamentoCentavos,
              numero_parcelas: numeroParcelasConexao,
              status: "PENDENTE_FATURA",
            })
            .select("id")
            .single();

          if (lancamentoError) {
            console.error(
              "Erro ao criar lancamento de Credito Conexao para venda da loja",
              lancamentoError
            );
            return json(500, {
              ok: false,
              error: "erro_criar_lancamento_credito_conexao",
            });
          }

          lancamentoId = lancamentoCriado?.id ?? null;
          console.log("[loja] lancamento credito conexao criado", {
            lancamentoId,
            vendaId: venda.id,
            contaConexaoId: contaConexaoSelecionada.id,
            valor: valorLancamentoCentavos,
            numeroParcelas: numeroParcelasConexao,
          });
        }

        let statusLancamento: "PENDENTE_FATURA" | "FATURADO" = "PENDENTE_FATURA";
        let faturaId: number | null = null;
        let periodoFatura: string | null = null;
        let comprasFatura: number | null = null;

        if (lancamentoId) {
          try {
            const periodo = getPeriodoReferencia();
            const { fatura, periodo_usado } = await ensureFaturaAberta(
              supabaseAdmin,
              contaConexaoSelecionada.id,
              periodo
            );
            faturaId = fatura.id;
            periodoFatura = periodo_usado;

            const vinc = await vincularLancamentoNaFatura(supabaseAdmin, faturaId, lancamentoId);
            if (!vinc.ok) {
              throw vinc.error || new Error("Erro ao vincular lancamento na fatura");
            }

            const { error: updLanc } = await supabaseAdmin
              .from("credito_conexao_lancamentos")
              .update({ status: "FATURADO" })
              .eq("id", lancamentoId);

            if (updLanc) {
              throw updLanc;
            }

            statusLancamento = "FATURADO";
            comprasFatura = await recalcularComprasFatura(supabaseAdmin, faturaId);
          } catch (errFatura: any) {
            console.error("[POST /api/loja/vendas] falha ao vincular lancamento na fatura", errFatura);
          }
        }

        // Para CARTAO_CONEXAO, nao criar cobranca/recebimento/recebivel aqui.
        return json(201, {
          ok: true,
          data: {
            venda,
            itens: itensCriados ?? [],
            lancamento_credito_conexao_id: lancamentoId,
            status_lancamento: statusLancamento,
            fatura_id: faturaId,
            periodo_referencia: periodoFatura,
            compras_fatura_centavos: comprasFatura,
          },
        });
      } catch (err) {
        console.error("Erro inesperado na integracao com Credito Conexao", err);
        return json(500, { ok: false, error: "erro_credito_conexao_interno" });
      }
    }

    // Integracao financeira v0
    let cobrancaCriadaId: number | null = null;
    if (valorTotalVenda > 0) {
      try {
        if (forma_pagamento === "CREDIARIO_INTERNO" || tipo_venda === "CREDIARIO_INTERNO") {
          if (!dueDate) {
            return json(400, {
              ok: false,
              error: "Para crediario interno, envie data_vencimento.",
            });
          }

          const { data: cobranca, error: erroCobranca } = await supabaseAdmin
            .from("cobrancas")
            .insert({
              pessoa_id: cliente_pessoa_id,
              descricao: `Venda Loja v0 #${venda.id}`,
              valor_centavos: valorTotalVenda,
              moeda: "BRL",
              vencimento: dueDate,
              status: "PENDENTE",
              origem_tipo: "LOJA_VENDA",
              origem_id: venda.id,
            })
            .select("*")
            .maybeSingle();

          if (erroCobranca) {
            console.error("[POST /api/loja/vendas] Erro ao criar cobranca:", erroCobranca);
          } else if (cobranca?.id) {
            cobrancaCriadaId = cobranca.id;
            await supabaseAdmin
              .from("loja_vendas")
              .update({ cobranca_id: cobranca.id, status_pagamento: "PENDENTE" })
              .eq("id", venda.id);
          }
        } else if (forma_pagamento === "CREDITO") {
          if (!cartaoInfo) {
            console.error("[POST /api/loja/vendas] Cartao info ausente para forma_pagamento=CREDITO");
          } else {
            const agora = new Date();
            const dataCurta = agora.toISOString().slice(0, 10);
            const dataCompleta = agora.toISOString();

            const { data: cobranca, error: erroCobranca } = await supabaseAdmin
              .from("cobrancas")
              .insert({
                pessoa_id: cliente_pessoa_id,
                descricao: `Venda Loja v0 #${venda.id}`,
                valor_centavos: valorTotalVenda,
                moeda: "BRL",
                vencimento: dataCurta,
                data_pagamento: dataCurta,
                status: "PAGO",
                metodo_pagamento: "CREDITO",
                origem_tipo: "LOJA_VENDA",
                origem_id: venda.id,
              })
              .select("*")
              .maybeSingle();

            if (erroCobranca) {
              console.error("[POST /api/loja/vendas] Erro ao criar cobranca CREDITO:", erroCobranca);
            } else if (cobranca?.id) {
              cobrancaCriadaId = cobranca.id;
              await supabaseAdmin
                .from("loja_vendas")
                .update({ cobranca_id: cobranca.id, status_pagamento: "PAGO" })
                .eq("id", venda.id);

              const { error: erroRec } = await supabaseAdmin
                .from("recebimentos")
                .insert({
                  cobranca_id: cobranca.id,
                  centro_custo_id: cartaoInfo.centroCustoId ?? null,
                  valor_centavos: valorTotalVenda,
                  data_pagamento: dataCompleta,
                  metodo_pagamento: "CREDITO",
                  origem_sistema: "LOJA_VENDA",
                  observacoes: `Recebimento automatico venda #${venda.id} (cartao credito)`,
                })
                .select("*")
                .maybeSingle();

              if (erroRec) {
                console.error("[POST /api/loja/vendas] Recebimento CREDITO falhou:", erroRec);
              }
            }

            const { error: recebivelError } = await supabaseAdmin
              .from("cartao_recebiveis")
              .insert({
                venda_id: venda.id,
                maquina_id: cartaoInfo.maquinaId,
                bandeira_id: cartaoInfo.bandeiraId,
                conta_financeira_id: cartaoInfo.contaFinanceiraId,
                valor_bruto_centavos: cartaoInfo.valorBrutoCentavos,
                taxa_operadora_centavos: cartaoInfo.taxaOperadoraCentavos,
                valor_liquido_centavos: cartaoInfo.valorLiquidoCentavos,
                numero_parcelas: cartaoInfo.numeroParcelas,
                data_prevista_pagamento: cartaoInfo.dataPrevistaISO,
              });

            if (recebivelError) {
              console.error(
                "[POST /api/loja/vendas] Erro ao criar recebivel de cartao para venda CREDITO da loja",
                recebivelError
              );
            }
          }
        } else if (forma_pagamento === "AVISTA") {
          // cria cobranca paga + recebimento imediato
          const { data: cobranca, error: erroCobranca } = await supabaseAdmin
            .from("cobrancas")
            .insert({
              pessoa_id: cliente_pessoa_id,
              descricao: `Venda Loja v0 #${venda.id}`,
              valor_centavos: valorTotalVenda,
              moeda: "BRL",
              vencimento: new Date().toISOString().slice(0, 10),
              data_pagamento: new Date().toISOString().slice(0, 10),
              status: "PAGO",
              metodo_pagamento: forma_pagamento,
              origem_tipo: "LOJA_VENDA",
              origem_id: venda.id,
            })
            .select("*")
            .maybeSingle();

          if (erroCobranca) {
            console.error("[POST /api/loja/vendas] Erro ao criar cobranca AVISTA:", erroCobranca);
          } else if (cobranca?.id) {
            cobrancaCriadaId = cobranca.id;
            await supabaseAdmin
              .from("loja_vendas")
              .update({ cobranca_id: cobranca.id, status_pagamento: "PAGO" })
              .eq("id", venda.id);

            const { data: recebimento, error: erroRec } = await supabaseAdmin
              .from("recebimentos")
              .insert({
                cobranca_id: cobranca.id,
                valor_centavos: valorTotalVenda,
                data_pagamento: new Date().toISOString(),
                metodo_pagamento: forma_pagamento,
                origem_sistema: "LOJA_VENDA",
                observacoes: `Recebimento automatico venda #${venda.id}`,
              })
              .select("*")
              .maybeSingle();

            if (erroRec) {
              console.error(
                "[POST /api/loja/vendas] Recebimento AVISTA falhou:",
                erroRec
              );
            }

            // NOVO: registrar movimento financeiro da venda AVISTA da loja
            if (recebimento && venda) {
              try {
                let centroCustoId = (cobranca as any)?.centro_custo_id ?? null;

                if (!centroCustoId) {
                  centroCustoId = await getCentroCustoLojaId(supabaseAdmin);
                }

                if (!centroCustoId) {
                  console.error(
                    "Nao foi possivel determinar centro_custo_id para movimento financeiro da venda AVISTA da loja",
                    { vendaId: venda.id }
                  );
                } else {
                  const { error: movimentoError } = await supabaseAdmin
                    .from("movimento_financeiro")
                    .insert({
                      tipo: "RECEITA",
                      centro_custo_id: centroCustoId,
                      valor_centavos: recebimento.valor_centavos,
                      data_movimento:
                        recebimento.data_pagamento ?? new Date().toISOString(),
                      origem: "LOJA_VENDA",
                      origem_id: venda.id,
                      descricao: `Venda Loja #${venda.id} - AVISTA`,
                      usuario_id: null,
                    });

                  if (movimentoError) {
                    console.error(
                      "Erro ao registrar movimento financeiro da venda AVISTA da loja",
                      movimentoError
                    );
                  }
                }
              } catch (err) {
                console.error(
                  "Erro inesperado ao registrar movimento financeiro da venda AVISTA da loja",
                  err
                );
              }
            }
          }
        }
      } catch (finErr) {
        console.error("[POST /api/loja/vendas] Erro integracao financeira:", finErr);
      }
    }

    const vendaComCobranca =
      cobrancaCriadaId != null
        ? { ...venda, cobranca_id: cobrancaCriadaId }
        : venda;

    return json(201, { ok: true, data: { venda: vendaComCobranca, itens: itensCriados ?? [] } });
  } catch (err) {
    console.error("[POST /api/loja/vendas] Erro inesperado:", err);
    return json(500, { ok: false, error: "Erro inesperado ao criar venda." });
  }
}
