import { NextResponse, type NextRequest } from "next/server";
import { Pool, type PoolClient } from "pg";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { requireUser } from "@/lib/supabase/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import { inserirMatriculaEventoPg } from "@/lib/matriculas/eventos";
import {
  buildReativacaoPlano,
  type MatriculaCanceladaResumo,
  type ReativacaoConfigItem,
  type ReativacaoTrocaTurma,
} from "@/lib/matriculas/reativacao";
import { buscarMatriculasCanceladasPorPessoa } from "@/lib/matriculas/reativacaoData";

export const runtime = "nodejs";

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: process.env.SUPABASE_DB_URL?.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});

type RouteBody = {
  matricula_id: number;
  pessoa_id?: number | null;
  responsavel_financeiro_id?: number | null;
  tipo_matricula?: "REGULAR" | "CURSO_LIVRE" | "PROJETO_ARTISTICO" | null;
  ano_referencia?: number | null;
  data_matricula?: string | null;
  data_inicio_vinculo?: string | null;
  observacoes?: string | null;
  motivo_reativacao?: string | null;
  total_mensalidade_centavos?: number | null;
  configuracao_desejada?: ReativacaoConfigItem[] | null;
  modulos_manter?: number[] | null;
  modulos_remover?: number[] | null;
  modulos_adicionar?: Array<{ modulo_id: number; turma_id: number | null }> | null;
  trocas_turma?: ReativacaoTrocaTurma[] | null;
};

type MatriculaLockedRow = {
  id: number;
  pessoa_id: number;
  responsavel_financeiro_id: number | null;
  tipo_matricula: string | null;
  vinculo_id: number | null;
  status: string | null;
  ano_referencia: number | null;
  data_matricula: string | null;
  data_inicio_vinculo: string | null;
  observacoes: string | null;
  data_encerramento: string | null;
  encerramento_em: string | null;
  encerramento_motivo: string | null;
  cancelamento_tipo: string | null;
};

type ItemRow = {
  id: number;
  matricula_id: number;
  modulo_id: number | null;
  turma_id_inicial: number | null;
  descricao: string | null;
  status: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  cancelamento_tipo: string | null;
  observacoes: string | null;
  valor_base_centavos: number | null;
  valor_liquido_centavos: number | null;
};

type TurmaRow = {
  turma_id: number;
  produto_id: number | null;
  nome: string | null;
};

