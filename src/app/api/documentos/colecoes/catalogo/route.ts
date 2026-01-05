import { NextResponse } from "next/server";
import { listarColecoes } from "@/lib/documentos/documentos-variaveis";

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
  try {
    const colecoes = await listarColecoes({ somenteAtivas: true, somenteColunasAtivas: true });

    const payload: ColecaoCatalogo[] = colecoes.map((c) => ({
      codigo: c.codigo,
      nome: c.nome,
      descricao: c.descricao,
      root_tipo: c.root_tipo,
      ordem: c.ordem,
      colunas: c.colunas.map((col) => ({
        codigo: col.codigo,
        label: col.label,
        tipo: col.tipo,
        formato: col.formato ?? null,
        ordem: col.ordem,
      })),
    }));

    return NextResponse.json({ data: payload }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao carregar colecoes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
