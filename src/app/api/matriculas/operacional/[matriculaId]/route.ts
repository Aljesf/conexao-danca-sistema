import { NextResponse } from "next/server";
import { Pool, type PoolClient } from "pg";

export const runtime = "nodejs";

type MetodoLiquidacao = "CARTAO_CONEXAO" | "COBRANCAS_LEGADO" | "CREDITO_BOLSA";

type MatriculaOperacionalDetalhe = {
  matricula: Record<string, unknown>;
  turma_aluno: Record<string, unknown> | null;
  aluno: Record<string, unknown> | null;
  responsavel_financeiro: Record<string, unknown> | null;
  turma: Record<string, unknown> | null;
  cobrancas: Array<Record<string, unknown>>;
  lancamentos_cartao: Array<Record<string, unknown>>;
  cartao_conexao_conta?: Record<string, unknown> | null;
  metodo_liquidacao: MetodoLiquidacao;
};

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: process.env.SUPABASE_DB_URL?.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});

function parseId(param: string | undefined): number | null {
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
    return NextResponse.json({ error: "env_invalida", message: "SUPABASE_DB_URL nao configurada." }, { status: 500 });
  }

  const matriculaId = parseId(ctx.params.matriculaId);
  if (!matriculaId) {
    return NextResponse.json({ error: "param_invalido" }, { status: 400 });
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
      [matriculaId],
    );
    if (!matricula) return NextResponse.json({ error: "matricula_nao_encontrada" }, { status: 404 });

    const metodo = String((matricula.metodo_liquidacao ?? "CARTAO_CONEXAO")) as MetodoLiquidacao;

    const pessoaId = Number(matricula.pessoa_id);
    const respFinId = Number(matricula.responsavel_financeiro_id);
    const turmaId = Number(matricula.vinculo_id ?? matricula.turma_id);

    const turmaAluno = await q1(
      client,
      `
      SELECT *
      FROM public.turma_aluno
      WHERE matricula_id = $1
      ORDER BY turma_aluno_id DESC
      LIMIT 1
      `,
      [matriculaId],
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

    if (metodo === "COBRANCAS_LEGADO") {
      const cobrancas = await qMany(
        client,
        `
        SELECT *
        FROM public.cobrancas
        WHERE origem_tipo = 'MATRICULA'
          AND origem_id = $1
        ORDER BY
          CASE WHEN origem_subtipo = 'PRORATA_AJUSTE' THEN 0 ELSE 1 END,
          parcela_numero NULLS FIRST,
          vencimento
        `,
        [matriculaId],
      );

      const payload: MatriculaOperacionalDetalhe = {
        ok: true,
        metodo_liquidacao: metodo,
        matricula,
        turma_aluno: turmaAluno,
        aluno,
        responsavel_financeiro: responsavel,
        turma,
        cobrancas,
        lancamentos_cartao: [],
      } as MatriculaOperacionalDetalhe;

      return NextResponse.json(payload, { status: 200 });
    }

    const conta = await q1(
      client,
      `
      SELECT id, pessoa_titular_id, tipo_conta, ativo
      FROM public.credito_conexao_contas
      WHERE pessoa_titular_id = $1
        AND tipo_conta = 'ALUNO'
      ORDER BY id DESC
      LIMIT 1
      `,
      [respFinId],
    );

    const lancamentos = await qMany(
      client,
      `
      SELECT
        id,
        conta_conexao_id,
        valor_centavos,
        numero_parcelas,
        status,
        origem_sistema,
        origem_id,
        descricao,
        created_at,
        updated_at
      FROM public.credito_conexao_lancamentos
      WHERE origem_sistema = 'MATRICULA'
        AND origem_id = $1
      ORDER BY id ASC
      `,
      [matriculaId],
    );

    const payload: MatriculaOperacionalDetalhe = {
      ok: true,
      metodo_liquidacao: metodo,
      matricula,
      turma_aluno: turmaAluno,
      aluno,
      responsavel_financeiro: responsavel,
      turma,
      cartao_conexao_conta: conta,
      lancamentos_cartao: lancamentos,
      cobrancas: [],
    } as MatriculaOperacionalDetalhe;

    return NextResponse.json(payload, { status: 200 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "erro_desconhecido";
    return NextResponse.json({ error: "falha_detalhe_matricula", message: msg }, { status: 500 });
  } finally {
    client.release();
  }
}
