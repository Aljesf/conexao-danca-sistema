import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PessoaBuscaItem = {
  id: number;
  nome: string;
  email?: string | null;
};

type PessoaRow = {
  id: number | string | null;
  nome: string | null;
  email: string | null;
};

function normalizeQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").replace(/[%_]/g, "");
}

function parseLimit(raw: string | null, fallback = 10, max = 20): number {
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return fallback;
  return Math.min(n, max);
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const qRaw = url.searchParams.get("q") ?? url.searchParams.get("query") ?? "";
    const q = normalizeQuery(qRaw);

    if (q.length < 2) {
      return NextResponse.json({ items: [] satisfies PessoaBuscaItem[] }, { status: 200 });
    }

    const limit = parseLimit(url.searchParams.get("limit"));
    const supabase = await createClient();
    const like = `%${q}%`;
    const digits = q.replace(/\D/g, "");

    const orParts = [`nome.ilike.${like}`, `email.ilike.${like}`];
    if (digits.length >= 2) {
      orParts.push(`cpf.ilike.%${digits}%`);
    }

    const { data, error } = await supabase
      .from("pessoas")
      .select("id,nome,email")
      .or(orParts.join(","))
      .order("nome", { ascending: true })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        { error: "falha_busca_pessoas", message: error.message },
        { status: 500 }
      );
    }

    const rows = (data ?? []) as PessoaRow[];
    const items: PessoaBuscaItem[] = rows.map((p) => ({
      id: Number(p.id),
      nome: String(p.nome ?? ""),
      email: p.email ?? null,
    }));

    return NextResponse.json({ items }, { status: 200 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json(
      { error: "falha_busca_pessoas", message },
      { status: 500 }
    );
  }
}
