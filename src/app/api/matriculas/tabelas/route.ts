import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient, type PostgrestError } from "@supabase/supabase-js";
import { resolveTurmaIdReal } from "@/app/api/_utils/resolveTurmaIdReal";
import { guardApiByRole } from "@/lib/auth/roleGuard";

type AlvoTipo = "TURMA" | "CURSO_LIVRE" | "PROJETO";
type ServicoTipo = "CURSO_REGULAR" | "CURSO_LIVRE" | "PROJETO_ARTISTICO";
type ProdutoTipo = "REGULAR" | "CURSO_LIVRE" | "PROJETO_ARTISTICO";

type BodyTabela = {
  titulo?: string;
  ano_referencia?: number | null;
  ativo?: boolean;
  produto_tipo?: ProdutoTipo;
  observacoes?: string | null;
  servico_tipo?: ServicoTipo;
  servico_id?: number | string;
  unidade_execucao_ids?: number[] | null;
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

type ConflitoTabela = {
  id: number;
  titulo: string;
  ano_referencia: number | null;
  ativo: boolean;
};

const ALVOS_VALIDOS: AlvoTipo[] = ["TURMA", "CURSO_LIVRE", "PROJETO"];

const SERVICO_TIPO_TO_PRODUTO_TIPO: Record<ServicoTipo, ProdutoTipo> = {
  CURSO_REGULAR: "REGULAR",
  CURSO_LIVRE: "CURSO_LIVRE",
  PROJETO_ARTISTICO: "PROJETO_ARTISTICO",
};

const PRODUTO_TIPO_TO_SERVICO_TIPO: Record<ProdutoTipo, ServicoTipo> = {
  REGULAR: "CURSO_REGULAR",
  CURSO_LIVRE: "CURSO_LIVRE",
  PROJETO_ARTISTICO: "PROJETO_ARTISTICO",
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

function isMissingRelation(err: unknown): boolean {
  const e = err as PostgrestError | null;
  return !!e && typeof e.code === "string" && e.code === "42P01";
}

function normalizeNumberArray(values: unknown): number[] {
  if (!Array.isArray(values)) return [];
  return Array.from(new Set(values.map((v) => Number(v)).filter((v) => Number.isFinite(v) && v > 0)));
}

function parseServicoTipo(value: unknown): ServicoTipo | null {
  const raw = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!raw) return null;
  if (raw === "CURSO_REGULAR" || raw === "CURSO_LIVRE" || raw === "PROJETO_ARTISTICO") {
    return raw as ServicoTipo;
  }
  return null;
}

function parseProdutoTipo(value: unknown): ProdutoTipo | null {
  const raw = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!raw) return null;
  if (raw === "REGULAR" || raw === "CURSO_LIVRE" || raw === "PROJETO_ARTISTICO") {
    return raw as ProdutoTipo;
  }
  return null;
}

async function fetchServicoTipo(admin: ReturnType<typeof createClient>, servicoId: number): Promise<ServicoTipo | null> {
  const { data, error } = await admin
    .from("escola_produtos_educacionais")
    .select("tipo")
    .eq("id", servicoId)
    .maybeSingle();

  if (error) {
    if (isMissingRelation(error)) return null;
    throw error;
  }

  if (!data?.tipo) return null;
  const tipoRaw = String(data.tipo).toUpperCase();
  return parseServicoTipo(tipoRaw);
}

async function isCursoLivreId(admin: ReturnType<typeof createClient>, servicoId: number): Promise<boolean> {
  const { data, error } = await admin.from("cursos_livres").select("id").eq("id", servicoId).maybeSingle();
  if (error) {
    if (isMissingRelation(error)) return false;
    throw error;
  }
  return !!data?.id;
}

