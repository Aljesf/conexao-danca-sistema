import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";
import { guardApiByRole } from "@/lib/auth/roleGuard";

type PessoaSearchRow = {
  id: number;
  nome: string | null;
  cpf: string | null;
};

function sanitizeQuery(q: string): string {
  return q.trim().replace(/\s+/g, " ");
}

export async function GET(req: NextRequest): Promise<Response> {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;
  const { searchParams } = new URL(req.url);

  const rawQ = searchParams.get("q") ?? "";
  const q = sanitizeQuery(rawQ);
  const limitParam = Number(searchParams.get("limit") ?? "20");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 5), 30) : 20;

  if (q.length < 2) {
    return NextResponse.json({ pessoas: [] as PessoaSearchRow[] });
  }

  const qDigits = q.replace(/\D/g, "");
  const hasCpfDigits = qDigits.length >= 3;

  const or = hasCpfDigits ? `nome.ilike.%${q}%,cpf.ilike.%${qDigits}%` : `nome.ilike.%${q}%`;

  const { data, error } = await supabase
    .from("pessoas")
    .select("id, nome, cpf")
    .or(or)
    .order("nome", { ascending: true })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const pessoas = (data ?? []).map((p) => ({
    id: p.id as number,
    nome: (p as { nome?: string | null }).nome ?? null,
    cpf: (p as { cpf?: string | null }).cpf ?? null,
  })) satisfies PessoaSearchRow[];

  return NextResponse.json({ pessoas });
}


