"use server";

import { revalidatePath } from "next/cache";

import { concluirAvaliacao, iniciarAvaliacao } from "@/lib/avaliacoes/turmaAvaliacoesServer";

export async function iniciarAvaliacaoAction(avaliacaoId: number, turmaId: number) {
  await iniciarAvaliacao(avaliacaoId);
  revalidatePath(`/academico/turmas/${turmaId}`);
  revalidatePath(`/academico/turmas/${turmaId}/avaliacoes/${avaliacaoId}`);
  revalidatePath(`/avaliacoes/turma/${avaliacaoId}/lancamento`);
}

export async function concluirAvaliacaoAction(avaliacaoId: number, turmaId: number) {
  await concluirAvaliacao(avaliacaoId);
  revalidatePath(`/academico/turmas/${turmaId}`);
  revalidatePath(`/academico/turmas/${turmaId}/avaliacoes/${avaliacaoId}`);
  revalidatePath(`/avaliacoes/turma/${avaliacaoId}/lancamento`);
}