async function ensureUnidadesBelongToCursoLivre(
  admin: ReturnType<typeof createClient>,
  cursoLivreId: number,
  unidadeExecucaoIds: number[],
) {
  if (!unidadeExecucaoIds.length) return { ok: true as const, missing: [] as number[] };

  const { data, error } = await admin
    .from("escola_unidades_execucao")
    .select("unidade_execucao_id, origem_id")
    .eq("origem_tipo", "TURMA")
    .in("unidade_execucao_id", unidadeExecucaoIds);

  if (error) return { ok: false as const, error };

  const rows = (data ?? []) as Array<{ unidade_execucao_id: number; origem_id: number }>;
  const foundIds = new Set(rows.map((r) => Number(r.unidade_execucao_id)));
  const missingIds = unidadeExecucaoIds.filter((id) => !foundIds.has(id));

  const turmaIds = rows.map((r) => Number(r.origem_id)).filter((id) => Number.isFinite(id) && id > 0);
  if (turmaIds.length === 0) {
    return { ok: true as const, missing: missingIds };
  }

  const { data: turmas, error: turmasErr } = await admin
    .from("turmas")
    .select("turma_id")
    .eq("tipo_turma", "CURSO_LIVRE")
    .eq("curso_livre_id", cursoLivreId)
    .in("turma_id", turmaIds);

  if (turmasErr) return { ok: false as const, error: turmasErr };

  const turmasOk = new Set((turmas ?? []).map((t) => Number((t as { turma_id?: number }).turma_id)));
  const invalidIds = rows
    .filter((row) => !turmasOk.has(Number(row.origem_id)))
    .map((row) => Number(row.unidade_execucao_id))
    .filter((id) => Number.isFinite(id) && id > 0);

  return { ok: true as const, missing: Array.from(new Set([...missingIds, ...invalidIds])) };
}

async function resolveUnidadesFromTurmas(
  admin: ReturnType<typeof createClient>,
  servicoId: number,
  turmaIds: number[],
) {
  const { data, error } = await admin
    .from("escola_unidades_execucao")
    .select("unidade_execucao_id, origem_id")
    .eq("servico_id", servicoId)
    .eq("origem_tipo", "TURMA")
    .in("origem_id", turmaIds);

  if (error) throw error;

  const rows = (data ?? []) as Array<{ unidade_execucao_id: number; origem_id: number }>;
  const foundTurmas = new Set(rows.map((r) => Number(r.origem_id)));
  const missingTurmas = turmaIds.filter((id) => !foundTurmas.has(id));
  const unidadeExecucaoIds = normalizeNumberArray(rows.map((r) => r.unidade_execucao_id));

  return { unidadeExecucaoIds, missingTurmas };
}

async function ensureUnidadesBelongToServico(
  admin: ReturnType<typeof createClient>,
  servicoId: number,
  unidadeExecucaoIds: number[],
) {
  if (!unidadeExecucaoIds.length) return { ok: true as const, missing: [] as number[] };

  const { data, error } = await admin
    .from("escola_unidades_execucao")
    .select("unidade_execucao_id")
    .eq("servico_id", servicoId)
    .in("unidade_execucao_id", unidadeExecucaoIds);

  if (error) return { ok: false as const, error };

  const found = new Set((data ?? []).map((r: any) => Number(r.unidade_execucao_id)));
  const missing = unidadeExecucaoIds.filter((id) => !found.has(id));
  return { ok: true as const, missing };
}

async function buscarConflitosUnidades(
  admin: ReturnType<typeof createClient>,
  servicoId: number,
  unidadeExecucaoIds: number[],
  anoRef: number | null,
  ignoreTabelaId?: number,
) {
  if (anoRef === null) return [] as ConflitoTabela[];

  const { data, error } = await admin
    .from("matricula_tabelas")
    .select("id,titulo,ano_referencia,ativo")
    .eq("referencia_id", servicoId)
    .eq("ano_referencia", anoRef)
    .eq("ativo", true);

  if (error) throw error;

  const tabelas = (data ?? []) as ConflitoTabela[];
  const filtradas = tabelas.filter((t) => t.id !== ignoreTabelaId);
  if (filtradas.length === 0) return [];
  if (unidadeExecucaoIds.length === 0) return filtradas;

  const tabelaIds = filtradas.map((t) => t.id);
  const { data: pivotRows, error: pivErr } = await admin
    .from("matricula_tabelas_unidades_execucao")
    .select("tabela_id, unidade_execucao_id")
    .in("tabela_id", tabelaIds);

  if (pivErr) throw pivErr;

  const rows = (pivotRows ?? []) as Array<{ tabela_id: number; unidade_execucao_id: number }>;
  const tabelasComPivot = new Set(rows.map((r) => Number(r.tabela_id)));
  const tabelaMap = new Map(filtradas.map((t) => [t.id, t]));
  const conflitos = new Map<number, ConflitoTabela>();

  filtradas.forEach((t) => {
    if (!tabelasComPivot.has(t.id)) conflitos.set(t.id, t);
  });

  const unidadeSet = new Set(unidadeExecucaoIds);
  rows.forEach((r) => {
    if (unidadeSet.has(Number(r.unidade_execucao_id))) {
      const tabela = tabelaMap.get(Number(r.tabela_id));
      if (tabela) conflitos.set(tabela.id, tabela);
    }
  });

  return Array.from(conflitos.values());
}

