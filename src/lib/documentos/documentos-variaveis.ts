import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";

export type ColecaoColunaRow = {
  colecao_id: number;
  codigo: string;
  label: string;
  tipo: string;
  formato: string | null;
  ordem: number;
  ativo: boolean;
};

export type ColecaoRow = {
  id: number;
  codigo: string;
  nome: string;
  descricao: string | null;
  root_tipo: string;
  ordem: number;
  ativo: boolean;
  colunas: ColecaoColunaRow[];
};

export type DocumentoVariavelRow = {
  id: number;
  codigo: string;
  descricao: string;
  origem: string;
  tipo: string;
  formato: string | null;
  ativo: boolean;
};

type ListarColecoesOptions = {
  somenteAtivas?: boolean;
  somenteColunasAtivas?: boolean;
};

type ListarVariaveisOptions = {
  somenteAtivas?: boolean;
};

export async function listarVariaveisSimples(
  options: ListarVariaveisOptions = {},
): Promise<DocumentoVariavelRow[]> {
  const supabase = await getSupabaseServerSSR();

  let query = supabase
    .from("documentos_variaveis")
    .select("id,codigo,descricao,origem,tipo,formato,ativo")
    .order("ativo", { ascending: false })
    .order("codigo", { ascending: true });

  if (typeof options.somenteAtivas === "boolean") {
    query = query.eq("ativo", options.somenteAtivas);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: Number(row.id),
    codigo: String(row.codigo ?? ""),
    descricao: String(row.descricao ?? ""),
    origem: String(row.origem ?? ""),
    tipo: String(row.tipo ?? ""),
    formato: row.formato ? String(row.formato) : null,
    ativo: Boolean(row.ativo),
  }));
}

export async function listarColecoes(
  options: ListarColecoesOptions = {},
): Promise<ColecaoRow[]> {
  const supabase = await getSupabaseServerSSR();

  let query = supabase
    .from("documentos_colecoes")
    .select("id,codigo,nome,descricao,root_tipo,ordem,ativo")
    .order("ordem", { ascending: true })
    .order("codigo", { ascending: true });

  if (typeof options.somenteAtivas === "boolean") {
    query = query.eq("ativo", options.somenteAtivas);
  }

  const { data: colecoes, error } = await query;
  if (error) throw new Error(error.message);

  const colecaoIds = (colecoes ?? [])
    .map((c) => Number(c.id))
    .filter((id) => Number.isFinite(id) && id > 0);

  let colunasQuery = supabase
    .from("documentos_colecoes_colunas")
    .select("colecao_id,codigo,label,tipo,formato,ordem,ativo")
    .in("colecao_id", colecaoIds.length > 0 ? colecaoIds : [-1])
    .order("ordem", { ascending: true })
    .order("codigo", { ascending: true });

  const somenteColunasAtivas =
    typeof options.somenteColunasAtivas === "boolean"
      ? options.somenteColunasAtivas
      : Boolean(options.somenteAtivas);

  if (somenteColunasAtivas) {
    colunasQuery = colunasQuery.eq("ativo", true);
  }

  const { data: colunas, error: colunasError } = await colunasQuery;
  if (colunasError) throw new Error(colunasError.message);

  const mapColunas = new Map<number, ColecaoColunaRow[]>();
  for (const col of colunas ?? []) {
    const colecaoId = Number(col.colecao_id);
    if (!Number.isFinite(colecaoId)) continue;
    const arr = mapColunas.get(colecaoId) ?? [];
    arr.push({
      colecao_id: colecaoId,
      codigo: String(col.codigo ?? ""),
      label: String(col.label ?? ""),
      tipo: String(col.tipo ?? ""),
      formato: col.formato ? String(col.formato) : null,
      ordem: Number(col.ordem ?? 0),
      ativo: Boolean(col.ativo),
    });
    mapColunas.set(colecaoId, arr);
  }

  return (colecoes ?? []).map((c) => ({
    id: Number(c.id),
    codigo: String(c.codigo ?? ""),
    nome: String(c.nome ?? ""),
    descricao: c.descricao ? String(c.descricao) : null,
    root_tipo: String(c.root_tipo ?? ""),
    ordem: Number(c.ordem ?? 0),
    ativo: Boolean(c.ativo),
    colunas: mapColunas.get(Number(c.id)) ?? [],
  }));
}
