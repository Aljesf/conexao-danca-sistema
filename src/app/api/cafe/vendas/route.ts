import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { upsertLancamentoPorCobranca } from "@/lib/credito-conexao/upsertLancamentoPorCobranca";
import { toCompetenciaYYYYMM } from "@/lib/financeiro/competencia";
import { recalcularComprasFatura, vincularLancamentoNaFatura } from "@/lib/financeiro/creditoConexaoFaturas";

type ProdutoRow = {
  id: number;
  nome: string;
  preco_venda_centavos: number;
  ativo: boolean;
  preparado: boolean;
  insumo_direto_id: number | null;
};

type ReceitaRow = {
  produto_id: number;
  insumo_id: number;
  quantidade: number;
};

type InsumoRow = {
  id: number;
  nome: string;
  saldo_atual: number;
};

type VendaItemInsert = {
  venda_id: number;
  produto_id: number;
  quantidade: number;
  preco_unitario_centavos: number;
  total_centavos: number;
};

type CartaoTipoTransacao = "CREDITO_AVISTA" | "CREDITO_PARCELADO";

type ContaConexaoResumo = {
  id: number;
  pessoa_titular_id: number;
  tipo_conta: string | null;
  dia_fechamento: number | null;
  dia_vencimento: number | null;
};

type JsonRecord = Record<string, unknown>;

type ItemParsed = {
  produto_id: number;
  quantidade: number;
  preco_unitario_centavos: number | null;
  total_centavos: number;
  beneficiario_pessoa_id: number | null;
  observacoes: string | null;
};

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

async function ensureFaturaAbertaNaCompetencia(params: {
  supabase: any;
  contaConexaoId: number;
  competencia: string;
  diaVencimento: number | null;
}): Promise<number> {
  const { supabase, contaConexaoId, competencia, diaVencimento } = params;

  const { data: existente, error: findErr } = await supabase
    .from("credito_conexao_faturas")
    .select("id,status,data_vencimento")
    .eq("conta_conexao_id", contaConexaoId)
    .eq("periodo_referencia", competencia)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findErr) throw findErr;

  const dataVencimento = buildVencimentoFromCompetencia(competencia, diaVencimento);

  if (existente?.id) {
    if (existente.status !== "ABERTA" || !existente.data_vencimento) {
      const { error: updErr } = await supabase
        .from("credito_conexao_faturas")
        .update({
          status: "ABERTA",
          data_vencimento: existente.data_vencimento ?? dataVencimento,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existente.id);
      if (updErr) throw updErr;
    }
    return Number(existente.id);
  }

  const { data: criada, error: createErr } = await supabase
    .from("credito_conexao_faturas")
    .insert({
      conta_conexao_id: contaConexaoId,
      periodo_referencia: competencia,
      data_fechamento: todayISODate(),
      data_vencimento: dataVencimento,
      valor_total_centavos: 0,
      valor_taxas_centavos: 0,
      status: "ABERTA",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (createErr || !criada?.id) {
    throw createErr ?? new Error("falha_criar_fatura_aberta");
  }

  return Number(criada.id);
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
  const immediateKeywords = ["DINHEIRO", "PIX", "TRANSFERENCIA", "TED", "DOC", "AVISTA", "DEBITO", "SEM_COBRANCA"];
  return immediateKeywords.some((kw) => code.includes(kw));
}

function inferTipoTransacao(parcelas: number): CartaoTipoTransacao {
  return parcelas > 1 ? "CREDITO_PARCELADO" : "CREDITO_AVISTA";
}

function nowLocalISOString(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString();
}

export async function GET(req: Request) {
  const denied = await guardApiByRole(req);
  if (denied) return denied as unknown as NextResponse;

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("cafe_vendas")
    .select("*, cafe_venda_itens(*, cafe_produtos(id, nome))")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 200 });
}

