import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function GET(request: NextRequest) {
  const cookieStore = cookies();
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
    return NextResponse.json({ ok: true, pessoas: [] }, { status: 200 });
  }

  const ilike = "%" + query.replace(/%/g, "").replace(/_/g, "") + "%";

  const { data, error } = await supabase
    .from("pessoas")
    .select("id, nome_completo, nome, email, telefone_principal")
    .or(`nome_completo.ilike.${ilike},nome.ilike.${ilike},email.ilike.${ilike}`)
    .order("nome_completo", { ascending: true })
    .limit(20);

  if (error) {
    console.error("erro_busca_pessoas:", error);
    return NextResponse.json({ ok: false, error: "erro_busca_pessoas" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, pessoas: data ?? [] }, { status: 200 });
}
