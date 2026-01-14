import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

export async function GET(_: Request, ctx: { params: { pessoaId: string } }) {
  const denied = await guardApiByRole(_ as any);
  if (denied) return denied as any;

  try {
    const pessoaId = Number(ctx.params.pessoaId);
    if (!Number.isFinite(pessoaId) || pessoaId <= 0) {
      return NextResponse.json({ ok: false, error: "pessoa_id_invalido" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("financeiro_cobrancas_avulsas")
      .select("id,origem_tipo,origem_id,valor_centavos,vencimento,status,meio,motivo_excecao,observacao,criado_em,pago_em")
      .eq("pessoa_id", pessoaId)
      .order("criado_em", { ascending: false });

    if (error) {
      return NextResponse.json({ ok: false, error: "db_erro", detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: data ?? [] });
  } catch {
    return NextResponse.json({ ok: false, error: "erro_interno" }, { status: 500 });
  }
}
