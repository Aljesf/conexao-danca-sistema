import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import { getColaboradorCompetencias } from "@/lib/financeiro/colaboradoresFinanceiro";

function toInt(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.trunc(parsed);
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
  const data = await getColaboradorCompetencias(getSupabaseAdmin(), colaboradorId, competencia);
  if (!data) {
    return NextResponse.json({ ok: false, error: "colaborador_nao_encontrado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, ...data });
}
