"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { salvarResultadosLancamento } from "@/lib/avaliacoes/resultadoServer";

const alunoSchema = z.object({
  pessoaId: z.number().int(),
  conceitoFinalId: z.number().int().nullable(),
  observacoes: z.string().optional(),
  conceitosPorGrupo: z.record(z.string(), z.number().int().nullable()),
});

const lancamentoSchema = z.object({
  data_avaliacao: z.string().min(1, "Informe a data da avaliação"),
  alunos: z.array(alunoSchema),
});

export type LancamentoInput = z.infer<typeof lancamentoSchema>;

export async function salvarLancamentoAction(
  avaliacaoId: number,
  data: LancamentoInput
) {
  try {
    const parsed = lancamentoSchema.parse(data);
    await salvarResultadosLancamento(
      avaliacaoId,
      parsed.data_avaliacao,
      parsed.alunos.map((a) => ({
        pessoaId: a.pessoaId,
        conceitoFinalId: a.conceitoFinalId,
        observacoes: a.observacoes ?? null,
        conceitosPorGrupo: a.conceitosPorGrupo ?? {},
      }))
    );

    revalidatePath(`/avaliacoes/turma/${avaliacaoId}/lancamento`);
    redirect(`/academico/turmas/${await getTurmaIdByAvaliacao(avaliacaoId)}#avaliacoes`);
  } catch (error: any) {
    console.error("Erro ao salvar lançamento:", error);
    return { error: error?.message ?? "Erro ao salvar resultados." };
  }
}

async function getTurmaIdByAvaliacao(avaliacaoId: number) {
  const { getSupabaseServer } = await import("@/lib/supabaseServer");
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("turma_avaliacoes")
    .select("turma_id")
    .eq("id", avaliacaoId)
    .single();
  return data?.turma_id ?? "";
}
