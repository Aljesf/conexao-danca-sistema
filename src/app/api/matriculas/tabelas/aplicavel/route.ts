import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";

function badRequest(message: string, details?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: "bad_request", message, details: details ?? null }, { status: 400 });
}
function conflict(message: string, details?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: "conflict", message, details: details ?? null }, { status: 409 });
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
    const turmaId = Number(url.searchParams.get("turma_id") || "");
    const ano = Number(url.searchParams.get("ano") || "");

    if (!turmaId) return badRequest("turma_id é obrigatório.");
    if (!ano) return badRequest("ano é obrigatório.");

    const admin = getAdmin();

    const { data: piv, error: pivErr } = await admin
      .from("matricula_tabelas_turmas")
      .select("tabela_id, matricula_tabelas:tabela_id ( id, titulo, ano_referencia, ativo )")
      .eq("turma_id", turmaId);

    if (pivErr) return serverError("Falha ao resolver tabela aplicável (pivot).", { pivErr });

    const candidatas =
      (piv ?? [])
        .map((r) => (r as { matricula_tabelas?: { id: number; titulo: string; ano_referencia: number; ativo: boolean } })
          .matricula_tabelas)
        .filter((t): t is { id: number; titulo: string; ano_referencia: number; ativo: boolean } => !!t)
        .filter((t) => t.ativo === true && Number(t.ano_referencia) === ano) ?? [];

    if (!candidatas.length) {
      return conflict("Nenhuma tabela ativa encontrada para a turma/ano selecionados.", { turma_id: turmaId, ano });
    }

    candidatas.sort((a, b) => Number(b.id) - Number(a.id));
    const tabela = candidatas[0];

    const { data: itens, error: itensErr } = await admin
      .from("matricula_tabela_itens")
      .select("id, codigo_item, tipo_item, descricao, valor_centavos, ativo, ordem")
      .eq("tabela_id", tabela.id)
      .eq("ativo", true)
      .eq("tipo_item", "RECORRENTE")
      .eq("codigo_item", "MENSALIDADE")
      .order("ordem", { ascending: true })
      .limit(1);

    if (itensErr) return serverError("Falha ao buscar itens da tabela.", { itensErr });

    const item = itens?.[0];
    if (!item) {
      return conflict("Tabela encontrada, mas não há MENSALIDADE/RECORRENTE ativa. Matrícula não pode prosseguir.", {
        tabela_id: tabela.id,
      });
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          tabela: { id: tabela.id, titulo: tabela.titulo, ano_referencia: tabela.ano_referencia },
          item_recorrente: item,
        },
      },
      { status: 200 }
    );
  } catch (e: unknown) {
    return serverError("Erro inesperado ao resolver tabela aplicável.", { message: e instanceof Error ? e.message : String(e) });
  }
}