function parsePositiveInt(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseDateYmdOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

function parseNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseNullableInteger(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  return parsePositiveInt(value);
}

function normalizeIntArray(value: unknown): number[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;
  const out: number[] = [];
  const seen = new Set<number>();
  for (const raw of value) {
    const id = parsePositiveInt(raw);
    if (!id) return null;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function normalizeModulosAdicionar(
  value: unknown,
): Array<{ modulo_id: number; turma_id: number | null }> | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;
  const out: Array<{ modulo_id: number; turma_id: number | null }> = [];
  const seen = new Set<string>();
  for (const raw of value) {
    if (!raw || typeof raw !== "object") return null;
    const record = raw as Record<string, unknown>;
    const moduloId = parsePositiveInt(record.modulo_id);
    const turmaId = parseNullableInteger(record.turma_id);
    if (!moduloId) return null;
    const key = `${moduloId}:${turmaId ?? "null"}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ modulo_id: moduloId, turma_id: turmaId });
  }
  return out;
}

function normalizeTrocasTurma(value: unknown): ReativacaoTrocaTurma[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;
  const out: ReativacaoTrocaTurma[] = [];
  const seen = new Set<string>();
  for (const raw of value) {
    if (!raw || typeof raw !== "object") return null;
    const record = raw as Record<string, unknown>;
    const moduloId = parsePositiveInt(record.modulo_id);
    const turmaOrigemId = parseNullableInteger(record.turma_origem_id);
    const turmaDestinoId = parsePositiveInt(record.turma_destino_id);
    if (!moduloId || !turmaDestinoId) return null;
    const key = `${moduloId}:${turmaOrigemId ?? "null"}:${turmaDestinoId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      modulo_id: moduloId,
      turma_origem_id: turmaOrigemId,
      turma_destino_id: turmaDestinoId,
    });
  }
  return out;
}

function normalizeConfiguracaoDesejada(value: unknown): ReativacaoConfigItem[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const out: ReativacaoConfigItem[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") return null;
    const record = raw as Record<string, unknown>;
    const moduloId = parsePositiveInt(record.modulo_id);
    const turmaId = parseNullableInteger(record.turma_id);
    const nivel = parseNullableString(record.nivel);
    const valorMensalCentavos =
      record.valor_mensal_centavos === undefined || record.valor_mensal_centavos === null
        ? null
        : Number(record.valor_mensal_centavos);

    if (!moduloId || !nivel) return null;
    if (record.valor_mensal_centavos !== undefined && record.valor_mensal_centavos !== null) {
      if (!Number.isInteger(valorMensalCentavos) || (valorMensalCentavos as number) < 0) {
        return null;
      }
    }

    let bolsa: ReativacaoConfigItem["bolsa"] = null;
    if (record.bolsa !== undefined && record.bolsa !== null) {
      if (!record.bolsa || typeof record.bolsa !== "object") return null;
      const bolsaRecord = record.bolsa as Record<string, unknown>;
      const projetoSocialId = parsePositiveInt(bolsaRecord.projeto_social_id);
      const bolsaTipoId = parsePositiveInt(bolsaRecord.bolsa_tipo_id);
      if (!projetoSocialId || !bolsaTipoId) return null;
      bolsa = {
        projeto_social_id: projetoSocialId,
        bolsa_tipo_id: bolsaTipoId,
      };
    }

    const liquidacaoTipo = parseNullableString(record.liquidacao_tipo);
    out.push({
      modulo_id: moduloId,
      turma_id: turmaId,
      nivel,
      nivel_id: parseNullableInteger(record.nivel_id),
      liquidacao_tipo: liquidacaoTipo === "BOLSA" ? "BOLSA" : "FAMILIA",
      valor_mensal_centavos: valorMensalCentavos ?? null,
      bolsa,
    });
  }
  return out;
}

function buildDescricaoMatriculaItem(params: {
  turmaNome?: string | null;
  turmaId?: number | null;
  moduloId?: number | null;
  prefixo?: string;
}) {
  const turmaNome = typeof params.turmaNome === "string" ? params.turmaNome.trim() : "";
  if (turmaNome) return turmaNome;
  if (params.moduloId) return `${params.prefixo ?? "Modulo"} #${params.moduloId}`;
  if (params.turmaId) return `Turma #${params.turmaId}`;
  return params.prefixo ?? "Item da matricula";
}

function sortIntArray(values: number[]) {
  return [...values].sort((a, b) => a - b);
}

function sortModulosAdicionar(values: Array<{ modulo_id: number; turma_id: number | null }>) {
  return [...values].sort((a, b) => {
    if (a.modulo_id !== b.modulo_id) return a.modulo_id - b.modulo_id;
    return (a.turma_id ?? 0) - (b.turma_id ?? 0);
  });
}

function sortTrocasTurma(values: ReativacaoTrocaTurma[]) {
  return [...values].sort((a, b) => {
    if (a.modulo_id !== b.modulo_id) return a.modulo_id - b.modulo_id;
    if ((a.turma_origem_id ?? 0) !== (b.turma_origem_id ?? 0)) {
      return (a.turma_origem_id ?? 0) - (b.turma_origem_id ?? 0);
    }
    return a.turma_destino_id - b.turma_destino_id;
  });
}

async function q1<T extends Record<string, unknown>>(
  client: PoolClient,
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  const { rows } = await client.query(sql, params);
  if (rows.length === 0) return null;
  return rows[0] as T;
}

async function resolveValorItemPorTurma(params: {
  alunoId: number;
  turmaId: number | null;
  anoReferencia: number | null;
  fallback: number;
  request: NextRequest;
}): Promise<number> {
  const turmaId = parsePositiveInt(params.turmaId);
  if (!turmaId || !params.anoReferencia) {
    return Math.max(0, Math.trunc(params.fallback));
  }

  const resolveUrl = new URL("/api/matriculas/precos/resolver", params.request.url);
  resolveUrl.searchParams.set("aluno_id", String(params.alunoId));
  resolveUrl.searchParams.set("alvo_tipo", "TURMA");
  resolveUrl.searchParams.set("alvo_id", String(turmaId));
  resolveUrl.searchParams.set("ano", String(params.anoReferencia));

  const response = await fetch(resolveUrl.toString(), {
    headers: { cookie: params.request.headers.get("cookie") ?? "" },
  });
  const payload = (await response.json().catch(() => null)) as
    | {
        ok?: boolean;
        message?: string;
        data?: {
          valor_final_centavos?: number | null;
          item_aplicado?: { valor_centavos?: number | null } | null;
        } | null;
      }
    | null;

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.message ?? `falha_resolver_preco_turma_${turmaId}`);
  }

  const valorDireto = Number(payload.data?.valor_final_centavos ?? NaN);
  if (Number.isFinite(valorDireto)) return Math.max(0, Math.trunc(valorDireto));

  const valorAplicado = Number(payload.data?.item_aplicado?.valor_centavos ?? NaN);
  if (Number.isFinite(valorAplicado)) return Math.max(0, Math.trunc(valorAplicado));

  return Math.max(0, Math.trunc(params.fallback));
}

