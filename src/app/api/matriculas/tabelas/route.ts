import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { resolveTurmaIdReal } from "@/app/api/_utils/resolveTurmaIdReal";

type AlvoTipo = "TURMA" | "CURSO_LIVRE" | "WORKSHOP" | "PROJETO";

type BodyTabela = {
  titulo?: string;
  ano_referencia?: number | null;
  ativo?: boolean;
  produto_tipo?: "REGULAR" | "CURSO_LIVRE" | "PROJETO_ARTISTICO";
  observacoes?: string | null;
  alvo_tipo?: AlvoTipo;
  alvo_ids?: number[] | null;
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

type LinkComTabela = {
  alvo_tipo: AlvoTipo;
  alvo_id: number;
  matricula_tabelas?: { id: number; titulo: string; ano_referencia: number | null; ativo: boolean } | null;
};

const ALVOS_VALIDOS: AlvoTipo[] = ["TURMA", "CURSO_LIVRE", "WORKSHOP", "PROJETO"];

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

function uniqueNumbers(values: number[]) {
  return Array.from(new Set(values.map((v) => Number(v)).filter((v) => Number.isFinite(v) && v > 0)));
}

async function normalizarAlvoIds(admin: ReturnType<typeof createClient>, alvoTipo: AlvoTipo, ids: number[]) {
  if (alvoTipo !== "TURMA") return uniqueNumbers(ids);
  const resolved: number[] = [];
  for (const id of ids) {
    const real = await resolveTurmaIdReal(admin, id);
    resolved.push(real);
  }
  return uniqueNumbers(resolved);
}

async function buscarConflitos(
  admin: ReturnType<typeof createClient>,
  alvoTipo: AlvoTipo,
  alvoIds: number[],
  anoRef: number | null,
  ignoreTabelaId?: number,
) {
  if (!alvoIds.length || anoRef === null) return [] as LinkComTabela[];

  const { data, error } = await admin
    .from("matricula_tabelas_alvos")
    .select("alvo_tipo,alvo_id,matricula_tabelas:tabela_id (id,titulo,ano_referencia,ativo)")
    .eq("alvo_tipo", alvoTipo)
    .in("alvo_id", alvoIds)
    .eq("matricula_tabelas.ano_referencia", anoRef)
    .eq("matricula_tabelas.ativo", true);

  if (error) throw error;

  const links = (data ?? []) as LinkComTabela[];
  return links.filter((l) => l.matricula_tabelas && l.matricula_tabelas.id !== ignoreTabelaId);
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
          id, titulo, ano_referencia, ativo, produto_tipo, created_at,
          matricula_tabelas_alvos ( alvo_tipo, alvo_id )
        `,
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

    if (!body.titulo?.trim()) return badRequest("Titulo e obrigatorio.");

    const alvoTipo = (body.alvo_tipo ?? (body.turma_ids ? "TURMA" : null)) as AlvoTipo | null;
    if (!alvoTipo || !ALVOS_VALIDOS.includes(alvoTipo)) {
      return badRequest("alvo_tipo invalido.");
    }

    const alvoIdsRaw = body.alvo_ids?.length ? body.alvo_ids : body.turma_ids ?? [];
    if (!alvoIdsRaw || alvoIdsRaw.length === 0) {
      return badRequest("Selecione ao menos 1 alvo para vincular.");
    }

    const produtoTipo = body.produto_tipo ?? "REGULAR";
    const anoRef = body.ano_referencia ?? null;
    const ativo = body.ativo ?? true;

    if (produtoTipo === "REGULAR" && (anoRef === null || !Number.isFinite(anoRef))) {
      return badRequest("ano_referencia e obrigatorio para REGULAR.");
    }

    const admin = getAdmin();
    const alvoIds = await normalizarAlvoIds(admin, alvoTipo, alvoIdsRaw);

    let conflitos: LinkComTabela[] = [];
    try {
      conflitos = await buscarConflitos(admin, alvoTipo, alvoIds, anoRef, undefined);
    } catch (e: unknown) {
      return serverError("Falha ao validar conflito de tabelas.", { message: e instanceof Error ? e.message : String(e) });
    }

    if (conflitos.length > 0) {
      return conflict("Conflito: ja existe tabela ativa para o mesmo alvo/ano.", { conflitos });
    }

    const { data: tabela, error: tabelaErr } = await admin
      .from("matricula_tabelas")
      .insert({
        titulo: body.titulo.trim(),
        produto_tipo: produtoTipo,
        ano_referencia: anoRef,
        ativo,
        observacoes: body.observacoes ?? null,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (tabelaErr || !tabela) return serverError("Falha ao criar tabela.", { tabelaErr });

    const tabelaId = tabela.id as number;

    const pivotRows = alvoIds.map((alvoId) => ({ tabela_id: tabelaId, alvo_tipo: alvoTipo, alvo_id: alvoId }));
    const { error: pivErr } = await admin.from("matricula_tabelas_alvos").insert(pivotRows);
    if (pivErr) return serverError("Falha ao vincular tabela aos alvos.", { pivErr });

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

    if (!Number.isFinite(tabelaId) || tabelaId <= 0) return badRequest("id invalido.");
    if (!body.titulo?.trim()) return badRequest("Titulo e obrigatorio.");

    const alvoTipo = (body.alvo_tipo ?? (body.turma_ids ? "TURMA" : null)) as AlvoTipo | null;
    if (!alvoTipo || !ALVOS_VALIDOS.includes(alvoTipo)) {
      return badRequest("alvo_tipo invalido.");
    }

    const alvoIdsRaw = body.alvo_ids?.length ? body.alvo_ids : body.turma_ids ?? [];
    if (!alvoIdsRaw || alvoIdsRaw.length === 0) {
      return badRequest("Selecione ao menos 1 alvo para vincular.");
    }

    const ativo = body.ativo ?? true;
    const anoRef = body.ano_referencia ?? null;

    const admin = getAdmin();
    const alvoIds = await normalizarAlvoIds(admin, alvoTipo, alvoIdsRaw);

    let conflitos: LinkComTabela[] = [];
    try {
      conflitos = await buscarConflitos(admin, alvoTipo, alvoIds, anoRef, tabelaId);
    } catch (e: unknown) {
      return serverError("Falha ao validar conflito de tabelas.", { message: e instanceof Error ? e.message : String(e) });
    }

    if (conflitos.length > 0) {
      return conflict("Conflito: ja existe tabela ativa para o mesmo alvo/ano.", { conflitos });
    }

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

    const { error: delErr } = await admin.from("matricula_tabelas_alvos").delete().eq("tabela_id", tabelaId);
    if (delErr) return serverError("Falha ao atualizar vinculos de alvo (delete).", { delErr });

    const pivotRows = alvoIds.map((alvoId) => ({ tabela_id: tabelaId, alvo_tipo: alvoTipo, alvo_id: alvoId }));
    const { error: pivErr } = await admin.from("matricula_tabelas_alvos").insert(pivotRows);
    if (pivErr) return serverError("Falha ao atualizar vinculos de alvo (insert).", { pivErr });

    return NextResponse.json({ ok: true, data: { id: tabelaId } }, { status: 200 });
  } catch (e: unknown) {
    return serverError("Erro inesperado ao atualizar tabela.", { message: e instanceof Error ? e.message : String(e) });
  }
}
