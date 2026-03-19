import { z } from "zod";
import type { Supa } from "./auth";

export const zStatusFrequencia = z.enum(["PRESENTE", "FALTA", "JUSTIFICADA", "ATRASO"]);

export const zItemFrequencia = z.object({
  alunoPessoaId: z.coerce.number().int().positive(),
  status: zStatusFrequencia,
  minutosAtraso: z.coerce.number().int().min(1).optional(),
  observacao: z.string().max(500).optional(),
});

export const zBodyFrequencia = z
  .object({
    itens: z.array(zItemFrequencia).max(200).default([]),
    removerAlunoPessoaIds: z.array(z.coerce.number().int().positive()).max(200).default([]),
  })
  .superRefine((body, ctx) => {
    if (body.itens.length > 0 || body.removerAlunoPessoaIds.length > 0) {
      return;
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Envie ao menos uma presenca para salvar ou remover.",
      path: ["itens"],
    });
  });

export async function getAulaOrFail(params: { supabase: Supa; aulaId: number }) {
  const { data, error } = await params.supabase
    .from("turma_aulas")
    .select("id, turma_id, data_aula")
    .eq("id", params.aulaId)
    .single();

  if (error) return { ok: false as const, status: 404, code: "AULA_NAO_ENCONTRADA" as const };
  return { ok: true as const, aula: data };
}

export async function salvarPresencasDaAula(params: {
  supabase: Supa;
  aulaId: number;
  itens: Array<z.infer<typeof zItemFrequencia>>;
  removerAlunoPessoaIds?: number[];
  registradoPorAuthUserId: string;
  registradoPorColaboradorId: number | null;
}) {
  const registradoEm = new Date().toISOString();

  const rows = params.itens.map((item) => ({
    aula_id: params.aulaId,
    aluno_pessoa_id: item.alunoPessoaId,
    status: item.status,
    minutos_atraso: item.status === "ATRASO" ? (item.minutosAtraso ?? 1) : null,
    observacao: item.observacao ?? null,
    registrado_por: params.registradoPorAuthUserId,
    registrado_por_auth_user_id: params.registradoPorAuthUserId,
    registrado_por_colaborador_id: params.registradoPorColaboradorId,
    registrado_em: registradoEm,
  }));

  const idsMantidos = new Set(rows.map((row) => row.aluno_pessoa_id));
  const removerAlunoPessoaIds = [...new Set(params.removerAlunoPessoaIds ?? [])].filter(
    (id) => !idsMantidos.has(id)
  );

  if (removerAlunoPessoaIds.length > 0) {
    const { error: deleteErr } = await params.supabase
      .from("turma_aula_presencas")
      .delete()
      .eq("aula_id", params.aulaId)
      .in("aluno_pessoa_id", removerAlunoPessoaIds);

    if (deleteErr) {
      throw new Error(deleteErr.message);
    }
  }

  if (rows.length > 0) {
    const { error: upsertErr } = await params.supabase
      .from("turma_aula_presencas")
      .upsert(rows, { onConflict: "aula_id,aluno_pessoa_id" });

    if (upsertErr) {
      throw new Error(upsertErr.message);
    }
  }

  const { data, error } = await params.supabase
    .from("turma_aula_presencas")
    .select("*")
    .eq("aula_id", params.aulaId)
    .order("aluno_pessoa_id", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return {
    salvas: rows.length,
    presencas: data ?? [],
  };
}
