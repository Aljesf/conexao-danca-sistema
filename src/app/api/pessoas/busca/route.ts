import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q =
    (url.searchParams.get("q") ?? url.searchParams.get("query") ?? "").trim();

  if (q.length < 2) {
    return NextResponse.json({ ok: true, pessoas: [] });
  }

  const like = `%${q.replace(/%/g, "").replace(/_/g, "")}%`;

  const { data, error } = await supabase
    .from("pessoas")
    .select("id,nome,email,cpf,telefone,ativo")
    .or(`nome.ilike.${like},email.ilike.${like},cpf.ilike.${like}`)
    .order("nome", { ascending: true })
    .limit(20);

  if (error) {
    return NextResponse.json({ ok: false, error: "db_error", details: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, pessoas: data ?? [] });
}
