import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { getSupabaseServer } from "@/lib/supabaseServer";

type CancelBody = { motivo?: string | null };

export async function DELETE(req: Request, ctx: { params: { id: string } }) {
  const denied = await guardApiByRole(req);
  if (denied) return denied as unknown as NextResponse;

  const compraId = Number(ctx.params.id);
  if (!Number.isFinite(compraId)) {
    return NextResponse.json({ ok: false, error: "compra_id_invalido" }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  const auth = await (await getSupabaseServer()).auth.getUser();
  const canceladaPor = auth.data?.user?.id ?? null;

  const body = (await req.json().catch(() => null)) as CancelBody | null;
  const motivo = body?.motivo?.trim() || null;

  const { data: compra, error: compraErr } = await supabase
    .from("cafe_compras")
    .select("id,status")
    .eq("id", compraId)
    .single();

  if (compraErr || !compra) {
    return NextResponse.json({ ok: false, error: "compra_nao_encontrada" }, { status: 404 });
  }
  if (compra.status !== "ATIVA") {
    return NextResponse.json({ ok: false, error: "compra_ja_cancelada" }, { status: 400 });
  }

  const { data: itens, error: itensErr } = await supabase
    .from("cafe_compra_itens")
    .select("insumo_id,quantidade")
    .eq("compra_id", compraId);

  if (itensErr) {
    return NextResponse.json({ ok: false, error: itensErr.message }, { status: 500 });
  }

  for (const it of itens ?? []) {
    const qtd = Number(it.quantidade);
    const insumoId = Number(it.insumo_id);

    const { data: insumo, error: insErr } = await supabase
      .from("cafe_insumos")
      .select("id,saldo_atual")
      .eq("id", insumoId)
      .single();

    if (insErr || !insumo) {
      return NextResponse.json({ ok: false, error: "insumo_nao_encontrado" }, { status: 400 });
    }

    const saldoAtual = Number(insumo.saldo_atual ?? 0);
    const novoSaldo = saldoAtual - qtd;

    if (novoSaldo < 0) {
      return NextResponse.json({ ok: false, error: "saldo_negativo_ao_cancelar" }, { status: 400 });
    }

    const { error: updErr } = await supabase
      .from("cafe_insumos")
      .update({ saldo_atual: novoSaldo })
      .eq("id", insumoId);

    if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
  }

  const { error: delMovErr } = await supabase
    .from("cafe_insumo_movimentos")
    .delete()
    .eq("origem", "COMPRA")
    .eq("referencia_id", compraId);

  if (delMovErr) return NextResponse.json({ ok: false, error: delMovErr.message }, { status: 500 });

  const { error: cancelErr } = await supabase
    .from("cafe_compras")
    .update({
      status: "CANCELADA",
      cancelada_em: new Date().toISOString(),
      cancelada_por: canceladaPor,
      motivo_cancelamento: motivo,
    })
    .eq("id", compraId);

  if (cancelErr) return NextResponse.json({ ok: false, error: cancelErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
