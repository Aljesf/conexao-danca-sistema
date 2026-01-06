"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import {
  atualizarConceito,
  criarConceito,
} from "@/lib/avaliacoes/conceitosServer";
import type { ConceitoAvaliacao } from "@/types/avaliacoes";

type ConceitoPayload = Pick<
  ConceitoAvaliacao,
  "codigo" | "rotulo" | "descricao" | "ordem" | "cor_hex" | "ativo"
>;

export async function criarConceitoAction(data: ConceitoPayload) {
  try {
    await criarConceito(normalizePayload(data));
    revalidatePath("/escola/academico/avaliacoes/conceitos");
    redirect("/escola/academico/avaliacoes/conceitos");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao criar conceito.";
    console.error("Erro ao criar conceito:", error);
    return { error: message };
  }
}

export async function atualizarConceitoAction(
  id: number,
  data: ConceitoPayload
) {
  try {
    await atualizarConceito(id, normalizePayload(data));
    revalidatePath("/escola/academico/avaliacoes/conceitos");
    redirect("/escola/academico/avaliacoes/conceitos");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar conceito.";
    console.error("Erro ao atualizar conceito:", error);
    return { error: message };
  }
}

function normalizePayload(data: ConceitoPayload) {
  return {
    codigo: data.codigo?.trim()?.toUpperCase() ?? "",
    rotulo: data.rotulo?.trim() ?? "",
    descricao: data.descricao?.trim() || null,
    ordem: data.ordem ?? 1,
    cor_hex: data.cor_hex?.trim() || null,
    ativo: data.ativo ?? true,
  };
}
