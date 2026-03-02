import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

export async function GET(req: NextRequest) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;

  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(req.url);
  const limitRaw = searchParams.get("limit") ?? "10";
  const limit = Math.min(Math.max(parseInt(limitRaw, 10) || 10, 1), 50);

  const { data: agg, error: errAgg } = await supabase
    .from("vw_financeiro_devedores_atrasados")
    .select("*")
    .order("total_vencido_centavos", { ascending: false })
    .limit(limit);

  if (errAgg) {
    return NextResponse.json(
      { ok: false, error: "erro_listar_devedores_atrasados", details: errAgg.message },
      { status: 500 }
    );
  }

  const pessoaIds = (agg ?? [])
    .map((r: any) => Number(r?.pessoa_id))
    .filter((id: number) => Number.isFinite(id) && id > 0);

  let pessoasMap: Record<string, { id: number; nome: string | null }> = {};
  if (pessoaIds.length > 0) {
    const { data: pessoas, error: errP } = await supabase.from("pessoas").select("id,nome").in("id", pessoaIds);
    if (!errP && pessoas) {
      pessoasMap = pessoas.reduce((acc: Record<string, { id: number; nome: string | null }>, p: any) => {
        acc[String(p.id)] = { id: p.id, nome: p.nome ?? null };
        return acc;
      }, {});
    }
  }

  const itens = (agg ?? []).map((r: any) => ({
    ...r,
    pessoa: pessoasMap[String(r.pessoa_id)] ?? { id: r.pessoa_id, nome: null },
  }));

  const totalVencidoCentavos = itens.reduce((acc: number, r: any) => {
    return acc + Number(r?.total_vencido_centavos ?? 0);
  }, 0);

  return NextResponse.json({
    ok: true,
    limit,
    total_vencido_centavos: totalVencidoCentavos,
    itens,
  });
}
