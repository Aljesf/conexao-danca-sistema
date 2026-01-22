import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";
import { guardApiByRole } from "@/lib/auth/roleGuard";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardApiByRole(_req as any);
  if (denied) return denied as any;
  const auth = await requireUser(_req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;
  const { id } = await params;
  const faturaId = Number(id);

  if (!faturaId || Number.isNaN(faturaId)) {
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
    .eq("id", faturaId)
    .single();

  if (error || !data) {
    console.error("Erro ao buscar fatura detalhe", error);
    return NextResponse.json({ ok: false, error: "fatura_nao_encontrada" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, fatura: data });
}


