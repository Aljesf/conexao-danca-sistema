"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { criarAvaliacaoParaTurma } from "@/lib/avaliacoes/turmaAvaliacoesServer";

const novaAvaliacaoSchema = z.object({
  modeloId: z.coerce.number().int().min(1, "Selecione um modelo"),
  titulo: z.string().min(1, "Informe o título"),
  descricao: z.string().optional(),
  obrigatoria: z.boolean().default(false),
  data_prevista: z.string().optional(),
});

export async function criarTurmaAvaliacaoAction(turmaId: number, formData: FormData) {
  try {
    const parsed = novaAvaliacaoSchema.parse({
      modeloId: formData.get("modeloId"),
      titulo: formData.get("titulo"),
      descricao: formData.get("descricao") || undefined,
      obrigatoria: formData.get("obrigatoria") === "on",
      data_prevista: formData.get("data_prevista") || undefined,
    });

    const payload: Parameters<typeof criarAvaliacaoParaTurma>[0] = {
      turma_id: turmaId,
      avaliacao_modelo_id: parsed.modeloId,
      titulo: parsed.titulo,
      descricao: parsed.descricao ?? null,
      obrigatoria: parsed.obrigatoria,
      data_prevista: parsed.data_prevista ?? null,
      status: "RASCUNHO",
      data_realizada: null,
    };

    await criarAvaliacaoParaTurma(payload);

    revalidatePath(`/academico/turmas/${turmaId}`);
    redirect(`/academico/turmas/${turmaId}#avaliacoes`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao salvar avaliação.";
    console.error("Erro ao criar avaliação da turma:", error);
    return { error: message };
  }
}
