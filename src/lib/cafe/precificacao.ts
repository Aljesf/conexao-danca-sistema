import type { SupabaseClient } from "@supabase/supabase-js";

type SupabaseLike = Pick<SupabaseClient, "from">;

type ProdutoBaseRow = {
  id: number;
  nome: string;
  preco_venda_centavos: number | null;
  ativo: boolean | null;
};

type TabelaPrecoRow = {
  id: number;
  codigo: string | null;
  nome: string | null;
  descricao: string | null;
  ativo: boolean | null;
  is_default: boolean | null;
  ordem: number | null;
};

export type CafeTabelaPrecoDisponivel = {
  id: number;
  nome: string;
  codigo: string | null;
  descricao: string | null;
  padrao: boolean;
  ativo: boolean;
};

export type CafeTabelaPrecoResolvida = {
  tabela_preco_atual_id: number | null;
  origem: "PADRAO" | "COLABORADOR" | "EXPLICITA" | "FALLBACK";
  itens: CafeTabelaPrecoDisponivel[];
};

export type CafePrecoProdutoResolvido = {
  produto_id: number;
  produto_nome: string;
  tabela_preco_id: number | null;
  tabela_preco_nome: string | null;
  valor_unitario_centavos: number;
  origem_preco: "TABELA_PRECO" | "PRECO_BASE";
};

type ListarTabelasParams = {
  supabase: SupabaseLike;
  compradorPessoaId?: number | null;
  compradorTipo?: string | null;
};

type ResolverTabelaPadraoParams = {
  supabase: SupabaseLike;
  compradorPessoaId?: number | null;
  compradorTipo?: string | null;
  tabelaPrecoId?: number | null;
};

type ResolverPrecoProdutoParams = {
  supabase: SupabaseLike;
  produtoId: number;
  tabelaPrecoId?: number | null;
  compradorPessoaId?: number | null;
  compradorTipo?: string | null;
};

function asInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Math.trunc(Number(value));
  }
  return null;
}

function upper(value: unknown) {
  return typeof value === "string"
    ? value
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
    : "";
}

function normalizarCompradorTipo(value: string | null | undefined) {
  const normalized = upper(value);
  if (normalized === "COLABORADOR") return "COLABORADOR" as const;
  if (normalized === "ALUNO") return "ALUNO" as const;
  if (normalized === "PESSOA_AVULSA" || normalized === "PESSOA") return "PESSOA_AVULSA" as const;
  return "NAO_IDENTIFICADO" as const;
}

function isTabelaColaborador(row: TabelaPrecoRow) {
  const codigo = upper(row.codigo);
  const nome = upper(row.nome);
  const descricao = upper(row.descricao);
  return (
    codigo.includes("COLABORADOR") ||
    nome.includes("COLABORADOR") ||
    descricao.includes("COLABORADOR")
  );
}

function mapTabela(row: TabelaPrecoRow): CafeTabelaPrecoDisponivel {
  return {
    id: row.id,
    nome: row.nome ?? `Tabela #${row.id}`,
    codigo: row.codigo ?? null,
    descricao: row.descricao ?? null,
    padrao: Boolean(row.is_default),
    ativo: row.ativo !== false,
  };
}

async function carregarPerfilComprador(params: {
  supabase: SupabaseLike;
  compradorPessoaId: number | null;
  compradorTipoInformado?: string | null;
}) {
  const tipoInformado = normalizarCompradorTipo(params.compradorTipoInformado);
  if (!params.compradorPessoaId) {
    return tipoInformado;
  }

  const [colaboradorResult, alunoResult] = await Promise.all([
    params.supabase
      .from("colaboradores")
      .select("id")
      .eq("pessoa_id", params.compradorPessoaId)
      .eq("ativo", true)
      .limit(1)
      .maybeSingle(),
    params.supabase
      .from("pessoas_roles")
      .select("pessoa_id")
      .eq("pessoa_id", params.compradorPessoaId)
      .eq("role", "ALUNO")
      .limit(1)
      .maybeSingle(),
  ]);

  if (colaboradorResult.error) throw colaboradorResult.error;
  if (alunoResult.error) throw alunoResult.error;

  if (asInt((colaboradorResult.data as { id?: number } | null)?.id)) return "COLABORADOR" as const;
  if (asInt((alunoResult.data as { pessoa_id?: number } | null)?.pessoa_id)) return "ALUNO" as const;
  return tipoInformado === "NAO_IDENTIFICADO" ? "PESSOA_AVULSA" : tipoInformado;
}

async function carregarTabelasPrecoAtivas(supabase: SupabaseLike) {
  const { data, error } = await supabase
    .from("cafe_tabelas_preco")
    .select("id,codigo,nome,descricao,ativo,is_default,ordem")
    .eq("ativo", true)
    .order("is_default", { ascending: false })
    .order("ordem", { ascending: true })
    .order("nome", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as TabelaPrecoRow[]).filter((item) => typeof item.id === "number");
}

