import { NextResponse } from "next/server";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";
import { guardApiByRole } from "@/lib/auth/roleGuard";

type TabelaItemRow = {
  id: number;
  tabela_id: number;
  codigo_item: string;
  descricao: string | null;
  tipo_item: string;
  valor_centavos: number;
  ativo: boolean;
  ordem: number;
};

function parseId(param: string): number | null {
  const n = Number(param);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardApiByRole(_req as any);
  if (denied) return denied as any;
  const supabase = await getSupabaseServerSSR();
  const { id } = await ctx.params;
  const tabelaId = parseId(id);

  if (!tabelaId) {
    return NextResponse.json({ error: "ID invalido." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("matricula_tabela_itens")
    .select("id,tabela_id,codigo_item,descricao,tipo_item,valor_centavos,ativo,ordem")
    .eq("tabela_id", tabelaId)
    .order("ordem", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ itens: (data ?? []) as TabelaItemRow[] });
}
