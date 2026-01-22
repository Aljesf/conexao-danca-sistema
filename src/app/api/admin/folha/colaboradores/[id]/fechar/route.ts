import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

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

  const { data: folha, error: folhaError } = await supabase
    .from("folha_pagamento_colaborador")
    .select("id,status")
    .eq("id", folhaId)
    .single();

  if (folhaError || !folha) {
    return NextResponse.json(
      { ok: false, error: "folha_nao_encontrada", detail: folhaError?.message ?? "sem_retorno" },
      { status: 404 },
    );
  }

  if (folha.status !== "ABERTA") {
    return NextResponse.json({ ok: false, error: "folha_nao_aberta" }, { status: 409 });
  }

  const { data: updated, error } = await supabase
    .from("folha_pagamento_colaborador")
    .update({ status: "FECHADA", data_fechamento: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", folhaId)
    .select("id,competencia_ano_mes,colaborador_id,status,data_fechamento,data_pagamento,observacoes,created_at,updated_at")
    .single();

  if (error || !updated) {
    return NextResponse.json(
      { ok: false, error: "falha_fechar_folha", detail: error?.message ?? "sem_retorno" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, data: updated });
}
