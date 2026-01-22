import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clampInt(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const turmaId = Number(id);
  if (!Number.isInteger(turmaId) || turmaId <= 0) {
    return NextResponse.json({ error: "turma_id_invalido" }, { status: 400 });
  }

  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;

  const url = new URL(request.url);
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
