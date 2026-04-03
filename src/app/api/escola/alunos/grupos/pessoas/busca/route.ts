import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type PessoaBuscaRow = {
  id: number;
  nome: string | null;
  telefone: string | null;
  email: string | null;
};

function parseLimit(raw: string | null, fallback = 10, max = 20): number {
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return fallback;
  return Math.min(n, max);
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().replace(/[%_]/g, "");

  if (q.length < 2) {
    return NextResponse.json({ ok: true, data: [] });
  }

  const supabase = createAdminClient();
  const limit = parseLimit(url.searchParams.get("limit"));
  const like = `%${q}%`;
  const candidateLimit = Math.min(Math.max(limit * 5, 50), 200);

  const { data: pessoasData, error: pessoasError } = await supabase
    .from("pessoas")
    .select("id,nome,telefone,email")
    .eq("ativo", true)
    .ilike("nome", like)
    .order("nome", { ascending: true })
    .limit(candidateLimit);

  if (pessoasError) {
    return NextResponse.json({ ok: false, error: pessoasError.message }, { status: 500 });
  }

  const candidatas = (pessoasData ?? []) as PessoaBuscaRow[];
  if (candidatas.length === 0) {
    return NextResponse.json({ ok: true, data: [] });
  }

  const pessoaIds = candidatas.map((row) => row.id);

  const { data: matriculasData, error: matriculasError } = await supabase
    .from("matriculas")
    .select("pessoa_id")
    .in("pessoa_id", pessoaIds)
    .eq("status", "ATIVA");

  if (matriculasError) {
    return NextResponse.json({ ok: false, error: matriculasError.message }, { status: 500 });
  }

  const pessoaIdsAtivos = new Set(
    ((matriculasData ?? []) as Array<{ pessoa_id: number | null }>).map((row) => row.pessoa_id).filter((id): id is number => Number.isFinite(id)),
  );

  const pessoas = candidatas
    .filter((row) => pessoaIdsAtivos.has(row.id))
    .slice(0, limit)
    .map((row) => ({
      id: row.id,
      nome: row.nome ?? "",
      telefone: row.telefone ?? null,
      email: row.email ?? null,
    }));

  return NextResponse.json({ ok: true, data: pessoas });
}
