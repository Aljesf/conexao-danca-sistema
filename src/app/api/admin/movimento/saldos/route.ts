import { NextResponse } from "next/server";
import { requireMovimentoAdmin } from "@/lib/auth/movimento-guard";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { jsonError } from "@/lib/http/api-errors";
import { guardApiByRole } from "@/lib/auth/roleGuard";

export async function GET(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  try {
    await requireMovimentoAdmin();
    const supabase = getSupabaseServiceClient();

    const url = new URL(req.url);
    const competencia = url.searchParams.get("competencia");
    const tipo_credito = url.searchParams.get("tipo_credito");
    const origem = url.searchParams.get("origem");

    let q = supabase
      .from("vw_movimento_saldo_lotes")
      .select("*")
      .order("competencia", { ascending: false });

    if (competencia) q = q.eq("competencia", competencia);
    if (tipo_credito) q = q.eq("tipo_credito", tipo_credito);
    if (origem) q = q.eq("origem", origem);

    const { data, error } = await q;
    if (error) throw error;

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return jsonError(err);
  }
}
