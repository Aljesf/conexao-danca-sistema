import { z } from "zod";
import type { Supa } from "./auth";

export const zStatusFrequencia = z.enum(["PRESENTE", "FALTA", "JUSTIFICADA", "ATRASO"]);

export const zItemFrequencia = z.object({
  alunoPessoaId: z.coerce.number().int().positive(),
  status: zStatusFrequencia,
  minutosAtraso: z.coerce.number().int().min(1).optional(),
  observacao: z.string().max(500).optional(),
});

export const zBodyFrequencia = z.object({
  itens: z.array(zItemFrequencia).min(1).max(200),
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

  const { error: upsertErr } = await params.supabase
    .from("turma_aula_presencas")
    .upsert(rows, { onConflict: "aula_id,aluno_pessoa_id" });

  if (upsertErr) {
    throw new Error(upsertErr.message);
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
