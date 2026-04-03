export type MatriculaReativacaoItemResumo = {
  item_id: number | null;
  modulo_id: number | null;
  modulo_id_resolvido: number | null;
  modulo_label: string | null;
  descricao: string | null;
  status: string | null;
  turma_inicial_id: number | null;
  turma_inicial_nome: string | null;
  turma_atual_id: number | null;
  turma_atual_nome: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  cancelamento_tipo: string | null;
};

export type MatriculaCanceladaResumo = {
  id: number;
  pessoa_id: number;
  status: string;
  tipo_matricula: string | null;
  ano_referencia: number | null;
  vinculo_id: number | null;
  data_matricula: string | null;
  data_inicio_vinculo: string | null;
  data_cancelamento: string | null;
  motivo_cancelamento: string | null;
  cancelamento_tipo: string | null;
  resumo_modulos: string[];
  resumo_turmas: string[];
  itens: MatriculaReativacaoItemResumo[];
};

export type MatriculaReativacaoEligibilidade = {
  possui_matricula_cancelada: boolean;
  matriculas_canceladas_encontradas: MatriculaCanceladaResumo[];
  acao_sugerida: "REATIVAR" | "CRIAR_NOVA";
};

export type ReativacaoConfigItem = {
  modulo_id: number;
  turma_id: number | null;
  nivel: string;
  nivel_id?: number | null;
  liquidacao_tipo?: "FAMILIA" | "BOLSA" | null;
  valor_mensal_centavos?: number | null;
  bolsa?: {
    projeto_social_id: number;
    bolsa_tipo_id: number;
  } | null;
  curso_id?: number | null;
  curso_nome?: string | null;
  turma_label?: string | null;
  origem_valor?: "TABELA" | "MANUAL" | null;
  data_inicio_aulas?: string | null;
  valor_manual_reais?: string | null;
};

export type ReativacaoTrocaTurma = {
  modulo_id: number;
  turma_origem_id: number | null;
  turma_destino_id: number;
};

export type ReativacaoPlano = {
  modulos_manter: number[];
  modulos_remover: number[];
  modulos_adicionar: Array<{ modulo_id: number; turma_id: number | null }>;
  trocas_turma: ReativacaoTrocaTurma[];
  modulos_ativos_finais: Array<{
    modulo_id: number;
    turma_id: number | null;
    origem: "REATIVADO" | "NOVO";
  }>;
  conflitos: string[];
};

function toPositiveInt(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function buildReativacaoPlano(params: {
  anteriores: MatriculaReativacaoItemResumo[];
  desejados: Array<Pick<ReativacaoConfigItem, "modulo_id" | "turma_id">>;
}): ReativacaoPlano {
  const anterioresByModulo = new Map<number, MatriculaReativacaoItemResumo>();
  const desejadosByModulo = new Map<number, Pick<ReativacaoConfigItem, "modulo_id" | "turma_id">>();
  const conflitos: string[] = [];

  for (const item of params.anteriores) {
    const moduloId = toPositiveInt(item.modulo_id_resolvido ?? item.modulo_id);
    if (!moduloId) continue;
    if (anterioresByModulo.has(moduloId)) {
      conflitos.push(`Modulo ${moduloId} duplicado no historico da matricula cancelada.`);
      continue;
    }
    anterioresByModulo.set(moduloId, item);
  }

  for (const item of params.desejados) {
    const moduloId = toPositiveInt(item.modulo_id);
    if (!moduloId) continue;
    if (desejadosByModulo.has(moduloId)) {
      conflitos.push(`Modulo ${moduloId} informado mais de uma vez na configuracao desejada.`);
      continue;
    }
    desejadosByModulo.set(moduloId, {
      modulo_id: moduloId,
      turma_id: toPositiveInt(item.turma_id),
    });
  }

  const modulosManter: number[] = [];
  const modulosRemover: number[] = [];
  const trocasTurma: ReativacaoTrocaTurma[] = [];
  const modulosAtivosFinais: ReativacaoPlano["modulos_ativos_finais"] = [];

  for (const [moduloId, itemAnterior] of anterioresByModulo.entries()) {
    const desejado = desejadosByModulo.get(moduloId);
    if (!desejado) {
      modulosRemover.push(moduloId);
      continue;
    }

    modulosManter.push(moduloId);
    const turmaOrigem = toPositiveInt(itemAnterior.turma_atual_id ?? itemAnterior.turma_inicial_id);
    const turmaDestino = toPositiveInt(desejado.turma_id);

    if (turmaOrigem && turmaDestino && turmaOrigem !== turmaDestino) {
      trocasTurma.push({
        modulo_id: moduloId,
        turma_origem_id: turmaOrigem,
        turma_destino_id: turmaDestino,
      });
    }

    modulosAtivosFinais.push({
      modulo_id: moduloId,
      turma_id: turmaDestino ?? turmaOrigem ?? null,
      origem: "REATIVADO",
    });
  }

  const modulosAdicionar: Array<{ modulo_id: number; turma_id: number | null }> = [];
  for (const [moduloId, desejado] of desejadosByModulo.entries()) {
    if (anterioresByModulo.has(moduloId)) continue;
    modulosAdicionar.push({
      modulo_id: moduloId,
      turma_id: desejado.turma_id ?? null,
    });
    modulosAtivosFinais.push({
      modulo_id: moduloId,
      turma_id: desejado.turma_id ?? null,
      origem: "NOVO",
    });
  }

  return {
    modulos_manter: modulosManter,
    modulos_remover: modulosRemover,
    modulos_adicionar: modulosAdicionar,
    trocas_turma: trocasTurma,
    modulos_ativos_finais: modulosAtivosFinais,
    conflitos,
  };
}
