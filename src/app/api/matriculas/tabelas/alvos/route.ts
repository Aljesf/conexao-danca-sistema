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
    const tipo = String(url.searchParams.get("tipo") || "TURMA");

    const admin = getAdmin();

    if (tipo === "TURMA") {
      const { data, error } = await admin.from("turmas").select("turma_id,nome").order("nome");
      if (error) return serverError("Falha ao listar turmas.", { error });
      const rows = (data ?? []).map((row) => ({
        id: row.turma_id,
        turma_id: row.turma_id,
        nome: row.nome,
      }));
      return NextResponse.json({ ok: true, data: rows }, { status: 200 });
    }

    if (tipo === "CURSO_LIVRE") {
      const { data, error } = await admin.from("cursos_livres").select("id,titulo").order("titulo");
      if (error) return serverError("Falha ao listar cursos livres.", { error });
      return NextResponse.json({ ok: true, data }, { status: 200 });
    }

    if (tipo === "WORKSHOP") {
      const { data, error } = await admin.from("workshops").select("id,titulo").order("titulo");
      if (error) return serverError("Falha ao listar workshops.", { error });
      return NextResponse.json({ ok: true, data }, { status: 200 });
    }

    if (tipo === "PROJETO") {
      const { data, error } = await admin.from("projetos").select("id,titulo").order("titulo");
      if (error) return serverError("Falha ao listar projetos.", { error });
      return NextResponse.json({ ok: true, data }, { status: 200 });
    }

    return badRequest("tipo invalido.", { tipo });
  } catch (e: unknown) {
    return serverError("Erro inesperado ao listar alvos.", { message: e instanceof Error ? e.message : String(e) });
  }
}
