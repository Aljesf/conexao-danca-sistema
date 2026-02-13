import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Body = {
  colaborador_id: number;
  tipo_item: string;
  descricao: string;
  valor_centavos: number;
};

export async function POST(req: Request, ctx: { params: Promise<{ folhaId: string }> }) {
  const supabase = await createClient();
  const { folhaId: folhaIdRaw } = await ctx.params;
  const folhaId = Number(folhaIdRaw);

  if (!Number.isFinite(folhaId)) {
    return NextResponse.json({ error: "folha_id_invalido" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body) return NextResponse.json({ error: "payload_invalido" }, { status: 400 });

  const colaboradorId = Number(body.colaborador_id);
  const tipo = String(body.tipo_item ?? "").trim();
  const descricao = String(body.descricao ?? "").trim();
  const valor = Math.trunc(Number(body.valor_centavos));

  if (!Number.isFinite(colaboradorId)) {
    return NextResponse.json({ error: "colaborador_id_invalido" }, { status: 400 });
  }
  if (!tipo) return NextResponse.json({ error: "tipo_item_obrigatorio" }, { status: 400 });
  if (!descricao) return NextResponse.json({ error: "descricao_obrigatoria" }, { status: 400 });
  if (!Number.isFinite(valor) || valor <= 0) {
    return NextResponse.json({ error: "valor_centavos_invalido" }, { status: 400 });
  }

  const { data: folha, error: folhaErr } = await supabase
    .from("folha_pagamento")
    .select("id,status")
    .eq("id", folhaId)
    .maybeSingle();

  if (folhaErr || !folha) return NextResponse.json({ error: "folha_nao_encontrada" }, { status: 404 });
  if (folha.status !== "ABERTA") return NextResponse.json({ error: "folha_nao_editavel" }, { status: 409 });

  const { data: colaborador, error: colErr } = await supabase
    .from("colaboradores")
    .select("id")
    .eq("id", colaboradorId)
    .maybeSingle();
  if (colErr) return NextResponse.json({ error: colErr.message }, { status: 500 });
  if (!colaborador) return NextResponse.json({ error: "colaborador_nao_encontrado" }, { status: 404 });

  const { data: item, error } = await supabase
    .from("folha_pagamento_itens")
    .insert({
      folha_id: folhaId,
      colaborador_id: colaboradorId,
      tipo_item: tipo,
      descricao,
      valor_centavos: valor,
      criado_automatico: false,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item }, { status: 200 });
}
