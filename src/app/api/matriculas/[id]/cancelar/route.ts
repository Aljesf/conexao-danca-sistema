import { NextResponse, type NextRequest } from "next/server";
import { Pool, type PoolClient } from "pg";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { requireUser } from "@/lib/supabase/api-auth";
import { EncerramentoPayloadSchema } from "../_encerramento.types";
import { computeCobrancasParaCancelar, type CobrancaRow } from "../_encerramento.shared";

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

async function q1<T extends Record<string, unknown>>(
  client: PoolClient,
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  const { rows } = await client.query(sql, params);
  if (rows.length === 0) return null;
  return rows[0] as T;
}

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
  const hoje = new Date().toISOString().slice(0, 10);
  const competenciaAtual = hoje.slice(0, 7);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const matricula = await q1<{ id: number; status: string | null }>(
      client,
      `
      SELECT id, status
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

    const cobrancasQuery = await client.query<CobrancaRow>(
      `
      SELECT
        id,
        COALESCE(valor_centavos, 0)::int AS valor_centavos,
        vencimento::text AS vencimento,
        data_pagamento::text AS data_pagamento,
        COALESCE(status, '') AS status
      FROM public.cobrancas
      WHERE origem_tipo = 'MATRICULA'
        AND origem_id = $1
        AND COALESCE(upper(status), '') IN ('PENDENTE', 'ABERTA', 'EM_ABERTO', 'ATIVA')
      FOR UPDATE
      `,
      [matriculaId],
    );

    const paraCancelar = computeCobrancasParaCancelar(cobrancasQuery.rows, hoje);
    const idsParaCancelar = paraCancelar.map((c) => Number(c.id));
    const valorCancelado = paraCancelar.reduce((acc, c) => acc + Number(c.valor_centavos || 0), 0);
    let lancamentosCartaoCancelados = 0;
    let faturasCartaoRecalculadas = 0;
    let lancamentosCartaoIds: number[] = [];

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

    // Cancelar previsoes futuras do Cartao Conexao ligadas a esta matricula.
    // Criterio:
    // - origem direta da matricula, ou
    // - lancamento vinculado a cobranca cancelada no passo anterior
    // - status pendente de faturamento, ou faturado em fatura ainda aberta
    const lancamentosCartaoQuery = await client.query<{
      id: number;
      fatura_id: number | null;
      fatura_status: string | null;
    }>(
      `
      SELECT DISTINCT
        l.id,
        fl.fatura_id,
        f.status AS fatura_status
      FROM public.credito_conexao_lancamentos l
      LEFT JOIN public.credito_conexao_fatura_lancamentos fl
        ON fl.lancamento_id = l.id
      LEFT JOIN public.credito_conexao_faturas f
        ON f.id = fl.fatura_id
      WHERE (
        (COALESCE(upper(l.origem_sistema), '') = 'MATRICULA' AND l.origem_id = $1)
        OR ($2::boolean AND l.cobranca_id = ANY($3::bigint[]))
      )
      AND (
        $2::boolean
        OR l.competencia IS NULL
        OR l.competencia >= $4
      )
      AND (
        COALESCE(upper(l.status), '') = 'PENDENTE_FATURA'
        OR (
          COALESCE(upper(l.status), '') = 'FATURADO'
          AND COALESCE(upper(f.status), '') IN ('ABERTA', 'PENDENTE', 'EM_ABERTO')
        )
      )
      FOR UPDATE OF l
      `,
      [
        matriculaId,
        idsParaCancelar.length > 0,
        idsParaCancelar.length > 0 ? idsParaCancelar : [-1],
        competenciaAtual,
      ],
    );

    lancamentosCartaoIds = lancamentosCartaoQuery.rows
      .map((r) => Number(r.id))
      .filter((id) => Number.isFinite(id));

    if (lancamentosCartaoIds.length > 0) {
      await client.query(
        `
        UPDATE public.credito_conexao_lancamentos
        SET status = 'CANCELADO',
            updated_at = now()
        WHERE id = ANY($1::bigint[])
        `,
        [lancamentosCartaoIds],
      );

      await client.query(
        `
        DELETE FROM public.credito_conexao_fatura_lancamentos
        WHERE lancamento_id = ANY($1::bigint[])
        `,
        [lancamentosCartaoIds],
      );

      const faturaIds = Array.from(
        new Set(
          lancamentosCartaoQuery.rows
            .map((r) => Number(r.fatura_id))
            .filter((id) => Number.isFinite(id) && id > 0),
        ),
      );

      if (faturaIds.length > 0) {
        await client.query(
          `
          UPDATE public.credito_conexao_faturas f
          SET valor_total_centavos = COALESCE((
              SELECT SUM(l.valor_centavos)::int
              FROM public.credito_conexao_fatura_lancamentos fl
              JOIN public.credito_conexao_lancamentos l ON l.id = fl.lancamento_id
              WHERE fl.fatura_id = f.id
                AND COALESCE(upper(l.status), '') IN ('PENDENTE_FATURA', 'FATURADO')
            ), 0),
            updated_at = now()
          WHERE f.id = ANY($1::bigint[])
          `,
          [faturaIds],
        );
        faturasCartaoRecalculadas = faturaIds.length;
      }
    }
    lancamentosCartaoCancelados = lancamentosCartaoIds.length;

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

    await client.query(
      `
      UPDATE public.matriculas
      SET
        status = 'CANCELADA',
        data_encerramento = $2::date,
        encerramento_tipo = 'CANCELADA',
        encerramento_motivo = $3,
        encerramento_em = now(),
        encerramento_por_user_id = $4,
        updated_at = now()
      WHERE id = $1
      `,
      [matriculaId, hoje, motivo, userId],
    );

    const payload = {
      cobrancas_canceladas_ids: idsParaCancelar,
      turma_aluno_encerrados: turmaAlunoResult.rowCount ?? 0,
      lancamentos_cartao_cancelados_ids: lancamentosCartaoIds,
      faturas_cartao_recalculadas_qtd: faturasCartaoRecalculadas,
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
          cobrancas_canceladas_qtd: idsParaCancelar.length,
          cobrancas_canceladas_valor_centavos: valorCancelado,
          turma_aluno_encerrados: turmaAlunoResult.rowCount ?? 0,
          lancamentos_cartao_cancelados_qtd: lancamentosCartaoCancelados,
          faturas_cartao_recalculadas_qtd: faturasCartaoRecalculadas,
          retificacao_de_concluida: retificacaoDeConcluida,
        }),
      ],
    );

    await client.query("COMMIT");

    return NextResponse.json({
      ok: true,
      matricula_id: matriculaId,
      status_final: "CANCELADA",
      cobrancas_canceladas_qtd: idsParaCancelar.length,
      cobrancas_canceladas_valor_centavos: valorCancelado,
      turma_aluno_encerrados: turmaAlunoResult.rowCount ?? 0,
      lancamentos_cartao_cancelados_qtd: lancamentosCartaoCancelados,
      faturas_cartao_recalculadas_qtd: faturasCartaoRecalculadas,
      retificacao_de_concluida: retificacaoDeConcluida,
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