async function hasModeloLiquidacaoColumn(client: PoolClient): Promise<boolean> {
  const row = await q1<{ exists_column: boolean }>(
    client,
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'matricula_execucao_valores'
          AND column_name = 'modelo_liquidacao'
      ) AS exists_column
    `,
  );
  return Boolean(row?.exists_column);
}

function jsonBadRequest(message: string, details?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: "bad_request", message, details: details ?? null }, { status: 400 });
}

function jsonConflict(message: string, details?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: "conflict", message, details: details ?? null }, { status: 409 });
}

function findResumoMatricula(
  resumo: MatriculaCanceladaResumo[],
  matriculaId: number,
): MatriculaCanceladaResumo | null {
  return resumo.find((item) => item.id === matriculaId) ?? null;
}

export async function GET(request: NextRequest) {
  const denied = await guardApiByRole(request as any);
  if (denied) return denied as any;

  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const pessoaId = parsePositiveInt(request.nextUrl.searchParams.get("pessoa_id"));
  if (!pessoaId) {
    return jsonBadRequest("pessoa_id invalido.");
  }

  try {
    const admin = getSupabaseAdmin();
    const contexto = await buscarMatriculasCanceladasPorPessoa(
      admin as unknown as { from: (table: string) => any },
      pessoaId,
    );
    return NextResponse.json({ ok: true, ...contexto }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "erro_interno";
    return NextResponse.json(
      { ok: false, error: "falha_consultar_matriculas_canceladas", message },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const denied = await guardApiByRole(request as any);
  if (denied) return denied as any;

  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  let body: RouteBody;
  try {
    body = (await request.json()) as RouteBody;
  } catch {
    return jsonBadRequest("JSON invalido.");
  }

  const matriculaId = parsePositiveInt(body.matricula_id);
  if (!matriculaId) {
    return jsonBadRequest("matricula_id invalido.");
  }

  const configuracaoDesejada = normalizeConfiguracaoDesejada(body.configuracao_desejada);
  if (!configuracaoDesejada || configuracaoDesejada.length === 0) {
    return jsonBadRequest("configuracao_desejada obrigatoria.");
  }

  const modulosManterPayload = normalizeIntArray(body.modulos_manter);
  const modulosRemoverPayload = normalizeIntArray(body.modulos_remover);
  const modulosAdicionarPayload = normalizeModulosAdicionar(body.modulos_adicionar);
  const trocasTurmaPayload = normalizeTrocasTurma(body.trocas_turma);

  if (!modulosManterPayload || !modulosRemoverPayload || !modulosAdicionarPayload || !trocasTurmaPayload) {
    return jsonBadRequest("Plano estrutural invalido.");
  }

  if (!process.env.SUPABASE_DB_URL) {
    return NextResponse.json(
      { ok: false, error: "env_invalida", message: "SUPABASE_DB_URL nao configurada." },
      { status: 500 },
    );
  }

  const admin = getSupabaseAdmin();
  const userId = auth.userId;
  const hoje = new Date().toISOString().slice(0, 10);
  const dataMatricula = parseDateYmdOrNull(body.data_matricula) ?? hoje;
  const dataInicioVinculo = parseDateYmdOrNull(body.data_inicio_vinculo) ?? dataMatricula;
  const motivoReativacao = parseNullableString(body.motivo_reativacao);
  const observacoes = parseNullableString(body.observacoes);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const matricula = await q1<MatriculaLockedRow>(
      client,
      `
        SELECT
          id,
          pessoa_id,
          responsavel_financeiro_id,
          tipo_matricula::text as tipo_matricula,
          vinculo_id,
          status::text as status,
          ano_referencia,
          data_matricula::text as data_matricula,
          data_inicio_vinculo::text as data_inicio_vinculo,
          observacoes,
          data_encerramento::text as data_encerramento,
          encerramento_em::text as encerramento_em,
          encerramento_motivo,
          cancelamento_tipo
        FROM public.matriculas
        WHERE id = $1
        FOR UPDATE
      `,
      [matriculaId],
    );

    if (!matricula) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: false, error: "matricula_nao_encontrada" }, { status: 404 });
    }

    if (String(matricula.status ?? "").toUpperCase() !== "CANCELADA") {
      await client.query("ROLLBACK");
      return jsonConflict("Somente matriculas canceladas podem ser reativadas.", {
        status_atual: matricula.status ?? null,
      });
    }

    if (body.pessoa_id && Number(body.pessoa_id) !== Number(matricula.pessoa_id)) {
      await client.query("ROLLBACK");
      return jsonConflict("Pessoa informada nao corresponde a matricula cancelada.");
    }

    const outraMatriculaAtiva = await q1<{ id: number }>(
      client,
      `
        SELECT id
        FROM public.matriculas
        WHERE pessoa_id = $1
          AND id <> $2
          AND status = 'ATIVA'
        LIMIT 1
      `,
      [matricula.pessoa_id, matriculaId],
    );

    if (outraMatriculaAtiva?.id) {
      await client.query("ROLLBACK");
      return jsonConflict("A pessoa ja possui outra matricula ativa. A reativacao foi bloqueada.", {
        matricula_ativa_id: outraMatriculaAtiva.id,
      });
    }

    const contexto = await buscarMatriculasCanceladasPorPessoa(
      admin as unknown as { from: (table: string) => any },
      matricula.pessoa_id,
    );
    const resumoCancelado = findResumoMatricula(contexto.matriculas_canceladas_encontradas, matriculaId);

    if (!resumoCancelado) {
      await client.query("ROLLBACK");
      return jsonConflict("Nao foi possivel reconstruir o historico da matricula cancelada.", {
        matricula_id: matriculaId,
      });
    }

    const plano = buildReativacaoPlano({
      anteriores: resumoCancelado.itens,
      desejados: configuracaoDesejada.map((item) => ({
        modulo_id: item.modulo_id,
        turma_id: item.turma_id,
      })),
    });

    if (plano.conflitos.length > 0) {
      await client.query("ROLLBACK");
      return jsonConflict("A configuracao desejada possui conflitos estruturais.", {
        conflitos: plano.conflitos,
      });
    }

    if (
      JSON.stringify(sortIntArray(modulosManterPayload)) !== JSON.stringify(sortIntArray(plano.modulos_manter)) ||
      JSON.stringify(sortIntArray(modulosRemoverPayload)) !== JSON.stringify(sortIntArray(plano.modulos_remover)) ||
      JSON.stringify(sortModulosAdicionar(modulosAdicionarPayload)) !==
        JSON.stringify(sortModulosAdicionar(plano.modulos_adicionar)) ||
      JSON.stringify(sortTrocasTurma(trocasTurmaPayload)) !== JSON.stringify(sortTrocasTurma(plano.trocas_turma))
    ) {
      await client.query("ROLLBACK");
      return jsonConflict("O plano de reativacao ficou desatualizado. Revise a configuracao antes de confirmar.", {
        plano_atual: plano,
      });
    }

    const itemIds = resumoCancelado.itens
      .map((item) => parsePositiveInt(item.item_id))
      .filter((value): value is number => Boolean(value));

    let itensHistoricos = new Map<number, ItemRow>();
    if (itemIds.length > 0) {
      const { rows } = await client.query<ItemRow>(
        `
          SELECT
            id,
            matricula_id,
            modulo_id,
            turma_id_inicial,
            descricao,
            status::text as status,
            data_inicio::text as data_inicio,
            data_fim::text as data_fim,
            cancelamento_tipo,
            observacoes,
            valor_base_centavos,
            valor_liquido_centavos
          FROM public.matricula_itens
          WHERE id = ANY($1::bigint[])
          FOR UPDATE
        `,
        [itemIds],
      );
      itensHistoricos = new Map(rows.map((row) => [Number(row.id), row]));
    }

    const turmaIdsDesejadas = Array.from(
      new Set(
        configuracaoDesejada
          .map((item) => parsePositiveInt(item.turma_id))
          .filter((value): value is number => Boolean(value)),
      ),
    );

    const turmasById = new Map<number, TurmaRow>();
    if (turmaIdsDesejadas.length > 0) {
      const { rows } = await client.query<TurmaRow>(
        `
          SELECT turma_id, produto_id, nome
          FROM public.turmas
          WHERE turma_id = ANY($1::bigint[])
        `,
        [turmaIdsDesejadas],
      );
      for (const row of rows) {
        turmasById.set(Number(row.turma_id), row);
      }
    }

    const draftsByModulo = new Map<
      number,
      {
        modulo_id: number;
        turma_id: number | null;
        descricao: string;
        valor_base_centavos: number;
        valor_liquido_centavos: number;
        nivel: string;
        origem_valor: string;
        liquidacao_tipo: "FAMILIA" | "BOLSA";
      }
    >();

    for (const item of configuracaoDesejada) {
      const turmaId = parsePositiveInt(item.turma_id);
      const turma = turmaId ? turmasById.get(turmaId) ?? null : null;
      const valor = Number.isInteger(item.valor_mensal_centavos)
        ? Math.max(0, Math.trunc(Number(item.valor_mensal_centavos)))
        : await resolveValorItemPorTurma({
            alunoId: matricula.pessoa_id,
            turmaId,
            anoReferencia:
              parsePositiveInt(body.ano_referencia) ??
              parsePositiveInt(matricula.ano_referencia),
            fallback: 0,
            request,
          });
      const liquidacaoTipo = item.liquidacao_tipo === "BOLSA" ? "BOLSA" : "FAMILIA";
      draftsByModulo.set(item.modulo_id, {
        modulo_id: item.modulo_id,
        turma_id: turmaId,
        descricao: buildDescricaoMatriculaItem({
          turmaNome: turma?.nome ?? null,
          turmaId,
          moduloId: item.modulo_id,
          prefixo: item.nivel?.trim() ? `Modulo ${item.nivel.trim()}` : "Modulo",
        }),
        valor_base_centavos: valor,
        valor_liquido_centavos: valor,
        nivel: item.nivel,
        origem_valor:
          liquidacaoTipo === "BOLSA"
            ? `MANUAL|BOLSA|${item.bolsa?.projeto_social_id ?? "SEM_PROJETO"}`
            : Number.isInteger(item.valor_mensal_centavos)
              ? "MANUAL|FAMILIA"
              : "TABELA|FAMILIA",
        liquidacao_tipo: liquidacaoTipo,
      });
    }

    const resumoByModulo = new Map<number, (typeof resumoCancelado.itens)[number]>();
    for (const item of resumoCancelado.itens) {
      const moduloId = parsePositiveInt(item.modulo_id_resolvido ?? item.modulo_id);
      if (!moduloId || resumoByModulo.has(moduloId)) continue;
      resumoByModulo.set(moduloId, item);
    }

    const principalTurmaId =
      configuracaoDesejada.find((item) => parsePositiveInt(item.turma_id))?.turma_id ??
      parsePositiveInt(matricula.vinculo_id);

    const totalMensalidadeCentavos =
      Number.isInteger(body.total_mensalidade_centavos) && Number(body.total_mensalidade_centavos) >= 0
        ? Math.max(0, Math.trunc(Number(body.total_mensalidade_centavos)))
        : Array.from(draftsByModulo.values()).reduce((acc, item) => acc + item.valor_liquido_centavos, 0);

    await client.query(
      `
        UPDATE public.turma_aluno
        SET
          dt_fim = $2::date,
          status = CASE
            WHEN COALESCE(upper(status), '') IN ('ATIVO', 'ATIVA', '') THEN 'encerrado'
            ELSE status
          END
        WHERE matricula_id = $1
          AND dt_fim IS NULL
      `,
      [matriculaId, dataInicioVinculo],
    );

    const modulosEncerrados: Array<{ modulo_id: number; item_id: number | null }> = [];
    const modulosAtivosFinais: Array<{ modulo_id: number; item_id: number; turma_id: number | null }> = [];
    const trocasTurmaExecutadas: ReativacaoTrocaTurma[] = [];

    for (const moduloId of plano.modulos_remover) {
      const resumoItem = resumoByModulo.get(moduloId) ?? null;
      const itemId = parsePositiveInt(resumoItem?.item_id);
      if (!itemId) continue;

      const historico = itensHistoricos.get(itemId) ?? null;
      const dataFimHistorica =
        historico?.data_fim ??
        matricula.data_encerramento ??
        (matricula.encerramento_em ? matricula.encerramento_em.slice(0, 10) : null) ??
        dataInicioVinculo;

      await client.query(
        `
          UPDATE public.matricula_itens
          SET
            status = 'CANCELADO',
            data_fim = $2::date,
            cancelamento_tipo = COALESCE(cancelamento_tipo, $3),
            cancelado_em = COALESCE(cancelado_em, $4::timestamptz),
            updated_at = now()
          WHERE id = $1
        `,
        [
          itemId,
          dataFimHistorica,
          historico?.cancelamento_tipo ?? resumoItem?.cancelamento_tipo ?? "RETORNO_NAO_CONFIRMADO",
          matricula.encerramento_em ?? new Date().toISOString(),
        ],
      );

      await inserirMatriculaEventoPg(client, {
        matricula_id: matriculaId,
        tipo_evento: "MODULO_REMOVIDO",
        modulo_id: moduloId,
        observacao: "Modulo nao retornou na reativacao.",
        created_by: userId,
      });

      modulosEncerrados.push({ modulo_id: moduloId, item_id: itemId });
    }

    for (const moduloId of plano.modulos_manter) {
      const draft = draftsByModulo.get(moduloId);
      if (!draft) continue;

      const resumoItem = resumoByModulo.get(moduloId) ?? null;
      const itemIdExistente = parsePositiveInt(resumoItem?.item_id);

      if (!itemIdExistente) {
        const created = await q1<{ id: number }>(
          client,
          `
            INSERT INTO public.matricula_itens (
              matricula_id,
              curso_id,
              modulo_id,
              turma_id_inicial,
              descricao,
              origem_tipo,
              valor_base_centavos,
              valor_liquido_centavos,
              status,
              data_inicio,
              observacoes
            )
            VALUES ($1, null, $2, $3, $4, 'CURSO', $5, $6, 'ATIVO', $7::date, $8)
            RETURNING id
          `,
          [
            matriculaId,
            draft.modulo_id,
            draft.turma_id,
            draft.descricao,
            draft.valor_base_centavos,
            draft.valor_liquido_centavos,
            dataInicioVinculo,
            observacoes,
          ],
        );

        if (!created?.id) {
          throw new Error(`falha_criar_item_matricula_${moduloId}`);
        }

        if (draft.turma_id) {
          await client.query(
            `
              INSERT INTO public.turma_aluno (
                turma_id,
                aluno_pessoa_id,
                matricula_id,
                matricula_item_id,
                dt_inicio,
                status
              )
              VALUES ($1, $2, $3, $4, $5::date, 'ativo')
            `,
            [draft.turma_id, matricula.pessoa_id, matriculaId, created.id, dataInicioVinculo],
          );
        }

        await inserirMatriculaEventoPg(client, {
          matricula_id: matriculaId,
          tipo_evento: "MODULO_ADICIONADO",
          modulo_id: moduloId,
          turma_destino_id: draft.turma_id,
          observacao: "Modulo recriado na reativacao por ausencia de item historico reaproveitavel.",
          created_by: userId,
        });

        modulosAtivosFinais.push({ modulo_id: moduloId, item_id: created.id, turma_id: draft.turma_id });
        continue;
      }

      await client.query(
        `
          UPDATE public.matricula_itens
          SET
            status = 'ATIVO',
            descricao = $2,
            valor_base_centavos = $3,
            valor_liquido_centavos = $4,
            data_inicio = $5::date,
            data_fim = null,
            cancelamento_tipo = null,
            observacoes = $6,
            reativado_em = now(),
            reativado_por_user_id = $7,
            updated_at = now()
          WHERE id = $1
        `,
        [
          itemIdExistente,
          draft.descricao,
          draft.valor_base_centavos,
          draft.valor_liquido_centavos,
          dataInicioVinculo,
          observacoes,
          userId,
        ],
      );

      if (draft.turma_id) {
        await client.query(
          `
            INSERT INTO public.turma_aluno (
              turma_id,
              aluno_pessoa_id,
              matricula_id,
              matricula_item_id,
              dt_inicio,
              status
            )
            VALUES ($1, $2, $3, $4, $5::date, 'ativo')
          `,
          [draft.turma_id, matricula.pessoa_id, matriculaId, itemIdExistente, dataInicioVinculo],
        );
      }

      const troca = plano.trocas_turma.find((item) => item.modulo_id === moduloId) ?? null;
      if (troca) {
        await inserirMatriculaEventoPg(client, {
          matricula_id: matriculaId,
          tipo_evento: "TURMA_TROCADA",
          modulo_id: moduloId,
          turma_origem_id: troca.turma_origem_id,
          turma_destino_id: troca.turma_destino_id,
          observacao: "Troca de turma executada na reativacao.",
          created_by: userId,
        });
        trocasTurmaExecutadas.push(troca);
      }

      modulosAtivosFinais.push({
        modulo_id: moduloId,
        item_id: itemIdExistente,
        turma_id: draft.turma_id,
      });
    }

    for (const item of plano.modulos_adicionar) {
      const draft = draftsByModulo.get(item.modulo_id);
      if (!draft) continue;

      const created = await q1<{ id: number }>(
        client,
        `
          INSERT INTO public.matricula_itens (
            matricula_id,
            curso_id,
            modulo_id,
            turma_id_inicial,
            descricao,
            origem_tipo,
            valor_base_centavos,
            valor_liquido_centavos,
            status,
            data_inicio,
            observacoes
          )
          VALUES ($1, null, $2, $3, $4, 'CURSO', $5, $6, 'ATIVO', $7::date, $8)
          RETURNING id
        `,
        [
          matriculaId,
          draft.modulo_id,
          draft.turma_id,
          draft.descricao,
          draft.valor_base_centavos,
          draft.valor_liquido_centavos,
          dataInicioVinculo,
          observacoes,
        ],
      );

      if (!created?.id) {
        throw new Error(`falha_criar_modulo_adicional_${item.modulo_id}`);
      }

      if (draft.turma_id) {
        await client.query(
          `
            INSERT INTO public.turma_aluno (
              turma_id,
              aluno_pessoa_id,
              matricula_id,
              matricula_item_id,
              dt_inicio,
              status
            )
            VALUES ($1, $2, $3, $4, $5::date, 'ativo')
          `,
          [draft.turma_id, matricula.pessoa_id, matriculaId, created.id, dataInicioVinculo],
        );
      }

      await inserirMatriculaEventoPg(client, {
        matricula_id: matriculaId,
        tipo_evento: "MODULO_ADICIONADO",
        modulo_id: item.modulo_id,
        turma_destino_id: draft.turma_id,
        observacao: "Modulo novo adicionado no retorno.",
        created_by: userId,
      });

      modulosAtivosFinais.push({
        modulo_id: item.modulo_id,
        item_id: created.id,
        turma_id: draft.turma_id,
      });
    }

    const modeloLiquidacaoColumn = await hasModeloLiquidacaoColumn(client);

    await client.query(
      `
        UPDATE public.matricula_execucao_valores
        SET ativo = false, updated_at = now()
        WHERE matricula_id = $1
          AND ativo = true
      `,
      [matriculaId],
    );

    for (const item of configuracaoDesejada) {
      const draft = draftsByModulo.get(item.modulo_id);
      if (!draft?.turma_id) continue;

      if (modeloLiquidacaoColumn) {
        await client.query(
          `
            INSERT INTO public.matricula_execucao_valores (
              matricula_id,
              turma_id,
              nivel,
              valor_mensal_centavos,
              origem_valor,
              ativo,
              modelo_liquidacao
            )
            VALUES ($1, $2, $3, $4, $5, true, $6)
          `,
          [
            matriculaId,
            draft.turma_id,
            draft.nivel,
            draft.valor_liquido_centavos,
            draft.origem_valor,
            draft.liquidacao_tipo,
          ],
        );
      } else {
        await client.query(
          `
            INSERT INTO public.matricula_execucao_valores (
              matricula_id,
              turma_id,
              nivel,
              valor_mensal_centavos,
              origem_valor,
              ativo
            )
            VALUES ($1, $2, $3, $4, $5, true)
          `,
          [
            matriculaId,
            draft.turma_id,
            draft.nivel,
            draft.valor_liquido_centavos,
            draft.origem_valor,
          ],
        );
      }
    }

    const vinculoFinal = parsePositiveInt(principalTurmaId) ?? parsePositiveInt(matricula.vinculo_id);
    if (!vinculoFinal) {
      throw new Error("reativacao_sem_turma_principal");
    }

    const tipoMatriculaFinal =
      body.tipo_matricula && ["REGULAR", "CURSO_LIVRE", "PROJETO_ARTISTICO"].includes(body.tipo_matricula)
        ? body.tipo_matricula
        : parseNullableString(matricula.tipo_matricula) ?? "REGULAR";

    await client.query(
      `
        UPDATE public.matriculas
        SET
          status = 'ATIVA',
          responsavel_financeiro_id = $2,
          tipo_matricula = $3::public.tipo_matricula_enum,
          vinculo_id = $4,
          ano_referencia = $5,
          data_matricula = $6::date,
          data_inicio_vinculo = $7::date,
          observacoes = $8,
          total_mensalidade_centavos = $9,
          reativada_em = now(),
          reativada_por_user_id = $10,
          motivo_reativacao = $11,
          data_encerramento = null,
          encerramento_tipo = null,
          cancelamento_tipo = null,
          gera_perda_financeira = null,
          encerramento_motivo = null,
          encerramento_em = null,
          encerramento_por_user_id = null,
          updated_at = now(),
          updated_by = $10
        WHERE id = $1
      `,
      [
        matriculaId,
        parsePositiveInt(body.responsavel_financeiro_id) ??
          parsePositiveInt(matricula.responsavel_financeiro_id) ??
          null,
        tipoMatriculaFinal,
        vinculoFinal,
        parsePositiveInt(body.ano_referencia) ?? parsePositiveInt(matricula.ano_referencia),
        dataMatricula,
        dataInicioVinculo,
        observacoes ?? matricula.observacoes ?? null,
        totalMensalidadeCentavos,
        userId,
        motivoReativacao,
      ],
    );

    await inserirMatriculaEventoPg(client, {
      matricula_id: matriculaId,
      tipo_evento: "REATIVADA",
      observacao: motivoReativacao ?? "Reativacao administrativa com reconfiguracao estrutural.",
      created_by: userId,
      dados: {
        modulos_manter: plano.modulos_manter,
        modulos_remover: plano.modulos_remover,
        modulos_adicionar: plano.modulos_adicionar,
        trocas_turma: plano.trocas_turma,
        total_mensalidade_centavos: totalMensalidadeCentavos,
      },
    });

    await client.query(
      `
        INSERT INTO public.auditoria_logs (
          user_id,
          acao,
          entidade,
          entidade_id,
          detalhes
        )
        VALUES ($1, 'MATRICULA_REATIVADA', 'MATRICULA', $2, $3::jsonb)
      `,
      [
        userId,
        String(matriculaId),
        JSON.stringify({
          motivo_reativacao: motivoReativacao,
          modulos_manter: plano.modulos_manter,
          modulos_remover: plano.modulos_remover,
          modulos_adicionar: plano.modulos_adicionar,
          trocas_turma: trocasTurmaExecutadas,
          total_mensalidade_centavos: totalMensalidadeCentavos,
        }),
      ],
    );

    await client.query("COMMIT");

    return NextResponse.json(
      {
        ok: true,
        matricula_reativada: {
          id: matriculaId,
          status: "ATIVA",
          reativada_em: new Date().toISOString(),
          motivo_reativacao: motivoReativacao,
        },
        modulos_ativos_finais: modulosAtivosFinais,
        modulos_encerrados: modulosEncerrados,
        trocas_turma_executadas: trocasTurmaExecutadas,
      },
      { status: 200 },
    );
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // noop
    }
    const message = error instanceof Error ? error.message : "erro_interno";
    return NextResponse.json({ ok: false, error: "falha_reativar_matricula", message }, { status: 500 });
  } finally {
    client.release();
  }
}
