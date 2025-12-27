import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";

type BodyTabela = {
  titulo?: string;
  ano_referencia?: number | null;
  ativo?: boolean;
  turma_ids?: number[] | null;
  observacoes?: string | null;
};

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

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const cookieStore = await cookies();
    const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: u } = await supabaseAuth.auth.getUser();
    if (!u?.user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const tabelaId = Number(params.id);
    if (!Number.isFinite(tabelaId) || tabelaId <= 0) return badRequest("id invalido.");

    let body: BodyTabela;
    try {
      body = (await req.json()) as BodyTabela;
    } catch {
      return badRequest("JSON invalido.");
    }

    if (!body.titulo?.trim()) return badRequest("Titulo e obrigatorio.");
    if (!body.turma_ids || body.turma_ids.length === 0) {
      return badRequest("Selecione ao menos 1 turma para vincular.");
    }

    const admin = getAdmin();

    const { error: updErr } = await admin
      .from("matricula_tabelas")
      .update({
        titulo: body.titulo.trim(),
        ano_referencia: body.ano_referencia ?? null,
        ativo: body.ativo ?? true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tabelaId);

    if (updErr) return serverError("Falha ao atualizar tabela.", { updErr });

    const { error: delErr } = await admin.from("matricula_tabelas_turmas").delete().eq("tabela_id", tabelaId);
    if (delErr) return serverError("Falha ao atualizar vinculos de turma (delete).", { delErr });

    const pivotRows = body.turma_ids.map((turmaId) => ({ tabela_id: tabelaId, turma_id: turmaId }));
    const { error: pivErr } = await admin.from("matricula_tabelas_turmas").insert(pivotRows);
    if (pivErr) return serverError("Falha ao atualizar vinculos de turma (insert).", { pivErr });

    return NextResponse.json({ ok: true, data: { id: tabelaId } }, { status: 200 });
  } catch (e: unknown) {
    return serverError("Erro inesperado ao atualizar tabela.", {
      message: e instanceof Error ? e.message : String(e),
    });
  }
}
