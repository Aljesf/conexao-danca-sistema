import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type EventoTipo = "PROVENTO" | "DESCONTO";

type FolhaRow = {
  id: number;
  status: string;
};

function toInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Math.trunc(Number(value));
  }
  return null;
}

function isEventoTipo(value: unknown): value is EventoTipo {
  return value === "PROVENTO" || value === "DESCONTO";
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
  if (!body) {
    return NextResponse.json({ ok: false, error: "payload_invalido" }, { status: 400 });
  }

  const tipo = body.tipo;
  const descricao = typeof body.descricao === "string" ? body.descricao.trim() : "";
  const valor = toInt(body.valor_centavos);
  const origemTipo = typeof body.origem_tipo === "string" ? body.origem_tipo : null;
  const origemId = toInt(body.origem_id);

  if (!isEventoTipo(tipo)) {
    return NextResponse.json({ ok: false, error: "tipo_invalido" }, { status: 400 });
  }
  if (!descricao) {
    return NextResponse.json({ ok: false, error: "descricao_obrigatoria" }, { status: 400 });
  }
  if (valor === null || valor < 0) {
    return NextResponse.json({ ok: false, error: "valor_invalido" }, { status: 400 });
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

  if ((folha as FolhaRow).status !== "ABERTA") {
    return NextResponse.json({ ok: false, error: "folha_fechada" }, { status: 409 });
  }

  const { data: evento, error } = await supabase
    .from("folha_pagamento_eventos")
    .insert({
      folha_pagamento_id: folhaId,
      tipo,
      descricao,
      valor_centavos: valor,
      origem_tipo: origemTipo,
      origem_id: origemId,
    })
    .select("id,tipo,descricao,valor_centavos,origem_tipo,origem_id,created_at,updated_at")
    .single();

  if (error || !evento) {
    return NextResponse.json(
      { ok: false, error: "falha_criar_evento", detail: error?.message ?? "sem_retorno" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, data: evento });
}
