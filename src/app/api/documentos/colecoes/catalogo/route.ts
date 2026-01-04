import { NextResponse } from "next/server";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";

type ColecaoColuna = {
  codigo: string;
  label: string;
  tipo: string;
  formato: string | null;
  ordem: number;
};

type ColecaoCatalogo = {
  codigo: string;
  nome: string;
  descricao: string | null;
  root_tipo: string;
  ordem: number;
  colunas: ColecaoColuna[];
};

export async function GET() {
  const supabase = await getSupabaseServerSSR();

  const { data: colecoes, error: colecoesError } = await supabase
    .from("documentos_colecoes")
    .select("id,codigo,nome,descricao,root_tipo,ordem")
    .eq("ativo", true)
    .order("ordem", { ascending: true });

  if (colecoesError) {
    return NextResponse.json({ error: colecoesError.message }, { status: 500 });
  }

  const colecaoIds = (colecoes ?? []).map((c) => c.id);

  const { data: colunas, error: colunasError } = await supabase
    .from("documentos_colecoes_colunas")
    .select("colecao_id,codigo,label,tipo,formato,ordem")
    .eq("ativo", true)
    .in("colecao_id", colecaoIds.length ? colecaoIds : [-1])
    .order("ordem", { ascending: true });

  if (colunasError) {
    return NextResponse.json({ error: colunasError.message }, { status: 500 });
  }

  const mapColunas = new Map<number, ColecaoColuna[]>();
  for (const col of colunas ?? []) {
    const rec = col as { colecao_id: number } & ColecaoColuna;
    const arr = mapColunas.get(rec.colecao_id) ?? [];
    arr.push({
      codigo: rec.codigo,
      label: rec.label,
      tipo: rec.tipo,
      formato: rec.formato ?? null,
      ordem: rec.ordem,
    });
    mapColunas.set(rec.colecao_id, arr);
  }

  const payload: ColecaoCatalogo[] = (colecoes ?? []).map((c) => ({
    codigo: c.codigo,
    nome: c.nome,
    descricao: c.descricao ?? null,
    root_tipo: c.root_tipo,
    ordem: c.ordem,
    colunas: mapColunas.get(c.id) ?? [],
  }));

  return NextResponse.json({ data: payload }, { status: 200 });
}
