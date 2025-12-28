import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient, type PostgrestError } from "@supabase/supabase-js";
import { resolveTurmaIdReal } from "@/app/api/_utils/resolveTurmaIdReal";

export const dynamic = "force-dynamic";

type ApiOk<T> = { ok: true; data: T };
type ApiErr = {
  ok: false;
  message: string;
  error: "bad_request" | "unauthorized" | "conflict" | "server_error";
  details?: Record<string, unknown> | null;
};

type BodyPut = {
  titulo: string;
  ano_referencia: number | null;
  ativo: boolean;
  alvo_tipo: "TURMA" | "CURSO_LIVRE" | "PROJETO";
  alvo_ids: number[];
};

function jsonError(status: number, body: ApiErr) {
  return NextResponse.json(body, { status });
}

function badRequest(message: string, details?: Record<string, unknown>) {
  return jsonError(400, { ok: false, error: "bad_request", message, details: details ?? null });
}
function unauthorized(message: string) {
  return jsonError(401, { ok: false, error: "unauthorized", message, details: null });
}
function conflict(message: string, details?: Record<string, unknown>) {
  return jsonError(409, { ok: false, error: "conflict", message, details: details ?? null });
}
function serverError(message: string, details?: Record<string, unknown>) {
  return jsonError(500, { ok: false, error: "server_error", message, details: details ?? null });
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

function isMissingRelation(err: unknown): boolean {
  const e = err as PostgrestError | null;
  return !!e && typeof e.code === "string" && e.code === "42P01";
}

function safeDetails(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return { message: err.message, name: err.name, stack: err.stack ?? null };
  }
  return { error: err };
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params;
  console.log("[PUT /api/matriculas/tabelas/:id] start", { id: params.id, method: req.method });

  try {
    const tabelaIdRaw = params.id;
    const tabelaId = Number(tabelaIdRaw);
    if (!Number.isFinite(tabelaId) || tabelaId <= 0) {
      return badRequest("ID invalido.", { tabelaId: tabelaIdRaw });
    }

    const cookieStore = await cookies();
    const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: u } = await supabaseAuth.auth.getUser();
    if (!u?.user) return unauthorized("Nao autenticado.");

    let body: BodyPut;
    try {
      body = (await req.json()) as BodyPut;
    } catch (e: unknown) {
      console.error("[PUT /api/matriculas/tabelas/:id] JSON parse error", e);
      return badRequest("Payload invalido (JSON).", { message: e instanceof Error ? e.message : String(e) });
    }

    console.log("[PUT /api/matriculas/tabelas/:id] body", body);

    const titulo = String(body.titulo ?? "").trim();
    if (!titulo) return badRequest("Titulo e obrigatorio.");
    if (body.ano_referencia === null || Number.isNaN(Number(body.ano_referencia))) {
      return badRequest("Ano de referencia e obrigatorio.");
    }
    if (!body.alvo_tipo) return badRequest("alvo_tipo e obrigatorio.");
    if (!Array.isArray(body.alvo_ids) || body.alvo_ids.length === 0) {
      return badRequest("Selecione ao menos 1 alvo para vincular.");
    }

    const admin = getAdmin();

    let alvoIds = body.alvo_ids.map((n) => Number(n)).filter(Boolean);
    if (body.alvo_tipo === "TURMA") {
      const normalized: number[] = [];
      for (const turmaInput of alvoIds) {
        normalized.push(await resolveTurmaIdReal(admin, turmaInput));
      }
      alvoIds = Array.from(new Set(normalized));
    } else {
      alvoIds = Array.from(new Set(alvoIds));
    }

    if (!alvoIds.length) return badRequest("Selecione ao menos 1 alvo para vincular.");

    let produtoId: number | null = null;
    if (body.alvo_tipo === "TURMA") {
      const { data: turmas, error: turmasErr } = await admin
        .from("turmas")
        .select("turma_id, produto_id")
        .in("turma_id", alvoIds);

      if (turmasErr) {
        console.error("[matriculas/tabelas PUT] turmasErr", turmasErr);
        if (isMissingRelation(turmasErr)) {
          return conflict("Tabela turmas nao encontrada (migracao pendente).", { turmasErr });
        }
        return serverError("Falha ao validar produto das turmas.", { turmasErr });
      }

      const rows = (turmas ?? []) as Array<{ turma_id: number; produto_id: number | null }>;
      const encontrados = new Set(rows.map((t) => Number(t.turma_id)));
      const faltantes = alvoIds.filter((id) => !encontrados.has(id));
      if (faltantes.length) {
        return badRequest("Uma ou mais turmas nao foram encontradas.", { alvo_ids: faltantes });
      }

      for (const turma of rows) {
        if (turma.produto_id === null || turma.produto_id === undefined) {
          return conflict("Alvos pertencem a produtos diferentes.", { turma_id: turma.turma_id });
        }
        const atual = Number(turma.produto_id);
        if (produtoId === null) {
          produtoId = atual;
        } else if (produtoId !== atual) {
          return conflict("Alvos pertencem a produtos diferentes.", { produto_ids: [produtoId, atual] });
        }
      }
    }

    if (body.ativo) {
      const { data: conflitos, error: confErr } = await admin
        .from("matricula_tabelas_alvos")
        .select("tabela_id")
        .eq("alvo_tipo", body.alvo_tipo)
        .in("alvo_id", alvoIds);

      if (confErr) {
        console.error("[matriculas/tabelas PUT] confErr", confErr);
        if (isMissingRelation(confErr)) {
          return conflict("Tabela de vinculos nao encontrada (migracao pendente).", { confErr });
        }
        return serverError("Falha ao validar conflitos.", { confErr });
      }

      const conflitoTabelaIds = Array.from(new Set((conflitos ?? []).map((c: any) => Number(c.tabela_id)))).filter(
        (x) => x !== tabelaId,
      );

      if (conflitoTabelaIds.length) {
        const { data: tabs, error: tabsErr } = await admin
          .from("matricula_tabelas")
          .select("id,titulo,ano_referencia,ativo")
          .in("id", conflitoTabelaIds)
          .eq("ano_referencia", body.ano_referencia)
          .eq("ativo", true);

        if (tabsErr) {
          console.error("[matriculas/tabelas PUT] tabsErr", tabsErr);
          if (isMissingRelation(tabsErr)) {
            return conflict("Tabela matricula_tabelas nao encontrada (migracao pendente).", { tabsErr });
          }
          return serverError("Falha ao validar conflitos (tabelas).", { tabsErr });
        }

        if (tabs?.length) {
          return conflict("Conflito: ja existe tabela ativa para um ou mais alvos neste ano. Desative a anterior antes.", {
            alvos: alvoIds,
            candidatas: tabs,
          });
        }
      }
    }

    const updatePayload: Record<string, unknown> = {
      titulo,
      ano_referencia: body.ano_referencia,
      ativo: !!body.ativo,
      updated_at: new Date().toISOString(),
    };

    if (produtoId !== null) {
      updatePayload.referencia_tipo = "PRODUTO";
      updatePayload.referencia_id = produtoId;
    }

    const { error: upErr } = await admin
      .from("matricula_tabelas")
      .update(updatePayload)
      .eq("id", tabelaId);

    if (upErr) {
      console.error("[matriculas/tabelas PUT] upErr", upErr);
      if (isMissingRelation(upErr)) {
        return conflict("Tabela matricula_tabelas nao encontrada (migracao pendente).", { upErr });
      }
      return serverError("Falha ao atualizar tabela.", { upErr });
    }

    const { error: delErr } = await admin.from("matricula_tabelas_alvos").delete().eq("tabela_id", tabelaId);
    if (delErr) {
      console.error("[matriculas/tabelas PUT] delErr", delErr);
      if (isMissingRelation(delErr)) {
        return conflict("Tabela de vinculos nao encontrada (migracao pendente).", { delErr });
      }
      return serverError("Falha ao remover vinculos antigos.", { delErr });
    }

    const rows = alvoIds.map((alvoId) => ({
      tabela_id: tabelaId,
      alvo_tipo: body.alvo_tipo,
      alvo_id: alvoId,
    }));

    const { error: insErr } = await admin.from("matricula_tabelas_alvos").insert(rows);
    if (insErr) {
      console.error("[matriculas/tabelas PUT] insErr", insErr);
      if (isMissingRelation(insErr)) {
        return conflict("Tabela de vinculos nao encontrada (migracao pendente).", { insErr });
      }
      return serverError("Falha ao salvar vinculos.", { insErr });
    }

    return NextResponse.json({ ok: true, data: { id: tabelaId } } satisfies ApiOk<{ id: number }>, { status: 200 });
  } catch (e: unknown) {
    console.error("[matriculas/tabelas PUT] fatal", e);
    return serverError("Erro inesperado ao atualizar tabela.", safeDetails(e));
  }
}
