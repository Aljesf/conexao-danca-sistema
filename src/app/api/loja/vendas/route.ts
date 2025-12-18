import { NextResponse } from "next/server";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

type JsonRecord = Record<string, unknown>;

function isRecord(v: unknown): v is JsonRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asInt(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) {
    return Math.trunc(Number(v));
  }
  return null;
}

function asString(v: unknown): string | null {
  if (typeof v === "string") return v;
  return null;
}

function todayISODate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDaysISODate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

type CartaoTipoTransacao = "CREDITO_AVISTA" | "CREDITO_PARCELADO";

function inferTipoTransacao(parcelas: number): CartaoTipoTransacao {
  return parcelas > 1 ? "CREDITO_PARCELADO" : "CREDITO_AVISTA";
}

// GET de diagnostico simples
export async function GET() {
  try {
    return json({ ok: true, route: "/api/loja/vendas", ts: new Date().toISOString() });
  } catch (err: any) {
    return json(
      { ok: false, error: "GET crash", details: { message: String(err?.message || err) } },
      500
    );
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await getSupabaseServerSSR();

    const bodyUnknown: unknown = await req.json().catch(() => null);
    if (!isRecord(bodyUnknown)) {
      return NextResponse.json({ ok: false, error: "payload_invalido" }, { status: 400 });
    }

    const clientePessoaId = asInt(
      bodyUnknown.cliente_pessoa_id ?? bodyUnknown.clientePessoaId ?? bodyUnknown.cliente_id
    );
    const tipoVenda = asString(bodyUnknown.tipo_venda ?? bodyUnknown.tipoVenda);
    const valorTotalCentavos = asInt(
      bodyUnknown.valor_total_centavos ?? bodyUnknown.valorTotalCentavos ?? bodyUnknown.total_centavos
    );
    const descontoCentavos = asInt(bodyUnknown.desconto_centavos ?? bodyUnknown.descontoCentavos) ?? 0;
    const formaPagamento = asString(
      bodyUnknown.forma_pagamento ??
        bodyUnknown.formaPagamento ??
        bodyUnknown.forma_pagamento_codigo ??
        bodyUnknown.formaPagamentoCodigo
    );
    const statusPagamento = asString(bodyUnknown.status_pagamento ?? bodyUnknown.statusPagamento) ?? "PAGO";

    if (!clientePessoaId || !tipoVenda || !valorTotalCentavos || !formaPagamento) {
      return NextResponse.json(
        {
          ok: false,
          error: "campos_obrigatorios",
          details: {
            cliente_pessoa_id: clientePessoaId,
            tipo_venda: tipoVenda,
            valor_total_centavos: valorTotalCentavos,
            forma_pagamento: formaPagamento,
          },
        },
        { status: 400 }
      );
    }

    const dataVencimento = asString(bodyUnknown.data_vencimento ?? bodyUnknown.dataVencimento);
    const observacoes = asString(bodyUnknown.observacoes);
    const observacaoVendedor = asString(
      bodyUnknown.observacao_vendedor ?? bodyUnknown.observacaoVendedor
    );

    const contaConexaoId = asInt(bodyUnknown.conta_conexao_id ?? bodyUnknown.contaConexaoId);
    const numeroParcelas = asInt(bodyUnknown.numero_parcelas ?? bodyUnknown.numeroParcelas) ?? 1;

    const itensUnknown = bodyUnknown.itens;

    const vendaInsert: JsonRecord = {
      cliente_pessoa_id: clientePessoaId,
      tipo_venda: tipoVenda,
      valor_total_centavos: valorTotalCentavos,
      desconto_centavos: descontoCentavos,
      forma_pagamento: formaPagamento,
      status_pagamento: statusPagamento,
      data_vencimento: dataVencimento ?? null,
      observacoes: observacoes ?? null,
      observacao_vendedor: observacaoVendedor ?? null,
      conta_conexao_id: contaConexaoId ?? null,
      numero_parcelas: numeroParcelas,
      vendedor_user_id: asString(bodyUnknown.vendedor_user_id ?? bodyUnknown.vendedorUserId) ?? null,
    };

    const { data: vendaCriada, error: vendaErr } = await supabase
      .from("loja_vendas")
      .insert(vendaInsert)
      .select(
        "id, cliente_pessoa_id, tipo_venda, valor_total_centavos, desconto_centavos, forma_pagamento, status_pagamento, numero_parcelas"
      )
      .single();

    if (vendaErr || !vendaCriada) {
      return NextResponse.json(
        { ok: false, error: "falha_insert_venda", details: vendaErr?.message ?? "sem_detalhe" },
        { status: 500 }
      );
    }

    const vendaId: number = vendaCriada.id;

    if (Array.isArray(itensUnknown) && itensUnknown.length > 0) {
      const itensToInsert: JsonRecord[] = [];

      for (const it of itensUnknown) {
        if (!isRecord(it)) continue;

        const produtoId = asInt(it.produto_id ?? it.produtoId);
        const qtd = asInt(it.quantidade ?? it.qtd);
        const precoUnit = asInt(it.preco_unitario_centavos ?? it.precoUnitarioCentavos);
        const total = asInt(it.total_centavos ?? it.totalCentavos);

        if (!produtoId || !qtd || !precoUnit || !total) continue;

        itensToInsert.push({
          venda_id: vendaId,
          produto_id: produtoId,
          quantidade: qtd,
          preco_unitario_centavos: precoUnit,
          total_centavos: total,
          beneficiario_pessoa_id:
            asInt(it.beneficiario_pessoa_id ?? it.beneficiarioPessoaId) ?? null,
          observacoes: asString(it.observacoes) ?? null,
          variante_id: asInt(it.variante_id ?? it.varianteId) ?? null,
        });
      }

      if (itensToInsert.length > 0) {
        const { error: itensErr } = await supabase.from("loja_venda_itens").insert(itensToInsert);
        if (itensErr) {
          // best-effort rollback to avoid orphan sale
          await supabase.from("loja_venda_itens").delete().eq("venda_id", vendaId);
          await supabase.from("loja_vendas").delete().eq("id", vendaId);

          return NextResponse.json(
            { ok: false, error: "falha_insert_itens", details: itensErr.message },
            { status: 500 }
          );
        }
      }
    }

    const maquinaId = asInt(
      bodyUnknown.cartao_maquina_id ?? bodyUnknown.maquina_id ?? bodyUnknown.maquinaId
    );
    const bandeiraId = asInt(
      bodyUnknown.cartao_bandeira_id ?? bodyUnknown.bandeira_id ?? bodyUnknown.bandeiraId
    );

    if (maquinaId && bandeiraId) {
      const { data: maquinaRow, error: maqErr } = await supabase
        .from("cartao_maquinas")
        .select("id, conta_financeira_id")
        .eq("id", maquinaId)
        .single();

      if (maqErr || !maquinaRow?.conta_financeira_id) {
        await supabase.from("loja_venda_itens").delete().eq("venda_id", vendaId);
        await supabase.from("loja_vendas").delete().eq("id", vendaId);

        return NextResponse.json(
          {
            ok: false,
            error: "maquina_invalida",
            details: maqErr?.message ?? "maquina_sem_conta_financeira",
          },
          { status: 400 }
        );
      }

      const contaFinanceiraId: number = maquinaRow.conta_financeira_id;

      const parcelas = numeroParcelas;
      const tipoTransacao = asString(
        bodyUnknown.cartao_tipo_transacao ?? bodyUnknown.tipo_transacao
      ) as CartaoTipoTransacao | null;
      const tipoTransacaoFinal: CartaoTipoTransacao =
        tipoTransacao === "CREDITO_AVISTA" || tipoTransacao === "CREDITO_PARCELADO"
          ? tipoTransacao
          : inferTipoTransacao(parcelas);

      const { data: regraRow } = await supabase
        .from("cartao_regras_operacao")
        .select("prazo_recebimento_dias, taxa_percentual, taxa_fixa_centavos")
        .eq("maquina_id", maquinaId)
        .eq("bandeira_id", bandeiraId)
        .eq("tipo_transacao", tipoTransacaoFinal)
        .eq("ativo", true)
        .maybeSingle();

      const prazoDias =
        typeof regraRow?.prazo_recebimento_dias === "number" ? regraRow.prazo_recebimento_dias : 30;
      const taxaPercentual =
        typeof regraRow?.taxa_percentual === "number" ? regraRow.taxa_percentual : 0;
      const taxaFixa =
        typeof regraRow?.taxa_fixa_centavos === "number" ? regraRow.taxa_fixa_centavos : 0;

      const valorBruto = valorTotalCentavos;
      const taxaOperadoraFromPayload = asInt(
        bodyUnknown.taxa_operadora_centavos ?? bodyUnknown.taxaOperadoraCentavos
      );
      const valorLiquidoFromPayload = asInt(
        bodyUnknown.valor_liquido_centavos ?? bodyUnknown.valorLiquidoCentavos
      );

      const taxaOperadora =
        taxaOperadoraFromPayload ??
        Math.max(0, Math.round(valorBruto * (taxaPercentual / 100)) + taxaFixa);
      const valorLiquido = valorLiquidoFromPayload ?? Math.max(0, valorBruto - taxaOperadora);

      const dataPrevistaPagamento =
        asString(bodyUnknown.data_prevista_pagamento ?? bodyUnknown.dataPrevistaPagamento) ??
        addDaysISODate(prazoDias);

      const recebivelInsert: JsonRecord = {
        venda_id: vendaId,
        maquina_id: maquinaId,
        bandeira_id: bandeiraId,
        conta_financeira_id: contaFinanceiraId,
        valor_bruto_centavos: valorBruto,
        taxa_operadora_centavos: taxaOperadora,
        valor_liquido_centavos: valorLiquido,
        numero_parcelas: parcelas,
        data_prevista_pagamento: dataPrevistaPagamento,
        status: "PREVISTO",
      };

      const { error: recErr } = await supabase.from("cartao_recebiveis").insert(recebivelInsert);

      if (recErr) {
        await supabase.from("loja_venda_itens").delete().eq("venda_id", vendaId);
        await supabase.from("loja_vendas").delete().eq("id", vendaId);

        return NextResponse.json(
          { ok: false, error: "falha_insert_cartao_recebivel", details: recErr.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        ok: true,
        venda: vendaCriada,
        meta: {
          data_servidor: todayISODate(),
        },
      },
      { status: 201 }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "erro_desconhecido";
    return NextResponse.json({ ok: false, error: "erro_interno", details: msg }, { status: 500 });
  }
}
