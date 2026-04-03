type SupabaseLike = {
  from: (table: string) => any;
};

type PgClientLike = {
  query: (sql: string, params?: unknown[]) => Promise<unknown>;
};

export const MATRICULA_EVENTO_TIPOS = [
  "CRIADA",
  "CANCELADA",
  "REATIVADA",
  "CONCLUIDA",
  "MODULO_ADICIONADO",
  "MODULO_REMOVIDO",
  "TURMA_TROCADA",
  "EXCECAO_PRIMEIRO_PAGAMENTO_CONCEDIDA",
  "EXCECAO_PRIMEIRO_PAGAMENTO_REVOGADA",
  "OBSERVACAO_INTERNA",
  "STATUS_ALTERADO",
] as const;

export type MatriculaEventoTipo = (typeof MATRICULA_EVENTO_TIPOS)[number];

export type MatriculaEventoInsert = {
  matricula_id: number;
  tipo_evento: MatriculaEventoTipo;
  dados?: Record<string, unknown> | null;
  autorizado_por?: string | null;
  modulo_id?: number | null;
  turma_origem_id?: number | null;
  turma_destino_id?: number | null;
  observacao?: string | null;
  created_by?: string | null;
};

function toPositiveInt(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function toNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function normalizeMatriculaEventoInsert(evento: MatriculaEventoInsert) {
  const authorizedBy = toNullableString(evento.autorizado_por) ?? toNullableString(evento.created_by);
  return {
    matricula_id: toPositiveInt(evento.matricula_id),
    tipo_evento: evento.tipo_evento,
    dados: evento.dados ?? {},
    autorizado_por: authorizedBy,
    modulo_id: toPositiveInt(evento.modulo_id),
    turma_origem_id: toPositiveInt(evento.turma_origem_id),
    turma_destino_id: toPositiveInt(evento.turma_destino_id),
    observacao: toNullableString(evento.observacao),
    created_by: toNullableString(evento.created_by) ?? authorizedBy,
  };
}

export async function inserirMatriculaEventoSupabase(
  supabase: SupabaseLike,
  evento: MatriculaEventoInsert,
): Promise<void> {
  const payload = normalizeMatriculaEventoInsert(evento);
  if (!payload.matricula_id) {
    throw new Error("matricula_evento_matricula_id_invalido");
  }

  const { error } = await supabase.from("matricula_eventos").insert(payload);
  if (error) throw error;
}

export async function inserirMatriculaEventoPg(
  client: PgClientLike,
  evento: MatriculaEventoInsert,
): Promise<void> {
  const payload = normalizeMatriculaEventoInsert(evento);
  if (!payload.matricula_id) {
    throw new Error("matricula_evento_matricula_id_invalido");
  }

  await client.query(
    `
      INSERT INTO public.matricula_eventos (
        matricula_id,
        tipo_evento,
        dados,
        autorizado_por,
        modulo_id,
        turma_origem_id,
        turma_destino_id,
        observacao,
        created_by
      )
      VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9)
    `,
    [
      payload.matricula_id,
      payload.tipo_evento,
      JSON.stringify(payload.dados ?? {}),
      payload.autorizado_por,
      payload.modulo_id,
      payload.turma_origem_id,
      payload.turma_destino_id,
      payload.observacao,
      payload.created_by,
    ],
  );
}
