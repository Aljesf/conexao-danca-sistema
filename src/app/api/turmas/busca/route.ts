import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ ok: false, error: "nao_autenticado" }, { status: 401 });
  }

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
