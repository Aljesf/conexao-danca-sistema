import { NextResponse } from "next/server";
import { Pool } from "pg";
import { guardApiByRole } from "@/lib/auth/roleGuard";

export const runtime = "nodejs";

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: process.env.SUPABASE_DB_URL?.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});

type PrecoServicoPayload = {
  servico_id: number;
  ano_referencia: number;
  plano_id: number;
  centro_custo_id?: number | null;
  ativo?: boolean;
};

export async function GET(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT * FROM public.matricula_precos_servico ORDER BY ativo DESC, ano_referencia DESC, id DESC`,
    );
    return NextResponse.json({ ok: true, precos: rows }, { status: 200 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "erro_desconhecido";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const body = (await req.json().catch(() => null)) as PrecoServicoPayload | null;
  if (!body?.servico_id || !body?.ano_referencia || !body?.plano_id) {
    return NextResponse.json({ ok: false, error: "servico_id_ano_plano_obrigatorios" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    const ativo = typeof body.ativo === "boolean" ? body.ativo : true;

    const { rows } = await client.query(
      `
      INSERT INTO public.matricula_precos_servico (
        servico_id, ano_referencia, plano_id, centro_custo_id, ativo, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,now(),now())
      ON CONFLICT (servico_id, ano_referencia)
      DO UPDATE SET
        plano_id = EXCLUDED.plano_id,
        centro_custo_id = EXCLUDED.centro_custo_id,
        ativo = EXCLUDED.ativo,
        updated_at = now()
      RETURNING *
      `,
      [body.servico_id, body.ano_referencia, body.plano_id, body.centro_custo_id ?? null, ativo],
    );

    return NextResponse.json({ ok: true, preco: rows[0] }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "erro_desconhecido";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  } finally {
    client.release();
  }
}
