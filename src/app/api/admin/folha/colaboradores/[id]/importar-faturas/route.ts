import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type FolhaRow = {
  id: number;
  competencia_ano_mes: string;
  colaborador_id: number;
  status: string;
};

type ColaboradorRow = {
  id: number;
  pessoa_id: number | null;
};

type ContaRow = {
  id: number;
};

type FaturaRow = {
  id: number;
  conta_conexao_id: number;
  periodo_referencia: string;
  valor_total_centavos: number;
  status: string;
  folha_pagamento_id: number | null;
};

function toInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Math.trunc(Number(value));
  }
  return null;
}

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const supabase = getSupabaseAdmin();
  const folhaId = toInt(ctx.params.id);

  if (!folhaId) {
    return NextResponse.json({ ok: false, error: "folha_id_invalido" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const contaConexaoId = body ? toInt(body.conta_conexao_id) : null;

  const { data: folha, error: folhaError } = await supabase
    .from("folha_pagamento_colaborador")
    .select("id,competencia_ano_mes,colaborador_id,status")
    .eq("id", folhaId)
    .single();

  if (folhaError || !folha) {
    return NextResponse.json(
      { ok: false, error: "folha_nao_encontrada", detail: folhaError?.message ?? "sem_retorno" },
      { status: 404 },
    );
  }

  if ((folha as FolhaRow).status !== "ABERTA") {
    return NextResponse.json({ ok: false, error: "folha_fechada" }, { status: 409 });
  }

  let contaIds: number[] = [];

  if (contaConexaoId) {
    contaIds = [contaConexaoId];
  } else {
    const { data: colaborador, error: colabError } = await supabase
      .from("colaboradores")
      .select("id,pessoa_id")
      .eq("id", (folha as FolhaRow).colaborador_id)
      .single();

    if (colabError || !colaborador) {
      return NextResponse.json(
        { ok: false, error: "colaborador_nao_encontrado", detail: colabError?.message ?? "sem_retorno" },
        { status: 404 },
      );
    }

    const pessoaId = (colaborador as ColaboradorRow).pessoa_id;
    if (!pessoaId) {
      return NextResponse.json({ ok: false, error: "colaborador_sem_pessoa" }, { status: 400 });
    }

    const { data: contas, error: contasError } = await supabase
      .from("credito_conexao_contas")
      .select("id")
      .eq("tipo_conta", "COLABORADOR")
      .eq("pessoa_titular_id", pessoaId);

    if (contasError) {
      return NextResponse.json(
        { ok: false, error: "falha_buscar_contas", detail: contasError.message },
        { status: 500 },
      );
    }

    contaIds = (contas ?? []).map((c) => (c as ContaRow).id).filter((v) => Number.isFinite(v));
  }

  if (contaIds.length === 0) {
    return NextResponse.json({ ok: true, data: { imported: 0, reason: "sem_contas" } });
  }

  const { data: faturas, error: faturasError } = await supabase
    .from("credito_conexao_faturas")
    .select("id,conta_conexao_id,periodo_referencia,valor_total_centavos,status,folha_pagamento_id")
    .eq("status", "ABERTA")
    .eq("periodo_referencia", (folha as FolhaRow).competencia_ano_mes)
    .in("conta_conexao_id", contaIds)
    .is("folha_pagamento_id", null);

  if (faturasError) {
    return NextResponse.json(
      { ok: false, error: "falha_listar_faturas", detail: faturasError.message },
      { status: 500 },
    );
  }

  const listaFaturas = (faturas ?? []) as FaturaRow[];
  if (listaFaturas.length === 0) {
    return NextResponse.json({ ok: true, data: { imported: 0 } });
  }

  const faturaIds = listaFaturas.map((f) => f.id);
  const { data: eventosExistentes, error: eventosError } = await supabase
    .from("folha_pagamento_eventos")
    .select("origem_id")
    .eq("folha_pagamento_id", folhaId)
    .eq("origem_tipo", "CREDITO_CONEXAO_FATURA")
    .in("origem_id", faturaIds);

  if (eventosError) {
    return NextResponse.json(
      { ok: false, error: "falha_buscar_eventos", detail: eventosError.message },
      { status: 500 },
    );
  }

  const existentes = new Set(
    (eventosExistentes ?? [])
      .map((e) => (e as { origem_id: number | null }).origem_id)
      .filter((v): v is number => typeof v === "number"),
  );

  const paraImportar = listaFaturas.filter((f) => !existentes.has(f.id));

  if (paraImportar.length === 0) {
    return NextResponse.json({ ok: true, data: { imported: 0 } });
  }

  const idsParaAtualizar = paraImportar.map((f) => f.id);
  const { error: updateError } = await supabase
    .from("credito_conexao_faturas")
    .update({ folha_pagamento_id: folhaId, updated_at: new Date().toISOString() })
    .in("id", idsParaAtualizar)
    .is("folha_pagamento_id", null);

  if (updateError) {
    return NextResponse.json(
      { ok: false, error: "falha_atualizar_faturas", detail: updateError.message },
      { status: 500 },
    );
  }

  const eventos = paraImportar.map((f) => ({
    folha_pagamento_id: folhaId,
    tipo: "DESCONTO",
    descricao: `Cartao Conexao - Fatura ${f.id}`,
    valor_centavos: f.valor_total_centavos,
    origem_tipo: "CREDITO_CONEXAO_FATURA",
    origem_id: f.id,
  }));

  const { data: inserted, error: insertError } = await supabase
    .from("folha_pagamento_eventos")
    .insert(eventos)
    .select("id,tipo,descricao,valor_centavos,origem_tipo,origem_id");

  if (insertError) {
    return NextResponse.json(
      { ok: false, error: "falha_inserir_eventos", detail: insertError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, data: { imported: eventos.length, eventos: inserted ?? [] } });
}
