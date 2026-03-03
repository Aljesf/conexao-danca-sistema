import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

export async function GET(req: NextRequest) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;

  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(req.url);
  const pessoaIdRaw = searchParams.get("pessoa_id");
  const pessoaId = Number(pessoaIdRaw);

  if (!Number.isFinite(pessoaId) || pessoaId <= 0) {
    return NextResponse.json({ ok: false, error: "pessoa_id_invalido" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("vw_financeiro_contas_receber_flat")
    .select(
      "cobranca_id,pessoa_id,vencimento,dias_atraso,valor_centavos,saldo_aberto_centavos,origem_tipo,origem_id,status_cobranca,bucket_vencimento,situacao_saas"
    )
    .eq("pessoa_id", pessoaId)
    .eq("situacao_saas", "VENCIDA")
    .gt("saldo_aberto_centavos", 0)
    .not("status_cobranca", "ilike", "CANCELADA")
    .order("vencimento", { ascending: true, nullsFirst: false });

  if (error) {
    return NextResponse.json(
      { ok: false, error: "erro_listar_titulos_vencidos", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, pessoa_id: pessoaId, titulos: data ?? [] });
}
