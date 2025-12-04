"use server";

import { getSupabaseServer } from "@/lib/supabaseServer";

export type AvaliacaoModelo = {
  id: number;
  nome: string;
  tipo_avaliacao: string | null;
  obrigatoria: boolean;
  ativo: boolean;
};

export async function listarAvaliacoesModeloAtivas(): Promise<AvaliacaoModelo[]> {
  const supabase = await getSupabaseServer();

  const { data, error } = await supabase
    .from("avaliacoes_modelo")
    .select("id, nome, tipo_avaliacao, obrigatoria, ativo")
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (error) {
    console.error("[listarAvaliacoesModeloAtivas] Erro:", error);
    return [];
  }

  return (data ?? []) as AvaliacaoModelo[];
}
