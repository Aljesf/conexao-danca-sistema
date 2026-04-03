import type {
  MatriculaCanceladaResumo,
  MatriculaReativacaoEligibilidade,
  MatriculaReativacaoItemResumo,
} from "@/lib/matriculas/reativacao";

type SupabaseLike = {
  from: (table: string) => any;
};

type TurmaResumo = {
  turma_id: number;
  nome: string | null;
  produto_id: number | null;
};

function toPositiveInt(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function toNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const normalized = toNullableString(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function deriveModuloLabel(descricao: string | null): string | null {
  const normalized = toNullableString(descricao);
  if (!normalized) return null;
  const semLegado = normalized.replace(/^item legado\s*-\s*/i, "").trim();
  const parts = semLegado
    .split(" - ")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts[0] ?? semLegado;
}

export async function buscarMatriculasCanceladasPorPessoa(
  supabase: SupabaseLike,
  pessoaId: number,
): Promise<MatriculaReativacaoEligibilidade> {
  const { data, error } = await supabase
    .from("matriculas")
    .select(
      "id,pessoa_id,status,tipo_matricula,ano_referencia,vinculo_id,data_matricula,data_inicio_vinculo,data_encerramento,encerramento_em,encerramento_motivo,cancelamento_tipo,updated_at",
    )
    .eq("pessoa_id", pessoaId)
    .eq("status", "CANCELADA")
    .order("encerramento_em", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false });

  if (error) throw error;

  const matriculas = (data ?? []) as Array<Record<string, unknown>>;
  if (matriculas.length === 0) {
    return {
      possui_matricula_cancelada: false,
      matriculas_canceladas_encontradas: [],
      acao_sugerida: "CRIAR_NOVA",
    };
  }

  const matriculaIds = matriculas
    .map((row) => toPositiveInt(row.id))
    .filter((value): value is number => Boolean(value));

  const { data: itensRaw, error: itensError } = await supabase
    .from("matricula_itens")
    .select(
      "id,matricula_id,modulo_id,turma_id_inicial,descricao,status,data_inicio,data_fim,cancelamento_tipo",
    )
    .in("matricula_id", matriculaIds)
    .order("id", { ascending: true });

  if (itensError) throw itensError;

  const itens = (itensRaw ?? []) as Array<Record<string, unknown>>;
  const itemIds = itens
    .map((row) => toPositiveInt(row.id))
    .filter((value): value is number => Boolean(value));

  let vinculos: Array<Record<string, unknown>> = [];
  if (itemIds.length > 0) {
    const { data: vinculosRaw, error: vinculosError } = await supabase
      .from("turma_aluno")
      .select("matricula_id,matricula_item_id,turma_id,dt_inicio,dt_fim,status,turma:turmas(turma_id,nome,produto_id)")
      .in("matricula_item_id", itemIds)
      .order("dt_inicio", { ascending: false });

    if (vinculosError) throw vinculosError;
    vinculos = (vinculosRaw ?? []) as Array<Record<string, unknown>>;
  }

  const turmaIds = Array.from(
    new Set(
      [
        ...matriculas.map((row) => toPositiveInt(row.vinculo_id)),
        ...itens.map((row) => toPositiveInt(row.turma_id_inicial)),
        ...vinculos.map((row) => toPositiveInt(row.turma_id)),
      ].filter((value): value is number => Boolean(value)),
    ),
  );

  const turmaMap = new Map<number, TurmaResumo>();
  if (turmaIds.length > 0) {
    const { data: turmasRaw, error: turmasError } = await supabase
      .from("turmas")
      .select("turma_id,nome,produto_id")
      .in("turma_id", turmaIds);

    if (turmasError) throw turmasError;

    for (const row of (turmasRaw ?? []) as Array<Record<string, unknown>>) {
      const turmaId = toPositiveInt(row.turma_id);
      if (!turmaId) continue;
      turmaMap.set(turmaId, {
        turma_id: turmaId,
        nome: toNullableString(row.nome),
        produto_id: toPositiveInt(row.produto_id),
      });
    }
  }

  const moduloIds = Array.from(
    new Set(
      [
        ...itens.map((row) => toPositiveInt(row.modulo_id)),
        ...Array.from(turmaMap.values()).map((turma) => toPositiveInt(turma.produto_id)),
        ...vinculos.map((row) => {
          const turma = row.turma as Record<string, unknown> | null;
          return toPositiveInt(turma?.produto_id);
        }),
      ].filter((value): value is number => Boolean(value)),
    ),
  );

  const moduloMap = new Map<number, string | null>();
  if (moduloIds.length > 0) {
    const { data: modulosRaw, error: modulosError } = await supabase
      .from("escola_produtos_educacionais")
      .select("id,titulo")
      .in("id", moduloIds);

    if (modulosError) throw modulosError;

    for (const row of (modulosRaw ?? []) as Array<Record<string, unknown>>) {
      const moduloId = toPositiveInt(row.id);
      if (!moduloId) continue;
      moduloMap.set(moduloId, toNullableString(row.titulo));
    }
  }

  const { data: encerramentosRaw, error: encerramentosError } = await supabase
    .from("matriculas_encerramentos")
    .select("id,matricula_id,tipo,motivo,realizado_em")
    .in("matricula_id", matriculaIds)
    .eq("tipo", "CANCELADA")
    .order("realizado_em", { ascending: false });

  if (encerramentosError) throw encerramentosError;

  const ultimoEncerramentoByMatricula = new Map<number, Record<string, unknown>>();
  for (const row of (encerramentosRaw ?? []) as Array<Record<string, unknown>>) {
    const matriculaId = toPositiveInt(row.matricula_id);
    if (!matriculaId || ultimoEncerramentoByMatricula.has(matriculaId)) continue;
    ultimoEncerramentoByMatricula.set(matriculaId, row);
  }

  const itensByMatricula = new Map<number, Array<Record<string, unknown>>>();
  for (const item of itens) {
    const matriculaId = toPositiveInt(item.matricula_id);
    if (!matriculaId) continue;
    const bucket = itensByMatricula.get(matriculaId) ?? [];
    bucket.push(item);
    itensByMatricula.set(matriculaId, bucket);
  }

  const vinculosByItem = new Map<number, Array<Record<string, unknown>>>();
  for (const vinculo of vinculos) {
    const itemId = toPositiveInt(vinculo.matricula_item_id);
    if (!itemId) continue;
    const bucket = vinculosByItem.get(itemId) ?? [];
    bucket.push(vinculo);
    vinculosByItem.set(itemId, bucket);
  }

  const resumoMatriculas: MatriculaCanceladaResumo[] = matriculas
    .map((row) => {
      const matriculaId = toPositiveInt(row.id);
      const pessoaIdRow = toPositiveInt(row.pessoa_id);
      if (!matriculaId || !pessoaIdRow) return null;

      const itensMatricula = itensByMatricula.get(matriculaId) ?? [];
      const resumoItens: MatriculaReativacaoItemResumo[] = itensMatricula.map((item) => {
        const itemId = toPositiveInt(item.id);
        const itemVinculos = itemId ? vinculosByItem.get(itemId) ?? [] : [];
        const vinculoAtivo = itemVinculos.find((vinculo) => !toNullableString(vinculo.dt_fim)) ?? null;
        const vinculoAtual = vinculoAtivo ?? itemVinculos[0] ?? null;
        const turmaAtualObj = (vinculoAtual?.turma as Record<string, unknown> | null) ?? null;
        const turmaInicialId = toPositiveInt(item.turma_id_inicial);
        const turmaInicial = turmaInicialId ? turmaMap.get(turmaInicialId) ?? null : null;
        const turmaAtualId =
          toPositiveInt(vinculoAtual?.turma_id) ?? toPositiveInt(turmaAtualObj?.turma_id) ?? null;
        const turmaAtual = turmaAtualId ? turmaMap.get(turmaAtualId) ?? null : null;
        const moduloId = toPositiveInt(item.modulo_id);
        const moduloIdResolvido =
          moduloId ??
          toPositiveInt(turmaAtualObj?.produto_id) ??
          toPositiveInt(turmaAtual?.produto_id) ??
          toPositiveInt(turmaInicial?.produto_id) ??
          null;
        const moduloLabel =
          (moduloIdResolvido ? moduloMap.get(moduloIdResolvido) ?? null : null) ??
          deriveModuloLabel(toNullableString(item.descricao));

        return {
          item_id: itemId,
          modulo_id: moduloId,
          modulo_id_resolvido: moduloIdResolvido,
          modulo_label: moduloLabel,
          descricao: toNullableString(item.descricao),
          status: toNullableString(item.status),
          turma_inicial_id: turmaInicialId,
          turma_inicial_nome: turmaInicial?.nome ?? null,
          turma_atual_id: turmaAtualId,
          turma_atual_nome: turmaAtual?.nome ?? toNullableString(turmaAtualObj?.nome),
          data_inicio: toNullableString(item.data_inicio),
          data_fim: toNullableString(item.data_fim),
          cancelamento_tipo: toNullableString(item.cancelamento_tipo),
        };
      });

      if (resumoItens.length === 0) {
        const turmaFallbackId = toPositiveInt(row.vinculo_id);
        const turmaFallback = turmaFallbackId ? turmaMap.get(turmaFallbackId) ?? null : null;
        const moduloFallbackId = toPositiveInt(turmaFallback?.produto_id);
        resumoItens.push({
          item_id: null,
          modulo_id: moduloFallbackId,
          modulo_id_resolvido: moduloFallbackId,
          modulo_label: moduloFallbackId ? moduloMap.get(moduloFallbackId) ?? null : null,
          descricao: null,
          status: toNullableString(row.status),
          turma_inicial_id: turmaFallbackId,
          turma_inicial_nome: turmaFallback?.nome ?? null,
          turma_atual_id: null,
          turma_atual_nome: null,
          data_inicio: toNullableString(row.data_inicio_vinculo),
          data_fim: toNullableString(row.data_encerramento),
          cancelamento_tipo: toNullableString(row.cancelamento_tipo),
        });
      }

      const ultimoEncerramento = ultimoEncerramentoByMatricula.get(matriculaId) ?? null;
      return {
        id: matriculaId,
        pessoa_id: pessoaIdRow,
        status: toNullableString(row.status) ?? "CANCELADA",
        tipo_matricula: toNullableString(row.tipo_matricula),
        ano_referencia: toPositiveInt(row.ano_referencia),
        vinculo_id: toPositiveInt(row.vinculo_id),
        data_matricula: toNullableString(row.data_matricula),
        data_inicio_vinculo: toNullableString(row.data_inicio_vinculo),
        data_cancelamento:
          toNullableString(row.encerramento_em) ??
          toNullableString(row.data_encerramento) ??
          toNullableString(ultimoEncerramento?.realizado_em),
        motivo_cancelamento:
          toNullableString(row.encerramento_motivo) ?? toNullableString(ultimoEncerramento?.motivo),
        cancelamento_tipo: toNullableString(row.cancelamento_tipo),
        resumo_modulos: uniqueStrings(
          resumoItens.map((item) =>
            item.modulo_label ?? (item.modulo_id_resolvido ? `Modulo #${item.modulo_id_resolvido}` : null),
          ),
        ),
        resumo_turmas: uniqueStrings(
          resumoItens.map((item) => item.turma_atual_nome ?? item.turma_inicial_nome),
        ),
        itens: resumoItens,
      };
    })
    .filter((item): item is MatriculaCanceladaResumo => Boolean(item));

  return {
    possui_matricula_cancelada: resumoMatriculas.length > 0,
    matriculas_canceladas_encontradas: resumoMatriculas,
    acao_sugerida: resumoMatriculas.length > 0 ? "REATIVAR" : "CRIAR_NOVA",
  };
}
