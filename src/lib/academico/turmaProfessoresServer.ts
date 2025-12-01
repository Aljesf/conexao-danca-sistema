"use server";

import { getSupabaseServer } from "@/lib/supabaseServer";

export async function listarProfessoresDaTurma(turmaId: number) {
  const supabase = getSupabaseServer();

  const { data, error } = await supabase
    .from("turma_professores")
    .select(
      `
        id,
        turma_id,
        pessoa_id,
        papel,
        pessoas (
          id,
          nome,
          nome_social
        )
      `,
    )
    .eq("turma_id", turmaId)
    .order("papel", { ascending: true });

  if (error) {
    console.error("[listarProfessoresDaTurma] Erro:", error);
    throw new Error(error.message);
  }

  return data ?? [];
}
