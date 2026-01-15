import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ListaRow = {
  id: number;
  titulo: string;
  contexto: string | null;
  status: string;
  bloqueada: boolean;
  observacoes: string | null;
  criado_em: string;
};

type ItemRow = {
  id: number;
  lista_id: number;
  produto_id: number | null;
  produto_variacao_id: number | null;
  descricao_livre: string | null;
  quantidade: number;
  observacoes: string | null;
  pessoa_id: number | null;
  criado_em: string;
};

type ProdutoRow = { id: number; nome: string; codigo: string | null };
type VariacaoRow = {
  id: number;
  produto_id: number;
  sku: string | null;
  tamanho_id: number | null;
  cor_id: number | null;
};
type TamanhoRow = { id: number; nome: string };
type CorRow = { id: number; nome: string; codigo: string | null; hex: string | null };
type PessoaRow = { id: number; nome: string; cpf: string | null };

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  const supabase = await createClient();
  const listaId = Number(ctx.params.id);

  if (!Number.isFinite(listaId) || listaId <= 0) {
    return NextResponse.json({ error: "Lista invalida" }, { status: 400 });
  }

  const { data: lista, error: listaErr } = await supabase
    .from("loja_listas_demanda")
    .select("*")
    .eq("id", listaId)
    .single();

  if (listaErr) {
    return NextResponse.json({ error: listaErr.message }, { status: 500 });
  }

  const { data: itens, error: itensErr } = await supabase
    .from("loja_listas_demanda_itens")
    .select("*")
    .eq("lista_id", listaId)
    .order("id", { ascending: true });

  if (itensErr) {
    return NextResponse.json({ error: itensErr.message }, { status: 500 });
  }

  const itemRows = (itens ?? []) as ItemRow[];

  const produtoIds = uniq(
    itemRows.map((i) => i.produto_id).filter((v): v is number => typeof v === "number")
  );
  const variacaoIds = uniq(
    itemRows
      .map((i) => i.produto_variacao_id)
      .filter((v): v is number => typeof v === "number")
  );
  const pessoaIds = uniq(
    itemRows.map((i) => i.pessoa_id).filter((v): v is number => typeof v === "number")
  );

  const [{ data: produtos }, { data: variacoes }, { data: pessoas }] = await Promise.all([
    produtoIds.length
      ? supabase.from("loja_produtos").select("id,nome,codigo").in("id", produtoIds)
      : Promise.resolve({ data: [] as ProdutoRow[] }),
    variacaoIds.length
      ? supabase
          .from("loja_produto_variantes")
          .select("id,produto_id,sku,tamanho_id,cor_id")
          .in("id", variacaoIds)
      : Promise.resolve({ data: [] as VariacaoRow[] }),
    pessoaIds.length
      ? supabase.from("pessoas").select("id,nome,cpf").in("id", pessoaIds)
      : Promise.resolve({ data: [] as PessoaRow[] }),
  ]);

  const tamanhoIds = uniq(
    ((variacoes ?? []) as VariacaoRow[])
      .map((v) => v.tamanho_id)
      .filter((v): v is number => typeof v === "number")
  );
  const corIds = uniq(
    ((variacoes ?? []) as VariacaoRow[])
      .map((v) => v.cor_id)
      .filter((v): v is number => typeof v === "number")
  );

  const [{ data: tamanhos }, { data: cores }] = await Promise.all([
    tamanhoIds.length
      ? supabase.from("loja_tamanhos").select("id,nome").in("id", tamanhoIds)
      : Promise.resolve({ data: [] as TamanhoRow[] }),
    corIds.length
      ? supabase.from("loja_cores").select("id,nome,codigo,hex").in("id", corIds)
      : Promise.resolve({ data: [] as CorRow[] }),
  ]);

  const mapProdutos = new Map<number, ProdutoRow>(
    ((produtos ?? []) as ProdutoRow[]).map((p) => [p.id, p])
  );
  const mapVariacoes = new Map<number, VariacaoRow>(
    ((variacoes ?? []) as VariacaoRow[]).map((v) => [v.id, v])
  );
  const mapPessoas = new Map<number, PessoaRow>(
    ((pessoas ?? []) as PessoaRow[]).map((p) => [p.id, p])
  );
  const mapTamanhos = new Map<number, TamanhoRow>(
    ((tamanhos ?? []) as TamanhoRow[]).map((t) => [t.id, t])
  );
  const mapCores = new Map<number, CorRow>(
    ((cores ?? []) as CorRow[]).map((c) => [c.id, c])
  );

  const itensEnriquecidos = itemRows.map((it, idx) => {
    const produto = it.produto_id ? mapProdutos.get(it.produto_id) ?? null : null;
    const variacao = it.produto_variacao_id
      ? mapVariacoes.get(it.produto_variacao_id) ?? null
      : null;
    const tamanho = variacao?.tamanho_id
      ? mapTamanhos.get(variacao.tamanho_id) ?? null
      : null;
    const cor = variacao?.cor_id ? mapCores.get(variacao.cor_id) ?? null : null;
    const pessoa = it.pessoa_id ? mapPessoas.get(it.pessoa_id) ?? null : null;

    const variacaoLabelParts: string[] = [];
    if (tamanho?.nome) variacaoLabelParts.push(tamanho.nome);
    if (cor?.nome) variacaoLabelParts.push(cor.nome);
    const variacaoLabel = variacaoLabelParts.length
      ? variacaoLabelParts.join(" | ")
      : variacao?.sku ?? null;

    return {
      item: idx + 1,
      id: it.id,
      quantidade: it.quantidade,
      observacoes: it.observacoes,
      descricao_livre: it.descricao_livre,
      produto: produto ? { id: produto.id, nome: produto.nome, codigo: produto.codigo } : null,
      variacao: variacao
        ? { id: variacao.id, label: variacaoLabel, sku: variacao.sku }
        : null,
      destinatario: pessoa ? { id: pessoa.id, nome: pessoa.nome, cpf: pessoa.cpf } : null,
      raw: {
        produto_id: it.produto_id,
        produto_variacao_id: it.produto_variacao_id,
        pessoa_id: it.pessoa_id,
      },
    };
  });

  const resumoMap = new Map<string, { produto: string; variacao: string; quantidade: number }>();
  for (const it of itensEnriquecidos) {
    const produtoNome = it.produto?.nome ?? (it.descricao_livre ?? "Item livre");
    const variacaoNome = it.variacao?.label ?? "-";
    const key = `${produtoNome}||${variacaoNome}`;
    const current = resumoMap.get(key);
    if (current) current.quantidade += it.quantidade;
    else resumoMap.set(key, { produto: produtoNome, variacao: variacaoNome, quantidade: it.quantidade });
  }

  const resumo = Array.from(resumoMap.values()).sort((a, b) => b.quantidade - a.quantidade);

  return NextResponse.json(
    {
      lista: lista as ListaRow,
      itens: itensEnriquecidos,
      resumo,
    },
    { status: 200 }
  );
}
