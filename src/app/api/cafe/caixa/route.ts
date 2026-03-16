import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { requireUser } from "@/lib/supabase/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import { criarComandaCafe, listarComandasCafe } from "@/lib/cafe/caixa";

function statusFromError(message: string): number {
  switch (message) {
    case "payload_invalido":
    case "itens_obrigatorios":
    case "itens_invalidos":
    case "produto_nao_encontrado":
    case "produto_inativo":
    case "colaborador_pessoa_id_obrigatorio":
    case "saldo_em_aberto_obrigatorio_para_conta_interna":
    case "competencia_invalida":
      return 400;
    case "saldo_insuficiente":
      return 409;
    case "competencia_fechada_para_conta_interna":
      return 409;
    default:
      return 500;
  }
}

export async function GET(request: NextRequest) {
  const denied = await guardApiByRole(request as any);
  if (denied) return denied as any;

  try {
    const supabase = getSupabaseAdmin();
    const url = new URL(request.url);
    const data = await listarComandasCafe(supabase, url.searchParams);
    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "falha_listar_comandas_cafe";
    return NextResponse.json({ ok: false, error: message }, { status: statusFromError(message) });
  }
}

export async function POST(request: NextRequest) {
  const denied = await guardApiByRole(request as any);
  if (denied) return denied as any;

  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json().catch(() => null);
    const data = await criarComandaCafe({
      supabase,
      body,
      userId: auth.userId,
    });
    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "falha_criar_comanda_cafe";
    return NextResponse.json({ ok: false, error: message }, { status: statusFromError(message) });
  }
}
