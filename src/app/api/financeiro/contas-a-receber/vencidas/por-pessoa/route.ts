import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { isMissingExpurgoColumnError, logExpurgoMigrationWarning } from "@/lib/financeiro/expurgo-compat";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type CobrancaControleRow = {
  id: number | null;
  status: string | null;
  expurgada: boolean | null;
};

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

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
      "cobranca_id,pessoa_id,vencimento,dias_atraso,valor_centavos,saldo_aberto_centavos,origem_tipo,origem_id,status_cobranca,bucket_vencimento,situacao_saas",
    )
    .eq("pessoa_id", pessoaId)
    .eq("situacao_saas", "VENCIDA")
    .gt("saldo_aberto_centavos", 0)
    .not("status_cobranca", "ilike", "CANCELADA")
    .order("vencimento", { ascending: true, nullsFirst: false });

  if (error) {
    return NextResponse.json(
      { ok: false, error: "erro_listar_titulos_vencidos", details: error.message },
      { status: 500 },
    );
  }

  const ids = (data ?? [])
    .map((row) => numberOrNull((row as Record<string, unknown>).cobranca_id))
    .filter((id): id is number => typeof id === "number" && id > 0);

  if (ids.length === 0) {
    return NextResponse.json({ ok: true, pessoa_id: pessoaId, titulos: [] });
  }

  let { data: cobrancasControle, error: controleError } = await supabase
    .from("cobrancas")
    .select("id,status,expurgada")
    .in("id", ids);

  if (controleError && isMissingExpurgoColumnError(controleError)) {
    logExpurgoMigrationWarning("/api/financeiro/contas-a-receber/vencidas/por-pessoa", controleError);
    const fallback = await supabase.from("cobrancas").select("id,status").in("id", ids);
    controleError = fallback.error;
    cobrancasControle = (fallback.data ?? []).map((row) => ({
      ...row,
      expurgada: false,
    }));
  }

  if (controleError) {
    return NextResponse.json(
      { ok: false, error: "erro_filtrar_expurgo", details: controleError.message },
      { status: 500 },
    );
  }

  const controleMap = new Map(
    ((cobrancasControle ?? []) as CobrancaControleRow[])
      .filter((row) => typeof row.id === "number" && row.id > 0)
      .map((row) => [row.id as number, row]),
  );

  const titulos = (data ?? []).filter((row) => {
    const cobrancaId = numberOrNull((row as Record<string, unknown>).cobranca_id);
    if (!cobrancaId) return false;
    const controle = controleMap.get(cobrancaId);
    if (!controle) return false;
    if (controle.expurgada === true) return false;
    return (controle.status ?? "").toUpperCase() !== "CANCELADA";
  });

  return NextResponse.json({ ok: true, pessoa_id: pessoaId, titulos });
}
