import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type PessoaItem = {
  id: number;
  nome: string;
  cpf: string | null;
  telefone: string | null;
};

export async function GET(req: NextRequest) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;

  const { searchParams } = new URL(req.url);
  const qRaw = (searchParams.get("q") ?? "").trim();
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "10", 10) || 10, 20);

  if (qRaw.length < 2) {
    return NextResponse.json({ ok: true, q: qRaw, pessoas: [] as PessoaItem[] });
  }

  const like = `%${qRaw}%`;
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("pessoas")
    .select("id,nome,cpf,telefone")
    .or([`nome.ilike.${like}`, `cpf.ilike.${like}`, `telefone.ilike.${like}`].join(","))
    .order("nome", { ascending: true })
    .limit(limit);

  if (error) {
    return NextResponse.json({ ok: false, error: "db_erro", detail: error.message }, { status: 500 });
  }

  const pessoas = ((data ?? []) as Array<Record<string, unknown>>).map((p) => ({
    id: Number(p.id ?? 0),
    nome: String(p.nome ?? ""),
    cpf: p.cpf == null ? null : String(p.cpf),
    telefone: p.telefone == null ? null : String(p.telefone),
  })) satisfies PessoaItem[];

  return NextResponse.json({ ok: true, q: qRaw, pessoas });
}
