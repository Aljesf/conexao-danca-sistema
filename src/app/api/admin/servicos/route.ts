import { NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: process.env.SUPABASE_DB_URL?.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});

type ServicoTipo = "TURMA" | "CURSO_LIVRE" | "WORKSHOP" | "ESPETACULO" | "EVENTO";

type ServicoPayload = {
  tipo: ServicoTipo;
  origem_tabela?: string | null;
  origem_id?: number | null;
  ano_referencia?: number | null;
  titulo: string;
  descricao?: string | null;
  ativo?: boolean;
};

export async function GET() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`SELECT * FROM public.servicos ORDER BY ativo DESC, id DESC`);
    return NextResponse.json({ ok: true, servicos: rows }, { status: 200 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "erro_desconhecido";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as ServicoPayload | null;
  if (!body?.tipo || !body?.titulo?.trim()) {
    return NextResponse.json({ ok: false, error: "tipo_e_titulo_obrigatorios" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    const ativo = typeof body.ativo === "boolean" ? body.ativo : true;

    const { rows } = await client.query(
      `
      INSERT INTO public.servicos (
        tipo, origem_tabela, origem_id, ano_referencia, titulo, descricao, ativo, created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,now(),now()
      )
      RETURNING *
      `,
      [
        body.tipo,
        body.origem_tabela ?? null,
        body.origem_id ?? null,
        body.ano_referencia ?? null,
        body.titulo.trim(),
        body.descricao ?? null,
        ativo,
      ],
    );

    return NextResponse.json({ ok: true, servico: rows[0] }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "erro_desconhecido";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  } finally {
    client.release();
  }
}
