import { NextResponse } from "next/server";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";
import { upsertLancamentoPorCobranca } from "@/lib/credito-conexao/upsertLancamentoPorCobranca";
import { guardApiByRole } from "@/lib/auth/roleGuard";

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

function parseCentavos(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v !== "string") return null;

  const s0 = v.trim();
  if (!s0) return null;

  if (/^\d+$/.test(s0)) return Math.trunc(Number(s0));

  const s = s0
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const n = Number(s);
  if (!Number.isFinite(n)) return null;

  return Math.round(n * 100);
}

function pickInt(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
    if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) {
      return Math.trunc(Number(v));
    }
  }
  return null;
}

function pickCentavos(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = obj[k];
    const c = parseCentavos(v);
    if (typeof c === "number" && Number.isFinite(c)) return c;
  }
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

function competenciaFromDate(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return value.slice(0, 7);
}

function addCompetencia(base: string, offset: number): string {
  const [anoStr, mesStr] = base.split("-");
  const ano = Number(anoStr);
  const mes = Number(mesStr);
  if (!Number.isFinite(ano) || !Number.isFinite(mes)) return base;
  const d = new Date(Date.UTC(ano, mes - 1 + offset, 1));
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

function buildVencimentoFromCompetencia(
  competencia: string,
  diaVencimento: number | null
): string {
  const [anoStr, mesStr] = competencia.split("-");
  const ano = Number(anoStr);
  const mes = Number(mesStr);
  const maxDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const diaRaw =
    diaVencimento && Number.isFinite(diaVencimento) ? Math.trunc(diaVencimento) : 12;
  const dia = Math.min(Math.max(diaRaw, 1), maxDia);
  const mm = String(mes).padStart(2, "0");
  const dd = String(dia).padStart(2, "0");
  return `${ano}-${mm}-${dd}`;
}

function distribuirCentavos(total: number, parcelas: number): number[] {
  const n = Math.max(1, Math.trunc(parcelas));
  const base = Math.floor(total / n);
  let resto = total - base * n;
  const valores = new Array<number>(n).fill(base);
  for (let i = 0; i < n && resto > 0; i++) {
    valores[i] += 1;
    resto -= 1;
  }
  return valores;
}

function isCartaoConexaoForma(
  formaPagamento: string | null,
  formaPagamentoCodigo: string | null
): boolean {
  const forma = (formaPagamento ?? "").toUpperCase();
  const codigo = (formaPagamentoCodigo ?? "").toUpperCase();
  return forma === "CARTAO_CONEXAO" || codigo.includes("CARTAO_CONEXAO");
}

type CartaoTipoTransacao = "CREDITO_AVISTA" | "CREDITO_PARCELADO";

type ContaConexaoResumo = {
  id: number;
  pessoa_titular_id: number;
  dia_vencimento: number | null;
};

type VendaItemInsert = {
  venda_id: number;
  produto_id: number;
  quantidade: number;
  preco_unitario_centavos: number;
  total_centavos: number;
  beneficiario_pessoa_id: number | null;
  observacoes: string | null;
  variante_id: number | null;
};

function nowLocalISOString(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString();
}

function isCartaoCredito(forma: string | null): boolean {
  if (!forma) return false;
  const code = forma.toUpperCase();
  const isDebito = code.includes("DEBITO");
  if (isDebito) return false;
  return code.includes("CREDITO") || code.includes("CARTAO");
}

function isPagamentoImediato(forma: string | null): boolean {
  if (!forma) return false;
  if (isCartaoCredito(forma)) return false;

  const code = forma.toUpperCase();
  const immediateKeywords = ["DINHEIRO", "PIX", "TRANSFERENCIA", "TED", "DOC", "AVISTA", "DEBITO"];
  return immediateKeywords.some((kw) => code.includes(kw));
}

function inferTipoTransacao(parcelas: number): CartaoTipoTransacao {
  return parcelas > 1 ? "CREDITO_PARCELADO" : "CREDITO_AVISTA";
}

// GET de diagnostico simples
export async function GET(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
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
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  try {
    const supabase = await getSupabaseServerSSR();
    const { data: authData } = await supabase.auth.getUser();
    const usuarioId = authData?.user?.id ?? null;

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
    const formaPagamentoCodigo = asString(
      bodyUnknown.forma_pagamento_codigo ?? bodyUnknown.formaPagamentoCodigo
    );
    const statusPagamento = asString(bodyUnknown.status_pagamento ?? bodyUnknown.statusPagamento) ?? "PAGO";
    const taxaCartaoConexaoCentavos =
      asInt(
        bodyUnknown.taxa_cartao_conexao_centavos ?? bodyUnknown.taxaCartaoConexaoCentavos
      ) ?? 0;
    const cartaoConexaoTipoConta = asString(
      bodyUnknown.cartao_conexao_tipo_conta ?? bodyUnknown.cartaoConexaoTipoConta
    );
    const isCartaoConexao = isCartaoConexaoForma(formaPagamento, formaPagamentoCodigo);

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

    if (isCartaoConexao && (!contaConexaoId || contaConexaoId <= 0)) {
      return NextResponse.json(
        { ok: false, error: "conta_conexao_id_obrigatorio" },
        { status: 400 }
      );
    }
    if (isCartaoConexao && numeroParcelas < 1) {
      return NextResponse.json(
        { ok: false, error: "numero_parcelas_invalido" },
        { status: 400 }
      );
    }

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

    const itensInseridos: VendaItemInsert[] = [];
    const estoqueAjustes: Array<{
      produto_id: number;
      variante_id: number | null;
      quantidade: number;
    }> = [];

    const rollbackVenda = async () => {
      await supabase
        .from("loja_estoque_movimentos")
        .delete()
        .eq("origem", "VENDA")
        .eq("referencia_id", vendaId);

      for (const ajuste of estoqueAjustes) {
        const tabela =
          ajuste.variante_id && ajuste.variante_id > 0
            ? "loja_produto_variantes"
            : "loja_produtos";
        const alvoId = ajuste.variante_id ?? ajuste.produto_id;
        const { data: estoqueRow } = await supabase
          .from(tabela)
          .select("estoque_atual")
          .eq("id", alvoId)
          .maybeSingle();
        const estoqueAtual = Number((estoqueRow as any)?.estoque_atual ?? 0) || 0;
        await supabase
          .from(tabela)
          .update({ estoque_atual: estoqueAtual + ajuste.quantidade })
          .eq("id", alvoId);
      }

      await supabase.from("loja_venda_itens").delete().eq("venda_id", vendaId);
      await supabase.from("loja_vendas").delete().eq("id", vendaId);
    };

    // ====== Itens: agora OBRIGATÓRIO ter pelo menos 1 item válido ======
    const itensCandidate =
      (bodyUnknown as any).itens ??
      (bodyUnknown as any).items ??
      (bodyUnknown as any).venda_itens;

    if (!Array.isArray(itensCandidate) || itensCandidate.length === 0) {
      await supabase.from("loja_vendas").delete().eq("id", vendaId);
      return NextResponse.json({ ok: false, error: "itens_obrigatorios" }, { status: 400 });
    }

    const itensToInsert: VendaItemInsert[] = [];

    for (const raw of itensCandidate) {
      if (!isRecord(raw)) continue;

      const produtoId = pickInt(raw, ["produto_id", "produtoId", "produto_id_num", "produto"]);
      const varianteId = pickInt(raw, ["variante_id", "varianteId", "sku_id", "variante"]);
      const qtd = pickInt(raw, ["quantidade", "qtd", "qtde", "quantity"]);
      const precoUnitCent = pickCentavos(raw, [
        "preco_unitario_centavos",
        "precoUnitarioCentavos",
        "preco_unitario",
        "precoUnit",
        "preco",
      ]);
      const totalCent = pickCentavos(raw, [
        "total_centavos",
        "totalCentavos",
        "total",
        "valor_total_item",
      ]);

      if (!produtoId || !qtd || !precoUnitCent) continue;

      const totalFinal = totalCent ?? Math.max(0, qtd * precoUnitCent);

      const item: VendaItemInsert = {
        venda_id: vendaId,
        produto_id: produtoId,
        quantidade: qtd,
        preco_unitario_centavos: precoUnitCent,
        total_centavos: totalFinal,
        beneficiario_pessoa_id:
          pickInt(raw, [
            "beneficiario_pessoa_id",
            "beneficiarioPessoaId",
            "aluno_pessoa_id",
            "alunoPessoaId",
          ]) ?? null,
        observacoes: asString(raw.observacoes) ?? null,
        variante_id: varianteId ?? null,
      };

      itensToInsert.push(item);
    }

    if (itensToInsert.length === 0) {
      await supabase.from("loja_vendas").delete().eq("id", vendaId);
      return NextResponse.json(
        { ok: false, error: "itens_invalidos", details: "nenhum_item_valido_parseado" },
        { status: 400 }
      );
    }

    const { error: itensErr } = await supabase.from("loja_venda_itens").insert(itensToInsert);
    if (itensErr) {
      await supabase.from("loja_venda_itens").delete().eq("venda_id", vendaId);
      await supabase.from("loja_vendas").delete().eq("id", vendaId);

      return NextResponse.json(
        { ok: false, error: "falha_insert_itens", details: itensErr.message },
        { status: 500 }
      );
    }

    itensInseridos.push(...itensToInsert);

    if (itensInseridos.length > 0) {
      for (const item of itensInseridos) {
        const quantidade = Number(item.quantidade) || 0;
        if (quantidade <= 0) continue;

        const varianteId =
          typeof item.variante_id === "number" && item.variante_id > 0
            ? item.variante_id
            : null;
        const tabela = varianteId ? "loja_produto_variantes" : "loja_produtos";
        const alvoId = varianteId ?? item.produto_id;

        const { data: estoqueRow, error: estoqueErr } = await supabase
          .from(tabela)
          .select("id, estoque_atual")
          .eq("id", alvoId)
          .maybeSingle();

        if (estoqueErr || !estoqueRow) {
          console.error("[POST /api/loja/vendas] erro ao buscar estoque:", estoqueErr);
          await rollbackVenda();
          return NextResponse.json({ ok: false, error: "falha_movimento_estoque" }, { status: 500 });
        }

        const estoqueAntes = Number((estoqueRow as any)?.estoque_atual ?? 0) || 0;
        const estoqueDepois = estoqueAntes - quantidade;

        const { error: updateErr } = await supabase
          .from(tabela)
          .update({ estoque_atual: estoqueDepois })
          .eq("id", alvoId);

        if (updateErr) {
          console.error("[POST /api/loja/vendas] erro ao atualizar estoque:", updateErr);
          await rollbackVenda();
          return NextResponse.json({ ok: false, error: "falha_movimento_estoque" }, { status: 500 });
        }

        estoqueAjustes.push({
          produto_id: item.produto_id,
          variante_id: varianteId,
          quantidade,
        });

        const { error: movimentoErr } = await supabase.from("loja_estoque_movimentos").insert({
          produto_id: item.produto_id,
          variante_id: varianteId,
          tipo: "SAIDA",
          origem: "VENDA",
          referencia_id: vendaId,
          quantidade,
          saldo_antes: estoqueAntes,
          saldo_depois: estoqueDepois,
          observacao: "Saida automatica por venda no caixa",
          created_by: usuarioId,
        });

        if (movimentoErr) {
          console.error("[POST /api/loja/vendas] erro ao inserir movimento estoque:", movimentoErr);
          await rollbackVenda();
          return NextResponse.json({ ok: false, error: "falha_movimento_estoque" }, { status: 500 });
        }
      }
    }

    const formaBase = formaPagamentoCodigo || formaPagamento;
    const movimentoFinanceiroImediato = isPagamentoImediato(formaBase);

    if (movimentoFinanceiroImediato && valorTotalCentavos > 0) {
      let centroCustoId =
        asInt(bodyUnknown.centro_custo_id ?? bodyUnknown.centroCustoId) ?? null;

      if (!centroCustoId) {
        const { data: formaCtx, error: formaCtxError } = await supabase
          .from("formas_pagamento_contexto")
          .select("centro_custo_id")
          .eq("forma_pagamento_codigo", formaBase)
          .eq("ativo", true)
          .order("ordem_exibicao", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (formaCtxError) {
          console.error(
            "[POST /api/loja/vendas] erro ao buscar centro de custo da forma de pagamento:",
            formaCtxError
          );
        }

        centroCustoId = asInt((formaCtx as any)?.centro_custo_id ?? null);
      }

      if (centroCustoId) {
        const { error: movFinErr } = await supabase.from("movimento_financeiro").insert({
          tipo: "RECEITA",
          centro_custo_id: centroCustoId,
          valor_centavos: valorTotalCentavos,
          data_movimento: nowLocalISOString(),
          origem: "VENDA_LOJA",
          origem_id: vendaId,
          descricao: `Venda Loja #${vendaId} - ${formaPagamento}`,
          usuario_id: usuarioId,
        });

        if (movFinErr) {
          console.error(
            "[POST /api/loja/vendas] erro ao registrar movimento financeiro imediato:",
            movFinErr
          );
        }
      } else {
        console.error(
          "[POST /api/loja/vendas] centro_custo_id nao encontrado para movimento financeiro imediato."
        );
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
        await rollbackVenda();

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
        await rollbackVenda();

        return NextResponse.json(
          { ok: false, error: "falha_insert_cartao_recebivel", details: recErr.message },
          { status: 500 }
        );
      }
    }

    if (isCartaoConexao && contaConexaoId && valorTotalCentavos > 0) {
      const { data: contaRow, error: contaErr } = await supabase
        .from("credito_conexao_contas")
        .select("id, pessoa_titular_id, dia_vencimento")
        .eq("id", contaConexaoId)
        .maybeSingle();

      if (contaErr || !contaRow) {
        await rollbackVenda();
        return NextResponse.json(
          { ok: false, error: "conta_conexao_invalida", details: contaErr?.message ?? null },
          { status: 400 }
        );
      }

      const conta = contaRow as ContaConexaoResumo;
      const pessoaTitularId = Number(conta.pessoa_titular_id);
      const pessoaCobrancaId =
        Number.isFinite(pessoaTitularId) && pessoaTitularId > 0
          ? pessoaTitularId
          : clientePessoaId;
      const competenciaBase = competenciaFromDate(todayISODate()) ?? new Date().toISOString().slice(0, 7);
      const parcelas = Math.max(1, numeroParcelas);
      const totalVendaCentavos = Math.max(0, valorTotalCentavos);
      const taxaTotalCentavos = Math.max(0, taxaCartaoConexaoCentavos);
      const baseTotalCentavos = Math.max(0, totalVendaCentavos - taxaTotalCentavos);
      const parcelasBase = distribuirCentavos(baseTotalCentavos, parcelas);
      const parcelasTaxa = distribuirCentavos(taxaTotalCentavos, parcelas);
      const cobrancasCriadas: number[] = [];

      const rollbackCartaoConexao = async () => {
        if (cobrancasCriadas.length === 0) return;
        await supabase.from("credito_conexao_lancamentos").delete().in("cobranca_id", cobrancasCriadas);
        await supabase.from("cobrancas").delete().in("id", cobrancasCriadas);
      };

      for (let i = 0; i < parcelas; i++) {
        const competencia = addCompetencia(competenciaBase, i);
        const valorBase = parcelasBase[i] ?? 0;
        const valorTaxa = parcelasTaxa[i] ?? 0;
        const valorParcela = valorBase + valorTaxa;
        const vencimento = buildVencimentoFromCompetencia(
          competencia,
          conta.dia_vencimento ?? null
        );

        const descricao =
          parcelas > 1 ? `Venda Loja #${vendaId} (${i + 1}/${parcelas})` : `Venda Loja #${vendaId}`;

        const { data: cobranca, error: cobrErr } = await supabase
          .from("cobrancas")
          .insert({
            pessoa_id: pessoaCobrancaId,
            descricao,
            valor_centavos: valorParcela,
            vencimento,
            status: "PENDENTE",
            origem_tipo: "LOJA_VENDA",
            origem_id: vendaId,
            origem_subtipo: "CARTAO_CONEXAO",
            competencia_ano_mes: competencia,
          })
          .select("id")
          .single();

        if (cobrErr || !cobranca) {
          await rollbackCartaoConexao();
          await rollbackVenda();
          return NextResponse.json(
            { ok: false, error: "falha_criar_cobranca_cartao_conexao", details: cobrErr?.message ?? null },
            { status: 500 }
          );
        }

        const cobrancaId = Number((cobranca as { id?: number }).id);
        if (!Number.isFinite(cobrancaId) || cobrancaId <= 0) {
          await rollbackCartaoConexao();
          await rollbackVenda();
          return NextResponse.json(
            { ok: false, error: "cobranca_id_invalido" },
            { status: 500 }
          );
        }

        cobrancasCriadas.push(cobrancaId);

        const composicaoJson: Record<string, unknown> = {
          origem: "LOJA_PARCELADO",
          venda_id: vendaId,
          parcela_numero: i + 1,
          total_parcelas: parcelas,
          competencia,
          valor_parcela_centavos: valorParcela,
          valor_parcela_brl: (valorParcela / 100).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          }),
          valor_base_centavos: valorBase,
          taxa_centavos: valorTaxa,
          valor_total_venda_centavos: totalVendaCentavos,
          taxa_total_centavos: taxaTotalCentavos,
          cartao_conexao_tipo_conta: cartaoConexaoTipoConta ?? null,
          itens: itensInseridos.map((item) => ({
            produto_id: item.produto_id,
            variante_id: item.variante_id,
            quantidade: item.quantidade,
            total_centavos: item.total_centavos,
          })),
        };

        try {
          await upsertLancamentoPorCobranca({
            cobrancaId,
            contaConexaoId,
            competencia,
            valorCentavos: valorParcela,
            descricao,
            origemSistema: "LOJA",
            origemId: vendaId,
            composicaoJson,
          });
        } catch (err) {
          await rollbackCartaoConexao();
          await rollbackVenda();
          const msg = err instanceof Error ? err.message : "erro_desconhecido";
          return NextResponse.json(
            { ok: false, error: "falha_upsert_lancamento_cartao_conexao", details: msg },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json(
      {
        ok: true,
        venda: vendaCriada,
        meta: {
          data_servidor: todayISODate(),
          itens_inseridos: itensInseridos.length,
        },
        redirect_url: `/loja/vendas/${vendaId}`,
      },
      { status: 201 }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "erro_desconhecido";
    return NextResponse.json({ ok: false, error: "erro_interno", details: msg }, { status: 500 });
  }
}
