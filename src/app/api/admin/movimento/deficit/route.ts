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

    const { data, error } = await supabase
      .from("vw_movimento_deficit_institucional")
      .select("*");

    if (error) throw error;

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return jsonError(err);
  }
}
