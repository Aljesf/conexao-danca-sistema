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
    .select("id,competencia,status")
    .eq("id", folhaId)
    .maybeSingle();

  if (folhaErr || !folha) return NextResponse.json({ error: "folha_nao_encontrada" }, { status: 404 });
  if (folha.status !== "ABERTA") return NextResponse.json({ error: "folha_nao_editavel" }, { status: 409 });

  const { data: faturas, error: fatErr } = await supabase
    .from("credito_conexao_faturas")
    .select("id,conta_conexao_id,periodo_referencia,valor_total_centavos,status,folha_pagamento_id")
    .eq("periodo_referencia", folha.competencia)
    .eq("status", "ABERTA")
    .is("folha_pagamento_id", null);

  if (fatErr) return NextResponse.json({ error: fatErr.message }, { status: 500 });
  if (!faturas || faturas.length === 0) {
    return NextResponse.json({ imported: 0, message: "sem_faturas_para_importar" }, { status: 200 });
  }

  const contaIds = Array.from(new Set(faturas.map((f) => Number(f.conta_conexao_id)).filter((id) => Number.isFinite(id))));
  if (contaIds.length === 0) {
    return NextResponse.json({ imported: 0, message: "sem_contas_validas" }, { status: 200 });
  }

  const { data: contas, error: contaErr } = await supabase
    .from("credito_conexao_contas")
    .select("id,pessoa_titular_id,tipo_conta")
    .in("id", contaIds);

  if (contaErr) return NextResponse.json({ error: contaErr.message }, { status: 500 });

  const pessoaTitularPorConta = new Map<number, { pessoa_titular_id: number; tipo_conta: string }>();
  for (const c of contas ?? []) {
    pessoaTitularPorConta.set(Number(c.id), {
      pessoa_titular_id: Number(c.pessoa_titular_id),
      tipo_conta: String(c.tipo_conta ?? ""),
    });
  }

  const pessoaIds = Array.from(
    new Set((contas ?? []).map((c) => Number(c.pessoa_titular_id)).filter((id) => Number.isFinite(id))),
  );
  if (pessoaIds.length === 0) {
    return NextResponse.json({ imported: 0, message: "sem_pessoas_titulares" }, { status: 200 });
  }

  const { data: colaboradores, error: colErr } = await supabase
    .from("colaboradores")
    .select("id,pessoa_id")
    .in("pessoa_id", pessoaIds);

  if (colErr) return NextResponse.json({ error: colErr.message }, { status: 500 });

  const colaboradorPorPessoa = new Map<number, number>();
  for (const c of colaboradores ?? []) {
    colaboradorPorPessoa.set(Number(c.pessoa_id), Number(c.id));
  }

  const itensToInsert: Array<{
    folha_id: number;
    colaborador_id: number;
    tipo_item: string;
    descricao: string;
    valor_centavos: number;
    referencia_tipo: string;
    referencia_id: number;
    criado_automatico: boolean;
  }> = [];

  const faturaIdsParaVincular: number[] = [];

  for (const f of faturas) {
    const contaId = Number(f.conta_conexao_id);
    const meta = pessoaTitularPorConta.get(contaId);
    if (!meta) continue;
    if (meta.tipo_conta !== "COLABORADOR") continue;

    const colabId = colaboradorPorPessoa.get(meta.pessoa_titular_id);
    if (!colabId) continue;

    const faturaId = Number(f.id);
    const valorFatura = Number(f.valor_total_centavos);
    if (!Number.isFinite(faturaId) || !Number.isFinite(valorFatura)) continue;

    itensToInsert.push({
      folha_id: folhaId,
      colaborador_id: colabId,
      tipo_item: "DESCONTO_CREDITO_CONEXAO",
      descricao: `Desconto Cartao Conexao (fatura #${faturaId})`,
      valor_centavos: valorFatura,
      referencia_tipo: "CREDITO_CONEXAO_FATURA",
      referencia_id: faturaId,
      criado_automatico: true,
    });

    faturaIdsParaVincular.push(faturaId);
  }

  if (itensToInsert.length === 0) {
    return NextResponse.json({ imported: 0, message: "nenhuma_fatura_colaborador_valida" }, { status: 200 });
  }

  const { error: delErr } = await supabase
    .from("folha_pagamento_itens")
    .delete()
    .eq("folha_id", folhaId)
    .eq("criado_automatico", true)
    .eq("referencia_tipo", "CREDITO_CONEXAO_FATURA")
    .in("referencia_id", faturaIdsParaVincular);

  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  const { error: insErr } = await supabase.from("folha_pagamento_itens").insert(itensToInsert);
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  const { error: updErr } = await supabase
    .from("credito_conexao_faturas")
    .update({ folha_pagamento_id: folhaId })
    .in("id", faturaIdsParaVincular);

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({ imported: itensToInsert.length }, { status: 200 });
}

