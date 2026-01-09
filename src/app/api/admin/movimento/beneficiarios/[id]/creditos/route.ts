import { NextResponse } from "next/server";
import { requireMovimentoAdmin } from "@/lib/auth/movimento-guard";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { jsonError } from "@/lib/http/api-errors";
import { guardApiByRole } from "@/lib/auth/roleGuard";

export async function GET(_: Request, ctx: { params: { id: string } }) {
  const denied = await guardApiByRole(_ as any);
  if (denied) return denied as any;
  try {
    await requireMovimentoAdmin();
    const supabase = getSupabaseServiceClient();

    const { data, error } = await supabase
      .from("movimento_creditos")
      .select("*")
      .eq("beneficiario_id", ctx.params.id)
      .order("criado_em", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return jsonError(err);
  }
}
