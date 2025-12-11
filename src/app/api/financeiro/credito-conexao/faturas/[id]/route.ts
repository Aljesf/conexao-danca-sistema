import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = await getSupabaseServer();
  const id = Number(params.id);

  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ ok: false, error: "id_invalido" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("credito_conexao_faturas")
    .select(
      `
      id,
      conta_conexao_id,
      periodo_referencia,
      data_fechamento,
      data_vencimento,
      valor_total_centavos,
      valor_taxas_centavos,
      status,
      cobranca_id,
      created_at,
      updated_at,
      cobranca:cobrancas (
        id,
        pessoa_id,
        descricao,
        valor_centavos,
        vencimento,
        status,
        neofin_charge_id,
        link_pagamento,
        linha_digitavel,
        neofin_payload
      )
    `
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    console.error("Erro ao buscar fatura detalhe", error);
    return NextResponse.json({ ok: false, error: "fatura_nao_encontrada" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, fatura: data });
}
