import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calcularDataPagamentoPrevista } from "@/lib/financeiro/folha/folhaUtils";

type Body = {
  competencia: string; // YYYY-MM
  dia_pagamento?: number;
  pagamento_no_mes_seguinte?: boolean;
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const body = (await req.json().catch(() => null)) as Body | null;

  if (!body?.competencia || !/^\d{4}-\d{2}$/.test(body.competencia)) {
    return NextResponse.json({ error: "competencia_invalida" }, { status: 400 });
  }

  const diaPagamento = body.dia_pagamento ?? 5;
  const pagamentoNoMesSeguinte = body.pagamento_no_mes_seguinte ?? true;
  const dataPagamentoPrevista = calcularDataPagamentoPrevista(
    body.competencia,
    diaPagamento,
    pagamentoNoMesSeguinte,
  );

  const { data, error } = await supabase
    .from("folha_pagamento")
    .upsert(
      {
        competencia: body.competencia,
        status: "ABERTA",
        data_pagamento_prevista: dataPagamentoPrevista.toISOString().slice(0, 10),
      },
      { onConflict: "competencia" },
    )
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ folha: data }, { status: 200 });
}

