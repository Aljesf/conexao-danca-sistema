import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { processarClassificacaoFinanceira } from "@/lib/financeiro/processarClassificacaoFinanceira";

type Cobranca = {
  id: number;
  valor_centavos: number;
  centro_custo_id: number | null;
  data_pagamento?: string | null;
  origem_tipo?: string | null;
  origem_id?: number | null;
};

export async function POST(req: Request) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "usuario_nao_autenticado" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { cobranca_id?: number } | null;
  const cobrancaId = body?.cobranca_id ? Number(body.cobranca_id) : NaN;

  if (!cobrancaId || Number.isNaN(cobrancaId)) {
    return NextResponse.json({ ok: false, error: "cobranca_id_obrigatorio" }, { status: 400 });
  }

  const { data: cobranca, error } = await supabase
    .from("cobrancas")
    .select(
      `
      id,
      valor_centavos,
      centro_custo_id,
      data_pagamento,
      origem_tipo,
      origem_id
    `
    )
    .eq("id", cobrancaId)
    .maybeSingle<Cobranca>();

  if (error || !cobranca) {
    console.error("[reprocessar-classificacao] cobranca_nao_encontrada:", error);
    return NextResponse.json({ ok: false, error: "cobranca_nao_encontrada" }, { status: 404 });
  }

  try {
    console.log("[reprocessar-classificacao] processarClassificacaoFinanceira", {
      cobrancaId,
      origem: cobranca.origem_tipo,
      origemId: cobranca.origem_id,
    });

    const classificacao = await processarClassificacaoFinanceira(supabase, {
      ...cobranca,
      data_pagamento: cobranca.data_pagamento ?? new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, classificacao });
  } catch (err: any) {
    console.error("[reprocessar-classificacao] erro:", err);
    return NextResponse.json(
      { ok: false, error: "erro_processar_classificacao", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
