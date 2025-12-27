import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { resolveTurmaIdReal } from "@/app/api/_utils/resolveTurmaIdReal";

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

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: u } = await supabaseAuth.auth.getUser();
    if (!u?.user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const alunoId = Number(url.searchParams.get("aluno_id") || "");
    const alvoTipoRaw = String(url.searchParams.get("alvo_tipo") || "TURMA");
    const alvoIdParam = url.searchParams.get("alvo_id");
    const turmaIdParam = url.searchParams.get("turma_id");
    const alvoInput = Number(alvoIdParam || turmaIdParam || "");
    const ano = Number(url.searchParams.get("ano") || "");

    if (!alunoId) return badRequest("aluno_id e obrigatorio.");
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

    let qtdModalidades = 1;
    if (alvoTipo === "TURMA") {
      const { data: mats, error: matsErr } = await admin
        .from("matriculas")
        .select("id,vinculo_id,status")
        .eq("pessoa_id", alunoId)
        .eq("ano_referencia", ano);

      if (matsErr) return serverError("Falha ao contar matriculas do aluno.", { matsErr });

      const ativas = (mats ?? []).filter((m) => String(m.status || "").toUpperCase() !== "CANCELADA");
      const alvoJaExiste = ativas.some((m) => Number(m.vinculo_id) === alvoId);
      qtdModalidades = alvoJaExiste ? ativas.length : ativas.length + 1;
    }

    const { data: tiers, error: tierErr } = await admin
      .from("matricula_tabelas_precificacao_tiers")
      .select("id,minimo_modalidades,maximo_modalidades,item_codigo,tipo_item,ativo")
      .eq("tabela_id", tabela.id)
      .eq("ativo", true)
      .order("minimo_modalidades", { ascending: true });

    if (tierErr) return serverError("Falha ao buscar tiers de precificacao.", { tierErr });

    const tier = (tiers ?? []).find((t) => {
      const min = Number(t.minimo_modalidades);
      const max = t.maximo_modalidades === null ? null : Number(t.maximo_modalidades);
      return qtdModalidades >= min && (max === null || qtdModalidades <= max);
    });

    if (!tier) {
      return conflict("Nao ha tier de precificacao configurado para esta tabela (por quantidade de modalidades).", {
        tabela_id: tabela.id,
        qtdModalidades,
      });
    }

    const { data: itens, error: itensErr } = await admin
      .from("matricula_tabela_itens")
      .select("id,codigo_item,tipo_item,descricao,valor_centavos,ativo,ordem")
      .eq("tabela_id", tabela.id)
      .eq("ativo", true)
      .eq("tipo_item", tier.tipo_item)
      .eq("codigo_item", tier.item_codigo)
      .limit(1);

    if (itensErr) return serverError("Falha ao buscar item da tabela.", { itensErr });

    const item = itens?.[0];
    if (!item) {
      return conflict("Tier encontrado, mas o item configurado nao existe/esta inativo na tabela.", {
        tabela_id: tabela.id,
        item_codigo: tier.item_codigo,
      });
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          tabela: { id: tabela.id, titulo: tabela.titulo, ano_referencia: tabela.ano_referencia },
          qtd_modalidades: qtdModalidades,
          tier: { id: tier.id, item_codigo: tier.item_codigo, tipo_item: tier.tipo_item },
          item_aplicado: item,
          alvo: { tipo: alvoTipo, id: alvoId },
        },
      },
      { status: 200 },
    );
  } catch (e: unknown) {
    return serverError("Erro inesperado ao resolver preco por modalidades.", {
      message: e instanceof Error ? e.message : String(e),
    });
  }
}
