import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";

function badRequest(message: string, details?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: "bad_request", message, details: details ?? null }, { status: 400 });
}
function serverError(message: string, details?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: "server_error", message, details: details ?? null }, { status: 500 });
}
function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE_KEY ||
    "";
  if (!url) throw new Error("Env ausente: NEXT_PUBLIC_SUPABASE_URL");
  if (!service) throw new Error("Env ausente: SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, service, { auth: { persistSession: false } });
}

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: u } = await supabaseAuth.auth.getUser();
    if (!u?.user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const ano = Number(url.searchParams.get("ano") || "");
    if (!ano) return badRequest("ano e obrigatorio.");

    const admin = getAdmin();

    const { data: cobertura, error: cobErr } = await admin
      .from("matricula_tabelas_alvos")
      .select("alvo_tipo,alvo_id,matricula_tabelas:tabela_id ( id, ano_referencia, ativo, titulo )")
      .eq("matricula_tabelas.ano_referencia", ano)
      .eq("matricula_tabelas.ativo", true);

    if (cobErr) return serverError("Falha ao montar cobertura.", { cobErr });

    return NextResponse.json({ ok: true, data: cobertura ?? [] }, { status: 200 });
  } catch (e: unknown) {
    return serverError("Erro inesperado ao montar cobertura.", { message: e instanceof Error ? e.message : String(e) });
  }
}
