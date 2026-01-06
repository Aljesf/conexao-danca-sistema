"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  atualizarModelo,
  criarModelo,
} from "@/lib/avaliacoes/modelosServer";
import type { TipoAvaliacao } from "@/types/avaliacoes";

const grupoSchema = z.object({
  nome: z.string().min(1, "Informe o nome do grupo"),
  descricao: z.string().optional(),
  itens: z
    .array(z.string().min(1, "Item não pode ser vazio"))
    .min(1, "Adicione pelo menos um item"),
});

const modeloSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
  tipo_avaliacao: z.enum(["PRATICA", "TEORICA", "DESEMPENHO", "MISTA"] as [
    TipoAvaliacao,
    ...TipoAvaliacao[]
  ]),
  obrigatoria: z.boolean().default(false),
  grupos: z.array(grupoSchema).min(1, "Adicione pelo menos um grupo"),
  conceitos_ids: z.array(z.number().int()).min(1, "Selecione ao menos um conceito"),
  ativo: z.boolean().default(true),
});

export type ModeloFormInput = z.infer<typeof modeloSchema>;

export async function criarModeloAction(data: ModeloFormInput) {
  try {
    const payload = modeloSchema.parse(data);
    await criarModelo(payload);
    revalidatePath("/escola/academico/avaliacoes/modelos");
    redirect("/escola/academico/avaliacoes/modelos");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao criar modelo.";
    console.error("Erro ao criar modelo:", error);
    return { error: message };
  }
}

export async function atualizarModeloAction(id: number, data: ModeloFormInput) {
  try {
    const payload = modeloSchema.parse(data);
    await atualizarModelo(id, payload);
    revalidatePath("/escola/academico/avaliacoes/modelos");
    redirect("/escola/academico/avaliacoes/modelos");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar modelo.";
    console.error("Erro ao atualizar modelo:", error);
    return { error: message };
  }
}
