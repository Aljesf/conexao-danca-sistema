import { NextResponse } from "next/server";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";

type PoliticaPadraoRow = {
  id: number;
  tabela_id: number;
  tabela_item_id: number;
  politica_preco_id: number;
  created_at: string | null;
  updated_at: string | null;
  tabela?: {
    id: number;
    titulo: string;
    ano_referencia: number | null;
    ativo: boolean;
  } | null;
  item?: {
    id: number;
    codigo_item: string;
    descricao: string | null;
    tipo_item: string;
    valor_centavos: number;
    ativo: boolean;
    ordem: number;
  } | null;
  politica?: {
    politica_preco_id: number;
    nome: string;
    ativo: boolean;
  } | null;
};

function toInt(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Math.trunc(Number(v));
  return null;
}

export async function GET() {
  const supabase = await getSupabaseServerSSR();

  const { data, error } = await supabase
    .from("financeiro_politicas_preco_padroes")
    .select(
      `
      id,tabela_id,tabela_item_id,politica_preco_id,created_at,updated_at,
      tabela:matricula_tabelas ( id,titulo,ano_referencia,ativo ),
      item:matricula_tabela_itens ( id,codigo_item,descricao,tipo_item,valor_centavos,ativo,ordem ),
      politica:financeiro_politicas_preco ( politica_preco_id,nome,ativo )
    `,
    )
    .order("id", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ padroes: (data ?? []) as PoliticaPadraoRow[] });
}

export async function POST(req: Request) {
  const supabase = await getSupabaseServerSSR();
  const body = (await req.json().catch(() => null)) as
    | { tabela_id?: unknown; tabela_item_id?: unknown; politica_preco_id?: unknown }
    | null;

  const tabelaId = toInt(body?.tabela_id);
  const tabelaItemId = toInt(body?.tabela_item_id);
  const politicaId = toInt(body?.politica_preco_id);

  if (!tabelaId || !tabelaItemId || !politicaId) {
    return NextResponse.json({ error: "tabela_id, tabela_item_id e politica_preco_id sao obrigatorios." }, { status: 400 });
  }

  const payload = {
    tabela_id: tabelaId,
    tabela_item_id: tabelaItemId,
    politica_preco_id: politicaId,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("financeiro_politicas_preco_padroes")
    .upsert(payload, { onConflict: "tabela_id,tabela_item_id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
