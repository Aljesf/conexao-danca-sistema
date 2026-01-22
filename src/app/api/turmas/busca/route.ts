import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("query") || "").trim();

  if (!query) {
    return NextResponse.json({ ok: true, turmas: [] }, { status: 200 });
  }

  const ilike = "%" + query.replace(/%/g, "").replace(/_/g, "") + "%";

  const { data, error } = await supabase
    .from("turmas")
    .select("turma_id, nome, status")
    .ilike("nome", ilike)
    .order("nome", { ascending: true })
    .limit(20);

  if (error) {
    console.error("erro_busca_turmas:", error);
    return NextResponse.json({ ok: false, error: "erro_busca_turmas" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, turmas: data ?? [] }, { status: 200 });
}