async function syncUnidadesPivot(
  admin: ReturnType<typeof createClient>,
  tabelaId: number,
  unidadeExecucaoIds: number[],
) {
  const { error: delErr } = await admin.from("matricula_tabelas_unidades_execucao").delete().eq("tabela_id", tabelaId);
  if (delErr) return { ok: false as const, error: delErr };

  if (unidadeExecucaoIds.length === 0) return { ok: true as const };

  const rows = unidadeExecucaoIds.map((id) => ({ tabela_id: tabelaId, unidade_execucao_id: id }));
  const { error: insErr } = await admin.from("matricula_tabelas_unidades_execucao").insert(rows);
  if (insErr) return { ok: false as const, error: insErr };

  return { ok: true as const };
}

async function deriveLegacyAlvosFromServico(
  admin: ReturnType<typeof createClient>,
  servicoTipo: ServicoTipo,
  servicoId: number,
  unidadeExecucaoIds: number[],
) {
  if (servicoTipo === "CURSO_LIVRE") {
    return { alvoTipo: "CURSO_LIVRE" as const, alvoIds: [servicoId] };
  }
  if (servicoTipo === "PROJETO_ARTISTICO") {
    return { alvoTipo: "PROJETO" as const, alvoIds: [servicoId] };
  }

  if (unidadeExecucaoIds.length > 0) {
    const { data, error } = await admin
      .from("escola_unidades_execucao")
      .select("origem_id")
      .eq("origem_tipo", "TURMA")
      .in("unidade_execucao_id", unidadeExecucaoIds);

    if (error) throw error;
    const turmaIds = normalizeNumberArray((data ?? []).map((r: any) => r.origem_id));
    return { alvoTipo: "TURMA" as const, alvoIds: turmaIds };
  }

  const { data, error } = await admin
    .from("escola_unidades_execucao")
    .select("origem_id")
    .eq("servico_id", servicoId)
    .eq("origem_tipo", "TURMA");

  if (error) throw error;
  const turmaIds = normalizeNumberArray((data ?? []).map((r: any) => r.origem_id));
  return { alvoTipo: "TURMA" as const, alvoIds: turmaIds };
}

async function syncLegacyAlvos(admin: ReturnType<typeof createClient>, tabelaId: number, alvoTipo: AlvoTipo, alvoIds: number[]) {
  const { error: delErr } = await admin.from("matricula_tabelas_alvos").delete().eq("tabela_id", tabelaId);
  if (delErr) return { ok: false as const, error: delErr };

  if (!alvoIds.length) return { ok: true as const };

  const rows = alvoIds.map((id) => ({ tabela_id: tabelaId, alvo_tipo: alvoTipo, alvo_id: id }));
  const { error: insErr } = await admin.from("matricula_tabelas_alvos").insert(rows);
  if (insErr) return { ok: false as const, error: insErr };

  return { ok: true as const };
}

async function normalizarAlvoIds(admin: ReturnType<typeof createClient>, alvoTipo: AlvoTipo, ids: number[]) {
  if (alvoTipo !== "TURMA") return normalizeNumberArray(ids);
  const resolved: number[] = [];
  for (const id of ids) {
    const real = await resolveTurmaIdReal(admin, id);
    resolved.push(real);
  }
  return normalizeNumberArray(resolved);
}

