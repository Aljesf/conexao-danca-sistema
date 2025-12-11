import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

export async function adicionarProfessorNaTurmaBrowser(payload: {
  turma_id: number;
  colaborador_id: number;
  funcao_id: number;
  principal: boolean;
  observacoes?: string;
}) {
  const supabase = getSupabaseBrowser();
  const { error } = await supabase.from("turma_professores").insert(payload);
  if (error) throw error;
}
