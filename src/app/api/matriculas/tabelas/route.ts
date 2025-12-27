import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";

type BodyTabela = {
  titulo: string;
  ano_referencia?: number | null;
  ativo?: boolean;
  ativa?: boolean;
  produto_tipo?: "REGULAR" | "CURSO_LIVRE" | "PROJETO_ARTISTICO";
  referencia_tipo?: "TURMA" | "PRODUTO" | "PROJETO";
  referencia_id?: number | null;
  observacoes?: string | null;
  turma_ids?: number[] | null;
  itens?:
    | Array<{
        codigo: string;
        tipo: "RECORRENTE" | "UNICO";
        descricao: string;
        valor_centavos: number;
        ordem: number;
        ativo: boolean;
      }>
    | null;
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

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: u } = await supabaseAuth.auth.getUser();
    if (!u?.user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const admin = getAdmin();

    const { data, error } = await admin
      .from("matricula_tabelas")
      .select(
        `
          id, titulo, ano_referencia, ativo, produto_tipo, referencia_tipo, referencia_id, created_at,
          matricula_tabelas_turmas (
            turma_id,
            turmas:turma_id ( turma_id, nome )
          )
        `
      )
      .order("id", { ascending: false });

    if (error) return serverError("Falha ao listar tabelas.", { error });
    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (e: unknown) {
    return serverError("Erro inesperado ao listar tabelas.", { message: e instanceof Error ? e.message : String(e) });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: u } = await supabaseAuth.auth.getUser();
    if (!u?.user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const body = (await req.json()) as BodyTabela;

    if (!body.titulo?.trim()) return badRequest("Título é obrigatório.");
    if (!body.turma_ids || body.turma_ids.length === 0) {
      return badRequest("Selecione ao menos 1 turma para vincular.");
    }

    const produtoTipo = body.produto_tipo ?? "REGULAR";
    const referenciaTipo = body.referencia_tipo ?? "TURMA";
    const anoRef = body.ano_referencia ?? null;
    const ativo = typeof body.ativa === "boolean" ? body.ativa : body.ativo ?? true;
    const referenciaId = body.referencia_id ?? body.turma_ids[0];

    if (produtoTipo === "REGULAR" && (anoRef === null || !Number.isFinite(anoRef))) {
      return badRequest("ano_referencia é obrigatório para REGULAR.");
    }

    const admin = getAdmin();

    const { data: tabela, error: tabelaErr } = await admin
      .from("matricula_tabelas")
      .insert({
        titulo: body.titulo.trim(),
        produto_tipo: produtoTipo,
        referencia_tipo: referenciaTipo,
        referencia_id: referenciaId,
        ano_referencia: anoRef,
        ativo,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (tabelaErr || !tabela) return serverError("Falha ao criar tabela.", { tabelaErr });

    const tabelaId = tabela.id as number;

    const pivotRows = body.turma_ids.map((turmaId) => ({ tabela_id: tabelaId, turma_id: turmaId }));
    const { error: pivErr } = await admin.from("matricula_tabelas_turmas").insert(pivotRows);
    if (pivErr) return serverError("Falha ao vincular tabela às turmas.", { pivErr });

    if (body.itens?.length) {
      const itensRows = body.itens.map((it) => ({
        tabela_id: tabelaId,
        codigo_item: it.codigo,
        tipo_item: it.tipo,
        descricao: it.descricao,
        valor_centavos: it.valor_centavos,
        ordem: it.ordem,
        ativo: it.ativo,
      }));
      const { error: itensErr } = await admin.from("matricula_tabela_itens").insert(itensRows);
      if (itensErr) return serverError("Tabela criada, mas falhou ao inserir itens.", { itensErr });
    }

    return NextResponse.json({ ok: true, data: { id: tabelaId } }, { status: 201 });
  } catch (e: unknown) {
    return serverError("Erro inesperado ao criar tabela.", { message: e instanceof Error ? e.message : String(e) });
  }
}

export async function PUT(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: u } = await supabaseAuth.auth.getUser();
    if (!u?.user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const body = (await req.json()) as BodyTabela & { id?: number };
    const tabelaId = Number(body.id);

    if (!Number.isFinite(tabelaId) || tabelaId <= 0) return badRequest("id inválido.");
    if (!body.titulo?.trim()) return badRequest("Título é obrigatório.");
    if (!body.turma_ids || body.turma_ids.length === 0) {
      return badRequest("Selecione ao menos 1 turma para vincular.");
    }

    const ativo = typeof body.ativa === "boolean" ? body.ativa : body.ativo ?? true;
    const anoRef = body.ano_referencia ?? null;

    const admin = getAdmin();

    const { error: updErr } = await admin
      .from("matricula_tabelas")
      .update({
        titulo: body.titulo.trim(),
        ano_referencia: anoRef,
        ativo,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tabelaId);

    if (updErr) return serverError("Falha ao atualizar tabela.", { updErr });

    const { error: delErr } = await admin.from("matricula_tabelas_turmas").delete().eq("tabela_id", tabelaId);
    if (delErr) return serverError("Falha ao atualizar vínculos de turma (delete).", { delErr });

    const pivotRows = body.turma_ids.map((turmaId) => ({ tabela_id: tabelaId, turma_id: turmaId }));
    const { error: pivErr } = await admin.from("matricula_tabelas_turmas").insert(pivotRows);
    if (pivErr) return serverError("Falha ao atualizar vínculos de turma (insert).", { pivErr });

    return NextResponse.json({ ok: true, data: { id: tabelaId } }, { status: 200 });
  } catch (e: unknown) {
    return serverError("Erro inesperado ao atualizar tabela.", { message: e instanceof Error ? e.message : String(e) });
  }
}
