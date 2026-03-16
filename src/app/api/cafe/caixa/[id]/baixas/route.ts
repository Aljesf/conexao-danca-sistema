import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { requireUser } from "@/lib/supabase/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import { registrarBaixaCafe } from "@/lib/cafe/caixa";

type RouteContext = { params: Promise<{ id: string }> };

function parseId(value: string): number {
  const id = Number(value);
  if (!Number.isFinite(id) || id <= 0) throw new Error("venda_id_invalido");
  return Math.trunc(id);
}

function statusFromError(message: string): number {
  switch (message) {
    case "venda_id_invalido":
    case "payload_invalido":
    case "valor_baixa_invalido":
    case "valor_baixa_maior_que_aberto":
      return 400;
    case "venda_nao_encontrada":
      return 404;
    case "comanda_cancelada":
    case "comanda_ja_quitada":
      return 409;
    default:
      return 500;
  }
}

export async function POST(request: NextRequest, ctx: RouteContext) {
  const denied = await guardApiByRole(request as any);
  if (denied) return denied as any;

  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await ctx.params;
    const body = await request.json().catch(() => null);
    const supabase = getSupabaseAdmin();
    const data = await registrarBaixaCafe({
      supabase,
      vendaId: parseId(id),
      body,
      userId: auth.userId,
    });
    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "falha_registrar_baixa";
    return NextResponse.json({ ok: false, error: message }, { status: statusFromError(message) });
  }
}
