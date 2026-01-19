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

function parseId(param: string | undefined): number | null {
  const n = Number(param);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id?: string }> }) {
  const denied = await guardApiByRole(_req as any);
  if (denied) return denied as any;
  const { id: rawId } = await ctx.params;
  const id = parseId(rawId);
  if (!id) return NextResponse.json({ ok: false, error: "id_invalido" }, { status: 400 });

  const client = await pool.connect();
  try {
    const { rows } = await client.query(`SELECT * FROM public.servicos WHERE id = $1`, [id]);
    if (!rows[0]) return NextResponse.json({ ok: false, error: "nao_encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true, servico: rows[0] }, { status: 200 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "erro_desconhecido";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id?: string }> }) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const { id: rawId } = await ctx.params;
  const id = parseId(rawId);
  if (!id) return NextResponse.json({ ok: false, error: "id_invalido" }, { status: 400 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, error: "json_invalido" }, { status: 400 });

  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `
      UPDATE public.servicos
      SET
        titulo = COALESCE($2, titulo),
        descricao = COALESCE($3, descricao),
        ativo = COALESCE($4, ativo),
        updated_at = now()
      WHERE id = $1
      RETURNING *
      `,
      [
        id,
        typeof body.titulo === "string" ? body.titulo.trim() : null,
        typeof body.descricao === "string" ? body.descricao : null,
        typeof body.ativo === "boolean" ? body.ativo : null,
      ],
    );

    if (!rows[0]) return NextResponse.json({ ok: false, error: "nao_encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true, servico: rows[0] }, { status: 200 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "erro_desconhecido";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  } finally {
    client.release();
  }
}
