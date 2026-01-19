import { NextRequest, NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

function parseNumber(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ pessoaId: string }> }) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;

  const { pessoaId: pessoaIdRaw } = await ctx.params;
  const pessoaId = Number(pessoaIdRaw);
  if (!Number.isFinite(pessoaId) || pessoaId <= 0) {
    return NextResponse.json({ ok: false, error: "pessoa_id_invalido" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const data_inicio = searchParams.get("data_inicio");
  const data_fim = searchParams.get("data_fim");
  const origem_id = parseNumber(searchParams.get("origem_id"));
  const origem_tipo = searchParams.get("origem_tipo");

  try {
    let query = supabase
      .from("financeiro_cobrancas_avulsas")
      .select(
        "id,pessoa_id,origem_tipo,origem_id,valor_centavos,vencimento,status,meio,motivo_excecao,observacao,criado_em,pago_em"
      )
      .eq("pessoa_id", pessoaId)
      .order("vencimento", { ascending: true })
      .order("id", { ascending: false });

    if (status && status !== "TODOS") query = query.eq("status", status);
    if (data_inicio) query = query.gte("vencimento", data_inicio);
    if (data_fim) query = query.lte("vencimento", data_fim);
    if (origem_id) query = query.eq("origem_id", origem_id);
    if (origem_tipo) query = query.eq("origem_tipo", origem_tipo);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json(
        { ok: false, error: "erro_listar_cobrancas_avulsas", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data: data ?? [] });
  } catch {
    return NextResponse.json({ ok: false, error: "erro_interno" }, { status: 500 });
  }
}
