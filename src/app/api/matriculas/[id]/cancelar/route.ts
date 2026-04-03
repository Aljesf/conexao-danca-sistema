import { NextResponse, type NextRequest } from "next/server";
import { Pool, type PoolClient } from "pg";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { resolveCancelamentoSemantico } from "@/lib/matriculas/cancelamento-real";
import { inserirMatriculaEventoPg } from "@/lib/matriculas/eventos";
import { recalcularTiersAposDesmatricula } from "@/lib/matriculas/recalcularTiersAposDesmatricula";
import { requireUser } from "@/lib/supabase/api-auth";
import { EncerramentoPayloadSchema } from "../_encerramento.types";

export const runtime = "nodejs";

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: process.env.SUPABASE_DB_URL?.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});

function parsePositiveInt(v: unknown): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function uniquePositiveInts(values: Array<number | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is number => Number.isFinite(value) && Number(value) > 0)),
  );
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

type CobrancaRow = {
  id: number;
  valor_centavos: number;
  vencimento: string | null;
  data_pagamento: string | null;
  status: string;
};

type LancamentoCartaoRow = {
  id: number;
  cobranca_id: number | null;
  fatura_id: number | null;
  fatura_status: string | null;
};

type FaturaRecalculadaRow = {
  id: number;
  folha_pagamento_id: number | null;
  status: string | null;
  valor_total_centavos: number;
};

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardApiByRole(request as any);
  if (denied) return denied as any;

  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const { id: rawId } = await ctx.params;
  const matriculaId = parsePositiveInt(rawId);
  if (!matriculaId) {
    return NextResponse.json({ ok: false, error: "id_invalido" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = EncerramentoPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "payload_invalido", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (!process.env.SUPABASE_DB_URL) {
    return NextResponse.json(
      { ok: false, error: "env_invalida", message: "SUPABASE_DB_URL nao configurada." },
      { status: 500 },
    );
  }

  const userId = auth.userId;
  const motivo = parsed.data.motivo.trim();
  const cancelamento = resolveCancelamentoSemantico({
    cancelamentoTipo: parsed.data.cancelamento_tipo,
    geraPerdaFinanceira: parsed.data.gera_perda_financeira,
    motivo,
  });
  const hoje = new Date().toISOString().slice(0, 10);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const matricula = await q1<{ id: number; status: string | null; pessoa_id: number | null; ano_referencia: number | null }>(
      client,
      `
      SELECT id, status, pessoa_id, ano_referencia
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

    const statusAtual = String(matricula.status ?? "").toUpperCase();
    if (statusAtual === "CANCELADA") {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: false, error: "matricula_ja_cancelada" }, { status: 409 });
    }
    const retificacaoDeConcluida = statusAtual === "CONCLUIDA";

    const itensMatriculaQuery = await client.query<{ id: number }>(
      `
      SELECT id
      FROM public.matricula_itens
      WHERE matricula_id = $1
      FOR UPDATE
      `,
      [matriculaId],
    );
    const matriculaItemIds = uniquePositiveInts(itensMatriculaQuery.rows.map((row) => Number(row.id)));

    const cobrancasCandidatasQuery = await client.query<CobrancaRow>(
      `
      SELECT
        id,
        COALESCE(valor_centavos, 0)::int AS valor_centavos,
        vencimento::text AS vencimento,
        data_pagamento::text AS data_pagamento,
        COALESCE(status, '') AS status
      FROM public.cobrancas
      WHERE COALESCE(upper(status), '') IN ('PENDENTE', 'ABERTA', 'EM_ABERTO', 'ATIVA', 'EM_ATRASO')
        AND (
          (COALESCE(upper(origem_tipo), '') IN ('MATRICULA', 'MATRICULA_MENSALIDADE') AND origem_id = $1)
          OR (COALESCE(upper(origem_item_tipo), '') = 'MATRICULA' AND origem_item_id = $1)
          OR ($2::boolean AND COALESCE(upper(origem_item_tipo), '') = 'MATRICULA_ITEM' AND origem_item_id = ANY($3::bigint[]))
        )
      FOR UPDATE
      `,
      [matriculaId, matriculaItemIds.length > 0, matriculaItemIds.length > 0 ? matriculaItemIds : [-1]],
    );

    const cobrancaIdsIniciais = uniquePositiveInts(cobrancasCandidatasQuery.rows.map((row) => Number(row.id)));

    const lancamentosFilterParams = [
      matriculaId,
      cobrancaIdsIniciais.length > 0,
      cobrancaIdsIniciais.length > 0 ? cobrancaIdsIniciais : [-1],
    ];

    await client.query(
      `
      SELECT l.id
      FROM public.credito_conexao_lancamentos l
      WHERE (
        l.matricula_id = $1
        OR (COALESCE(upper(l.origem_sistema), '') LIKE 'MATRICULA%' AND l.origem_id = $1)
        OR ($2::boolean AND l.cobranca_id = ANY($3::bigint[]))
      )
      AND COALESCE(upper(l.status), '') IN ('PENDENTE_FATURA', 'FATURADO')
      FOR UPDATE OF l
      `,
      lancamentosFilterParams,
    );

    const lancamentosCartaoQuery = await client.query<LancamentoCartaoRow>(
      `
      SELECT DISTINCT
        l.id,
        l.cobranca_id,
        fl.fatura_id,
        f.status AS fatura_status
      FROM public.credito_conexao_lancamentos l
      LEFT JOIN public.credito_conexao_fatura_lancamentos fl
        ON fl.lancamento_id = l.id
      LEFT JOIN public.credito_conexao_faturas f
        ON f.id = fl.fatura_id
      WHERE (
        l.matricula_id = $1
        OR (COALESCE(upper(l.origem_sistema), '') LIKE 'MATRICULA%' AND l.origem_id = $1)
        OR ($2::boolean AND l.cobranca_id = ANY($3::bigint[]))
      )
      AND (
        COALESCE(upper(l.status), '') = 'PENDENTE_FATURA'
        OR (
          COALESCE(upper(l.status), '') = 'FATURADO'
          AND COALESCE(upper(f.status), '') IN ('ABERTA', 'PENDENTE', 'EM_ABERTO', 'EM_ATRASO')
        )
      )
      `,
      lancamentosFilterParams,
    );

    const lancamentosCartaoIds = uniquePositiveInts(lancamentosCartaoQuery.rows.map((row) => Number(row.id)));
    const cobrancaIdsViaLancamento = uniquePositiveInts(
      lancamentosCartaoQuery.rows.map((row) => Number(row.cobranca_id ?? 0)),
    );
    const cobrancasPossivelmenteDerivadas = uniquePositiveInts([...cobrancaIdsIniciais, ...cobrancaIdsViaLancamento]);

    let idsParaCancelar: number[] = [];
    let valorCancelado = 0;

    if (cobrancasPossivelmenteDerivadas.length > 0) {
      const cobrancasFinaisQuery = await client.query<CobrancaRow>(
        `
        SELECT
          id,
          COALESCE(valor_centavos, 0)::int AS valor_centavos,
          vencimento::text AS vencimento,
          data_pagamento::text AS data_pagamento,
          COALESCE(status, '') AS status
        FROM public.cobrancas
        WHERE id = ANY($1::bigint[])
          AND COALESCE(upper(status), '') NOT IN (
            'PAGO', 'PAGA', 'RECEBIDO', 'RECEBIDA', 'LIQUIDADO', 'LIQUIDADA', 'QUITADO', 'QUITADA',
            'CANCELADO', 'CANCELADA'
          )
        FOR UPDATE
        `,
        [cobrancasPossivelmenteDerivadas],
      );

      idsParaCancelar = uniquePositiveInts(cobrancasFinaisQuery.rows.map((row) => Number(row.id)));
      valorCancelado = cobrancasFinaisQuery.rows.reduce((acc, row) => acc + Number(row.valor_centavos || 0), 0);

      if (idsParaCancelar.length > 0) {
        await client.query(
          `
          UPDATE public.cobrancas
          SET
            status = 'CANCELADA',
            cancelada_em = now(),
            cancelada_motivo = $2,
            cancelada_por_user_id = $3,
            updated_at = now()
          WHERE id = ANY($1::bigint[])
          `,
          [idsParaCancelar, `Cancelamento/retificacao matricula #${matriculaId}: ${motivo}`, userId],
        );
      }
    }

    const faturaIdsAfetadas = uniquePositiveInts(
      lancamentosCartaoQuery.rows.map((row) => Number(row.fatura_id ?? 0)),
    );

    if (lancamentosCartaoIds.length > 0) {
      await client.query(
        `
        DELETE FROM public.credito_conexao_fatura_lancamentos
        WHERE lancamento_id = ANY($1::bigint[])
        `,
        [lancamentosCartaoIds],
      );

      await client.query(
        `
        UPDATE public.credito_conexao_lancamentos
        SET
          status = 'CANCELADO',
          composicao_json = COALESCE(composicao_json, '{}'::jsonb) || jsonb_build_object(
            'cancelamento_matricula',
            jsonb_build_object(
              'matricula_id', $2::bigint,
              'motivo', $3::text,
              'cancelado_em', now(),
              'cancelado_por_user_id', $4::text
            )
          ),
          updated_at = now()
        WHERE id = ANY($1::bigint[])
        `,
        [lancamentosCartaoIds, matriculaId, motivo, userId],
      );
    }

    let faturasRecalculadas: FaturaRecalculadaRow[] = [];

    if (faturaIdsAfetadas.length > 0) {
      const recalcResult = await client.query<FaturaRecalculadaRow>(
        `
        WITH totais AS (
          SELECT
            f.id,
            COALESCE((
              SELECT SUM(l.valor_centavos)::int
              FROM public.credito_conexao_fatura_lancamentos fl
              JOIN public.credito_conexao_lancamentos l
                ON l.id = fl.lancamento_id
              WHERE fl.fatura_id = f.id
                AND COALESCE(upper(l.status), '') IN ('PENDENTE_FATURA', 'FATURADO')
            ), 0) AS total_centavos
          FROM public.credito_conexao_faturas f
          WHERE f.id = ANY($1::bigint[])
        )
        UPDATE public.credito_conexao_faturas f
        SET
          valor_total_centavos = t.total_centavos,
          status = CASE
            WHEN t.total_centavos <= 0 THEN 'CANCELADA'
            WHEN f.data_vencimento IS NOT NULL AND f.data_vencimento < $2::date THEN 'EM_ATRASO'
            ELSE 'ABERTA'
          END,
          folha_pagamento_id = CASE WHEN t.total_centavos <= 0 THEN NULL ELSE f.folha_pagamento_id END,
          updated_at = now()
        FROM totais t
        WHERE f.id = t.id
        RETURNING
          f.id,
          f.folha_pagamento_id,
          f.status,
          COALESCE(f.valor_total_centavos, 0)::int AS valor_total_centavos
        `,
        [faturaIdsAfetadas, hoje],
      );
      faturasRecalculadas = recalcResult.rows;

      const faturasZeradas = faturasRecalculadas.filter((row) => Number(row.valor_total_centavos) <= 0).map((row) => row.id);
      const faturasComSaldo = faturasRecalculadas
        .filter((row) => Number(row.valor_total_centavos) > 0)
        .map((row) => row.id);

      if (faturasZeradas.length > 0) {
        await client.query(
          `
          DELETE FROM public.folha_pagamento_itens
          WHERE referencia_tipo = 'CREDITO_CONEXAO_FATURA'
            AND referencia_id = ANY($1::bigint[])
          `,
          [faturasZeradas],
        );

        await client.query(
          `
          DELETE FROM public.folha_pagamento_eventos
          WHERE origem_tipo = 'CREDITO_CONEXAO_FATURA'
            AND origem_id = ANY($1::bigint[])
          `,
          [faturasZeradas],
        );
      }

      if (faturasComSaldo.length > 0) {
        await client.query(
          `
          UPDATE public.folha_pagamento_itens i
          SET
            valor_centavos = f.valor_total_centavos,
            descricao = 'Desconto Cartao Conexao (fatura #' || f.id || ')'
          FROM public.credito_conexao_faturas f
          WHERE i.referencia_tipo = 'CREDITO_CONEXAO_FATURA'
            AND i.referencia_id = f.id
            AND f.id = ANY($1::bigint[])
          `,
          [faturasComSaldo],
        );

        await client.query(
          `
          UPDATE public.folha_pagamento_eventos e
          SET
            valor_centavos = f.valor_total_centavos,
            descricao = 'Cartao Conexao - Fatura ' || f.id,
            updated_at = now()
          FROM public.credito_conexao_faturas f
          WHERE e.origem_tipo = 'CREDITO_CONEXAO_FATURA'
            AND e.origem_id = f.id
            AND f.id = ANY($1::bigint[])
          `,
          [faturasComSaldo],
        );
      }
    }

    const turmaAlunoResult = await client.query(
      `
      UPDATE public.turma_aluno
      SET dt_fim = $2::date,
          status = 'cancelado'
      WHERE matricula_id = $1
        AND (dt_fim IS NULL OR dt_fim > $2::date)
      `,
      [matriculaId, hoje],
    );

    const itensCanceladosResult = await client.query(
      `
      UPDATE public.matricula_itens
      SET
        status = 'CANCELADO',
        data_fim = COALESCE(data_fim, $2::date),
        cancelamento_tipo = COALESCE(cancelamento_tipo, $3),
        cancelado_em = COALESCE(cancelado_em, now()),
        updated_at = now()
      WHERE matricula_id = $1
        AND COALESCE(upper(status), '') = 'ATIVO'
      `,
      [matriculaId, hoje, cancelamento.cancelamentoTipo],
    );

    await client.query(
      `
      UPDATE public.matriculas
      SET
        status = 'CANCELADA',
        data_encerramento = $2::date,
        encerramento_tipo = 'CANCELADA',
        cancelamento_tipo = $3,
        gera_perda_financeira = $4,
        encerramento_motivo = $5,
        encerramento_em = now(),
        encerramento_por_user_id = $6,
        updated_at = now()
      WHERE id = $1
      `,
      [matriculaId, hoje, cancelamento.cancelamentoTipo, cancelamento.geraPerdaFinanceira, motivo, userId],
    );

    const faturasComFolhaAfetada = faturasRecalculadas.filter((row) => Number(row.folha_pagamento_id ?? 0) > 0);

    const payload = {
      cancelamento_tipo: cancelamento.cancelamentoTipo,
      gera_perda_financeira: cancelamento.geraPerdaFinanceira,
      classificacao_fonte: cancelamento.fonte,
      cobrancas_canceladas_ids: idsParaCancelar,
      lancamentos_cartao_cancelados_ids: lancamentosCartaoIds,
      faturas_cartao_ids_afetadas: faturasRecalculadas.map((row) => row.id),
      faturas_cartao_recalculadas_qtd: faturasRecalculadas.length,
      faturas_cartao_com_folha_recomposta_qtd: faturasComFolhaAfetada.length,
      turma_aluno_encerrados: turmaAlunoResult.rowCount ?? 0,
      retificacao_de_concluida: retificacaoDeConcluida,
    };

    await client.query(
      `
      INSERT INTO public.matriculas_encerramentos (
        matricula_id,
        tipo,
        motivo,
        realizado_por_user_id,
        cobrancas_canceladas_qtd,
        cobrancas_canceladas_valor_centavos,
        payload
      )
      VALUES ($1, 'CANCELADA', $2, $3, $4, $5, $6::jsonb)
      `,
      [matriculaId, motivo, userId, idsParaCancelar.length, valorCancelado, JSON.stringify(payload)],
    );

    await inserirMatriculaEventoPg(client, {
      matricula_id: matriculaId,
      tipo_evento: "CANCELADA",
      observacao: motivo,
      created_by: userId,
      dados: {
        cancelamento_tipo: cancelamento.cancelamentoTipo,
        gera_perda_financeira: cancelamento.geraPerdaFinanceira,
        itens_cancelados_qtd: itensCanceladosResult.rowCount ?? 0,
        cobrancas_canceladas_qtd: idsParaCancelar.length,
        lancamentos_cartao_cancelados_qtd: lancamentosCartaoIds.length,
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
      VALUES ($1, 'MATRICULA_CANCELADA', 'MATRICULA', $2, $3::jsonb)
      `,
      [
        userId,
        String(matriculaId),
        JSON.stringify({
          motivo,
          status_final: "CANCELADA",
          cancelamento_tipo: cancelamento.cancelamentoTipo,
          gera_perda_financeira: cancelamento.geraPerdaFinanceira,
          cobrancas_canceladas_qtd: idsParaCancelar.length,
          cobrancas_canceladas_valor_centavos: valorCancelado,
          turma_aluno_encerrados: turmaAlunoResult.rowCount ?? 0,
          lancamentos_cartao_cancelados_qtd: lancamentosCartaoIds.length,
          faturas_cartao_recalculadas_qtd: faturasRecalculadas.length,
          faturas_cartao_com_folha_recomposta_qtd: faturasComFolhaAfetada.length,
          retificacao_de_concluida: retificacaoDeConcluida,
        }),
      ],
    );

    console.info("[MATRICULA][CANCELAR][FINANCEIRO_DERIVADO]", {
      matricula_id: matriculaId,
      cobrancas_canceladas_ids: idsParaCancelar,
      lancamentos_cartao_cancelados_ids: lancamentosCartaoIds,
      faturas_afetadas: faturasRecalculadas,
      folha_recomposta_qtd: faturasComFolhaAfetada.length,
    });

    // A2: Recálculo automático de tiers para matrículas remanescentes
    let recalcTiers: { lancamentos_atualizados: number; errors: string[] } | null = null;
    if (matricula.pessoa_id && matricula.ano_referencia) {
      try {
        const baseUrl = request.headers.get("x-forwarded-proto") && request.headers.get("host")
          ? `${request.headers.get("x-forwarded-proto")}://${request.headers.get("host")}`
          : process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : "http://localhost:3000";

        recalcTiers = await recalcularTiersAposDesmatricula({
          client,
          alunoId: matricula.pessoa_id,
          anoReferencia: matricula.ano_referencia,
          matriculaCanceladaId: matriculaId,
          userId,
          baseUrl,
        });
      } catch (tierErr) {
        console.warn("[MATRICULA][CANCELAR][RECALC_TIERS] Erro (nao bloqueante):", tierErr);
      }
    }

    await client.query("COMMIT");

    return NextResponse.json({
      ok: true,
      matricula_id: matriculaId,
      status_final: "CANCELADA",
      cancelamento_tipo: cancelamento.cancelamentoTipo,
      gera_perda_financeira: cancelamento.geraPerdaFinanceira,
      cobrancas_canceladas_qtd: idsParaCancelar.length,
      cobrancas_canceladas_valor_centavos: valorCancelado,
      turma_aluno_encerrados: turmaAlunoResult.rowCount ?? 0,
      itens_cancelados_qtd: itensCanceladosResult.rowCount ?? 0,
      lancamentos_cartao_cancelados_qtd: lancamentosCartaoIds.length,
      faturas_cartao_recalculadas_qtd: faturasRecalculadas.length,
      faturas_cartao_com_folha_recomposta_qtd: faturasComFolhaAfetada.length,
      retificacao_de_concluida: retificacaoDeConcluida,
      recalculo_tiers: recalcTiers
        ? { lancamentos_atualizados: recalcTiers.lancamentos_atualizados, errors: recalcTiers.errors }
        : null,
    });
  } catch (e: unknown) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // noop
    }
    const message = e instanceof Error ? e.message : "erro_desconhecido";
    return NextResponse.json(
      { ok: false, error: "falha_cancelar_matricula", message },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
