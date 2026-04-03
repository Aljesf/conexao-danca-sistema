type SupabaseLike = {
  from: (table: string) => any;
};

export type MatriculaItemRecord = {
  id: number;
  matricula_id: number;
  curso_id: number | null;
  modulo_id: number | null;
  turma_id_inicial: number | null;
  descricao: string;
  origem_tipo: string;
  valor_base_centavos: number;
  valor_liquido_centavos: number;
  status: "ATIVO" | "CANCELADO" | "ENCERRADO" | string;
  data_inicio: string | null;
  data_fim: string | null;
  cancelamento_tipo: string | null;
  observacoes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type MatriculaItemInsert = {
  matricula_id: number;
  curso_id?: number | null;
  modulo_id?: number | null;
  turma_id_inicial?: number | null;
  descricao: string;
  origem_tipo?: string | null;
  valor_base_centavos?: number | null;
  valor_liquido_centavos?: number | null;
  status?: "ATIVO" | "CANCELADO" | "ENCERRADO";
  data_inicio?: string | null;
  data_fim?: string | null;
  cancelamento_tipo?: string | null;
  observacoes?: string | null;
};

export type MatriculaItemDetalhe = MatriculaItemRecord & {
  turma_atual_id: number | null;
  turma_atual_nome: string | null;
  turma_aluno_id_atual: number | null;
};

export type TurmaAlunoVinculoResumo = {
  turma_aluno_id: number | null;
  matricula_item_id: number;
  turma_id: number;
  aluno_pessoa_id: number;
  matricula_id: number;
  dt_inicio: string | null;
  dt_fim: string | null;
  status: string | null;
  reused: boolean;
};

export type MatriculaAtivaExistenteResumo = {
  id: number;
  pessoa_id: number;
  status: string;
  tipo_matricula: string | null;
  ano_referencia: number | null;
  vinculo_id: number | null;
  data_matricula: string | null;
  data_inicio_vinculo: string | null;
  turma_nome: string | null;
};

function asInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Math.trunc(Number(value));
  }
  return null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asDate(value: unknown): string | null {
  const parsed = asString(value);
  if (!parsed) return null;
  return /^\d{4}-\d{2}-\d{2}/.test(parsed) ? parsed.slice(0, 10) : null;
}

function toMatriculaItemRecord(row: Record<string, unknown>): MatriculaItemRecord | null {
  const id = asInt(row.id);
  const matriculaId = asInt(row.matricula_id);
  const descricao = asString(row.descricao);
  if (!id || !matriculaId || !descricao) return null;
  return {
    id,
    matricula_id: matriculaId,
    curso_id: asInt(row.curso_id),
    modulo_id: asInt(row.modulo_id),
    turma_id_inicial: asInt(row.turma_id_inicial),
    descricao,
    origem_tipo: asString(row.origem_tipo) ?? "CURSO",
    valor_base_centavos: asInt(row.valor_base_centavos) ?? 0,
    valor_liquido_centavos: asInt(row.valor_liquido_centavos) ?? 0,
    status: asString(row.status) ?? "ATIVO",
    data_inicio: asDate(row.data_inicio),
    data_fim: asDate(row.data_fim),
    cancelamento_tipo: asString(row.cancelamento_tipo),
    observacoes: asString(row.observacoes),
    created_at: asString(row.created_at),
    updated_at: asString(row.updated_at),
  };
}

export function buildReferenciaMatriculaItemCompetencia(itemId: number, competencia: string) {
  return `matricula-item:${itemId}:competencia:${competencia}`;
}

