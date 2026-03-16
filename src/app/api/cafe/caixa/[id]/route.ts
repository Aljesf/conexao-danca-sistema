import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import { atualizarComandaCafe, detalharComandaCafe } from "@/lib/cafe/caixa";

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
    case "nao_eh_possivel_alterar_vinculo_apos_faturamento":
      return 400;
    case "venda_nao_encontrada":
      return 404;
    case "fatura_ja_fechada_para_esta_comanda":
      return 409;
    default:
      return 500;
  }
}

export async function GET(request: NextRequest, ctx: RouteContext) {
  const denied = await guardApiByRole(request as any);
  if (denied) return denied as any;

  try {
    const { id } = await ctx.params;
    const supabase = getSupabaseAdmin();
    const data = await detalharComandaCafe(supabase, parseId(id));
    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "falha_buscar_comanda";
    return NextResponse.json({ ok: false, error: message }, { status: statusFromError(message) });
  }
}

export async function PUT(request: NextRequest, ctx: RouteContext) {
  const denied = await guardApiByRole(request as any);
  if (denied) return denied as any;

  try {
    const { id } = await ctx.params;
    const body = await request.json().catch(() => null);
    const supabase = getSupabaseAdmin();
    const data = await atualizarComandaCafe({
      supabase,
      vendaId: parseId(id),
      body,
    });
    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "falha_atualizar_comanda";
    return NextResponse.json({ ok: false, error: message }, { status: statusFromError(message) });
  }
}
