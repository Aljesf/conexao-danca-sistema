import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

type VendaItemIn = {
  produto_id: number;
  quantidade: number;
};

type VendaIn = {
  pagador_pessoa_id?: number | null;
  consumidor_pessoa_id?: number | null;
  forma_pagamento: "PIX" | "DINHEIRO" | "CARTAO_CONEXAO_ALUNO" | "CARTAO_CONEXAO_COLABORADOR";
  observacoes?: string | null;
  itens: VendaItemIn[];
};

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

  const body = (await req.json().catch(() => null)) as VendaIn | null;

  if (!body?.forma_pagamento) {
    return NextResponse.json({ error: "forma_pagamento_obrigatoria" }, { status: 400 });
  }
  if (!Array.isArray(body?.itens) || body.itens.length === 0) {
    return NextResponse.json({ error: "itens_obrigatorio" }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();

  const produtoIds = Array.from(
    new Set(body.itens.map((i) => Number(i.produto_id)).filter((id) => Number.isFinite(id)))
  );

  if (produtoIds.length === 0) {
    return NextResponse.json({ error: "itens_obrigatorio" }, { status: 400 });
  }

  const { data: produtos, error: prodErr } = await supabase
    .from("cafe_produtos")
    .select("id, nome, preco_venda_centavos, ativo, preparado, insumo_direto_id")
    .in("id", produtoIds);

  if (prodErr || !produtos) {
    return NextResponse.json({ error: "erro_carregar_produtos" }, { status: 500 });
  }

  const produtoMap = new Map<number, ProdutoRow>();
  for (const p of produtos as ProdutoRow[]) {
    produtoMap.set(p.id, p);
  }

  if (produtoMap.size !== produtoIds.length) {
    return NextResponse.json({ error: "produto_nao_encontrado" }, { status: 400 });
  }

  for (const produto of produtoMap.values()) {
    if (!produto.ativo) {
      return NextResponse.json({ error: "produto_inativo" }, { status: 400 });
    }
  }

  const itensCalc = body.itens.map((i) => {
    const produto = produtoMap.get(i.produto_id);
    if (!produto) throw new Error("produto_nao_encontrado");
    const qtd = Number(i.quantidade);
    if (!Number.isFinite(qtd) || qtd <= 0) throw new Error("quantidade_invalida");
    const pu = Number(produto.preco_venda_centavos || 0);
    const total = Math.round(pu * qtd);
    return {
      produto_id: i.produto_id,
      quantidade: qtd,
      preco_unitario_centavos: pu,
      total_centavos: total,
    };
  });

  const valorTotal = itensCalc.reduce((acc, it) => acc + it.total_centavos, 0);

  const statusPagamento = body.forma_pagamento.startsWith("CARTAO_CONEXAO") ? "PENDENTE" : "PAGO";

  const { data: receitas, error: receitasErr } = await supabase
    .from("cafe_produto_receitas")
    .select("produto_id, insumo_id, quantidade")
    .eq("ativo", true)
    .in("produto_id", produtoIds);

  if (receitasErr) return NextResponse.json({ error: receitasErr.message }, { status: 500 });

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

  if (consumoMap.size > 0) {
    const insumoIds = Array.from(consumoMap.keys());
    const { data: insumos, error: insumoErr } = await supabase
      .from("cafe_insumos")
      .select("id, nome, saldo_atual")
      .in("id", insumoIds);

    if (insumoErr) return NextResponse.json({ error: insumoErr.message }, { status: 500 });

    const insumoMap = new Map<number, { nome: string; saldo_atual: number }>();
    for (const insumo of (insumos as { id: number; nome: string; saldo_atual: number }[] | null) ?? []) {
      insumoMap.set(insumo.id, { nome: insumo.nome, saldo_atual: Number(insumo.saldo_atual ?? 0) });
    }

    for (const [insumoId, consumo] of consumoMap.entries()) {
      const info = insumoMap.get(insumoId);
      if (!info) return NextResponse.json({ error: "insumo_nao_encontrado" }, { status: 400 });
      const novoSaldo = info.saldo_atual - consumo;
      if (novoSaldo < 0) {
        return NextResponse.json(
          {
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
      pagador_pessoa_id: body.pagador_pessoa_id ?? null,
      consumidor_pessoa_id: body.consumidor_pessoa_id ?? null,
      valor_total_centavos: valorTotal,
      forma_pagamento: body.forma_pagamento,
      status_pagamento: statusPagamento,
      observacoes: body.observacoes ?? null,
    })
    .select("*")
    .single();

  if (vendaErr || !venda) {
    return NextResponse.json({ error: vendaErr?.message ?? "erro_criar_venda" }, { status: 500 });
  }

  const itensPayload = itensCalc.map((it) => ({ ...it, venda_id: venda.id }));
  const { error: itensErr } = await supabase.from("cafe_venda_itens").insert(itensPayload);
  if (itensErr) return NextResponse.json({ error: itensErr.message }, { status: 500 });

  if (consumoMap.size > 0) {
    for (const [insumoId, consumo] of consumoMap.entries()) {
      const { data: insumoRow, error: insumoErr } = await supabase
        .from("cafe_insumos")
        .select("saldo_atual")
        .eq("id", insumoId)
        .single();

      if (insumoErr || !insumoRow) {
        return NextResponse.json({ error: "insumo_nao_encontrado" }, { status: 500 });
      }

      const saldoAtual = Number(insumoRow.saldo_atual ?? 0);
      const novoSaldo = saldoAtual - consumo;

      if (novoSaldo < 0) {
        return NextResponse.json(
          { error: "saldo_insuficiente", insumo_id: insumoId, saldo_atual: saldoAtual, consumo },
          { status: 400 }
        );
      }

      const { error: movErr } = await supabase
        .from("cafe_insumo_movimentos")
        .insert({
          insumo_id: insumoId,
          tipo: "SAIDA",
          quantidade: consumo,
          origem: "VENDA",
          referencia_id: venda.id,
          observacoes: `Venda #${venda.id}`,
        })
        .select("id")
        .maybeSingle();

      if (movErr) return NextResponse.json({ error: movErr.message }, { status: 500 });

      const { error: updErr } = await supabase
        .from("cafe_insumos")
        .update({ saldo_atual: novoSaldo })
        .eq("id", insumoId);

      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ data: { ...venda, valor_total_centavos: valorTotal } }, { status: 201 });
}
