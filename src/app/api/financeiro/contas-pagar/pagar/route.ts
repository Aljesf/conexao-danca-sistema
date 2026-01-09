import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { guardApiByRole } from "@/lib/auth/roleGuard";

type ApiResponse<T = any> = { ok: boolean; error?: string; data?: T };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

export async function POST(req: NextRequest) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  if (!supabaseAdmin) {
    return NextResponse.json(
      { ok: false, error: "Configuração do Supabase ausente." },
      { status: 500 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Body JSON inválido." },
      { status: 400 }
    );
  }

  const {
    conta_pagar_id,
    conta_financeira_id,
    valor_centavos,
    juros_centavos = 0,
    desconto_centavos = 0,
    data_pagamento,
    metodo_pagamento = null,
    forma_pagamento_codigo = null,
    cartao_maquina_id = null,
    cartao_bandeira_id = null,
    cartao_numero_parcelas = null,
    observacoes = null,
  } = body ?? {};

  if (!conta_pagar_id || typeof conta_pagar_id !== "number") {
    return NextResponse.json(
      { ok: false, error: "conta_pagar_id obrigatório e numérico." },
      { status: 400 }
    );
  }
  const valorPrincipal = Number(valor_centavos || 0);
  if (valorPrincipal <= 0) {
    return NextResponse.json(
      { ok: false, error: "valor_centavos deve ser maior que zero." },
      { status: 400 }
    );
  }

  const juros = Number(juros_centavos || 0);
  const desconto = Number(desconto_centavos || 0);
  const dataPgto = data_pagamento || new Date().toISOString().slice(0, 10);
  const metodo = (forma_pagamento_codigo as string | null) || metodo_pagamento || null;

  try {
    const { data: conta, error: errConta } = await supabaseAdmin
      .from("contas_pagar")
      .select(
        "id, valor_centavos, status, centro_custo_id, pessoa_id, descricao, categoria_id"
      )
      .eq("id", conta_pagar_id)
      .maybeSingle();

    if (errConta || !conta) {
      return NextResponse.json(
        { ok: false, error: "Conta a pagar não encontrada." },
        { status: 404 }
      );
    }

    if (conta.status === "PAGO" || conta.status === "CANCELADO") {
      return NextResponse.json(
        { ok: false, error: "Conta já está paga ou cancelada." },
        { status: 400 }
      );
    }

    const { data: pagamentosExist } = await supabaseAdmin
      .from("contas_pagar_pagamentos")
      .select("valor_principal_centavos, juros_centavos, desconto_centavos")
      .eq("conta_pagar_id", conta.id);

    const totalPagoAnterior =
      pagamentosExist?.reduce((acc: number, p: any) => {
        return (
          acc +
          Number(p.valor_principal_centavos || 0) +
          Number(p.juros_centavos || 0) -
          Number(p.desconto_centavos || 0)
        );
      }, 0) ?? 0;

    const valorLancamento = valorPrincipal + juros - desconto;
    const totalApos = totalPagoAnterior + valorLancamento;
    const valorConta = Number(conta.valor_centavos || 0);

    const statusFinal =
      totalApos >= valorConta ? ("PAGO" as const) : ("PARCIAL" as const);

    const { data: pagamento, error: errPag } = await supabaseAdmin
      .from("contas_pagar_pagamentos")
      .insert({
        conta_pagar_id: conta.id,
        centro_custo_id: conta.centro_custo_id,
        conta_financeira_id: conta_financeira_id ?? null,
        valor_principal_centavos: valorPrincipal,
        juros_centavos: juros,
        desconto_centavos: desconto,
        data_pagamento: dataPgto,
        metodo_pagamento: metodo,
        forma_pagamento_codigo: forma_pagamento_codigo ?? null,
        cartao_maquina_id: cartao_maquina_id ?? null,
        cartao_bandeira_id: cartao_bandeira_id ?? null,
        cartao_numero_parcelas: cartao_numero_parcelas ?? null,
        observacoes,
        usuario_id: null,
        created_at: new Date().toISOString(),
      })
      .select("*")
      .maybeSingle();

    if (errPag || !pagamento) {
      throw errPag || new Error("Falha ao registrar pagamento.");
    }

    const movimentoValor = valorLancamento;
    const { error: errMov } = await supabaseAdmin
      .from("movimento_financeiro")
      .insert({
        tipo: "DESPESA",
        centro_custo_id: conta.centro_custo_id,
        valor_centavos: movimentoValor,
        data_movimento: dataPgto,
        origem: "CONTA_PAGAR",
        origem_id: pagamento.id,
        descricao:
          conta.descricao ||
          `Pagamento conta a pagar #${conta.id} (compra Loja)`,
        usuario_id: null,
      });

    if (errMov) {
      console.error(
        "[/api/financeiro/contas-pagar/pagar] Falha ao inserir movimento_financeiro:",
        errMov
      );
    }

    await supabaseAdmin
      .from("contas_pagar")
      .update({
        status: statusFinal,
        data_pagamento: statusFinal === "PAGO" ? dataPgto : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conta.id);

    // Se existir pedido de compra vinculado e sem pendencias de recebimento, atualizar status para CONCLUIDO
    try {
      const { data: pedidosVinculados } = await supabaseAdmin
        .from("loja_pedidos_compra")
        .select("id")
        .eq("conta_pagar_id", conta.id);

      for (const ped of pedidosVinculados ?? []) {
        const { data: itensPedido } = await supabaseAdmin
          .from("loja_pedidos_compra_itens")
          .select("quantidade_pedida, quantidade_solicitada, quantidade_recebida")
          .eq("pedido_id", ped.id);

        const pendente =
          itensPedido?.reduce((acc: number, it: any) => {
            const pedida = Number(it.quantidade_pedida ?? it.quantidade_solicitada ?? 0) || 0;
            const recebida = Number(it.quantidade_recebida ?? 0) || 0;
            return acc + Math.max(pedida - recebida, 0);
          }, 0) ?? 0;

        if (pendente === 0 && statusFinal === "PAGO") {
          await supabaseAdmin
            .from("loja_pedidos_compra")
            .update({ status: "CONCLUIDO", updated_at: new Date().toISOString() })
            .eq("id", ped.id);
        }
      }
    } catch (errPedidoStatus) {
      console.warn(
        "[/api/financeiro/contas-pagar/pagar] Nao foi possivel atualizar status do pedido de compra vinculado:",
        errPedidoStatus
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        conta_pagar_id: conta.id,
        status: statusFinal,
        pagamento,
      },
    });
  } catch (err) {
    console.error("[/api/financeiro/contas-pagar/pagar] Erro:", err);
    return NextResponse.json(
      { ok: false, error: "Erro ao registrar pagamento da conta." },
      { status: 500 }
    );
  }
}
