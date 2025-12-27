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
  alvo_tipo?: AlvoTipo;
  alvo_ids?: number[] | null;
  turma_ids?: number[] | null;
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

    const alvoTipo = (body.alvo_tipo ?? (body.turma_ids ? "TURMA" : null)) as AlvoTipo | null;
    if (!alvoTipo || !ALVOS_VALIDOS.includes(alvoTipo)) {
      return badRequest("alvo_tipo invalido.");
    }

    const alvoIdsRaw = body.alvo_ids?.length ? body.alvo_ids : body.turma_ids ?? [];
    if (!alvoIdsRaw || alvoIdsRaw.length === 0) {
      return badRequest("Selecione ao menos 1 alvo para vincular.");
    }

    const admin = getAdmin();
    const alvoIds = await normalizarAlvoIds(admin, alvoTipo, alvoIdsRaw);

    let conflitos: LinkComTabela[] = [];
    try {
      conflitos = await buscarConflitos(admin, alvoTipo, alvoIds, body.ano_referencia ?? null, tabelaId);
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
        ano_referencia: body.ano_referencia ?? null,
        ativo: body.ativo ?? true,
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
    return serverError("Erro inesperado ao atualizar tabela.", {
      message: e instanceof Error ? e.message : String(e),
    });
  }
}
