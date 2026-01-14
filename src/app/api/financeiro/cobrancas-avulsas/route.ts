import { NextRequest, NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

function parseNumber(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function GET(req: NextRequest) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;

  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(req.url);

  const status = searchParams.get("status");
  const pessoa_id = parseNumber(searchParams.get("pessoa_id"));
  const data_inicio = searchParams.get("data_inicio");
  const data_fim = searchParams.get("data_fim");

  try {
    let query = supabase
      .from("financeiro_cobrancas_avulsas")
      .select("id,pessoa_id,origem_tipo,origem_id,valor_centavos,vencimento,status,meio,motivo_excecao,observacao,criado_em,pago_em")
      .order("vencimento", { ascending: true })
      .order("id", { ascending: false });

    if (status && status !== "TODOS") query = query.eq("status", status);
    if (pessoa_id) query = query.eq("pessoa_id", pessoa_id);
    if (data_inicio) query = query.gte("vencimento", data_inicio);
    if (data_fim) query = query.lte("vencimento", data_fim);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ ok: false, error: "erro_listar_cobrancas_avulsas", detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: data ?? [] });
  } catch {
    return NextResponse.json({ ok: false, error: "erro_interno" }, { status: 500 });
  }
}
