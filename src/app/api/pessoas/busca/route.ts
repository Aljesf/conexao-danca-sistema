import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type PessoaBuscaItem = {
  id: number;
  nome: string;
  cpf: string | null;
};

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    const sp = req.nextUrl.searchParams;

    // Compatibilidade: vários pontos do sistema usam nomes diferentes.
    const raw = sp.get("q") ?? sp.get("query") ?? sp.get("search") ?? "";
    const q = raw.trim();

    const limitParam = sp.get("limit");
    const limit = Math.min(Math.max(Number(limitParam ?? 20) || 20, 1), 50);

    // Evita varrer o banco com 0/1 caracteres
    if (q.length < 2) {
      return NextResponse.json({ pessoas: [], items: [] }, { status: 200 });
    }

    const { data, error } = await supabase
      .from("pessoas")
      .select("id,nome,nome_social,cpf")
      .eq("ativo", true)
      .or(`nome.ilike.%${q}%,nome_social.ilike.%${q}%,cpf.ilike.%${q}%`)
      .order("nome", { ascending: true })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        { error: error.message, pessoas: [], items: [] },
        { status: 500 }
      );
    }

    const items: PessoaBuscaItem[] = (data ?? []).map((p) => ({
      id: Number(p.id),
      nome: String(p.nome ?? ""),
      cpf: p.cpf ?? null,
    }));

    // Compatibilidade: alguns componentes esperam "items", outros "pessoas".
    return NextResponse.json({ pessoas: items, items }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro_desconhecido";
    return NextResponse.json(
      { error: msg, pessoas: [], items: [] },
      { status: 500 }
    );
  }
}
