import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolveTurmaIdReal } from "@/app/api/_utils/resolveTurmaIdReal";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { requireUser } from "@/lib/supabase/api-auth";

type AlvoTipo = "TURMA" | "CURSO_LIVRE" | "PROJETO";

type MatriculaTabela = {
  id: number;
  titulo: string;
  ano_referencia: number | null;
  ativo: boolean;
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

const ALVOS_VALIDOS: AlvoTipo[] = ["TURMA", "CURSO_LIVRE", "PROJETO"];

async function buscarTabelaIdsPorAlvo(admin: ReturnType<typeof createClient>, alvoTipo: AlvoTipo, alvoId: number) {
  const { data, error } = await admin
    .from("matricula_tabelas_alvos")
    .select("tabela_id")
    .eq("alvo_tipo", alvoTipo)
    .eq("alvo_id", alvoId);

  if (!error) {
    return { ids: (data ?? []).map((l) => Number((l as { tabela_id: number }).tabela_id)), error: null };
  }

  return { ids: [], error };
}

async function buscarTabelaIdsLegado(admin: ReturnType<typeof createClient>, alvoId: number) {
  const { data, error } = await admin
    .from("matricula_tabelas_turmas")
    .select("tabela_id")
    .eq("turma_id", alvoId);

  if (error) return [];
  return (data ?? []).map((l) => Number((l as { tabela_id: number }).tabela_id));
}

export async function GET(request: NextRequest) {
  const denied = await guardApiByRole(request as any);
  if (denied) return denied as any;
  try {
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;

    const url = new URL(request.url);
    const alvoTipoRaw = String(url.searchParams.get("alvo_tipo") || "TURMA");
    const alvoIdParam = url.searchParams.get("alvo_id");
    const turmaIdParam = url.searchParams.get("turma_id");
    const alvoInput = Number(alvoIdParam || turmaIdParam || "");
    const ano = Number(url.searchParams.get("ano") || "");

    if (!alvoInput) return badRequest("alvo_id e obrigatorio.");
    if (!ano) return badRequest("ano e obrigatorio.");

    if (!ALVOS_VALIDOS.includes(alvoTipoRaw as AlvoTipo)) {
      return badRequest("alvo_tipo invalido.", { alvo_tipo: alvoTipoRaw });
    }

    const alvoTipo = alvoTipoRaw as AlvoTipo;
    const admin = getAdmin();
    const alvoId = alvoTipo === "TURMA" ? await resolveTurmaIdReal(admin, alvoInput) : alvoInput;

    const { ids: tabelaIds, error: linkErr } = await buscarTabelaIdsPorAlvo(admin, alvoTipo, alvoId);
    if (linkErr) return serverError("Falha ao buscar vinculos da tabela.", { linkErr });

    const tabelaIdsFinal = tabelaIds.length
      ? tabelaIds
      : alvoTipo === "TURMA"
        ? await buscarTabelaIdsLegado(admin, alvoId)
        : [];

    if (!tabelaIdsFinal.length) {
      return conflict("Nenhuma tabela vinculada encontrada para o alvo/ano selecionados.", {
        alvo_tipo: alvoTipo,
        alvo_id: alvoId,
        ano,
      });
    }

    const { data: tabelas, error: tabErr } = await admin
      .from("matricula_tabelas")
      .select("id,titulo,ano_referencia,ativo")
      .in("id", tabelaIdsFinal)
      .eq("ativo", true)
      .eq("ano_referencia", ano);

    if (tabErr) return serverError("Falha ao buscar tabelas aplicaveis.", { tabErr });

    if (!tabelas?.length) {
      return conflict("Nenhuma tabela ativa encontrada para o alvo/ano selecionados.", {
        alvo_tipo: alvoTipo,
        alvo_id: alvoId,
        ano,
        tabela_ids: tabelaIdsFinal,
      });
    }

    if (tabelas.length > 1) {
      return conflict("Conflito: ha mais de uma tabela ativa para o mesmo alvo/ano. Desative as excedentes.", {
        alvo_tipo: alvoTipo,
        alvo_id: alvoId,
        ano,
        candidatas: tabelas,
      });
    }

    const tabela = tabelas[0] as MatriculaTabela;

    const { data: itens, error: itensErr } = await admin
      .from("matricula_tabela_itens")
      .select("id,codigo_item,tipo_item,descricao,valor_centavos,ativo,ordem")
      .eq("tabela_id", tabela.id)
      .eq("ativo", true)
      .eq("tipo_item", "RECORRENTE")
      .eq("codigo_item", "MENSALIDADE")
      .order("ordem", { ascending: true })
      .limit(1);

    if (itensErr) return serverError("Falha ao buscar itens da tabela.", { itensErr });

    const item = itens?.[0] ?? null;
    if (!item) {
      return conflict("Tabela encontrada, mas nao ha MENSALIDADE/RECORRENTE ativa.", { tabela_id: tabela.id });
    }

    return NextResponse.json(
      { ok: true, data: { tabela, item_recorrente: item, alvo: { tipo: alvoTipo, id: alvoId } } },
      { status: 200 },
    );
  } catch (e: unknown) {
    return serverError("Erro inesperado ao resolver tabela aplicavel.", {
      message: e instanceof Error ? e.message : String(e),
    });
  }
}


