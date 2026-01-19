import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clampInt(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const turmaId = Number(id);
  if (!Number.isInteger(turmaId) || turmaId <= 0) {
    return NextResponse.json({ error: "turma_id_invalido" }, { status: 400 });
  }

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Usuario nao autenticado." }, { status: 401 });
  }

  const url = new URL(req.url);
  const limit = clampInt(Number(url.searchParams.get("limit") ?? "50"), 1, 200);
  const offset = clampInt(Number(url.searchParams.get("offset") ?? "0"), 0, 5000);

  const { data, error } = await supabase
    .from("turmas_historico")
    .select("id,turma_id,ocorrida_em,actor_user_id,evento,resumo,diff,snapshot")
    .eq("turma_id", turmaId)
    .order("ocorrida_em", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [], limit, offset }, { status: 200 });
}