async function resolveLegacyPayload(admin: ReturnType<typeof createClient>, alvoTipo: AlvoTipo, alvoIdsRaw: number[]) {
  if (!ALVOS_VALIDOS.includes(alvoTipo)) {
    return { ok: false as const, response: badRequest("alvo_tipo invalido.") };
  }

  const alvoIds = await normalizarAlvoIds(admin, alvoTipo, alvoIdsRaw);
  if (!alvoIds.length) {
    return { ok: false as const, response: badRequest("Selecione ao menos 1 alvo para vincular.") };
  }

  if (alvoTipo !== "TURMA") {
    if (alvoIds.length !== 1) {
      return {
        ok: false as const,
        response: badRequest("Informe apenas 1 alvo para este tipo.", { alvo_tipo: alvoTipo }),
      };
    }
    const servicoTipo = alvoTipo === "CURSO_LIVRE" ? "CURSO_LIVRE" : "PROJETO_ARTISTICO";
    return {
      ok: true as const,
      servicoId: alvoIds[0],
      servicoTipo,
      produtoTipo: SERVICO_TIPO_TO_PRODUTO_TIPO[servicoTipo],
      unidadeExecucaoIds: [],
      legacyAlvoTipo: alvoTipo,
      legacyAlvoIds: alvoIds,
    };
  }

  const { data, error } = await admin
    .from("turmas")
    .select("turma_id, produto_id")
    .in("turma_id", alvoIds);

  if (error) return { ok: false as const, response: serverError("Falha ao validar turmas.", { error }) };

  const rows = (data ?? []) as Array<{ turma_id: number; produto_id: number | null }>;
  const encontrados = new Set(rows.map((t) => Number(t.turma_id)));
  const faltantes = alvoIds.filter((id) => !encontrados.has(id));
  if (faltantes.length) {
    return {
      ok: false as const,
      response: badRequest("Uma ou mais turmas nao foram encontradas.", { alvo_ids: faltantes }),
    };
  }

  const produtoIds = new Set(rows.map((t) => Number(t.produto_id)).filter((id) => Number.isFinite(id) && id > 0));
  if (produtoIds.size !== 1) {
    return {
      ok: false as const,
      response: conflict("Alvos pertencem a produtos diferentes.", { produto_ids: Array.from(produtoIds) }),
    };
  }

  const servicoId = Array.from(produtoIds)[0];
  const { unidadeExecucaoIds, missingTurmas } = await resolveUnidadesFromTurmas(admin, servicoId, alvoIds);
  if (missingTurmas.length) {
    return {
      ok: false as const,
      response: conflict("Unidades de execucao nao encontradas para algumas turmas.", { turma_ids: missingTurmas }),
    };
  }

  return {
    ok: true as const,
    servicoId,
    servicoTipo: "CURSO_REGULAR",
    produtoTipo: "REGULAR",
    unidadeExecucaoIds,
    legacyAlvoTipo: alvoTipo,
    legacyAlvoIds: alvoIds,
  };
}

