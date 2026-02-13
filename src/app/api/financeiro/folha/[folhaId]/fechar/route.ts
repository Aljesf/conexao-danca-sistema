import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(_req: Request, ctx: { params: Promise<{ folhaId: string }> }) {
  const supabase = await createClient();
  const { folhaId: folhaIdRaw } = await ctx.params;
  const folhaId = Number(folhaIdRaw);

  if (!Number.isFinite(folhaId)) {
    return NextResponse.json({ error: "folha_id_invalido" }, { status: 400 });
  }

  const { data: folha, error: folhaErr } = await supabase
    .from("folha_pagamento")
    .select("id,status")
    .eq("id", folhaId)
    .maybeSingle();

  if (folhaErr || !folha) {
    return NextResponse.json({ error: "folha_nao_encontrada" }, { status: 404 });
  }

  if (folha.status !== "ABERTA") {
    return NextResponse.json({ error: "folha_nao_editavel" }, { status: 409 });
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("folha_pagamento")
    .update({
      status: "FECHADA",
      data_fechamento: hoje,
    })
    .eq("id", folhaId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ folha: data }, { status: 200 });
}
