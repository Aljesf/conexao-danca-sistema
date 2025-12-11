import { getSupabaseServer } from "@/lib/supabaseServer";
import type { ModeloAvaliacao } from "@/types/avaliacoes";

export async function listarModelos(): Promise<ModeloAvaliacao[]> {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("avaliacoes_modelo")
    .select("*")
    .order("nome", { ascending: true });

  if (error) {
    console.error("Erro ao listar modelos de avaliação:", error);
    return [];
  }

  return (data ?? []) as ModeloAvaliacao[];
}

export async function buscarModelo(id: number): Promise<ModeloAvaliacao | null> {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("avaliacoes_modelo")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Erro ao buscar modelo:", error);
    return null;
  }

  return data as ModeloAvaliacao;
}

export async function criarModelo(payload: Partial<ModeloAvaliacao>) {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("avaliacoes_modelo")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as ModeloAvaliacao;
}

export async function atualizarModelo(id: number, payload: Partial<ModeloAvaliacao>) {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("avaliacoes_modelo")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as ModeloAvaliacao;
}

export async function deletarModelo(id: number) {
  // Soft delete: marca ativo = false
  const supabase = await getSupabaseServer();
  const { error } = await supabase
    .from("avaliacoes_modelo")
    .update({ ativo: false })
    .eq("id", id);

  if (error) throw error;
}