export async function GET(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
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
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  try {
    const cookieStore = await cookies();
    const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: u } = await supabaseAuth.auth.getUser();
    if (!u?.user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    let body: BodyTabela;
    try {
      body = (await req.json()) as BodyTabela;
    } catch (e: unknown) {
      return badRequest("JSON invalido.", { message: e instanceof Error ? e.message : String(e) });
    }

    const titulo = body.titulo?.trim();
    if (!titulo) return badRequest("Titulo e obrigatorio.");

    const admin = getAdmin();

    let servicoId = Number(body.servico_id ?? 0);
    let servicoTipo = parseServicoTipo(body.servico_tipo);
    let produtoTipo = parseProdutoTipo(body.produto_tipo);
    let unidadeExecucaoIds = normalizeNumberArray(body.unidade_execucao_ids);
    let legacyAlvoTipo: AlvoTipo | null = null;
    let legacyAlvoIds: number[] = [];

    if (!Number.isFinite(servicoId) || servicoId <= 0) {
      const alvoTipo = (body.alvo_tipo ?? (body.turma_ids ? "TURMA" : null)) as AlvoTipo | null;
      if (!alvoTipo) return badRequest("servico_id ou alvo_tipo obrigatorio.");

      const alvoIdsRaw = body.alvo_ids?.length ? body.alvo_ids : body.turma_ids ?? [];
      const legacy = await resolveLegacyPayload(admin, alvoTipo, alvoIdsRaw);
      if (!legacy.ok) return legacy.response;

      servicoId = legacy.servicoId;
      servicoTipo = legacy.servicoTipo;
      produtoTipo = legacy.produtoTipo;
      unidadeExecucaoIds = legacy.unidadeExecucaoIds;
      legacyAlvoTipo = legacy.legacyAlvoTipo;
      legacyAlvoIds = legacy.legacyAlvoIds;
    } else {
      const tipoDb = await fetchServicoTipo(admin, servicoId);
      if (tipoDb) {
        if (servicoTipo && servicoTipo !== tipoDb) {
          return badRequest("servico_tipo nao corresponde ao servico informado.", {
            servicoId,
            servicoTipo,
            servicoTipoDb: tipoDb,
          });
        }
        servicoTipo = tipoDb;
        produtoTipo = SERVICO_TIPO_TO_PRODUTO_TIPO[tipoDb];
      } else {
        if (servicoTipo) {
          produtoTipo = SERVICO_TIPO_TO_PRODUTO_TIPO[servicoTipo];
        } else if (produtoTipo) {
          servicoTipo = PRODUTO_TIPO_TO_SERVICO_TIPO[produtoTipo];
        }
      }

      if (!servicoTipo || !produtoTipo) {
        return badRequest("servico_tipo ou produto_tipo invalido.");
      }

      const alvoTipoRaw = (body.alvo_tipo ?? (body.turma_ids ? "TURMA" : null)) as AlvoTipo | null;
      const alvoIdsRaw = body.alvo_ids?.length ? body.alvo_ids : body.turma_ids ?? [];

      if (alvoTipoRaw === "TURMA" && alvoIdsRaw.length > 0) {
        const alvoIds = await normalizarAlvoIds(admin, "TURMA", alvoIdsRaw);
        if (alvoIds.length !== 1) {
          return badRequest("Informe exatamente 1 turma alvo para esta tabela.", { alvo_ids: alvoIds });
        }

        const alvoId = alvoIds[0];
        const { data: turma, error: turmaErr } = await admin
          .from("turmas")
          .select("turma_id, produto_id")
          .eq("turma_id", alvoId)
          .maybeSingle();

        if (turmaErr || !turma) {
          return badRequest("Turma alvo nao encontrada.", { alvo_id: alvoId });
        }

        if (Number(turma.produto_id) !== servicoId) {
          return badRequest("Servico nao corresponde a turma alvo.", {
            servico_id: servicoId,
            alvo_id: alvoId,
          });
        }

        if (unidadeExecucaoIds.length > 0) {
          const { data: unidades, error: unidadesErr } = await admin
            .from("escola_unidades_execucao")
            .select("unidade_execucao_id, origem_id")
            .eq("origem_tipo", "TURMA")
            .in("unidade_execucao_id", unidadeExecucaoIds);

          if (unidadesErr) {
            return serverError("Falha ao validar unidades de execucao da turma.", { error: unidadesErr });
          }

          const rows = (unidades ?? []) as Array<{ unidade_execucao_id: number; origem_id: number }>;
          const found = new Set(rows.map((r) => Number(r.unidade_execucao_id)));
          const missing = unidadeExecucaoIds.filter((id) => !found.has(id));
          const invalid = rows
            .filter((row) => Number(row.origem_id) !== alvoId)
            .map((row) => Number(row.unidade_execucao_id));

          const invalidIds = Array.from(new Set([...missing, ...invalid])).filter(
            (id) => Number.isFinite(id) && id > 0,
          );

          if (invalidIds.length) {
            return badRequest("Unidades de execucao nao pertencem a turma alvo.", {
              unidade_execucao_ids: invalidIds,
              alvo_id: alvoId,
            });
          }
        }
      }

      if (servicoTipo === "CURSO_LIVRE" && (await isCursoLivreId(admin, servicoId))) {
        const unidadesCheck = await ensureUnidadesBelongToCursoLivre(admin, servicoId, unidadeExecucaoIds);
        if (!unidadesCheck.ok) {
          return serverError("Falha ao validar unidades de execucao.", { error: unidadesCheck.error });
        }
        if (unidadesCheck.missing.length) {
          return badRequest("Unidades de execucao nao pertencem ao curso livre.", {
            unidade_execucao_ids: unidadesCheck.missing,
          });
        }
      } else {
        const unidadesCheck = await ensureUnidadesBelongToServico(admin, servicoId, unidadeExecucaoIds);
        if (!unidadesCheck.ok) {
          return serverError("Falha ao validar unidades de execucao.", { error: unidadesCheck.error });
        }
        if (unidadesCheck.missing.length) {
          return badRequest("Unidades de execucao nao pertencem ao servico.", {
            unidade_execucao_ids: unidadesCheck.missing,
          });
        }
      }
    }

    if (produtoTipo === "REGULAR" && (body.ano_referencia === null || !Number.isFinite(body.ano_referencia))) {
      return badRequest("ano_referencia e obrigatorio para REGULAR.");
    }

    const ativo = body.ativo ?? true;
    const anoRef = body.ano_referencia ?? null;

    if (ativo) {
      let conflitos: ConflitoTabela[] = [];
      try {
        conflitos = await buscarConflitosUnidades(admin, servicoId, unidadeExecucaoIds, anoRef, undefined);
      } catch (e: unknown) {
        return serverError("Falha ao validar conflito de tabelas.", {
          message: e instanceof Error ? e.message : String(e),
        });
      }
      if (conflitos.length > 0) {
        return conflict("Conflito: ja existe tabela ativa para o mesmo servico/ano/unidade.", { conflitos });
      }
    }

    const { data: tabela, error: tabelaErr } = await admin
      .from("matricula_tabelas")
      .insert({
        titulo,
        produto_tipo: produtoTipo,
        ano_referencia: anoRef,
        ativo,
        observacoes: body.observacoes ?? null,
        referencia_tipo: "PRODUTO",
        referencia_id: servicoId,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (tabelaErr || !tabela) return serverError("Falha ao criar tabela.", { tabelaErr });

    const tabelaId = tabela.id as number;

    const pivRes = await syncUnidadesPivot(admin, tabelaId, unidadeExecucaoIds);
    if (!pivRes.ok) return serverError("Falha ao vincular tabela a unidades de execucao.", { pivErr: pivRes.error });

    if (!legacyAlvoTipo) {
      const legacy = await deriveLegacyAlvosFromServico(admin, servicoTipo, servicoId, unidadeExecucaoIds);
      legacyAlvoTipo = legacy.alvoTipo;
      legacyAlvoIds = legacy.alvoIds;
    }

    if (legacyAlvoTipo) {
      const legRes = await syncLegacyAlvos(admin, tabelaId, legacyAlvoTipo, legacyAlvoIds);
      if (!legRes.ok) return serverError("Falha ao vincular tabela aos alvos legados.", { pivErr: legRes.error });
    }

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
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  try {
    const cookieStore = await cookies();
    const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: u } = await supabaseAuth.auth.getUser();
    if (!u?.user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    let body: BodyTabela & { id?: number };
    try {
      body = (await req.json()) as BodyTabela & { id?: number };
    } catch (e: unknown) {
      return badRequest("JSON invalido.", { message: e instanceof Error ? e.message : String(e) });
    }

    const tabelaId = Number(body.id);
    if (!Number.isFinite(tabelaId) || tabelaId <= 0) return badRequest("id invalido.");

    const titulo = body.titulo?.trim();
    if (!titulo) return badRequest("Titulo e obrigatorio.");

    const admin = getAdmin();

    let servicoId = Number(body.servico_id ?? 0);
    let servicoTipo = parseServicoTipo(body.servico_tipo);
    let produtoTipo = parseProdutoTipo(body.produto_tipo);
    let unidadeExecucaoIds = normalizeNumberArray(body.unidade_execucao_ids);
    let legacyAlvoTipo: AlvoTipo | null = null;
    let legacyAlvoIds: number[] = [];

    if (!Number.isFinite(servicoId) || servicoId <= 0) {
      const alvoTipo = (body.alvo_tipo ?? (body.turma_ids ? "TURMA" : null)) as AlvoTipo | null;
      if (!alvoTipo) return badRequest("servico_id ou alvo_tipo obrigatorio.");

      const alvoIdsRaw = body.alvo_ids?.length ? body.alvo_ids : body.turma_ids ?? [];
      const legacy = await resolveLegacyPayload(admin, alvoTipo, alvoIdsRaw);
      if (!legacy.ok) return legacy.response;

      servicoId = legacy.servicoId;
      servicoTipo = legacy.servicoTipo;
      produtoTipo = legacy.produtoTipo;
      unidadeExecucaoIds = legacy.unidadeExecucaoIds;
      legacyAlvoTipo = legacy.legacyAlvoTipo;
      legacyAlvoIds = legacy.legacyAlvoIds;
    } else {
      const tipoDb = await fetchServicoTipo(admin, servicoId);
      if (tipoDb) {
        if (servicoTipo && servicoTipo !== tipoDb) {
          return badRequest("servico_tipo nao corresponde ao servico informado.", {
            servicoId,
            servicoTipo,
            servicoTipoDb: tipoDb,
          });
        }
        servicoTipo = tipoDb;
        produtoTipo = SERVICO_TIPO_TO_PRODUTO_TIPO[tipoDb];
      } else {
        if (servicoTipo) {
          produtoTipo = SERVICO_TIPO_TO_PRODUTO_TIPO[servicoTipo];
        } else if (produtoTipo) {
          servicoTipo = PRODUTO_TIPO_TO_SERVICO_TIPO[produtoTipo];
        }
      }

      if (!servicoTipo || !produtoTipo) {
        return badRequest("servico_tipo ou produto_tipo invalido.");
      }

      if (servicoTipo === "CURSO_LIVRE" && (await isCursoLivreId(admin, servicoId))) {
        const unidadesCheck = await ensureUnidadesBelongToCursoLivre(admin, servicoId, unidadeExecucaoIds);
        if (!unidadesCheck.ok) {
          return serverError("Falha ao validar unidades de execucao.", { error: unidadesCheck.error });
        }
        if (unidadesCheck.missing.length) {
          return badRequest("Unidades de execucao nao pertencem ao curso livre.", {
            unidade_execucao_ids: unidadesCheck.missing,
          });
        }
      } else {
        const unidadesCheck = await ensureUnidadesBelongToServico(admin, servicoId, unidadeExecucaoIds);
        if (!unidadesCheck.ok) {
          return serverError("Falha ao validar unidades de execucao.", { error: unidadesCheck.error });
        }
        if (unidadesCheck.missing.length) {
          return badRequest("Unidades de execucao nao pertencem ao servico.", {
            unidade_execucao_ids: unidadesCheck.missing,
          });
        }
      }
    }

    if (produtoTipo === "REGULAR" && (body.ano_referencia === null || !Number.isFinite(body.ano_referencia))) {
      return badRequest("ano_referencia e obrigatorio para REGULAR.");
    }

    const ativo = body.ativo ?? true;
    const anoRef = body.ano_referencia ?? null;

    if (ativo) {
      let conflitos: ConflitoTabela[] = [];
      try {
        conflitos = await buscarConflitosUnidades(admin, servicoId, unidadeExecucaoIds, anoRef, tabelaId);
      } catch (e: unknown) {
        return serverError("Falha ao validar conflito de tabelas.", {
          message: e instanceof Error ? e.message : String(e),
        });
      }
      if (conflitos.length > 0) {
        return conflict("Conflito: ja existe tabela ativa para o mesmo servico/ano/unidade.", { conflitos });
      }
    }

    const { error: updErr } = await admin
      .from("matricula_tabelas")
      .update({
        titulo,
        produto_tipo: produtoTipo,
        ano_referencia: anoRef,
        ativo,
        referencia_tipo: "PRODUTO",
        referencia_id: servicoId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tabelaId);

    if (updErr) return serverError("Falha ao atualizar tabela.", { updErr });

    const pivRes = await syncUnidadesPivot(admin, tabelaId, unidadeExecucaoIds);
    if (!pivRes.ok) return serverError("Falha ao vincular tabela a unidades de execucao.", { pivErr: pivRes.error });

    if (!legacyAlvoTipo) {
      const legacy = await deriveLegacyAlvosFromServico(admin, servicoTipo, servicoId, unidadeExecucaoIds);
      legacyAlvoTipo = legacy.alvoTipo;
      legacyAlvoIds = legacy.alvoIds;
    }

    if (legacyAlvoTipo) {
      const legRes = await syncLegacyAlvos(admin, tabelaId, legacyAlvoTipo, legacyAlvoIds);
      if (!legRes.ok) return serverError("Falha ao vincular tabela aos alvos legados.", { pivErr: legRes.error });
    }

    return NextResponse.json({ ok: true, data: { id: tabelaId } }, { status: 200 });
  } catch (e: unknown) {
    return serverError("Erro inesperado ao atualizar tabela.", { message: e instanceof Error ? e.message : String(e) });
  }
}
