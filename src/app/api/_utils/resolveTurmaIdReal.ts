import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Normaliza o identificador de turma:
 * - se receber turmas.id, converte para turmas.turma_id (modelo atual do banco)
 * - se ja receber turmas.turma_id, retorna como esta
 */
export async function resolveTurmaIdReal(admin: SupabaseClient, turmaInput: number): Promise<number> {
  const { data, error } = await admin
    .from("turmas")
    .select("id,turma_id")
    .eq("id", turmaInput)
    .maybeSingle();

  if (error) throw error;
  if (data?.turma_id) return Number(data.turma_id);
  return turmaInput;
}
