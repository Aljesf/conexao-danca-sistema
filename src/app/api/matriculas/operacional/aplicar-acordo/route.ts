import { NextResponse } from "next/server";
import { Pool, type PoolClient } from "pg";

export const runtime = "nodejs";

type AplicarAcordoBody = {
  cobranca_id: number;
  data_prevista_pagamento: string; // YYYY-MM-DD
  data_inicio_encargos: string; // YYYY-MM-DD
};

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: process.env.SUPABASE_DB_URL?.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});

function okISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  const [y, m, day] = value.split("-").map((v) => Number(v));
  return d.getUTCFullYear() === y && d.getUTCMonth() + 1 === m && d.getUTCDate() === day;
}

function parsePositiveInt(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isInteger(v) || v <= 0) return null;
  return v;
}

async function getCobrancaInfo(
  client: PoolClient,
  cobrancaId: number
): Promise<{
  id: number;
  parcela_numero: number | null;
  total_parcelas: number | null;
  origem_tipo: string | null;
  origem_id: number | null;
} | null> {
  const { rows } = await client.query(
    `
    SELECT id, parcela_numero, total_parcelas, origem_tipo, origem_id
    FROM public.cobrancas
    WHERE id = $1
    LIMIT 1
    `,
    [cobrancaId]
  );

  if (rows.length === 0) return null;
  const r = rows[0] as Record<string, unknown>;

  return {
    id: Number(r.id),
    parcela_numero:
      r.parcela_numero === null || r.parcela_numero === undefined ? null : Number(r.parcela_numero),
    total_parcelas:
      r.total_parcelas === null || r.total_parcelas === undefined ? null : Number(r.total_parcelas),
    origem_tipo: r.origem_tipo === null || r.origem_tipo === undefined ? null : String(r.origem_tipo),
    origem_id: r.origem_id === null || r.origem_id === undefined ? null : Number(r.origem_id),
  };
}

export async function POST(req: Request) {
  if (!process.env.SUPABASE_DB_URL) {
    return NextResponse.json(
      { error: "env_invalida", message: "SUPABASE_DB_URL nao configurada." },
      { status: 500 }
    );
  }

  let body: Partial<AplicarAcordoBody> = {};
  try {
    const parsed: unknown = await req.json();
    body = parsed as Partial<AplicarAcordoBody>;
  } catch {
    return NextResponse.json({ error: "json_invalido" }, { status: 400 });
  }

  const cobrancaId = parsePositiveInt(body.cobranca_id);
  const dataPrevista =
    typeof body.data_prevista_pagamento === "string" ? body.data_prevista_pagamento : null;
  const dataInicio =
    typeof body.data_inicio_encargos === "string" ? body.data_inicio_encargos : null;

  if (!cobrancaId || !dataPrevista || !dataInicio) {
    return NextResponse.json(
      {
        error: "payload_invalido",
        message: "cobranca_id, data_prevista_pagamento e data_inicio_encargos sao obrigatorios.",
      },
      { status: 400 }
    );
  }

  if (!okISODate(dataPrevista) || !okISODate(dataInicio)) {
    return NextResponse.json(
      { error: "datas_invalidas", message: "Datas devem estar em YYYY-MM-DD." },
      { status: 400 }
    );
  }

  if (new Date(`${dataInicio}T00:00:00Z`).getTime() < new Date(`${dataPrevista}T00:00:00Z`).getTime()) {
    return NextResponse.json(
      {
        error: "regra_datas",
        message: "data_inicio_encargos nao pode ser menor que data_prevista_pagamento.",
      },
      { status: 422 }
    );
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const cobr = await getCobrancaInfo(client, cobrancaId);
    if (!cobr) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "cobranca_nao_encontrada" }, { status: 404 });
    }

    if (cobr.origem_tipo !== "MATRICULA") {
      await client.query("ROLLBACK");
      return NextResponse.json(
        {
          error: "origem_invalida",
          message: "Acordo permitido apenas para cobrancas de origem MATRICULA.",
        },
        { status: 422 }
      );
    }

    if (cobr.parcela_numero !== null && cobr.total_parcelas !== null) {
      if (cobr.parcela_numero === cobr.total_parcelas) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          {
            error: "acordo_bloqueado_ultima_parcela",
            message: "A ultima parcela nao pode ter acordo.",
          },
          { status: 409 }
        );
      }
    }

    const { rows } = await client.query(
      `
      UPDATE public.cobrancas
      SET
        data_prevista_pagamento = $2,
        data_inicio_encargos = $3,
        updated_at = now()
      WHERE id = $1
      RETURNING id, data_prevista_pagamento, data_inicio_encargos, parcela_numero, total_parcelas, origem_tipo, origem_id
      `,
      [cobrancaId, dataPrevista, dataInicio]
    );

    await client.query("COMMIT");
    return NextResponse.json({ ok: true, cobranca: rows[0] ?? null }, { status: 200 });
  } catch (e: unknown) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // noop
    }
    const msg = e instanceof Error ? e.message : "erro_desconhecido";
    return NextResponse.json({ error: "falha_aplicar_acordo", message: msg }, { status: 500 });
  } finally {
    client.release();
  }
}
