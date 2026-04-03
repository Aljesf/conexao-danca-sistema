import { NextResponse } from "next/server";
import {
  validarFaturasCreditoConexao,
  type FaturaOrigemValidada,
  type StatusOrigemFinanceira,
} from "@/lib/credito-conexao/validarCadeiaOrigem";
import { createClient } from "@/lib/supabase/server";

type ItemRow = {
  id: number;
  folha_id: number;
  colaborador_id: number;
  tipo_item: string;
  descricao: string;
  valor_centavos: number;
  referencia_tipo: string | null;
  referencia_id: number | null;
  criado_automatico: boolean;
  created_at: string;
};

type ItemOrigemDetalhe = {
  lancamento_id: number;
  competencia: string | null;
  descricao: string | null;
  origem_amigavel: string;
  origem_tecnica: string;
  referencia_item: string | null;
  status_origem: StatusOrigemFinanceira;
  valor_centavos: number;
  motivos: string[];
};

function isDesconto(tipo: string): boolean {
  if (tipo.startsWith("DESCONTO")) return true;
  return ["INSS", "IRRF", "FALTA", "ATRASO", "ADIANTAMENTO_SALARIAL"].includes(tipo);
}

function upper(value: unknown) {
  return String(value ?? "").trim().toUpperCase();
}

function resumirStatusOrigem(fatura: FaturaOrigemValidada): StatusOrigemFinanceira | "MISTA" {
  const status = new Set(fatura.itens.map((item) => item.status_origem));
  if (status.has("ORFA")) return "ORFA";
  if (status.has("CANCELADA")) return "CANCELADA";
  if (status.size > 1) return "MISTA";
  return "VALIDA";
}

function buildOrigemResumo(fatura: FaturaOrigemValidada | null) {
  if (!fatura) return null;

  const statusOrigem = resumirStatusOrigem(fatura);
  const primeiroItem = fatura.itens[0] ?? null;

  return {
    fatura_id: fatura.fatura_id,
    competencia: fatura.periodo_referencia,
    status_fatura: fatura.status_fatura,
    status_origem: statusOrigem,
    pode_importar_folha: fatura.pode_importar_folha,
    possui_inconsistencia: fatura.possui_inconsistencia,
    total_fatura_centavos: fatura.total_fatura_centavos,
    total_validos_centavos: fatura.total_validos_centavos,
    total_invalidos_centavos: fatura.total_invalidos_centavos,
    origem_amigavel:
      primeiroItem?.origem_amigavel ??
      (fatura.itens.length > 1 ? `${fatura.itens.length} lancamentos vinculados` : "Origem nao identificada"),
    origem_tecnica: primeiroItem?.origem_tecnica ?? `fatura#${fatura.fatura_id}`,
    motivos: fatura.motivos,
    itens_origem: fatura.itens.map<ItemOrigemDetalhe>((item) => ({
      lancamento_id: item.lancamento_id,
      competencia: item.competencia,
      descricao: item.descricao,
      origem_amigavel: item.origem_amigavel,
      origem_tecnica: item.origem_tecnica,
      referencia_item: item.referencia_item,
      status_origem: item.status_origem,
      valor_centavos: item.valor_centavos,
      motivos: item.motivos,
    })),
  };
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

  const competenciaFolha = String(folha.competencia ?? "");

  const { data: prevFolha, error: prevErr } = await supabase
    .from("folha_pagamento")
    .select("id,competencia")
    .lt("competencia", competenciaFolha)
    .order("competencia", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (prevErr) return NextResponse.json({ error: prevErr.message }, { status: 500 });

  const { data: nextFolha, error: nextErr } = await supabase
    .from("folha_pagamento")
    .select("id,competencia")
    .gt("competencia", competenciaFolha)
    .order("competencia", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (nextErr) return NextResponse.json({ error: nextErr.message }, { status: 500 });

  const { data: itens, error: iErr } = await supabase
    .from("folha_pagamento_itens")
    .select("*")
    .eq("folha_id", folhaId)
    .order("id", { ascending: true });

  if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });

  const itensTyped = (itens ?? []) as ItemRow[];
  const faturaIds = Array.from(
    new Set(
      itensTyped
        .filter((item) => upper(item.referencia_tipo) === "CREDITO_CONEXAO_FATURA")
        .map((item) => Number(item.referencia_id ?? 0))
        .filter((value) => Number.isFinite(value) && value > 0),
    ),
  );

  const validacoesFatura =
    faturaIds.length > 0
      ? await validarFaturasCreditoConexao(supabase as unknown as { from: (table: string) => any }, faturaIds)
      : new Map<number, FaturaOrigemValidada>();

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
      prev_folha: prevFolha
        ? { id: Number(prevFolha.id), competencia: String(prevFolha.competencia ?? "") }
        : null,
      next_folha: nextFolha
        ? { id: Number(nextFolha.id), competencia: String(nextFolha.competencia ?? "") }
        : null,
      colaboradores: colaboradoresResumo,
      itens: itensTyped.map((it) => {
        const faturaId = upper(it.referencia_tipo) === "CREDITO_CONEXAO_FATURA" ? Number(it.referencia_id ?? 0) : null;
        const origemResumo =
          faturaId && Number.isFinite(faturaId)
            ? buildOrigemResumo(validacoesFatura.get(faturaId) ?? null)
            : null;

        return {
          ...it,
          colaborador_nome: nomePorColab.get(it.colaborador_id) ?? `Colaborador #${it.colaborador_id}`,
          origem_resumo: origemResumo,
        };
      }),
    },
    { status: 200 },
  );
}
