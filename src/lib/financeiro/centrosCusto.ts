import { SupabaseClient } from "@supabase/supabase-js";

const centroCustoCache = new Map<string, number | null>();

function normalizeCodigo(codigo: string): string {
  return codigo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

export async function getCentroCustoIdPorCodigos(
  supabase: SupabaseClient<any> | null,
  codigos: string[],
): Promise<number | null> {
  if (!supabase || codigos.length === 0) return null;

  const aliases = Array.from(
    new Set(codigos.map(normalizeCodigo).filter((codigo) => codigo.length > 0)),
  );
  if (aliases.length === 0) return null;

  const cacheKey = aliases.join("|");
  if (centroCustoCache.has(cacheKey)) {
    return centroCustoCache.get(cacheKey) ?? null;
  }

  const { data, error } = await supabase
    .from("centros_custo")
    .select("id, codigo, nome")
    .eq("ativo", true);

  if (error) {
    console.error("[centrosCusto] Nao foi possivel buscar centros de custo:", error);
    centroCustoCache.set(cacheKey, null);
    return null;
  }

  const centroEncontrado =
    (data ?? []).find((row) => aliases.includes(normalizeCodigo(String(row.codigo ?? "")))) ??
    (data ?? []).find((row) => aliases.includes(normalizeCodigo(String(row.nome ?? "")))) ??
    null;

  const centroId = centroEncontrado ? Number(centroEncontrado.id) : null;
  centroCustoCache.set(cacheKey, Number.isFinite(centroId) ? centroId : null);
  return Number.isFinite(centroId) ? centroId : null;
}

export async function getCentroCustoLojaId(
  supabase: SupabaseClient<any> | null,
): Promise<number | null> {
  return getCentroCustoIdPorCodigos(supabase, ["LOJA", "AJ DANCE STORE"]);
}

export async function getCentroCustoEscolaId(
  supabase: SupabaseClient<any> | null,
): Promise<number | null> {
  return getCentroCustoIdPorCodigos(supabase, ["ESCOLA", "ESC", "ESCOLA CONEXAO DANCA"]);
}

export async function getCentroCustoCafeId(
  supabase: SupabaseClient<any> | null,
): Promise<number | null> {
  return getCentroCustoIdPorCodigos(supabase, ["CAFE", "CAF", "BALLET CAFE"]);
}

export async function getCentroCustoIntermediacaoId(
  supabase: SupabaseClient<any> | null,
): Promise<number | null> {
  return getCentroCustoIdPorCodigos(supabase, ["FIN", "INTERMEDIACAO FINANCEIRA"]);
}
