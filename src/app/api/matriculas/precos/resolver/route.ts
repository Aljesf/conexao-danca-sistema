import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient, type PostgrestError } from "@supabase/supabase-js";

type AlvoTipo = "TURMA" | "CURSO_LIVRE" | "PROJETO";

type MatriculaTabela = {
  id: number;
  titulo: string;
  ano_referencia: number | null;
  ativo: boolean;
};

type TierRow = {
  id: number;
  minimo_modalidades: number | null;
  maximo_modalidades: number | null;
  item_codigo: string;
  tipo_item: string;
  ativo: boolean;
};

type ItemRow = {
  id: number;
  codigo_item: string;
  tipo_item: string;
  descricao?: string | null;
  valor_centavos: number;
  ativo: boolean;
  ordem: number;
};

type MatriculaRow = {
  id: number;
  servico_id: number | null;
  vinculo_id: number | null;
  status: string | null;
};

const ALVOS_VALIDOS: AlvoTipo[] = ["TURMA", "CURSO_LIVRE", "PROJETO"];
const REFERENCIA_TIPO = "PRODUTO";

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

function isSchemaMissing(err: unknown): boolean {
  const e = err as PostgrestError | null;
  return !!e && typeof e.code === "string" && (e.code === "42P01" || e.code === "42703");
}

function toPositiveNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizeNumberArray(values: unknown[]): number[] {
  return Array.from(new Set(values.map((v) => Number(v)).filter((v) => Number.isFinite(v) && v > 0)));
}

type TurmaMapResult =
  | { ok: true; mapa: Map<number, number> }
  | { ok: false; response: NextResponse };

async function buildMapaTurmas(
  admin: ReturnType<typeof createClient>,
  rows: MatriculaRow[],
): Promise<TurmaMapResult> {
  const vinculosSemServico = Array.from(
    new Set(
      rows
        .filter((m) => !m.servico_id && m.vinculo_id)
        .map((m) => Number(m.vinculo_id))
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  );

  const mapaTurmas = new Map<number, number>();
  if (!vinculosSemServico.length) return { ok: true, mapa: mapaTurmas };

  const { data, error } = await admin.from("turmas").select("turma_id,produto_id").in("turma_id", vinculosSemServico);
  if (error) {
    if (isSchemaMissing(error)) {
      return { ok: false, response: conflict("Nao foi possivel calcular modalidades (schema pendente).", { error }) };
    }
    return { ok: false, response: serverError("Falha ao resolver turmas do aluno.", { error }) };
  }

  (data ?? []).forEach((t) => {
    const turmaId = toPositiveNumber((t as { turma_id?: number }).turma_id);
    const produtoId = toPositiveNumber((t as { produto_id?: number | null }).produto_id);
    if (turmaId && produtoId) mapaTurmas.set(turmaId, produtoId);
  });

  return { ok: true, mapa: mapaTurmas };
}

function resolveServicoId(m: MatriculaRow, mapaTurmas: Map<number, number>): number | null {
  if (m.servico_id) return m.servico_id;
  if (m.vinculo_id) return mapaTurmas.get(m.vinculo_id) ?? null;
  return null;
}

async function listarMatriculas(
  admin: ReturnType<typeof createClient>,
  alunoId: number,
  ano: number,
): Promise<{ ok: true; rows: MatriculaRow[] } | { ok: false; response: NextResponse }> {
  let data: unknown[] | null = null;
  let error: PostgrestError | null = null;

  ({ data, error } = await admin
    .from("matriculas")
    .select("id,servico_id,vinculo_id,status")
    .eq("pessoa_id", alunoId)
    .eq("ano_referencia", ano));

  if (error && isSchemaMissing(error)) {
    ({ data, error } = await admin
      .from("matriculas")
      .select("id,produto_id,vinculo_id,status")
      .eq("pessoa_id", alunoId)
      .eq("ano_referencia", ano));
  }

  if (error) {
    if (isSchemaMissing(error)) {
      return { ok: false, response: conflict("Nao foi possivel calcular modalidades (schema pendente).", { error }) };
    }
    return { ok: false, response: serverError("Falha ao buscar matriculas do aluno.", { error }) };
  }

  const rows: MatriculaRow[] = (data ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    const servicoId = toPositiveNumber(record.servico_id ?? record.produto_id);
    const vinculoId = toPositiveNumber(record.vinculo_id);
    const statusRaw = record.status;
    return {
      id: toPositiveNumber(record.id) ?? 0,
      servico_id: servicoId,
      vinculo_id: vinculoId,
      status: typeof statusRaw === "string" ? statusRaw : statusRaw ? String(statusRaw) : null,
    };
  });

  return { ok: true, rows };
}