export async function buscarMatriculaAtivaExistentePorPessoa(
  supabase: SupabaseLike,
  pessoaId: number,
  options?: { excludeMatriculaId?: number | null },
): Promise<MatriculaAtivaExistenteResumo | null> {
  let query = supabase
    .from("matriculas")
    .select(
      "id,pessoa_id,status,tipo_matricula,ano_referencia,vinculo_id,data_matricula,data_inicio_vinculo,updated_at",
    )
    .eq("pessoa_id", pessoaId)
    .eq("status", "ATIVA")
    .order("updated_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(1);

  if (options?.excludeMatriculaId && Number.isInteger(options.excludeMatriculaId)) {
    query = query.neq("id", options.excludeMatriculaId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const row = ((data ?? []) as Array<Record<string, unknown>>)[0] ?? null;
  const matriculaId = asInt(row?.id);
  const pessoaIdRow = asInt(row?.pessoa_id);
  if (!matriculaId || !pessoaIdRow) return null;

  const vinculoId = asInt(row?.vinculo_id);
  let turmaNome: string | null = null;

  if (vinculoId) {
    const { data: turma, error: turmaError } = await supabase
      .from("turmas")
      .select("nome")
      .eq("turma_id", vinculoId)
      .maybeSingle();

    if (turmaError) throw turmaError;
    turmaNome = asString((turma as Record<string, unknown> | null)?.nome);
  }

  return {
    id: matriculaId,
    pessoa_id: pessoaIdRow,
    status: asString(row?.status) ?? "ATIVA",
    tipo_matricula: asString(row?.tipo_matricula),
    ano_referencia: asInt(row?.ano_referencia),
    vinculo_id: vinculoId,
    data_matricula: asDate(row?.data_matricula),
    data_inicio_vinculo: asDate(row?.data_inicio_vinculo),
    turma_nome: turmaNome,
  };
}

export async function insertMatriculaItens(
  supabase: SupabaseLike,
  itens: MatriculaItemInsert[],
): Promise<MatriculaItemRecord[]> {
  if (itens.length === 0) return [];

  const payload = itens.map((item) => ({
    matricula_id: item.matricula_id,
    curso_id: item.curso_id ?? null,
    modulo_id: item.modulo_id ?? null,
    turma_id_inicial: item.turma_id_inicial ?? null,
    descricao: item.descricao,
    origem_tipo: item.origem_tipo ?? "CURSO",
    valor_base_centavos: item.valor_base_centavos ?? 0,
    valor_liquido_centavos: item.valor_liquido_centavos ?? 0,
    status: item.status ?? "ATIVO",
    data_inicio: item.data_inicio ?? new Date().toISOString().slice(0, 10),
    data_fim: item.data_fim ?? null,
    cancelamento_tipo: item.cancelamento_tipo ?? null,
    observacoes: item.observacoes ?? null,
  }));

  const { data, error } = await supabase
    .from("matricula_itens")
    .insert(payload)
    .select(
      "id,matricula_id,curso_id,modulo_id,turma_id_inicial,descricao,origem_tipo,valor_base_centavos,valor_liquido_centavos,status,data_inicio,data_fim,cancelamento_tipo,observacoes,created_at,updated_at",
    );

  if (error) throw error;

  return ((data ?? []) as Array<Record<string, unknown>>)
    .map(toMatriculaItemRecord)
    .filter((item): item is MatriculaItemRecord => Boolean(item));
}

export async function listMatriculaItensAtivos(
  supabase: SupabaseLike,
  matriculaId: number,
): Promise<MatriculaItemRecord[]> {
  const { data, error } = await supabase
    .from("matricula_itens")
    .select(
      "id,matricula_id,curso_id,modulo_id,turma_id_inicial,descricao,origem_tipo,valor_base_centavos,valor_liquido_centavos,status,data_inicio,data_fim,cancelamento_tipo,observacoes,created_at,updated_at",
    )
    .eq("matricula_id", matriculaId)
    .eq("status", "ATIVO")
    .order("id", { ascending: true });

  if (error) throw error;

  return ((data ?? []) as Array<Record<string, unknown>>)
    .map(toMatriculaItemRecord)
    .filter((item): item is MatriculaItemRecord => Boolean(item));
}

export async function listMatriculaItens(
  supabase: SupabaseLike,
  matriculaId: number,
): Promise<MatriculaItemRecord[]> {
  const { data, error } = await supabase
    .from("matricula_itens")
    .select(
      "id,matricula_id,curso_id,modulo_id,turma_id_inicial,descricao,origem_tipo,valor_base_centavos,valor_liquido_centavos,status,data_inicio,data_fim,cancelamento_tipo,observacoes,created_at,updated_at",
    )
    .eq("matricula_id", matriculaId)
    .order("id", { ascending: true });

  if (error) throw error;

  return ((data ?? []) as Array<Record<string, unknown>>)
    .map(toMatriculaItemRecord)
    .filter((item): item is MatriculaItemRecord => Boolean(item));
}

export async function listMatriculaItensDetalhe(
  supabase: SupabaseLike,
  matriculaId: number,
): Promise<MatriculaItemDetalhe[]> {
  const items = await listMatriculaItens(supabase, matriculaId);
  if (items.length === 0) return [];

  const itemIds = items.map((item) => item.id);
  const { data: vinculosRaw, error: vinculosError } = await supabase
    .from("turma_aluno")
    .select("turma_aluno_id,matricula_item_id,turma_id,dt_inicio,dt_fim,status,turma:turmas(turma_id,nome)")
    .in("matricula_item_id", itemIds)
    .is("dt_fim", null)
    .order("dt_inicio", { ascending: false });

  if (vinculosError) throw vinculosError;

  const vinculoByItem = new Map<number, Record<string, unknown>>();
  for (const row of (vinculosRaw ?? []) as Array<Record<string, unknown>>) {
    const itemId = asInt(row.matricula_item_id);
    if (!itemId || vinculoByItem.has(itemId)) continue;
    vinculoByItem.set(itemId, row);
  }

  return items.map((item) => {
    const vinculo = vinculoByItem.get(item.id) ?? null;
    const turma = vinculo?.turma as Record<string, unknown> | undefined;
    return {
      ...item,
      turma_atual_id: asInt(vinculo?.turma_id ?? turma?.turma_id),
      turma_atual_nome: asString(turma?.nome),
      turma_aluno_id_atual: asInt(vinculo?.turma_aluno_id),
    };
  });
}

export async function vincularTurmaAlunoPorItens(params: {
  supabase: SupabaseLike;
  matriculaId: number;
  alunoPessoaId: number;
  dataInicio: string | null;
  itens: Array<{
    matricula_item_id: number;
    turma_id: number | null;
  }>;
}): Promise<TurmaAlunoVinculoResumo[]> {
  const { supabase, matriculaId, alunoPessoaId, dataInicio, itens } = params;
  const resultados: TurmaAlunoVinculoResumo[] = [];

  for (const item of itens) {
    if (!item.turma_id) continue;

    const { data: existentes, error: existentesError } = await supabase
      .from("turma_aluno")
      .select("turma_aluno_id,matricula_id,matricula_item_id,turma_id,aluno_pessoa_id,dt_inicio,dt_fim,status")
      .eq("turma_id", item.turma_id)
      .eq("aluno_pessoa_id", alunoPessoaId)
      .is("dt_fim", null)
      .order("dt_inicio", { ascending: false })
      .limit(1);

    if (existentesError) throw existentesError;

    const existente = ((existentes ?? []) as Array<Record<string, unknown>>)[0] ?? null;
    const turmaAlunoId = asInt(existente?.turma_aluno_id);

    if (!turmaAlunoId) {
      const { data: inserted, error: insertError } = await supabase
        .from("turma_aluno")
        .insert({
          turma_id: item.turma_id,
          aluno_pessoa_id: alunoPessoaId,
          matricula_id: matriculaId,
          matricula_item_id: item.matricula_item_id,
          dt_inicio: dataInicio,
          status: "ativo",
        })
        .select("turma_aluno_id,turma_id,aluno_pessoa_id,matricula_id,matricula_item_id,dt_inicio,dt_fim,status")
        .single();

      if (insertError) throw insertError;

      resultados.push({
        turma_aluno_id: asInt(inserted.turma_aluno_id),
        matricula_item_id: item.matricula_item_id,
        turma_id: item.turma_id,
        aluno_pessoa_id: alunoPessoaId,
        matricula_id: matriculaId,
        dt_inicio: asDate(inserted.dt_inicio),
        dt_fim: asDate(inserted.dt_fim),
        status: asString(inserted.status),
        reused: false,
      });
      continue;
    }

    const { data: updated, error: updateError } = await supabase
      .from("turma_aluno")
      .update({
        matricula_id: matriculaId,
        matricula_item_id: item.matricula_item_id,
      })
      .eq("turma_aluno_id", turmaAlunoId)
      .select("turma_aluno_id,turma_id,aluno_pessoa_id,matricula_id,matricula_item_id,dt_inicio,dt_fim,status")
      .single();

    if (updateError) throw updateError;

    resultados.push({
      turma_aluno_id: asInt(updated.turma_aluno_id),
      matricula_item_id: item.matricula_item_id,
      turma_id: asInt(updated.turma_id) ?? item.turma_id,
      aluno_pessoa_id: asInt(updated.aluno_pessoa_id) ?? alunoPessoaId,
      matricula_id: asInt(updated.matricula_id) ?? matriculaId,
      dt_inicio: asDate(updated.dt_inicio),
      dt_fim: asDate(updated.dt_fim),
      status: asString(updated.status),
      reused: true,
    });
  }

  return resultados;
}
