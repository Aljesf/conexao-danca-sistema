import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Normaliza o identificador de turma:
 * - valida contra turmas.turma_id (modelo atual do banco)
 */
export async function resolveTurmaIdReal(admin: SupabaseClient, turmaInput: number): Promise<number> {
  const { data, error } = await admin
    .from("turmas")
    .select("turma_id")
    .eq("turma_id", turmaInput)
    .maybeSingle();

  if (error) throw error;
  if (data?.turma_id) return Number(data.turma_id);
  return turmaInput;
}