async function resolverTabelaById(
  supabase: SupabaseLike,
  tabelaPrecoId: number,
): Promise<TabelaPrecoRow | null> {
  const { data, error } = await supabase
    .from("cafe_tabelas_preco")
    .select("id,codigo,nome,descricao,ativo,is_default,ordem")
    .eq("id", tabelaPrecoId)
    .maybeSingle();

  if (error) throw error;
  if (!data || data.ativo === false) return null;
  return data as TabelaPrecoRow;
}

export async function listarTabelasPrecoDisponiveisCafe(
  params: ListarTabelasParams,
): Promise<CafeTabelaPrecoResolvida> {
  const compradorTipo = await carregarPerfilComprador({
    supabase: params.supabase,
    compradorPessoaId: params.compradorPessoaId ?? null,
    compradorTipoInformado: params.compradorTipo ?? null,
  });

  const tabelas = await carregarTabelasPrecoAtivas(params.supabase);
  const padrao = tabelas.find((item) => item.is_default) ?? tabelas[0] ?? null;
  const colaborador = tabelas.find(isTabelaColaborador) ?? null;

  const tabelaAtual =
    compradorTipo === "COLABORADOR" ? colaborador ?? padrao ?? null : padrao ?? null;

  return {
    tabela_preco_atual_id: tabelaAtual?.id ?? null,
    origem:
      compradorTipo === "COLABORADOR" && colaborador
        ? "COLABORADOR"
        : padrao
          ? "PADRAO"
          : "FALLBACK",
    itens: tabelas.map(mapTabela),
  };
}

export async function resolverTabelaPrecoPadraoCafe(
  params: ResolverTabelaPadraoParams,
): Promise<CafeTabelaPrecoResolvida> {
  const tabelas = await listarTabelasPrecoDisponiveisCafe({
    supabase: params.supabase,
    compradorPessoaId: params.compradorPessoaId ?? null,
    compradorTipo: params.compradorTipo ?? null,
  });

  const tabelaExplicitaId = params.tabelaPrecoId ?? null;
  if (!tabelaExplicitaId) return tabelas;

  const explicita = await resolverTabelaById(params.supabase, tabelaExplicitaId);
  if (!explicita) {
    return tabelas;
  }

  return {
    ...tabelas,
    tabela_preco_atual_id: explicita.id,
    origem: "EXPLICITA",
  };
}

export async function resolverPrecoProdutoNoContexto(
  params: ResolverPrecoProdutoParams,
): Promise<CafePrecoProdutoResolvido> {
  const { supabase, produtoId } = params;
  const { data: produto, error: produtoError } = await supabase
    .from("cafe_produtos")
    .select("id,nome,preco_venda_centavos,ativo")
    .eq("id", produtoId)
    .maybeSingle();

  if (produtoError) throw produtoError;
  if (!produto) throw new Error("produto_nao_encontrado");
  if ((produto as ProdutoBaseRow).ativo === false) throw new Error("produto_inativo");

  const tabelaResolvida = await resolverTabelaPrecoPadraoCafe({
    supabase,
    compradorPessoaId: params.compradorPessoaId ?? null,
    compradorTipo: params.compradorTipo ?? null,
    tabelaPrecoId: params.tabelaPrecoId ?? null,
  });

  const tabelaPrecoId = tabelaResolvida.tabela_preco_atual_id;
  const tabelaPreco = tabelaPrecoId
    ? tabelaResolvida.itens.find((item) => item.id === tabelaPrecoId) ?? null
    : null;

  if (tabelaPrecoId) {
    const { data: precoData, error: precoError } = await supabase
      .from("cafe_produto_precos")
      .select("preco_centavos")
      .eq("produto_id", produtoId)
      .eq("tabela_preco_id", tabelaPrecoId)
      .eq("ativo", true)
      .maybeSingle();

    if (precoError) throw precoError;
    const precoTabela = asInt((precoData as { preco_centavos?: number | null } | null)?.preco_centavos);
    if (precoTabela && precoTabela > 0) {
      return {
        produto_id: produto.id,
        produto_nome: produto.nome,
        tabela_preco_id: tabelaPrecoId,
        tabela_preco_nome: tabelaPreco?.nome ?? null,
        valor_unitario_centavos: precoTabela,
        origem_preco: "TABELA_PRECO",
      };
    }
  }

  return {
    produto_id: produto.id,
    produto_nome: produto.nome,
    tabela_preco_id: tabelaPrecoId,
    tabela_preco_nome: tabelaPreco?.nome ?? null,
    valor_unitario_centavos: asInt((produto as ProdutoBaseRow).preco_venda_centavos) ?? 0,
    origem_preco: "PRECO_BASE",
  };
}
