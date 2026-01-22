import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, ctx: { params: Promise<{ id?: string }> }) {
  const { id } = await ctx.params;
  const localId = Number(id);
  if (!Number.isInteger(localId) || localId <= 0) {
    return NextResponse.json({ error: "local_id_invalido" }, { status: 400 });
  }
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;

  const { data, error } = await supabase
    .from("espacos")
    .select("id,local_id,nome,tipo,capacidade,ativo,observacoes,created_at,updated_at")
    .eq("local_id", localId)
    .order("nome", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, espacos: data ?? [] }, { status: 200 });
}