export async function POST(req: Request) {
  const denied = await guardApiByRole(req);
  if (denied) return denied as unknown as NextResponse;

  const supabase = getSupabaseServiceClient();
  const bodyUnknown = (await req.json().catch(() => null)) as JsonRecord | null;

  if (!isRecord(bodyUnknown)) {
    return NextResponse.json({ ok: false, error: "payload_invalido" }, { status: 400 });
  }

  const compradorId = asInt(
    bodyUnknown.comprador_pessoa_id ??
      bodyUnknown.pagador_pessoa_id ??
      bodyUnknown.cliente_pessoa_id ??
      bodyUnknown.clientePessoaId ??
      bodyUnknown.cliente_id
  );
  const consumidorId = asInt(
    bodyUnknown.consumidor_pessoa_id ?? bodyUnknown.consumidorPessoaId
  );
  const formaPagamento = asString(
    bodyUnknown.forma_pagamento ?? bodyUnknown.formaPagamento
  );
  const formaPagamentoCodigo = asString(
    bodyUnknown.forma_pagamento_codigo ?? bodyUnknown.formaPagamentoCodigo
  );
  const tabelaPrecoId = asInt(
    bodyUnknown.tabela_preco_id ?? bodyUnknown.tabelaPrecoId
  );

  if (!compradorId || !formaPagamento) {
    return NextResponse.json(
      { ok: false, error: "campos_obrigatorios" },
      { status: 400 }
    );
  }

  if (tabelaPrecoId) {
    const { data: tabela, error: tabelaErr } = await supabase
      .from("cafe_tabelas_preco")
      .select("id, ativo")
      .eq("id", tabelaPrecoId)
      .maybeSingle();

    if (tabelaErr) {
      return NextResponse.json({ ok: false, error: tabelaErr.message }, { status: 500 });
    }
    if (!tabela) {
      return NextResponse.json({ ok: false, error: "tabela_preco_invalida" }, { status: 400 });
    }
    if (tabela.ativo === false) {
      return NextResponse.json({ ok: false, error: "tabela_preco_inativa" }, { status: 400 });
    }
  }

  const formaBase = formaPagamentoCodigo ?? formaPagamento;
  const statusPagamento =
    asString(bodyUnknown.status_pagamento ?? bodyUnknown.statusPagamento) ??
    (isPagamentoImediato(formaBase) ? "PAGO" : "PENDENTE");

  const dadosCartaoExterno = isRecord(bodyUnknown.dados_cartao_externo)
    ? bodyUnknown.dados_cartao_externo
    : null;
  const dadosCartaoConexao = isRecord(bodyUnknown.dados_cartao_conexao)
    ? bodyUnknown.dados_cartao_conexao
    : null;

  const contaConexaoId = asInt(
    (dadosCartaoConexao as any)?.conta_conexao_id ??
      (dadosCartaoConexao as any)?.contaConexaoId ??
      bodyUnknown.conta_conexao_id ??
      bodyUnknown.contaConexaoId
  );
  const numeroParcelas =
    asInt(
      bodyUnknown.numero_parcelas ??
        bodyUnknown.numeroParcelas ??
        bodyUnknown.cartao_numero_parcelas ??
        (dadosCartaoConexao as any)?.parcelas ??
        (dadosCartaoExterno as any)?.parcelas
    ) ?? 1;
  const taxaCartaoConexaoCentavos =
    asInt(
      (dadosCartaoConexao as any)?.taxa_cartao_conexao_centavos ??
        bodyUnknown.taxa_cartao_conexao_centavos ??
        bodyUnknown.taxaCartaoConexaoCentavos
    ) ?? 0;
  const cartaoConexaoTipoConta = asString(
    (dadosCartaoConexao as any)?.tipo_conta ??
      bodyUnknown.cartao_conexao_tipo_conta ??
      bodyUnknown.cartaoConexaoTipoConta
  );

  const isCartaoConexao = isCartaoConexaoForma(formaPagamento, formaPagamentoCodigo);

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

  const itensCandidate =
    (bodyUnknown as any).itens ??
    (bodyUnknown as any).items ??
    (bodyUnknown as any).venda_itens;

  if (!Array.isArray(itensCandidate) || itensCandidate.length === 0) {
    return NextResponse.json({ ok: false, error: "itens_obrigatorios" }, { status: 400 });
  }

  const itensParsed: ItemParsed[] = [];

  for (const raw of itensCandidate) {
    if (!isRecord(raw)) continue;
    const produtoId = pickInt(raw, ["produto_id", "produtoId", "produto"]);
    const quantidade = pickInt(raw, ["quantidade", "qtd", "qtde", "quantity"]);
    if (!produtoId || !quantidade || quantidade <= 0) continue;

    itensParsed.push({
      produto_id: produtoId,
      quantidade,
      preco_unitario_centavos: pickCentavos(raw, [
        "preco_unitario_centavos",
        "precoUnitarioCentavos",
        "preco_unitario",
        "precoUnit",
        "preco",
      ]),
      total_centavos: 0,
      beneficiario_pessoa_id:
        pickInt(raw, [
          "beneficiario_pessoa_id",
          "beneficiarioPessoaId",
          "aluno_pessoa_id",
          "alunoPessoaId",
        ]) ?? compradorId,
      observacoes: asString(raw.observacoes) ?? null,
    });
  }

  if (itensParsed.length === 0) {
    return NextResponse.json({ ok: false, error: "itens_invalidos" }, { status: 400 });
  }

  const produtoIds = Array.from(new Set(itensParsed.map((i) => i.produto_id)));

  const { data: produtos, error: prodErr } = await supabase
    .from("cafe_produtos")
    .select("id, nome, preco_venda_centavos, ativo, preparado, insumo_direto_id")
    .in("id", produtoIds);

  if (prodErr || !produtos) {
    return NextResponse.json({ ok: false, error: "erro_carregar_produtos" }, { status: 500 });
  }

  const produtoMap = new Map<number, ProdutoRow>();
  for (const p of produtos as ProdutoRow[]) {
    produtoMap.set(p.id, p);
  }

  if (produtoMap.size !== produtoIds.length) {
    return NextResponse.json({ ok: false, error: "produto_nao_encontrado" }, { status: 400 });
  }

  for (const produto of produtoMap.values()) {
    if (!produto.ativo) {
      return NextResponse.json({ ok: false, error: "produto_inativo" }, { status: 400 });
    }
  }

  const itensCalc: ItemParsed[] = itensParsed.map((it) => {
    const produto = produtoMap.get(it.produto_id);
    const precoFallback = produto ? Number(produto.preco_venda_centavos || 0) : 0;
    const preco =
      it.preco_unitario_centavos === null ? precoFallback : it.preco_unitario_centavos;
    const total = Math.max(0, it.quantidade * preco);
    return {
      ...it,
      preco_unitario_centavos: preco,
      total_centavos: total,
    };
  });

  const valorTotal = itensCalc.reduce((acc, it) => acc + it.total_centavos, 0);

  const { data: receitas, error: receitasErr } = await supabase
    .from("cafe_produto_receitas")
    .select("produto_id, insumo_id, quantidade")
    .eq("ativo", true)
    .in("produto_id", produtoIds);

  if (receitasErr) {
    return NextResponse.json({ ok: false, error: receitasErr.message }, { status: 500 });
  }

  const receitaMap = new Map<number, ReceitaRow[]>();
  for (const r of (receitas as ReceitaRow[] | null) ?? []) {
    const list = receitaMap.get(r.produto_id) ?? [];
    list.push(r);
    receitaMap.set(r.produto_id, list);
  }

  const consumoMap = new Map<number, number>();

  for (const item of itensCalc) {
    const produto = produtoMap.get(item.produto_id);
    if (!produto) continue;

    const receitaItens = receitaMap.get(produto.id) ?? [];
    if (produto.preparado && receitaItens.length > 0) {
      for (const rec of receitaItens) {
        const consumoAtual = consumoMap.get(rec.insumo_id) ?? 0;
        consumoMap.set(rec.insumo_id, consumoAtual + Number(rec.quantidade) * item.quantidade);
      }
      continue;
    }

    if (produto.insumo_direto_id) {
      const consumoAtual = consumoMap.get(produto.insumo_direto_id) ?? 0;
      consumoMap.set(produto.insumo_direto_id, consumoAtual + item.quantidade);
    }
  }

  const saldosAntes = new Map<number, number>();
  if (consumoMap.size > 0) {
    const insumoIds = Array.from(consumoMap.keys());
    const { data: insumos, error: insumoErr } = await supabase
      .from("cafe_insumos")
      .select("id, nome, saldo_atual")
      .in("id", insumoIds);

    if (insumoErr) {
      return NextResponse.json({ ok: false, error: insumoErr.message }, { status: 500 });
    }

    const insumoMap = new Map<number, InsumoRow>();
    for (const insumo of (insumos as InsumoRow[] | null) ?? []) {
      insumoMap.set(insumo.id, {
        id: insumo.id,
        nome: insumo.nome,
        saldo_atual: Number(insumo.saldo_atual ?? 0),
      });
    }

    for (const [insumoId, consumo] of consumoMap.entries()) {
      const info = insumoMap.get(insumoId);
      if (!info) return NextResponse.json({ ok: false, error: "insumo_nao_encontrado" }, { status: 400 });
      saldosAntes.set(insumoId, info.saldo_atual);
      const novoSaldo = info.saldo_atual - consumo;
      if (novoSaldo < 0) {
        return NextResponse.json(
          {
            ok: false,
            error: "saldo_insuficiente",
            insumo_id: insumoId,
            insumo_nome: info.nome,
            saldo_atual: info.saldo_atual,
            consumo,
          },
          { status: 400 }
        );
      }
    }
  }

  const { data: venda, error: vendaErr } = await supabase
    .from("cafe_vendas")
    .insert({
      pagador_pessoa_id: compradorId,
      consumidor_pessoa_id: consumidorId ?? null,
      valor_total_centavos: valorTotal,
      forma_pagamento: formaPagamento,
      status_pagamento: statusPagamento,
      tabela_preco_id: tabelaPrecoId ?? null,
      observacoes: asString(bodyUnknown.observacoes) ?? null,
    })
    .select("*")
    .single();

  if (vendaErr || !venda) {
    return NextResponse.json({ ok: false, error: vendaErr?.message ?? "erro_criar_venda" }, { status: 500 });
  }

  const vendaId = Number((venda as { id?: number }).id);

  const rollbackVenda = async () => {
    await supabase
      .from("cafe_insumo_movimentos")
      .delete()
      .eq("origem", "VENDA")
      .eq("referencia_id", vendaId);

    for (const [insumoId, saldo] of saldosAntes.entries()) {
      await supabase
        .from("cafe_insumos")
        .update({ saldo_atual: saldo })
        .eq("id", insumoId);
    }

    await supabase.from("cafe_venda_itens").delete().eq("venda_id", vendaId);
    await supabase.from("cafe_vendas").delete().eq("id", vendaId);
  };

  const itensPayload: VendaItemInsert[] = itensCalc.map((it) => ({
    venda_id: vendaId,
    produto_id: it.produto_id,
    quantidade: it.quantidade,
    preco_unitario_centavos: it.preco_unitario_centavos,
    total_centavos: it.total_centavos,
  }));

  const { error: itensErr } = await supabase.from("cafe_venda_itens").insert(itensPayload);
  if (itensErr) {
    await rollbackVenda();
    return NextResponse.json({ ok: false, error: itensErr.message }, { status: 500 });
  }

  if (consumoMap.size > 0) {
    for (const [insumoId, consumo] of consumoMap.entries()) {
      const saldoAntes = saldosAntes.get(insumoId) ?? 0;
      const novoSaldo = saldoAntes - consumo;

      const { error: movErr } = await supabase
        .from("cafe_insumo_movimentos")
        .insert({
          insumo_id: insumoId,
          tipo: "SAIDA",
          quantidade: consumo,
          origem: "VENDA",
          referencia_id: vendaId,
          observacoes: `Venda #${vendaId}`,
        })
        .select("id")
        .maybeSingle();

      if (movErr) {
        await rollbackVenda();
        return NextResponse.json({ ok: false, error: movErr.message }, { status: 500 });
      }

      const { error: updErr } = await supabase
        .from("cafe_insumos")
        .update({ saldo_atual: novoSaldo })
        .eq("id", insumoId);

      if (updErr) {
        await rollbackVenda();
        return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
      }
    }
  }

  const movimentoFinanceiroImediato = isPagamentoImediato(formaBase);
  if (movimentoFinanceiroImediato && valorTotal > 0) {
    let centroCustoId = asInt(bodyUnknown.centro_custo_id ?? bodyUnknown.centroCustoId) ?? null;

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
          "[POST /api/cafe/vendas] erro ao buscar centro de custo da forma de pagamento:",
          formaCtxError
        );
      }

      centroCustoId = asInt((formaCtx as any)?.centro_custo_id ?? null);
    }

    if (centroCustoId) {
      const { error: movFinErr } = await supabase.from("movimento_financeiro").insert({
        tipo: "RECEITA",
        centro_custo_id: centroCustoId,
        valor_centavos: valorTotal,
        data_movimento: nowLocalISOString(),
        origem: "VENDA_CAFE",
        origem_id: vendaId,
        descricao: `Venda Cafe #${vendaId} - ${formaPagamento}`,
        usuario_id: null,
      });

      if (movFinErr) {
        console.error(
          "[POST /api/cafe/vendas] erro ao registrar movimento financeiro imediato:",
          movFinErr
        );
      }
    } else {
      console.error(
        "[POST /api/cafe/vendas] centro_custo_id nao encontrado para movimento financeiro imediato."
      );
    }
  }

  const cartaoMaquinaId = asInt(
    (dadosCartaoExterno as any)?.maquina_id ??
      bodyUnknown.cartao_maquina_id ??
      bodyUnknown.maquina_id ??
      bodyUnknown.maquinaId
  );
  const cartaoBandeiraId = asInt(
    (dadosCartaoExterno as any)?.bandeira_id ??
      bodyUnknown.cartao_bandeira_id ??
      bodyUnknown.bandeira_id ??
      bodyUnknown.bandeiraId
  );

  if (cartaoMaquinaId && cartaoBandeiraId && valorTotal > 0) {
    const { data: maquinaRow, error: maqErr } = await supabase
      .from("cartao_maquinas")
      .select("id, conta_financeira_id")
      .eq("id", cartaoMaquinaId)
      .single();

    if (maqErr || !maquinaRow?.conta_financeira_id) {
      await rollbackVenda();
      return NextResponse.json(
        { ok: false, error: "maquina_invalida", details: maqErr?.message ?? "maquina_sem_conta_financeira" },
        { status: 400 }
      );
    }

    const contaFinanceiraId: number = maquinaRow.conta_financeira_id;
    const parcelas = Math.max(1, numeroParcelas);
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
      .eq("maquina_id", cartaoMaquinaId)
      .eq("bandeira_id", cartaoBandeiraId)
      .eq("tipo_transacao", tipoTransacaoFinal)
      .eq("ativo", true)
      .maybeSingle();

    const prazoDias =
      typeof regraRow?.prazo_recebimento_dias === "number" ? regraRow.prazo_recebimento_dias : 30;
    const taxaPercentual =
      typeof regraRow?.taxa_percentual === "number" ? regraRow.taxa_percentual : 0;
    const taxaFixa =
      typeof regraRow?.taxa_fixa_centavos === "number" ? regraRow.taxa_fixa_centavos : 0;

    const valorBruto = valorTotal;
    const taxaOperadoraFromPayload = asInt(
      bodyUnknown.taxa_operadora_centavos ?? bodyUnknown.taxaOperadoraCentavos
    );
    const valorLiquidoFromPayload = asInt(
      bodyUnknown.valor_liquido_centavos ?? bodyUnknown.valorLiquidoCentavos
    );

    const taxaOperadora =
      taxaOperadoraFromPayload ?? Math.max(0, Math.round(valorBruto * (taxaPercentual / 100)) + taxaFixa);
    const valorLiquido = valorLiquidoFromPayload ?? Math.max(0, valorBruto - taxaOperadora);

    const dataPrevistaPagamento =
      asString(bodyUnknown.data_prevista_pagamento ?? bodyUnknown.dataPrevistaPagamento) ??
      addDaysISODate(prazoDias);

    const recebivelInsert: JsonRecord = {
      venda_id: vendaId,
      maquina_id: cartaoMaquinaId,
      bandeira_id: cartaoBandeiraId,
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

  let cobrancaIdParaVenda: number | null = null;
  if (isCartaoConexao && contaConexaoId && valorTotal > 0) {
    const { data: contaRow, error: contaErr } = await supabase
      .from("credito_conexao_contas")
      .select("id, pessoa_titular_id, tipo_conta, dia_fechamento, dia_vencimento")
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
    const contaTipo = (conta.tipo_conta ?? "").toUpperCase();
    const isContaColaborador = contaTipo === "COLABORADOR";
    const pessoaTitularId = Number(conta.pessoa_titular_id);
    const pessoaCobrancaId = Number.isFinite(pessoaTitularId) && pessoaTitularId > 0
      ? pessoaTitularId
      : compradorId;

    const competenciaBase = toCompetenciaYYYYMM(new Date());
    const parcelas = Math.max(1, numeroParcelas);
    const totalVendaCentavos = Math.max(0, valorTotal);
    const taxaTotalCentavos = Math.max(0, taxaCartaoConexaoCentavos);
    if (isContaColaborador) {
      const referenciaItem = `cafe:venda:${vendaId}`;
      const competencia = competenciaBase;
      const descricao = `Venda Cafe #${vendaId}`;
      const composicaoJson: Record<string, unknown> = {
        origem: "CAFE_COLABORADOR",
        venda_id: vendaId,
        competencia,
        valor_total_venda_centavos: totalVendaCentavos,
        taxa_total_centavos: taxaTotalCentavos,
        valor_lancamento_centavos: totalVendaCentavos,
        cartao_conexao_tipo_conta: contaTipo,
        cartao_conexao_tipo_conta_payload: cartaoConexaoTipoConta ?? null,
        itens: itensCalc.map((item) => ({
          produto_id: item.produto_id,
          quantidade: item.quantidade,
          total_centavos: item.total_centavos,
        })),
      };

      const { data: lancamentoExistente, error: lancFindErr } = await supabase
        .from("credito_conexao_lancamentos")
        .select("id")
        .eq("conta_conexao_id", contaConexaoId)
        .eq("origem_sistema", "CAFE")
        .eq("origem_id", vendaId)
        .eq("referencia_item", referenciaItem)
        .maybeSingle();

      if (lancFindErr) {
        await rollbackVenda();
        return NextResponse.json(
          { ok: false, error: "falha_buscar_lancamento_cartao_conexao", details: lancFindErr.message },
          { status: 500 }
        );
      }

      const payloadLancamento = {
        conta_conexao_id: contaConexaoId,
        cobranca_id: null,
        competencia,
        referencia_item: referenciaItem,
        valor_centavos: totalVendaCentavos,
        descricao,
        origem_sistema: "CAFE",
        origem_id: vendaId,
        composicao_json: composicaoJson,
        numero_parcelas: parcelas,
        status: "PENDENTE_FATURA",
        data_lancamento: todayISODate(),
      };

      let lancamentoId: number | null = null;
      let lancamentoCriado = false;

      if (lancamentoExistente?.id) {
        const { data: lancamentoAtualizado, error: lancUpdErr } = await supabase
          .from("credito_conexao_lancamentos")
          .update(payloadLancamento)
          .eq("id", lancamentoExistente.id)
          .select("id")
          .single();

        if (lancUpdErr || !lancamentoAtualizado?.id) {
          await rollbackVenda();
          return NextResponse.json(
            { ok: false, error: "falha_atualizar_lancamento_cartao_conexao", details: lancUpdErr?.message ?? null },
            { status: 500 }
          );
        }
        lancamentoId = Number(lancamentoAtualizado.id);
      } else {
        const { data: lancamentoInserido, error: lancInsErr } = await supabase
          .from("credito_conexao_lancamentos")
          .insert(payloadLancamento)
          .select("id")
          .single();

        if (lancInsErr || !lancamentoInserido?.id) {
          await rollbackVenda();
          return NextResponse.json(
            { ok: false, error: "falha_criar_lancamento_cartao_conexao", details: lancInsErr?.message ?? null },
            { status: 500 }
          );
        }
        lancamentoCriado = true;
        lancamentoId = Number(lancamentoInserido.id);
      }

      try {
        const faturaId = await ensureFaturaAbertaNaCompetencia({
          supabase,
          contaConexaoId,
          competencia,
          diaVencimento: conta.dia_vencimento ?? null,
        });
        const vinculo = await vincularLancamentoNaFatura(supabase, faturaId, lancamentoId);
        if (!vinculo.ok) {
          throw vinculo.error ?? new Error("falha_vincular_lancamento_fatura");
        }
        await recalcularComprasFatura(supabase, faturaId);

        const { data: faturaSyncMeta, error: faturaSyncMetaErr } = await supabase
          .from("credito_conexao_faturas")
          .select("id, folha_pagamento_id")
          .eq("id", faturaId)
          .maybeSingle();
        if (faturaSyncMetaErr) {
          throw faturaSyncMetaErr;
        }
        if (faturaSyncMeta?.folha_pagamento_id) {
          const { error: syncErr } = await supabase.rpc("sync_credito_fatura_para_folha", {
            p_fatura_id: faturaId,
          });
          if (syncErr) {
            console.error("[POST /api/cafe/vendas] falha_sync_credito_fatura_para_folha:", syncErr);
          }
        }
      } catch (err) {
        if (lancamentoCriado && lancamentoId) {
          await supabase.from("credito_conexao_lancamentos").delete().eq("id", lancamentoId);
        }
        await rollbackVenda();
        const msg = err instanceof Error ? err.message : "erro_desconhecido";
        return NextResponse.json(
          { ok: false, error: "falha_vincular_lancamento_fatura_colaborador", details: msg },
          { status: 500 }
        );
      }
    } else {
      const baseTotalCentavos = Math.max(0, totalVendaCentavos - taxaTotalCentavos);
      const parcelasBase = distribuirCentavos(baseTotalCentavos, parcelas);
      const parcelasTaxa = distribuirCentavos(taxaTotalCentavos, parcelas);
      const cobrancasCriadas: number[] = [];

      const rollbackCartaoConexao = async () => {
        if (cobrancasCriadas.length === 0) return;
        await supabase
          .from("credito_conexao_lancamentos")
          .delete()
          .in("cobranca_id", cobrancasCriadas);
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
          parcelas > 1 ? `Venda Cafe #${vendaId} (${i + 1}/${parcelas})` : `Venda Cafe #${vendaId}`;

        const { data: cobranca, error: cobrErr } = await supabase
          .from("cobrancas")
          .insert({
            pessoa_id: pessoaCobrancaId,
            descricao,
            valor_centavos: valorParcela,
            vencimento,
            status: "PENDENTE",
            origem_tipo: "CAFE",
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
          origem: "CAFE_PARCELADO",
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
          itens: itensCalc.map((item) => ({
            produto_id: item.produto_id,
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
            origemSistema: "CAFE",
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

      if (cobrancasCriadas.length === 1) {
        cobrancaIdParaVenda = cobrancasCriadas[0] ?? null;
      }
    }
  }

  if (cobrancaIdParaVenda) {
    const { error: updErr } = await supabase
      .from("cafe_vendas")
      .update({ cobranca_id: cobrancaIdParaVenda })
      .eq("id", vendaId);
    if (updErr) {
      console.error("[POST /api/cafe/vendas] falha ao atualizar cobranca_id:", updErr);
    }
  }

  return NextResponse.json(
    {
      ok: true,
      venda,
      redirect_url: `/cafe/vendas/${vendaId}`,
    },
    { status: 201 }
  );
}
