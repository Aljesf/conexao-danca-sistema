import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

export async function GET(req: Request) {
  const denied = await guardApiByRole(req);
  if (denied) return denied as unknown as NextResponse;

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("categorias_financeiras")
    .select("id,codigo,nome,tipo,ativo")
    .eq("tipo", "DESPESA")
    .eq("ativo", true)
    .or("codigo.ilike.%CAFE%,nome.ilike.%café%,nome.ilike.%cafe%")
    .order("nome", { ascending: true });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data }, { status: 200 });
}
