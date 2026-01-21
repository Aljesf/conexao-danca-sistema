import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

type ItemIn = {
  insumo_id: number;
  quantidade: number;
  valor_total_centavos: number;
  custo_unitario_centavos?: number;
  validade?: string | null;
  observacoes?: string | null;
};

type CompraIn = {
  data_compra?: string;
  onde_comprei: string;
  conta_financeira_id: number;
  categoria_financeira_id?: number | null;
  observacoes?: string | null;
  itens: ItemIn[];
};

function calcCustoUnitario(valorTotal: number, qtd: number): number {
  if (!Number.isFinite(valorTotal) || valorTotal < 0) return 0;
  if (!Number.isFinite(qtd) || qtd <= 0) return 0;
  return Math.round(valorTotal / qtd);
}

export async function GET(req: Request) {
  const denied = await guardApiByRole(req);
  if (denied) return denied as unknown as NextResponse;

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("cafe_compras")
    .select("id,data_compra,onde_comprei,valor_total_centavos,created_at")
    .eq("centro_custo_id", 3)
    .order("data_compra", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data }, { status: 200 });
}

export async function POST(req: Request) {
  const denied = await guardApiByRole(req);
  if (denied) return denied as unknown as NextResponse;

  const body = (await req.json().catch(() => null)) as CompraIn | null;

  if (!body?.onde_comprei?.trim()) {
    return NextResponse.json({ ok: false, error: "onde_comprei_obrigatorio" }, { status: 400 });
  }

  const contaId = Number(body?.conta_financeira_id);
  if (!Number.isFinite(contaId)) {
    return NextResponse.json({ ok: false, error: "conta_financeira_id_obrigatorio" }, { status: 400 });
  }

  const categoriaIdRaw = body?.categoria_financeira_id;
  const categoriaId =
    categoriaIdRaw === null || categoriaIdRaw === undefined ? null : Number(categoriaIdRaw);
  if (categoriaId !== null && !Number.isFinite(categoriaId)) {
    return NextResponse.json({ ok: false, error: "categoria_financeira_id_invalida" }, { status: 400 });
  }

  if (!Array.isArray(body?.itens) || body.itens.length === 0) {
    return NextResponse.json({ ok: false, error: "itens_obrigatorio" }, { status: 400 });
  }

  let itensCalc: Array<{
    insumo_id: number;
    quantidade: number;
    valor_total_centavos: number;
    custo_unitario_centavos: number;
    validade: string | null;
    observacoes: string | null;
  }> = [];

  try {
    itensCalc = body.itens.map((it, idx) => {
      const insumoId = Number(it.insumo_id);
      const qtd = Number(it.quantidade);
      const total = Number(it.valor_total_centavos);

      if (!Number.isFinite(insumoId)) throw new Error(`insumo_id_invalido_${idx}`);
      if (!Number.isFinite(qtd) || qtd <= 0) throw new Error(`quantidade_invalida_${idx}`);
      if (!Number.isFinite(total) || total < 0) throw new Error(`valor_total_invalido_${idx}`);

      const cu = Number.isFinite(it.custo_unitario_centavos)
        ? Number(it.custo_unitario_centavos)
        : calcCustoUnitario(total, qtd);

      return {
        insumo_id: insumoId,
        quantidade: qtd,
        valor_total_centavos: Math.round(total),
        custo_unitario_centavos: Math.round(cu),
        validade: it.validade ?? null,
        observacoes: it.observacoes ?? null,
      };
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "itens_invalidos" },
      { status: 400 }
    );
  }

  const valorTotal = itensCalc.reduce((acc, it) => acc + it.valor_total_centavos, 0);

  const supabase = getSupabaseServiceClient();
  const insumoIds = Array.from(new Set(itensCalc.map((it) => it.insumo_id)));
  const { data: insumos, error: insErr } = await supabase
    .from("cafe_insumos")
    .select("id,saldo_atual")
    .in("id", insumoIds);

  if (insErr) return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
  if ((insumos ?? []).length !== insumoIds.length) {
    return NextResponse.json({ ok: false, error: "insumo_nao_encontrado" }, { status: 400 });
  }

  const saldoMap = new Map<number, number>();
  for (const insumo of insumos ?? []) {
    saldoMap.set(insumo.id, Number(insumo.saldo_atual ?? 0));
  }

  const payload: Record<string, unknown> = {
    centro_custo_id: 3,
    conta_financeira_id: contaId,
    categoria_financeira_id: categoriaId,
    onde_comprei: body.onde_comprei.trim(),
    valor_total_centavos: valorTotal,
    observacoes: body.observacoes ?? null,
  };

  if (body.data_compra) {
    payload.data_compra = body.data_compra;
  }

  const { data: compra, error: compraErr } = await supabase
    .from("cafe_compras")
    .insert(payload)
    .select("*")
    .single();

  if (compraErr || !compra) {
    return NextResponse.json(
      { ok: false, error: compraErr?.message ?? "erro_criar_compra" },
      { status: 500 }
    );
  }

  const { data: itensIns, error: itensErr } = await supabase
    .from("cafe_compra_itens")
    .insert(itensCalc.map((it) => ({ ...it, compra_id: compra.id })))
    .select("*");

  if (itensErr) return NextResponse.json({ ok: false, error: itensErr.message }, { status: 500 });

  for (const it of itensCalc) {
    const saldoAtual = saldoMap.get(it.insumo_id) ?? 0;
    const novoSaldo = saldoAtual + Number(it.quantidade);

    const { error: movErr } = await supabase.from("cafe_insumo_movimentos").insert({
      insumo_id: it.insumo_id,
      tipo: "ENTRADA",
      quantidade: it.quantidade,
      custo_unitario_centavos: it.custo_unitario_centavos,
      validade: it.validade,
      origem: "COMPRA",
      referencia_id: compra.id,
      observacoes: it.observacoes,
    });

    if (movErr) return NextResponse.json({ ok: false, error: movErr.message }, { status: 500 });

    const { error: updErr } = await supabase
      .from("cafe_insumos")
      .update({ saldo_atual: novoSaldo })
      .eq("id", it.insumo_id);

    if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
    saldoMap.set(it.insumo_id, novoSaldo);
  }

  // TODO: registrar movimento_financeiro (DESPESA) usando o helper de lancamentos manuais.

  return NextResponse.json({ ok: true, data: { compra, itens: itensIns } }, { status: 201 });
}
