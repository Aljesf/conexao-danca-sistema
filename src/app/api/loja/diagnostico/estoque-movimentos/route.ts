import type { NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { requireUser } from "@/lib/supabase/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

// Endpoint de diagnóstico: tenta ler constraint e colunas de loja_estoque_movimentos.
// Observação: requer RPC "sql" habilitada no Supabase. Caso não esteja disponível,
// retornará erro orientando a rodar os SELECTs manualmente no SQL Editor.
export async function GET(request: NextRequest) {
  const denied = await guardApiByRole(request as any);
  if (denied) return denied as any;
  try {
    const auth = await requireUser(request);
    if (auth instanceof Response) return auth;

    const { supabase } = auth;

    const queries = {
      constraint: `
        select conname, pg_get_constraintdef(c.oid) as constraint_def
        from pg_constraint c
        join pg_class t on t.oid = c.conrelid
        join pg_namespace n on n.oid = t.relnamespace
        where n.nspname = 'public'
          and t.relname = 'loja_estoque_movimentos'
          and c.conname = 'loja_estoque_movimentos_motivo_check';
      `,
      columns: `
        select column_name, is_nullable, data_type
        from information_schema.columns
        where table_schema='public' and table_name='loja_estoque_movimentos'
        order by ordinal_position;
      `,
    };

    const [q1, q2] = await Promise.all([
      supabase.rpc("sql", { query: queries.constraint }),
      supabase.rpc("sql", { query: queries.columns }),
    ]);

    if (q1.error || q2.error) {
      return json(
        {
          ok: false,
          error:
            "RPC sql indisponível. Rode os SELECTs manualmente no SQL Editor do Supabase.",
          details: { constraintErr: q1.error ?? null, columnsErr: q2.error ?? null },
        },
        500
      );
    }

    return json({ ok: true, constraint: q1.data, columns: q2.data });
  } catch (err: any) {
    return json({ ok: false, error: String(err?.message || err) }, 500);
  }
}

