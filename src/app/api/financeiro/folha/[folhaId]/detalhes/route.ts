import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ItemRow = {
  id: number;
  folha_id: number;
  colaborador_id: number;
  tipo_item: string;
  descricao: string;
  valor_centavos: number;
  criado_automatico: boolean;
  created_at: string;
};

function isDesconto(tipo: string): boolean {
  if (tipo.startsWith("DESCONTO")) return true;
  return ["INSS", "IRRF", "FALTA", "ATRASO", "ADIANTAMENTO_SALARIAL"].includes(tipo);
}

export async function GET(_req: Request, ctx: { params: Promise<{ folhaId: string }> }) {
  const supabase = await createClient();
  const { folhaId: rawFolhaId } = await ctx.params;
  const folhaId = Number(rawFolhaId);

  if (!Number.isFinite(folhaId)) {
    return NextResponse.json({ error: "folha_id_invalido" }, { status: 400 });
  }

  const { data: folha, error: fErr } = await supabase
    .from("folha_pagamento")
    .select("*")
    .eq("id", folhaId)
    .maybeSingle();

  if (fErr || !folha) {
    return NextResponse.json({ error: "folha_nao_encontrada" }, { status: 404 });
  }

  const { data: itens, error: iErr } = await supabase
    .from("folha_pagamento_itens")
    .select("*")
    .eq("folha_id", folhaId)
    .order("id", { ascending: true });

  if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });

  const itensTyped = (itens ?? []) as ItemRow[];
  const colabIds = Array.from(
    new Set(itensTyped.map((x) => Number(x.colaborador_id)).filter((n) => Number.isFinite(n))),
  );

  const { data: colaboradores, error: cErr } =
    colabIds.length > 0
      ? await supabase.from("colaboradores").select("id,pessoa_id").in("id", colabIds)
      : { data: [], error: null };

  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

  const pessoaIds = Array.from(
    new Set((colaboradores ?? []).map((c) => Number(c.pessoa_id)).filter((n) => Number.isFinite(n))),
  );

  const { data: pessoas, error: pErr } =
    pessoaIds.length > 0
      ? await supabase.from("pessoas").select("id,nome").in("id", pessoaIds)
      : { data: [], error: null };

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  const nomePorPessoa = new Map<number, string>();
  for (const p of pessoas ?? []) {
    nomePorPessoa.set(Number(p.id), String(p.nome ?? ""));
  }

  const pessoaPorColab = new Map<number, number>();
  for (const c of colaboradores ?? []) {
    pessoaPorColab.set(Number(c.id), Number(c.pessoa_id));
  }

  const nomePorColab = new Map<number, string>();
  for (const [colabId, pessoaId] of pessoaPorColab.entries()) {
    nomePorColab.set(colabId, nomePorPessoa.get(pessoaId) ?? `Colaborador #${colabId}`);
  }

  const totaisPorColab = new Map<number, { proventos: number; descontos: number }>();
  for (const it of itensTyped) {
    const acc = totaisPorColab.get(it.colaborador_id) ?? { proventos: 0, descontos: 0 };
    if (isDesconto(it.tipo_item)) acc.descontos += Number(it.valor_centavos ?? 0);
    else acc.proventos += Number(it.valor_centavos ?? 0);
    totaisPorColab.set(it.colaborador_id, acc);
  }

  const colaboradoresResumo = Array.from(totaisPorColab.entries())
    .map(([colaborador_id, t]) => ({
      colaborador_id,
      nome: nomePorColab.get(colaborador_id) ?? `Colaborador #${colaborador_id}`,
      proventos_centavos: t.proventos,
      descontos_centavos: t.descontos,
      liquido_centavos: t.proventos - t.descontos,
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return NextResponse.json(
    {
      folha,
      colaboradores: colaboradoresResumo,
      itens: itensTyped.map((it) => ({
        ...it,
        colaborador_nome: nomePorColab.get(it.colaborador_id) ?? `Colaborador #${it.colaborador_id}`,
      })),
    },
    { status: 200 },
  );
}
