import { NextResponse } from "next/server";
import { Pool, type PoolClient } from "pg";

export const runtime = "nodejs";

type MatriculaOperacionalDetalhe = {
  matricula: Record<string, unknown>;
  turma_aluno: Record<string, unknown> | null;
  aluno: Record<string, unknown> | null;
  responsavel_financeiro: Record<string, unknown> | null;
  turma: Record<string, unknown> | null;
  cobrancas: Array<Record<string, unknown>>;
};

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: process.env.SUPABASE_DB_URL?.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});

function parseIdFromPath(param: string | undefined): number | null {
  if (!param) return null;
  const n = Number(param);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

async function q1(
  client: PoolClient,
  sql: string,
  params: unknown[] = []
): Promise<Record<string, unknown> | null> {
  const { rows } = await client.query(sql, params);
  if (rows.length === 0) return null;
  return rows[0] as Record<string, unknown>;
}

async function qMany(
  client: PoolClient,
  sql: string,
  params: unknown[] = []
): Promise<Array<Record<string, unknown>>> {
  const { rows } = await client.query(sql, params);
  return rows as Array<Record<string, unknown>>;
}

export async function GET(_req: Request, ctx: { params: { matriculaId?: string } }) {
  if (!process.env.SUPABASE_DB_URL) {
    return NextResponse.json(
      { error: "env_invalida", message: "SUPABASE_DB_URL nao configurada." },
      { status: 500 }
    );
  }

  const matriculaId = parseIdFromPath(ctx.params.matriculaId);
  if (!matriculaId) {
    return NextResponse.json(
      { error: "param_invalido", message: "matriculaId invalido." },
      { status: 400 }
    );
  }

  const client = await pool.connect();
  try {
    const matricula = await q1(
      client,
      `
      SELECT *
      FROM public.matriculas
      WHERE id = $1
      LIMIT 1
      `,
      [matriculaId]
    );

    if (!matricula) {
      return NextResponse.json({ error: "matricula_nao_encontrada" }, { status: 404 });
    }

    const pessoaId = Number(matricula.pessoa_id);
    const respFinId = Number(matricula.responsavel_financeiro_id);
    const turmaId = Number(matricula.vinculo_id);

    const turmaAluno = await q1(
      client,
      `
      SELECT *
      FROM public.turma_aluno
      WHERE matricula_id = $1
      ORDER BY turma_aluno_id DESC
      LIMIT 1
      `,
      [matriculaId]
    );

    const aluno = Number.isFinite(pessoaId)
      ? await q1(client, "SELECT * FROM public.pessoas WHERE id = $1 LIMIT 1", [pessoaId])
      : null;

    const responsavel = Number.isFinite(respFinId)
      ? await q1(client, "SELECT * FROM public.pessoas WHERE id = $1 LIMIT 1", [respFinId])
      : null;

    const turma = Number.isFinite(turmaId)
      ? await q1(client, "SELECT * FROM public.turmas WHERE turma_id = $1 LIMIT 1", [turmaId])
      : null;

    const cobrancas = await qMany(
      client,
      `
      SELECT
        id,
        pessoa_id,
        descricao,
        valor_centavos,
        vencimento,
        status,
        origem_tipo,
        origem_subtipo,
        origem_id,
        parcela_numero,
        total_parcelas,
        data_prevista_pagamento,
        data_inicio_encargos,
        multa_percentual_aplicavel,
        juros_mora_percentual_mensal_aplicavel,
        created_at,
        updated_at
      FROM public.cobrancas
      WHERE origem_tipo = 'MATRICULA'
        AND origem_id = $1
      ORDER BY
        CASE WHEN origem_subtipo = 'PRORATA_AJUSTE' THEN 0 ELSE 1 END,
        parcela_numero NULLS FIRST,
        vencimento
      `,
      [matriculaId]
    );

    const payload: MatriculaOperacionalDetalhe = {
      matricula,
      turma_aluno: turmaAluno,
      aluno,
      responsavel_financeiro: responsavel,
      turma,
      cobrancas,
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "erro_desconhecido";
    return NextResponse.json({ error: "falha_detalhe_matricula", message: msg }, { status: 500 });
  } finally {
    client.release();
  }
}