async function calcularQtdModalidades(
  admin: ReturnType<typeof createClient>,
  alunoId: number,
  ano: number,
  servicoId: number,
  alvoTipo: AlvoTipo,
): Promise<{ ok: true; qtdModalidades: number } | { ok: false; response: NextResponse }> {
  if (alvoTipo === "PROJETO") return { ok: true, qtdModalidades: 1 };

  const matsRes = await listarMatriculas(admin, alunoId, ano);
  if (!matsRes.ok) return matsRes;

  const ativas = matsRes.rows.filter((m) => String(m.status || "").toUpperCase() !== "CANCELADA");
  if (ativas.length === 0) return { ok: true, qtdModalidades: 1 };

  const mapaRes = await buildMapaTurmas(admin, ativas);
  if (!mapaRes.ok) return mapaRes;

  const alvoJaExiste = ativas.some((m) => resolveServicoId(m, mapaRes.mapa) === servicoId);
  return { ok: true, qtdModalidades: alvoJaExiste ? ativas.length : ativas.length + 1 };
}

async function calcularModalidadesPorGrupo(
  admin: ReturnType<typeof createClient>,
  alunoId: number,
  ano: number,
  servicosGrupoIds: number[],
  servicoId: number,
): Promise<{ ok: true; quantidadeModalidades: number; ordem: number } | { ok: false; response: NextResponse }> {
  const matsRes = await listarMatriculas(admin, alunoId, ano);
  if (!matsRes.ok) return matsRes;

  const ativas = matsRes.rows.filter((m) => String(m.status || "").toUpperCase() !== "CANCELADA");
  const mapaRes = await buildMapaTurmas(admin, ativas);
  if (!mapaRes.ok) return mapaRes;

  const servicoSet = new Set(servicosGrupoIds);
  const ativasGrupo = ativas
    .map((m) => ({ servicoId: resolveServicoId(m, mapaRes.mapa) }))
    .filter((r) => !!r.servicoId && servicoSet.has(r.servicoId));

  const quantidadeBase = ativasGrupo.length;
  const alvoJaExiste = ativasGrupo.some((r) => r.servicoId === servicoId);
  const quantidadeModalidades = alvoJaExiste ? quantidadeBase : quantidadeBase + 1;

  return { ok: true, quantidadeModalidades, ordem: quantidadeModalidades };
}

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: u } = await supabaseAuth.auth.getUser();
    if (!u?.user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const alunoId = Number(url.searchParams.get("aluno_id") || "");
    const alvoTipoRaw = String(url.searchParams.get("alvo_tipo") || "TURMA")
      .trim()
      .toUpperCase();
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
    const alvoId = alvoInput;

    let servicoId: number | null = null;
    let unidadeExecucaoId: number | null = null;
    let turmaId: number | null = null;

    if (alvoTipo === "TURMA") {
      turmaId = alvoId;
      const { data: turma, error: turmaErr } = await admin
        .from("turmas")
        .select("turma_id, produto_id")
        .eq("turma_id", turmaId)
        .maybeSingle();

      if (turmaErr) {
        if (isSchemaMissing(turmaErr)) {
          return conflict("Tabela turmas nao encontrada (migracao pendente).", { turmaErr });
        }
        return serverError("Falha ao validar turma.", { turmaErr });
      }

      if (!turma) return badRequest("Turma nao encontrada.", { turma_id: turmaId });

      servicoId = toPositiveNumber((turma as { produto_id?: number | null }).produto_id);
      if (!servicoId) return conflict("Turma sem servico vinculado.", { turma_id: turmaId });

      const { data: ue, error: ueErr } = await admin
        .from("escola_unidades_execucao")
        .select("unidade_execucao_id")
        .eq("servico_id", servicoId)
        .eq("origem_tipo", "TURMA")
        .eq("origem_id", turmaId)
        .eq("ativo", true)
        .maybeSingle();

      if (ueErr) {
        if (isSchemaMissing(ueErr)) {
          return conflict("Tabela escola_unidades_execucao nao encontrada (migracao pendente).", { ueErr });
        }
        return serverError("Falha ao resolver unidade de execucao.", { ueErr });
      }

      if (!ue) {
        return conflict("Turma sem unidade de execucao vinculada.", { turma_id: turmaId });
      }

      unidadeExecucaoId = toPositiveNumber((ue as { unidade_execucao_id?: number }).unidade_execucao_id);
      if (!unidadeExecucaoId) {
        return conflict("Unidade de execucao invalida para a turma.", { turma_id: turmaId });
      }
    } else {
      servicoId = toPositiveNumber(alvoId);
    }

    if (!servicoId) {
      return badRequest("servico_id invalido para o alvo informado.", { alvo_tipo: alvoTipo, alvo_id: alvoId });
    }

    const { data: tabelas, error: tabErr } = await admin
      .from("matricula_tabelas")
      .select("id,titulo,ano_referencia,ativo")
      .eq("referencia_tipo", REFERENCIA_TIPO)
      .eq("referencia_id", servicoId)
      .eq("ano_referencia", ano)
      .eq("ativo", true)
      .order("id", { ascending: false });

    if (tabErr) {
      if (isSchemaMissing(tabErr)) {
        return conflict("Tabela de precos ainda nao esta pronta para resolver precos.", { tabErr });
      }
      return serverError("Falha ao buscar tabelas aplicaveis.", { tabErr });
    }

    if (!tabelas?.length) {
      return conflict("Nenhuma tabela ativa encontrada para o servico/ano selecionados.", {
        servico_id: servicoId,
        ano,
      });
    }

    const tabela = tabelas[0] as MatriculaTabela;

    const { data: pivotRows, error: pivotErr } = await admin
      .from("matricula_tabelas_unidades_execucao")
      .select("unidade_execucao_id")
      .eq("tabela_id", tabela.id);

    if (pivotErr) {
      if (isSchemaMissing(pivotErr)) {
        return conflict("Pivot de unidades de execucao nao encontrado (migracao pendente).", { pivotErr });
      }
      return serverError("Falha ao validar unidades de execucao.", { pivotErr });
    }

    const pivotIds = normalizeNumberArray((pivotRows ?? []).map((r) => (r as { unidade_execucao_id?: number }).unidade_execucao_id));
    if (pivotIds.length > 0) {
      if (!unidadeExecucaoId) {
        return conflict("Tabela nao se aplica a unidade selecionada.", {
          tabela_id: tabela.id,
          unidade_execucao_id: null,
        });
      }
      if (!pivotIds.includes(unidadeExecucaoId)) {
        return conflict("Tabela nao se aplica a unidade selecionada.", {
          tabela_id: tabela.id,
          unidade_execucao_id: unidadeExecucaoId,
        });
      }
    }

    let tierGrupoId: number | null = null;
    let tierOrdem: number | null = null;
    let quantidadeModalidades: number | null = null;
    let tierValorCentavos: number | null = null;

    const { data: servicoTier, error: servicoTierErr } = await admin
      .from("escola_produtos_educacionais")
      .select("tier_grupo_id")
      .eq("id", servicoId)
      .maybeSingle();

    if (servicoTierErr) {
      if (!isSchemaMissing(servicoTierErr)) {
        console.error("[precos/resolver] servicoTierErr", servicoTierErr);
      }
    } else {
      tierGrupoId = toPositiveNumber((servicoTier as { tier_grupo_id?: number | null }).tier_grupo_id);
    }

    if (tierGrupoId) {
      const { data: servicosGrupo, error: servicosGrupoErr } = await admin
        .from("escola_produtos_educacionais")
        .select("id")
        .eq("tier_grupo_id", tierGrupoId);

      if (servicosGrupoErr) {
        if (!isSchemaMissing(servicosGrupoErr)) {
          console.error("[precos/resolver] servicosGrupoErr", servicosGrupoErr);
        }
      } else {
        const servicosGrupoIds = normalizeNumberArray(
          (servicosGrupo ?? []).map((s) => (s as { id?: number | null }).id),
        );
        if (servicosGrupoIds.length) {
          const qtdGrupoRes = await calcularModalidadesPorGrupo(admin, alunoId, ano, servicosGrupoIds, servicoId);
          if (qtdGrupoRes.ok) {
            quantidadeModalidades = qtdGrupoRes.quantidadeModalidades;
            tierOrdem = qtdGrupoRes.ordem;
          } else {
            console.error("[precos/resolver] qtdGrupo", qtdGrupoRes.response);
          }
        }
      }

      if (tierOrdem) {
        const { data: tierEq, error: tierEqErr } = await admin
          .from("financeiro_tiers")
          .select("tier_id,ordem,valor_centavos,ativo")
          .eq("tier_grupo_id", tierGrupoId)
          .eq("ordem", tierOrdem)
          .eq("ativo", true)
          .maybeSingle();

        if (tierEqErr) {
          if (!isSchemaMissing(tierEqErr)) {
            console.error("[precos/resolver] tierEqErr", tierEqErr);
          }
        }

        if (tierEq && !tierEqErr) {
          const valor = Number((tierEq as { valor_centavos?: number }).valor_centavos);
          if (Number.isFinite(valor) && valor > 0) {
            tierValorCentavos = valor;
            tierOrdem = toPositiveNumber((tierEq as { ordem?: number }).ordem) ?? tierOrdem;
          }
        } else {
          const { data: tierMax, error: tierMaxErr } = await admin
            .from("financeiro_tiers")
            .select("tier_id,ordem,valor_centavos,ativo")
            .eq("tier_grupo_id", tierGrupoId)
            .eq("ativo", true)
            .order("ordem", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (tierMaxErr) {
            if (!isSchemaMissing(tierMaxErr)) {
              console.error("[precos/resolver] tierMaxErr", tierMaxErr);
            }
          } else if (tierMax) {
            const valor = Number((tierMax as { valor_centavos?: number }).valor_centavos);
            if (Number.isFinite(valor) && valor > 0) {
              tierValorCentavos = valor;
              tierOrdem = toPositiveNumber((tierMax as { ordem?: number }).ordem) ?? tierOrdem;
            }
          }
        }
      }
    }

    let qtdModalidades: number | null = null;
    const qtdRes = await calcularQtdModalidades(admin, alunoId, ano, servicoId, alvoTipo);
    if (qtdRes.ok) {
      qtdModalidades = qtdRes.qtdModalidades;
    } else {
      console.error("[precos/resolver] qtdModalidades", qtdRes.response);
    }

    let tier: TierRow | null = null;
    const { data: tiersData, error: tierErr } = await admin
      .from("matricula_tabelas_precificacao_tiers")
      .select("id,minimo_modalidades,maximo_modalidades,item_codigo,tipo_item,ativo")
      .eq("tabela_id", tabela.id)
      .eq("ativo", true)
      .order("minimo_modalidades", { ascending: true });

    if (tierErr) {
      if (!isSchemaMissing(tierErr)) {
        return serverError("Falha ao buscar tiers de precificacao.", { tierErr });
      }
    }

    const tiers = (tiersData ?? []) as TierRow[];
    if (tiers.length > 0 && typeof qtdModalidades === "number") {
      tier =
        tiers.find((t) => {
          const min = Number(t.minimo_modalidades);
          const max = t.maximo_modalidades === null ? null : Number(t.maximo_modalidades);
          return qtdModalidades >= min && (max === null || qtdModalidades <= max);
        }) ?? null;
    }

    let item: ItemRow | null = null;
    if (tier) {
      const { data: itens, error: itensErr } = await admin
        .from("matricula_tabela_itens")
        .select("id,codigo_item,tipo_item,descricao,valor_centavos,ativo,ordem")
        .eq("tabela_id", tabela.id)
        .eq("ativo", true)
        .eq("tipo_item", tier.tipo_item)
        .eq("codigo_item", tier.item_codigo)
        .order("ordem", { ascending: true })
        .limit(1);

      if (itensErr) {
        if (isSchemaMissing(itensErr)) {
          return conflict("Tabela de precos ainda nao esta pronta para resolver precos.", { itensErr });
        }
        return serverError("Falha ao buscar item da tabela.", { itensErr });
      }

      item = (itens ?? [])[0] ?? null;
      if (!item) {
        return conflict("Tier encontrado, mas o item configurado nao existe/esta inativo na tabela.", {
          tabela_id: tabela.id,
          item_codigo: tier.item_codigo,
        });
      }
    } else {
      const { data: itens, error: itensErr } = await admin
        .from("matricula_tabela_itens")
        .select("id,codigo_item,tipo_item,descricao,valor_centavos,ativo,ordem")
        .eq("tabela_id", tabela.id)
        .eq("ativo", true)
        .eq("tipo_item", "RECORRENTE")
        .eq("codigo_item", "MENSALIDADE")
        .order("ordem", { ascending: true })
        .limit(1);

      if (itensErr) {
        if (isSchemaMissing(itensErr)) {
          return conflict("Tabela de precos ainda nao esta pronta para resolver precos.", { itensErr });
        }
        return serverError("Falha ao buscar item recorrente.", { itensErr });
      }

      item = (itens ?? [])[0] ?? null;
      if (!item) {
        return conflict("Tabela sem item recorrente configurado (MENSALIDADE).", { tabela_id: tabela.id });
      }
    }

    if (item && tierValorCentavos !== null) {
      item = { ...item, valor_centavos: tierValorCentavos };
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          tabela: { id: tabela.id, titulo: tabela.titulo, ano_referencia: tabela.ano_referencia },
          qtd_modalidades: qtdModalidades,
          quantidade_modalidades: quantidadeModalidades,
          tier_ordem: tierOrdem,
          tier_dinamico:
            tierValorCentavos !== null
              ? { tier_grupo_id: tierGrupoId, ordem: tierOrdem, valor_centavos: tierValorCentavos }
              : null,
          tier: tier ? { id: tier.id, item_codigo: tier.item_codigo, tipo_item: tier.tipo_item } : null,
          item_aplicado: item,
          alvo: { tipo: alvoTipo, id: alvoId },
        },
      },
      { status: 200 },
    );
  } catch (e: unknown) {
    return serverError("Erro inesperado ao resolver preco.", { message: e instanceof Error ? e.message : String(e) });
  }
}
