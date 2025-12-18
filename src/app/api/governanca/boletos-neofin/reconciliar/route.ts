import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

type ReconciliarResult = {
  cobranca_id: number;
  antes_status: string;
  depois_status: string;
  total_recebido_centavos: number;
  valor_centavos: number;
  ultimo_pagamento_em: string | null;
};

export async function POST() {
  const supabase = await getSupabaseServer();

  const { data, error } = await supabase
    .from("vw_governanca_boletos_neofin")
    .select(
      "cobranca_id,cobranca_status,total_recebido_centavos,valor_centavos,ultimo_pagamento_em"
    )
    .neq("cobranca_status", "PAGO");

  if (error) {
    return NextResponse.json(
      { ok: false, error: "erro_carregar_para_reconciliar", details: error.message },
      { status: 500 }
    );
  }

  const candidatos =
    (data ?? []).filter((row: any) => {
      const total = Number(row.total_recebido_centavos ?? 0);
      const valor = Number(row.valor_centavos ?? 0);
      return total >= valor && valor > 0;
    }) ?? [];

  const resultados: ReconciliarResult[] = [];

  for (const row of candidatos) {
    const cobrancaId = Number(row.cobranca_id);
    const antes = String(row.cobranca_status ?? "");
    const ultimoPagamento = (row.ultimo_pagamento_em as string | null) ?? null;

    const { error: upErr } = await supabase
      .from("cobrancas")
      .update({
        status: "PAGO",
        data_pagamento: ultimoPagamento ? ultimoPagamento.slice(0, 10) : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cobrancaId);

    if (!upErr) {
      resultados.push({
        cobranca_id: cobrancaId,
        antes_status: antes,
        depois_status: "PAGO",
        total_recebido_centavos: Number(row.total_recebido_centavos ?? 0),
        valor_centavos: Number(row.valor_centavos ?? 0),
        ultimo_pagamento_em: ultimoPagamento,
      });
    }
  }

  return NextResponse.json({ ok: true, atualizados: resultados, total: resultados.length });
}
