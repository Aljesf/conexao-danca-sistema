import { NextResponse } from "next/server";
import { Pool, type PoolClient } from "pg";
import { guardApiByRole } from "@/lib/auth/roleGuard";

export const runtime = "nodejs";

type EncerrarMatriculaBody = {
  matricula_id: number;
  data_fim?: string; // YYYY-MM-DD
  motivo?: string | null;
  cancelar_cobrancas_futuras?: boolean; // legado
  cancelar_lancamentos_pendentes?: boolean; // cartao
};

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: process.env.SUPABASE_DB_URL?.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});

function parsePositiveInt(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isInteger(v) || v <= 0) return null;
  return v;
}

function okISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime());
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

export async function POST(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  if (!process.env.SUPABASE_DB_URL) {
    return NextResponse.json({ error: "env_invalida", message: "SUPABASE_DB_URL nao configurada." }, { status: 500 });
  }

  let body: Partial<EncerrarMatriculaBody> = {};
  try {
    const parsed: unknown = await req.json();
    body = parsed as Partial<EncerrarMatriculaBody>;
  } catch {
    return NextResponse.json({ error: "json_invalido" }, { status: 400 });
  }

  const matriculaId = parsePositiveInt(body.matricula_id);
  if (!matriculaId) {
    return NextResponse.json({ error: "payload_invalido", message: "matricula_id e obrigatorio." }, { status: 400 });
  }

  const dataFim = typeof body.data_fim === "string" ? body.data_fim : null;
  if (dataFim && !okISODate(dataFim)) return NextResponse.json({ error: "data_fim_invalida" }, { status: 400 });

  const motivo = typeof body.motivo === "string" ? body.motivo : null;

  const cancelarCobrancasFuturas = body.cancelar_cobrancas_futuras === true;
  const cancelarLancPendentes = body.cancelar_lancamentos_pendentes !== false;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const matricula = await q1(
      client,
      `
      SELECT id, status, metodo_liquidacao
      FROM public.matriculas
      WHERE id = $1
      LIMIT 1
      `,
      [matriculaId],
    );

    if (!matricula) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "matricula_nao_encontrada" }, { status: 404 });
    }

    const metodo = String(matricula.metodo_liquidacao ?? "CARTAO_CONEXAO");

    const dataFimEfetiva =
      dataFim ?? String((await client.query("SELECT current_date::text AS d")).rows[0]?.d);

    const vinculo = await q1(
      client,
      `
      SELECT turma_aluno_id
      FROM public.turma_aluno
      WHERE matricula_id = $1
      ORDER BY turma_aluno_id DESC
      LIMIT 1
      `,
      [matriculaId],
    );

    if (vinculo) {
      await client.query(
        `
        UPDATE public.turma_aluno
        SET status = 'encerrado',
            dt_fim = $2
        WHERE turma_aluno_id = $1
        `,
        [Number(vinculo.turma_aluno_id), dataFimEfetiva],
      );
    }

    await client.query(
      `
      UPDATE public.matriculas
      SET status = 'CANCELADA',
          data_encerramento = $2,
          observacoes = COALESCE($3, observacoes),
          updated_at = now()
      WHERE id = $1
      `,
      [matriculaId, dataFimEfetiva, motivo],
    );

    if (metodo === "COBRANCAS_LEGADO" && cancelarCobrancasFuturas) {
      await client.query(
        `
        UPDATE public.cobrancas
        SET status = 'CANCELADA',
            updated_at = now()
        WHERE origem_tipo = 'MATRICULA'
          AND origem_id = $1
          AND vencimento > $2
          AND status IN ('ABERTA','PENDENTE')
        `,
        [matriculaId, dataFimEfetiva],
      );
    }

    if (metodo === "CARTAO_CONEXAO" && cancelarLancPendentes) {
      await client.query(
        `
        UPDATE public.credito_conexao_lancamentos
        SET status = 'CANCELADO',
            updated_at = now()
        WHERE origem_sistema = 'MATRICULA'
          AND origem_id = $1
          AND status = 'PENDENTE_FATURA'
        `,
        [matriculaId],
      );
    }

    await client.query("COMMIT");

    return NextResponse.json(
      { ok: true, matricula_id: matriculaId, metodo_liquidacao: metodo, data_fim: dataFimEfetiva },
      { status: 200 },
    );
  } catch (e: unknown) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // noop
    }
    const msg = e instanceof Error ? e.message : "erro_desconhecido";
    return NextResponse.json({ error: "falha_encerrar_matricula", message: msg }, { status: 500 });
  } finally {
    client.release();
  }
}
