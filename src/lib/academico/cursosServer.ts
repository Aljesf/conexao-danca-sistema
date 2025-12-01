import { getSupabaseServer } from "@/lib/supabaseServer";

export type CursoItem = {
  id: number;
  nome: string;
};

export async function listarCursos() {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase.from("cursos").select("id, nome").order("nome");
  if (error) {
    console.error("Erro ao listar cursos:", error);
    throw error;
  }
  return (data ?? []) as CursoItem[];
}
