import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import { guardApiByRole } from "@/lib/auth/roleGuard";

type Payload = {
  conta_conexao_id?: number;
  competencia?: string;
};

function assertCompetencia(value: string): boolean {
  return /^\d{4}-\d{2}$/.test(value);
}

function toPositiveNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function POST(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const supabase = getSupabaseAdmin();
  let body: Payload;

  try {
    body = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ ok: false, error: "payload_invalido" }, { status: 400 });
  }

  const contaId = toPositiveNumber(body?.conta_conexao_id);
  const competencia = typeof body?.competencia === "string" ? body.competencia.trim() : "";

  if (!contaId) {
    return NextResponse.json({ ok: false, error: "conta_conexao_id_invalido" }, { status: 400 });
  }
  if (!assertCompetencia(competencia)) {
    return NextResponse.json({ ok: false, error: "competencia_invalida" }, { status: 400 });
  }

  const { data: fatura, error: fErr } = await supabase
    .from("credito_conexao_faturas")
    .select("id, conta_conexao_id, periodo_referencia, status")
    .eq("conta_conexao_id", contaId)
    .eq("periodo_referencia", competencia)
    .maybeSingle();

  if (fErr || !fatura) {
    return NextResponse.json({ ok: false, error: "fatura_nao_encontrada" }, { status: 404 });
  }

  const faturaId = toPositiveNumber(fatura.id);
  if (!faturaId) {
    return NextResponse.json({ ok: false, error: "fatura_id_invalido" }, { status: 500 });
  }

  const { error: delErr } = await supabase
    .from("credito_conexao_fatura_lancamentos")
    .delete()
    .eq("fatura_id", faturaId);

  if (delErr) {
    return NextResponse.json({ ok: false, error: "falha_limpar_pivot", detail: delErr.message }, { status: 500 });
  }

  const { data: lancs, error: lErr } = await supabase
    .from("credito_conexao_lancamentos")
    .select("id, valor_centavos, status, referencia_item, competencia, cobranca_id")
    .eq("conta_conexao_id", contaId)
    .eq("competencia", competencia)
    .not("cobranca_id", "is", null)
    .in("status", ["PENDENTE_FATURA", "FATURADO"]);

  if (lErr) {
    return NextResponse.json({ ok: false, error: "falha_buscar_lancamentos", detail: lErr.message }, { status: 500 });
  }

  let lista = lancs ?? [];
  if (lista.length === 0) {
    const { data: legacy, error: legacyErr } = await supabase
      .from("credito_conexao_lancamentos")
      .select("id, valor_centavos, status, referencia_item, competencia, cobranca_id")
      .eq("conta_conexao_id", contaId)
      .eq("competencia", competencia)
      .is("cobranca_id", null)
      .not("referencia_item", "is", null)
      .in("status", ["PENDENTE_FATURA", "FATURADO"]);

    if (legacyErr) {
      return NextResponse.json(
        { ok: false, error: "falha_buscar_lancamentos_legado", detail: legacyErr.message },
        { status: 500 },
      );
    }

    lista = legacy ?? [];
  }

  if (lista.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "sem_lancamentos_validos_para_rebuild",
        hint: "Gere o lancamento mensal consolidado antes de rebuildar a fatura.",
      },
      { status: 409 },
    );
  }

  const payloadPivot = lista
    .map((l) => toPositiveNumber(l.id))
    .filter((id): id is number => !!id)
    .map((id) => ({ fatura_id: faturaId, lancamento_id: id }));

  const { error: insErr } = await supabase
    .from("credito_conexao_fatura_lancamentos")
    .insert(payloadPivot);

  if (insErr) {
    return NextResponse.json({ ok: false, error: "falha_inserir_pivot", detail: insErr.message }, { status: 500 });
  }

  const total = lista.reduce((acc, l) => acc + (typeof l.valor_centavos === "number" ? l.valor_centavos : 0), 0);

  const { error: updErr } = await supabase
    .from("credito_conexao_faturas")
    .update({ valor_total_centavos: total })
    .eq("id", faturaId);

  if (updErr) {
    return NextResponse.json({ ok: false, error: "falha_atualizar_total", detail: updErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    data: {
      fatura_id: faturaId,
      conta_conexao_id: contaId,
      competencia,
      itens_vinculados: payloadPivot.length,
      total_centavos: total,
    },
  });
}
