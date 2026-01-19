import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id?: string }> }) {
  const { id } = await ctx.params;
  const localId = Number(id);
  if (!Number.isInteger(localId) || localId <= 0) {
    return NextResponse.json({ error: "local_id_invalido" }, { status: 400 });
  }

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Usuario nao autenticado." }, { status: 401 });
  }

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
