import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import {
  getColaboradorAdiantamentos,
  registrarAdiantamentoColaborador,
} from "@/lib/financeiro/colaboradoresFinanceiro";

function toInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return Math.trunc(value);
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return Math.trunc(parsed);
  }
  return null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ colaboradorId: string }> }) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;

  const { colaboradorId: rawId } = await ctx.params;
  const colaboradorId = toInt(rawId);
  if (!colaboradorId) {
    return NextResponse.json({ ok: false, error: "colaborador_id_invalido" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const competencia = searchParams.get("competencia");
  const data = await getColaboradorAdiantamentos(getSupabaseAdmin(), colaboradorId, competencia);
  if (!data) {
    return NextResponse.json({ ok: false, error: "colaborador_nao_encontrado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ colaboradorId: string }> }) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;

  const { colaboradorId: rawId } = await ctx.params;
  const colaboradorId = toInt(rawId);
  if (!colaboradorId) {
    return NextResponse.json({ ok: false, error: "colaborador_id_invalido" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ ok: false, error: "payload_invalido" }, { status: 400 });
  }

  try {
    const data = await registrarAdiantamentoColaborador(getSupabaseAdmin(), {
      colaborador_id: colaboradorId,
      competencia: asString(body.competencia) ?? "",
      valor_centavos: toInt(body.valor_centavos) ?? 0,
      data_pagamento: asString(body.data_pagamento) ?? "",
      observacao: asString(body.observacao),
      conta_financeira_id: toInt(body.conta_financeira_id),
    });

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "erro_desconhecido";
    const [code, message] = detail.split(":", 2);
    const errorCode = message ? code : detail;
    return NextResponse.json(
      { ok: false, error: errorCode, detail: message ?? null },
      { status: errorCode === "colaborador_nao_encontrado" ? 404 : 400 },
    );
  }
}
