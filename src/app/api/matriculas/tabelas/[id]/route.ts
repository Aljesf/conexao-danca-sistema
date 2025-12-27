import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { resolveTurmaIdReal } from "@/app/api/_utils/resolveTurmaIdReal";

type BodyPut = {
  titulo: string;
  ano_referencia: number | null;
  ativo: boolean;
  alvo_tipo: "TURMA" | "CURSO_LIVRE" | "PROJETO";
  alvo_ids: number[];
};

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

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const tabelaId = Number(id);
    if (!tabelaId) return badRequest("ID invalido.");

    const cookieStore = await cookies();
    const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: u } = await supabaseAuth.auth.getUser();
    if (!u?.user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const body = (await req.json()) as BodyPut;

    if (!body.titulo?.trim()) return badRequest("Titulo e obrigatorio.");
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

    if (body.ativo) {
      const { data: conflitos, error: confErr } = await admin
        .from("matricula_tabelas_alvos")
        .select("tabela_id")
        .eq("alvo_tipo", body.alvo_tipo)
        .in("alvo_id", alvoIds);

      if (confErr) return serverError("Falha ao validar conflitos.", { confErr });

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

        if (tabsErr) return serverError("Falha ao validar conflitos (tabelas).", { tabsErr });

        if (tabs?.length) {
          return conflict("Conflito: ja existe tabela ativa para um ou mais alvos neste ano. Desative a anterior antes.", {
            alvos: alvoIds,
            candidatas: tabs,
          });
        }
      }
    }

    const { error: upErr } = await admin
      .from("matricula_tabelas")
      .update({
        titulo: body.titulo.trim(),
        ano_referencia: body.ano_referencia,
        ativo: !!body.ativo,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tabelaId);

    if (upErr) return serverError("Falha ao atualizar tabela.", { upErr });

    const { error: delErr } = await admin.from("matricula_tabelas_alvos").delete().eq("tabela_id", tabelaId);
    if (delErr) return serverError("Falha ao remover vinculos antigos.", { delErr });

    const rows = alvoIds.map((alvoId) => ({
      tabela_id: tabelaId,
      alvo_tipo: body.alvo_tipo,
      alvo_id: alvoId,
    }));

    const { error: insErr } = await admin.from("matricula_tabelas_alvos").insert(rows);
    if (insErr) return serverError("Falha ao salvar vinculos.", { insErr });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: unknown) {
    return serverError("Erro inesperado ao atualizar tabela.", { message: e instanceof Error ? e.message : String(e) });
  }
}
