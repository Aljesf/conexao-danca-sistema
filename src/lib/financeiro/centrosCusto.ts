import { SupabaseClient } from "@supabase/supabase-js";

let centroCustoLojaIdCache: number | null = null;

export async function getCentroCustoLojaId(
  supabase: SupabaseClient<any> | null
): Promise<number | null> {
  if (!supabase) return null;
  if (centroCustoLojaIdCache) return centroCustoLojaIdCache;

  const { data, error } = await supabase
    .from("centros_custo")
    .select("id, codigo")
    .eq("codigo", "LOJA")
    .maybeSingle();

  if (error || !data) {
    console.error("[centrosCusto] Nao foi possivel obter centro de custo LOJA:", error);
    return null;
  }

  centroCustoLojaIdCache = data.id as number;
  return centroCustoLojaIdCache;
}
