import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";
import { guardApiByRole } from "@/lib/auth/roleGuard";

const PK = "politica_preco_id";

function toInt(v: string): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function mapPlano(row: Record<string, unknown>) {
  return { ...row, id: row[PK] };
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ planoId: string }> }) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;
  const { planoId } = await ctx.params;
  const pid = toInt(planoId);

  if (!pid) {
    return NextResponse.json({ error: "ID invalido." }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as
    | { nome?: unknown; descricao?: unknown; ativo?: unknown }
    | null;

  const patch: Record<string, unknown> = {};
  if (typeof body?.nome === "string" && body.nome.trim()) patch.nome = body.nome.trim();
  if (typeof body?.descricao === "string") patch.descricao = body.descricao.trim();
  if (typeof body?.ativo === "boolean") patch.ativo = body.ativo;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("financeiro_politicas_preco")
    .update(patch)
    .eq(PK, pid)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = (data ?? {}) as Record<string, unknown>;
  return NextResponse.json({ plano: mapPlano(row) });
}

