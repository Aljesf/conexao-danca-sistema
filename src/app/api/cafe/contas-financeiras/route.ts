import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

export async function GET(req: Request) {
  const denied = await guardApiByRole(req);
  if (denied) return denied as unknown as NextResponse;

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("contas_financeiras")
    .select("id,codigo,nome,tipo,centro_custo_id,ativo")
    .eq("centro_custo_id", 3)
    .eq("ativo", true)
    .order("tipo", { ascending: true })
    .order("nome", { ascending: true });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data }, { status: 200 });
}
