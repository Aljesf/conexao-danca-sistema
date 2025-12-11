import { getSupabaseServer } from "@/lib/supabaseServer";
import type { ConceitoAvaliacao } from "@/types/avaliacoes";

export async function listarConceitos(): Promise<ConceitoAvaliacao[]> {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("avaliacoes_conceitos")
    .select("*")
    .order("ordem", { ascending: true })
    .order("rotulo", { ascending: true });

  if (error) {
    console.error("Erro ao listar conceitos:", error);
    return [];
  }

  return (data ?? []) as ConceitoAvaliacao[];
}

export async function buscarConceito(id: number): Promise<ConceitoAvaliacao | null> {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("avaliacoes_conceitos")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Erro ao buscar conceito:", error);
    return null;
  }

  return data as ConceitoAvaliacao;
}

export async function criarConceito(payload: Partial<ConceitoAvaliacao>) {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("avaliacoes_conceitos")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as ConceitoAvaliacao;
}

export async function atualizarConceito(id: number, payload: Partial<ConceitoAvaliacao>) {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("avaliacoes_conceitos")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as ConceitoAvaliacao;
}

export async function toggleAtivoConceito(id: number, ativo: boolean) {
  const supabase = await getSupabaseServer();
  const { error } = await supabase
    .from("avaliacoes_conceitos")
    .update({ ativo })
    .eq("id", id);

  if (error) throw error;
}
