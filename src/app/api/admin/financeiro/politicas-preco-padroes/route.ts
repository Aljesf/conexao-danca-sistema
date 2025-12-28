import { NextResponse } from "next/server";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";

type PoliticaPadraoRow = {
  id: number;
  tabela_id: number;
  tabela_item_id: number;
  politica_id: number;
  ativo: boolean;
  created_at: string | null;
  politica?: { id: number; nome: string; ativo: boolean } | null;
  item?: {
    id: number;
    codigo_item: string;
    descricao: string | null;
    tipo_item: string;
    valor_centavos: number;
    ativo: boolean;
    ordem: number;
  } | null;
};

function toInt(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Math.trunc(Number(v));
  return null;
}

export async function GET(req: Request) {
  const supabase = await getSupabaseServerSSR();
  const url = new URL(req.url);
  const tabelaId = toInt(url.searchParams.get("tabela_id"));

  if (url.searchParams.has("tabela_id") && !tabelaId) {
    return NextResponse.json({ error: "tabela_id invalido." }, { status: 400 });
  }

  let query = supabase
    .from("financeiro_politicas_preco_padrao")
    .select(
      `
      id,tabela_id,tabela_item_id,politica_id,ativo,created_at,
      politica:financeiro_politicas_preco ( id,nome,ativo ),
      item:matricula_tabela_itens ( id,codigo_item,descricao,tipo_item,valor_centavos,ativo,ordem )
    `,
    )
    .eq("ativo", true);

  if (tabelaId) {
    query = query.eq("tabela_id", tabelaId);
  }

  const { data, error } = await query.order("id", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ padroes: (data ?? []) as PoliticaPadraoRow[] });
}

export async function POST(req: Request) {
  const supabase = await getSupabaseServerSSR();
  const body = (await req.json().catch(() => null)) as
    | { tabela_id?: unknown; tabela_item_id?: unknown; politica_id?: unknown }
    | null;

  const tabelaId = toInt(body?.tabela_id);
  const tabelaItemId = toInt(body?.tabela_item_id);
  const politicaId = toInt(body?.politica_id);

  if (!tabelaId || !tabelaItemId || !politicaId) {
    return NextResponse.json({ error: "tabela_id, tabela_item_id e politica_id sao obrigatorios." }, { status: 400 });
  }

  const { data: politica, error: politicaErr } = await supabase
    .from("financeiro_politicas_preco")
    .select("id,ativo")
    .eq("id", politicaId)
    .maybeSingle();

  if (politicaErr) {
    return NextResponse.json({ error: politicaErr.message }, { status: 500 });
  }
  if (!politica) {
    return NextResponse.json({ error: "Politica nao encontrada." }, { status: 404 });
  }
  if (!politica.ativo) {
    return NextResponse.json({ error: "Nao e permitido definir politica inativa como padrao." }, { status: 400 });
  }

  const { error: desativarErr } = await supabase
    .from("financeiro_politicas_preco_padrao")
    .update({ ativo: false })
    .eq("tabela_id", tabelaId)
    .eq("tabela_item_id", tabelaItemId)
    .eq("ativo", true);

  if (desativarErr) {
    return NextResponse.json({ error: desativarErr.message }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("financeiro_politicas_preco_padrao")
    .insert({
      tabela_id: tabelaId,
      tabela_item_id: tabelaItemId,
      politica_id: politicaId,
      ativo: true,
    })
    .select("id,tabela_id,tabela_item_id,politica_id,ativo,created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ padrao: data }, { status: 201 });
}
