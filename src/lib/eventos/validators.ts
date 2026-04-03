import type {
  CoreografiaEstiloPayload,
  CoreografiaEstiloUpdatePayload,
  CoreografiaFormacao,
  CoreografiaMestrePayload,
  CoreografiaMestreUpdatePayload,
  EventoParticipanteExternoPayload,
  EventoParticipanteExternoUpdatePayload,
  EventoContratacaoPayload,
  EventoCoreografiaParticipantePayload,
  EventoDiaPayload,
  EventoEdicaoCalendarioPayload,
  EventoEdicaoCalendarioTipo,
  EventoEdicaoCalendarioUpdatePayload,
  EventoEdicaoConfiguracaoPayload,
  EventoEdicaoInscricaoPagamentoFinanceiroPayload,
  EventoEdicaoRegraFinanceiraPayload,
  EventoEdicaoDestinoFinanceiro,
  EventoEdicaoInscricaoPayload,
  EventoEdicaoInscricaoAdicionarItensPayload,
  EventoEdicaoInscricaoCancelarItemPayload,
  EventoEdicaoInscricaoUpdatePayload,
  EventoEdicaoCoreografiaVinculoPayload,
  EventoEdicaoCoreografiaVinculoUpdatePayload,
  EventoEdicaoItemFinanceiroPayload,
  EventoEdicaoModalidadePagamentoFinanceiro,
  EventoEdicaoOrigemInscricao,
  EventoEdicaoPayload,
  EventoEdicaoUpdatePayload,
  EventoEscolaPayload,
  EventoEscolaUpdatePayload,
  EventoFinanceiroReferenciaPayload,
  EventoInscricaoItemPayload,
  EventoInscricaoPayload,
  EventoModalidadePayload,
  EventoSessaoAtividadePayload,
  EventoSessaoPayload,
  EventoTurmaVinculoPayload,
} from "@/lib/eventos/types";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function asOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return typeof value === "string" ? value.trim() : undefined;
}

function asOptionalBoolean(
  value: unknown,
  fallback?: boolean,
): boolean | undefined {
  if (value === undefined) return fallback;
  if (typeof value === "boolean") return value;
  return fallback;
}

function asOptionalNumber(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return undefined;
}

function asOptionalInteger(value: unknown): number | null | undefined {
  const parsed = asOptionalNumber(value);
  if (parsed === undefined || parsed === null) return parsed;
  return Number.isInteger(parsed) ? parsed : undefined;
}

function asOptionalObject(
  value: unknown,
): Record<string, unknown> | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return isRecord(value) ? value : undefined;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => isNonEmptyString(item))
    .map((item) => item.trim());
}

function asCompetenciasArray(value: unknown): string[] {
  const values =
    typeof value === "string"
      ? value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : asStringArray(value);

  return Array.from(
    new Set(values.filter((item) => /^[0-9]{4}-[0-9]{2}$/.test(item))),
  ).sort((left, right) => left.localeCompare(right));
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function assertEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
): asserts value is T {
  assert(isNonEmptyString(value), `${field} é obrigatório`);
  assert(allowed.includes(value as T), `${field} inválido`);
}

const TIPOS_EVENTO = [
  "REUNIAO",
  "FESTIVAL",
  "MOSTRA",
  "ESPETACULO",
  "WORKSHOP",
  "FESTA",
  "AUDICAO",
  "AULA_ABERTA",
  "APRESENTACAO_EXTERNA",
  "OUTRO",
] as const;
const NATUREZAS_EVENTO = [
  "PEDAGOGICO",
  "ARTISTICO",
  "INSTITUCIONAL",
  "COMERCIAL",
  "SOCIAL",
] as const;
const ABRANGENCIAS_EVENTO = ["INTERNO", "EXTERNO", "HIBRIDO"] as const;
const STATUS_EDICAO = [
  "EM_PLANEJAMENTO",
  "INSCRICOES_ABERTAS",
  "EM_ANDAMENTO",
  "ENCERRADO",
  "CANCELADO",
] as const;
const STATUS_DIA = [
  "PLANEJADO",
  "CONFIRMADO",
  "EM_EXECUCAO",
  "ENCERRADO",
  "CANCELADO",
] as const;
const TIPOS_SESSAO = [
  "MANHA",
  "TARDE",
  "NOITE",
  "EXTRA",
  "ENSAIO",
  "APRESENTACAO",
  "WORKSHOP",
  "CERIMONIA",
  "OUTRO",
] as const;
const STATUS_SESSAO = [
  "PLANEJADA",
  "ABERTA",
  "EM_EXECUCAO",
  "ENCERRADA",
  "CANCELADA",
] as const;
const TIPOS_MODALIDADE = [
  "INSCRICAO",
  "PARTICIPACAO",
  "COREOGRAFIA",
  "SOLO",
  "DUO",
  "TRIO",
  "GRUPO",
  "FIGURINO",
  "WORKSHOP",
  "ITEM_COMPLEMENTAR",
  "OUTRO",
] as const;
const TIPOS_ATIVIDADE = [
  "CREDENCIAMENTO",
  "ABERTURA",
  "ENSAIO",
  "ENSAIO_GERAL",
  "ENTREGA_FIGURINO",
  "CAMARIM",
  "APRESENTACAO",
  "PREMIACAO",
  "INTERVALO",
  "WORKSHOP",
  "REUNIAO",
  "MONTAGEM",
  "DESMONTAGEM",
  "OUTRO",
] as const;
const FORMACOES = ["SOLO", "DUO", "TRIO", "GRUPO", "TURMA", "LIVRE"] as const;
const TIPOS_VINCULO_TURMA = [
  "ENSAIO",
  "CURSO_LIVRE",
  "OFICINA",
  "APOIO",
  "OUTRO",
] as const;
const STATUS_CONTRATACAO = [
  "RASCUNHO",
  "CONTRATADO",
  "EM_EXECUCAO",
  "CONCLUIDO",
  "CANCELADO",
] as const;
const NATUREZAS_FINANCEIRAS = ["RECEITA", "DESPESA"] as const;
const ORIGENS_FINANCEIRAS = [
  "INSCRICAO_EVENTO",
  "ITEM_INSCRICAO_EVENTO",
  "CONTA_INTERNA",
  "COBRANCA",
  "RECEBIMENTO",
  "CONTA_PAGAR",
  "PAGAMENTO_CONTA_PAGAR",
  "MOVIMENTO_FINANCEIRO",
  "INGRESSO",
  "PEDIDO_INGRESSO",
  "AJUSTE_MANUAL",
] as const;
const TIPOS_ITEM_FINANCEIRO = [
  "FIGURINO",
  "ENSAIO_EXTRA",
  "KIT",
  "MIDIA",
  "TAXA_ADMINISTRATIVA",
  "OUTRO",
] as const;
const MODOS_COBRANCA_ITEM = [
  "UNICO",
  "POR_ALUNO",
  "POR_TURMA",
  "POR_GRUPO",
  "POR_COREOGRAFIA",
  "PACOTE",
] as const;
const MODOS_COMPOSICAO_VALOR = [
  "VALOR_FIXO",
  "POR_COREOGRAFIA",
  "PACOTE",
  "PERSONALIZADO",
] as const;
const TIPOS_REGRA_FINANCEIRA_EDICAO = [
  "TAXA_GERAL",
  "POR_FORMACAO",
  "POR_MODALIDADE",
  "POR_PROGRESSAO",
  "POR_QUANTIDADE",
  "ITEM_ADICIONAL",
] as const;
const MODOS_CALCULO_REGRA_FINANCEIRA = [
  "VALOR_FIXO",
  "VALOR_TOTAL_FAIXA",
  "VALOR_POR_PARTICIPANTE",
  "VALOR_INCREMENTAL",
] as const;
const MODOS_COBRANCA = ["UNICA", "PARCELADA"] as const;
const ORIGENS_INSCRICAO = [
  "INSCRICAO_INTERNA",
  "INSCRICAO_EXTERNA",
] as const;
const DESTINOS_FINANCEIROS_INSCRICAO = [
  "CONTA_INTERNA",
  "COBRANCA_DIRETA",
  "COBRANCA_AVULSA",
] as const;
const MODALIDADES_PAGAMENTO_FINANCEIRO_INSCRICAO = [
  "ATO_TOTAL",
  "CONTA_INTERNA_TOTAL",
  "MISTO",
] as const;
const STATUS_INSCRICAO = ["RASCUNHO", "CONFIRMADA", "CANCELADA"] as const;
const STATUS_FINANCEIRO_INSCRICAO = [
  "NAO_GERADO",
  "PENDENTE",
  "PARCIAL",
  "PAGO",
  "ISENTO",
  "CANCELADO",
] as const;
const TIPOS_CALENDARIO = [
  "INSCRICAO",
  "ENSAIO",
  "APRESENTACAO",
  "REUNIAO",
  "PRAZO_INTERNO",
  "OUTRO",
] as const;

function normalizeCoreografiaLimites(
  tipoFormacao: CoreografiaFormacao,
  minimo: number | null | undefined,
  maximo: number | null | undefined,
) {
  if (tipoFormacao === "SOLO") return { minimo: 1, maximo: 1 };
  if (tipoFormacao === "DUO") return { minimo: 2, maximo: 2 };
  if (tipoFormacao === "TRIO") return { minimo: 3, maximo: 3 };
  const min = minimo ?? 1;
  const max = maximo ?? Math.max(min, 20);
  assert(min >= 1, "quantidade minima deve ser maior que zero");
  assert(max >= min, "quantidade maxima deve ser maior ou igual a minima");
  return { minimo: min, maximo: max };
}

function validateParticipacaoArtisticaPayload(input: unknown) {
  assert(isRecord(input), "participacao artistica invalida");
  assert(
    isNonEmptyString(input.coreografiaVinculoId ?? input.coreografia_vinculo_id),
    "coreografiaVinculoId e obrigatorio",
  );

  const formacao = input.formacao;
  if (formacao !== undefined && formacao !== null) {
    assertEnum(formacao, FORMACOES, "formacao");
  }

  return {
    coreografiaVinculoId: String(
      input.coreografiaVinculoId ?? input.coreografia_vinculo_id,
    ),
    formacao:
      (formacao as CoreografiaFormacao | undefined | null) ?? null,
  };
}

function uniqueOrderedStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function validateEventoPayload(input: unknown): EventoEscolaPayload {
  assert(isRecord(input), "payload inválido");
  const titulo = input.titulo ?? input.nome;
  const tipoEvento = input.tipoEvento ?? input.tipo_evento;
  const naturezaEvento = input.naturezaEvento ?? input.natureza;
  const abrangenciaEvento = input.abrangenciaEvento ?? input.abrangencia;
  assert(isNonEmptyString(titulo), "titulo é obrigatório");
  assertEnum(tipoEvento, TIPOS_EVENTO, "tipoEvento");
  assertEnum(naturezaEvento, NATUREZAS_EVENTO, "naturezaEvento");
  assertEnum(abrangenciaEvento, ABRANGENCIAS_EVENTO, "abrangenciaEvento");
  return {
    titulo: titulo.trim(),
    descricao: asOptionalString(input.descricao),
    tipoEvento,
    naturezaEvento,
    abrangenciaEvento,
    publicoAlvo: asOptionalString(input.publicoAlvo ?? input.publico_alvo),
    ativo: asOptionalBoolean(input.ativo, true),
  };
}

export function validateEventoUpdatePayload(
  input: unknown,
): EventoEscolaUpdatePayload {
  assert(isRecord(input), "payload inválido");
  assert(
    isNonEmptyString(input.eventoId ?? input.evento_id),
    "eventoId é obrigatório",
  );
  const tipoEvento = input.tipoEvento ?? input.tipo_evento;
  const naturezaEvento = input.naturezaEvento ?? input.natureza;
  const abrangenciaEvento = input.abrangenciaEvento ?? input.abrangencia;
  if (tipoEvento !== undefined) assertEnum(tipoEvento, TIPOS_EVENTO, "tipoEvento");
  if (naturezaEvento !== undefined) {
    assertEnum(naturezaEvento, NATUREZAS_EVENTO, "naturezaEvento");
  }
  if (abrangenciaEvento !== undefined) {
    assertEnum(abrangenciaEvento, ABRANGENCIAS_EVENTO, "abrangenciaEvento");
  }
  return {
    eventoId: String(input.eventoId ?? input.evento_id),
    titulo: isNonEmptyString(input.titulo ?? input.nome)
      ? String(input.titulo ?? input.nome).trim()
      : undefined,
    descricao: asOptionalString(input.descricao),
    tipoEvento,
    naturezaEvento,
    abrangenciaEvento,
    publicoAlvo: asOptionalString(input.publicoAlvo ?? input.publico_alvo),
    ativo: asOptionalBoolean(input.ativo),
  };
}

export function validateEdicaoPayload(input: unknown): EventoEdicaoPayload {
  assert(isRecord(input), "payload inválido");
  assert(
    isNonEmptyString(input.eventoId ?? input.evento_id),
    "eventoId é obrigatório",
  );
  assert(
    isNonEmptyString(input.tituloExibicao ?? input.titulo_exibicao),
    "tituloExibicao é obrigatório",
  );
  const ano = asOptionalInteger(input.anoReferencia ?? input.ano_referencia);
  assert(typeof ano === "number", "anoReferencia é obrigatório");
  if (input.status !== undefined) assertEnum(input.status, STATUS_EDICAO, "status");
  return {
    eventoId: String(input.eventoId ?? input.evento_id),
    tituloExibicao: String(input.tituloExibicao ?? input.titulo_exibicao).trim(),
    tema: asOptionalString(input.tema),
    descricao: asOptionalString(input.descricao),
    anoReferencia: ano,
    status: input.status as EventoEdicaoPayload["status"] | undefined,
    dataInicio: asOptionalString(input.dataInicio ?? input.data_inicio),
    dataFim: asOptionalString(input.dataFim ?? input.data_fim),
    localPrincipalNome: asOptionalString(
      input.localPrincipalNome ?? input.local_principal_nome,
    ),
    localPrincipalEndereco: asOptionalString(
      input.localPrincipalEndereco ?? input.local_principal_endereco,
    ),
    localPrincipalCidade: asOptionalString(
      input.localPrincipalCidade ?? input.local_principal_cidade,
    ),
    regulamentoResumo: asOptionalString(
      input.regulamentoResumo ?? input.regulamento_resumo,
    ),
    observacoes: asOptionalString(input.observacoes),
  };
}

export function validateEdicaoUpdatePayload(
  input: unknown,
): EventoEdicaoUpdatePayload {
  assert(isRecord(input), "payload inválido");
  assert(
    isNonEmptyString(input.edicaoId ?? input.edicao_id),
    "edicaoId é obrigatório",
  );
  if (input.status !== undefined) assertEnum(input.status, STATUS_EDICAO, "status");
  return {
    edicaoId: String(input.edicaoId ?? input.edicao_id),
    tituloExibicao: isNonEmptyString(input.tituloExibicao ?? input.titulo_exibicao)
      ? String(input.tituloExibicao ?? input.titulo_exibicao).trim()
      : undefined,
    tema: asOptionalString(input.tema),
    descricao: asOptionalString(input.descricao),
    anoReferencia:
      asOptionalInteger(input.anoReferencia ?? input.ano_referencia) ?? undefined,
    status: input.status as EventoEdicaoPayload["status"] | undefined,
    dataInicio: asOptionalString(input.dataInicio ?? input.data_inicio),
    dataFim: asOptionalString(input.dataFim ?? input.data_fim),
    localPrincipalNome: asOptionalString(
      input.localPrincipalNome ?? input.local_principal_nome,
    ),
    localPrincipalEndereco: asOptionalString(
      input.localPrincipalEndereco ?? input.local_principal_endereco,
    ),
    localPrincipalCidade: asOptionalString(
      input.localPrincipalCidade ?? input.local_principal_cidade,
    ),
    regulamentoResumo: asOptionalString(
      input.regulamentoResumo ?? input.regulamento_resumo,
    ),
    observacoes: asOptionalString(input.observacoes),
  };
}

export function validateDiaPayload(input: unknown): EventoDiaPayload {
  assert(isRecord(input), "payload inválido");
  assert(
    isNonEmptyString(input.edicaoId ?? input.edicao_id),
    "edicaoId é obrigatório",
  );
  assert(
    isNonEmptyString(input.dataEvento ?? input.data_evento),
    "dataEvento é obrigatório",
  );
  if (input.status !== undefined) assertEnum(input.status, STATUS_DIA, "status");
  return {
    edicaoId: String(input.edicaoId ?? input.edicao_id),
    dataEvento: String(input.dataEvento ?? input.data_evento),
    titulo: asOptionalString(input.titulo),
    ordem: asOptionalInteger(input.ordem),
    status: input.status as EventoDiaPayload["status"] | undefined,
    observacoes: asOptionalString(input.observacoes),
  };
}

export function validateSessaoPayload(input: unknown): EventoSessaoPayload {
  assert(isRecord(input), "payload inválido");
  assert(
    isNonEmptyString(input.edicaoId ?? input.edicao_id),
    "edicaoId é obrigatório",
  );
  assert(isNonEmptyString(input.diaId ?? input.dia_id), "diaId é obrigatório");
  assert(isNonEmptyString(input.titulo), "titulo é obrigatório");
  assertEnum(input.tipoSessao ?? input.tipo_sessao, TIPOS_SESSAO, "tipoSessao");
  if (input.status !== undefined) assertEnum(input.status, STATUS_SESSAO, "status");
  return {
    edicaoId: String(input.edicaoId ?? input.edicao_id),
    diaId: String(input.diaId ?? input.dia_id),
    localId: asOptionalString(input.localId ?? input.local_id),
    titulo: String(input.titulo).trim(),
    subtitulo: asOptionalString(input.subtitulo),
    tipoSessao: (input.tipoSessao ??
      input.tipo_sessao) as EventoSessaoPayload["tipoSessao"],
    horaInicio: asOptionalString(input.horaInicio ?? input.hora_inicio),
    horaFim: asOptionalString(input.horaFim ?? input.hora_fim),
    ordem: asOptionalInteger(input.ordem),
    status: input.status as EventoSessaoPayload["status"] | undefined,
    capacidadeTotal:
      asOptionalInteger(input.capacidadeTotal ?? input.capacidade_total) ?? null,
    exigeIngresso: asOptionalBoolean(
      input.exigeIngresso ?? input.exige_ingresso,
      false,
    ),
    usaMapaLugares: asOptionalBoolean(
      input.usaMapaLugares ?? input.usa_mapa_lugares,
      false,
    ),
    permitePublicoExterno: asOptionalBoolean(
      input.permitePublicoExterno ?? input.permite_publico_externo,
      true,
    ),
    observacoes: asOptionalString(input.observacoes),
  };
}

export function validateModalidadePayload(
  input: unknown,
): EventoModalidadePayload {
  assert(isRecord(input), "payload inválido");
  assert(
    isNonEmptyString(input.edicaoId ?? input.edicao_id),
    "edicaoId é obrigatório",
  );
  assert(isNonEmptyString(input.nome), "nome é obrigatório");
  assertEnum(
    input.tipoModalidade ?? input.tipo_modalidade,
    TIPOS_MODALIDADE,
    "tipoModalidade",
  );
  return {
    edicaoId: String(input.edicaoId ?? input.edicao_id),
    codigo: asOptionalString(input.codigo),
    nome: String(input.nome).trim(),
    tipoModalidade: (input.tipoModalidade ??
      input.tipo_modalidade) as EventoModalidadePayload["tipoModalidade"],
    descricao: asOptionalString(input.descricao),
    obrigatoria: asOptionalBoolean(input.obrigatoria, false),
    permiteMultiplasUnidades: asOptionalBoolean(
      input.permiteMultiplasUnidades ?? input.permite_multiplas_unidades,
      false,
    ),
    quantidadeMinima:
      asOptionalInteger(input.quantidadeMinima ?? input.quantidade_minima) ?? null,
    quantidadeMaxima:
      asOptionalInteger(input.quantidadeMaxima ?? input.quantidade_maxima) ?? null,
    ativo: asOptionalBoolean(input.ativo, true),
  };
}

export function validateInscricaoPayload(input: unknown): EventoInscricaoPayload {
  assert(isRecord(input), "payload inválido");
  assert(
    isNonEmptyString(input.edicaoId ?? input.edicao_id),
    "edicaoId é obrigatório",
  );
  const pessoaId = asOptionalInteger(input.pessoaId ?? input.pessoa_id);
  assert(typeof pessoaId === "number", "pessoaId é obrigatório");
  return {
    edicaoId: String(input.edicaoId ?? input.edicao_id),
    pessoaId,
    alunoPessoaId:
      asOptionalInteger(input.alunoPessoaId ?? input.aluno_pessoa_id) ?? null,
    responsavelFinanceiroId:
      asOptionalInteger(
        input.responsavelFinanceiroId ?? input.responsavel_financeiro_id,
      ) ?? null,
    contaInternaId:
      asOptionalInteger(input.contaInternaId ?? input.conta_interna_id) ?? null,
    observacoes: asOptionalString(input.observacoes),
  };
}

export function validateInscricaoItemPayload(
  input: unknown,
): EventoInscricaoItemPayload {
  assert(isRecord(input), "payload inválido");
  assert(
    isNonEmptyString(input.inscricaoId ?? input.inscricao_id),
    "inscricaoId é obrigatório",
  );
  return {
    inscricaoId: String(input.inscricaoId ?? input.inscricao_id),
    modalidadeId: asOptionalString(input.modalidadeId ?? input.modalidade_id),
    subeventoId: asOptionalString(input.subeventoId ?? input.subevento_id),
    descricao: asOptionalString(input.descricao),
    quantidade: asOptionalInteger(input.quantidade) ?? 1,
    valorUnitarioCentavos:
      asOptionalInteger(input.valorUnitarioCentavos ?? input.valor_unitario_centavos) ??
      0,
    obrigatorio: asOptionalBoolean(input.obrigatorio, false),
    observacoes: asOptionalString(input.observacoes),
  };
}

export function validateParticipanteExternoPayload(
  input: unknown,
): EventoParticipanteExternoPayload {
  assert(isRecord(input), "payload invalido");
  assert(isNonEmptyString(input.nome), "nome e obrigatorio");

  return {
    participanteExternoId: isNonEmptyString(
      input.participanteExternoId ?? input.participante_externo_id,
    )
      ? String(input.participanteExternoId ?? input.participante_externo_id)
      : undefined,
    nome: String(input.nome).trim(),
    dataNascimento: asOptionalString(input.dataNascimento ?? input.data_nascimento),
    documento: asOptionalString(input.documento),
    telefone: asOptionalString(input.telefone),
    email: asOptionalString(input.email),
    responsavelNome: asOptionalString(
      input.responsavelNome ?? input.responsavel_nome,
    ),
    observacoes: asOptionalString(input.observacoes),
    ativo: asOptionalBoolean(input.ativo, true),
  };
}

export function validateParticipanteExternoUpdatePayload(
  input: unknown,
): EventoParticipanteExternoUpdatePayload {
  assert(isRecord(input), "payload invalido");
  assert(
    isNonEmptyString(input.participanteExternoId ?? input.participante_externo_id),
    "participanteExternoId e obrigatorio",
  );

  return {
    participanteExternoId: String(
      input.participanteExternoId ?? input.participante_externo_id,
    ),
    nome: isNonEmptyString(input.nome) ? String(input.nome).trim() : undefined,
    dataNascimento: asOptionalString(input.dataNascimento ?? input.data_nascimento),
    documento: asOptionalString(input.documento),
    telefone: asOptionalString(input.telefone),
    email: asOptionalString(input.email),
    responsavelNome: asOptionalString(
      input.responsavelNome ?? input.responsavel_nome,
    ),
    observacoes: asOptionalString(input.observacoes),
    ativo: asOptionalBoolean(input.ativo),
  };
}

function validatePagamentoFinanceiroInscricaoPayload(
  input: unknown,
): EventoEdicaoInscricaoPagamentoFinanceiroPayload {
  assert(isRecord(input), "pagamentoFinanceiro invalido");

  const modalidade =
    input.modalidade ?? input.modalidade_pagamento ?? input.modalidadePagamento;
  assertEnum(
    modalidade,
    MODALIDADES_PAGAMENTO_FINANCEIRO_INSCRICAO,
    "pagamentoFinanceiro.modalidade",
  );

  const parcelasOrigem =
    input.parcelasContaInternaSelecionadas ??
    input.parcelas_conta_interna_selecionadas;
  const parcelasContaInternaSelecionadas = Array.isArray(parcelasOrigem)
    ? parcelasOrigem.map((item, index) => {
        assert(
          isRecord(item),
          `pagamentoFinanceiro.parcelasContaInternaSelecionadas[${index}] invalida`,
        );

        const parcelaNumero = asOptionalInteger(
          item.parcelaNumero ?? item.parcela_numero,
        );
        const totalParcelas = asOptionalInteger(
          item.totalParcelas ?? item.total_parcelas,
        );
        const competencia = asOptionalString(item.competencia);
        const valorCentavos = asOptionalInteger(
          item.valorCentavos ?? item.valor_centavos,
        );

        assert(
          typeof parcelaNumero === "number" && parcelaNumero > 0,
          "parcelaNumero invalido",
        );
        assert(
          typeof totalParcelas === "number" && totalParcelas > 0,
          "totalParcelas invalido",
        );
        assert(
          typeof competencia === "string" &&
            /^[0-9]{4}-[0-9]{2}$/.test(competencia),
          "competencia invalida",
        );
        assert(
          typeof valorCentavos === "number" && valorCentavos >= 0,
          "valorCentavos invalido",
        );

        return {
          parcelaNumero,
          totalParcelas,
          competencia,
          valorCentavos,
        };
      })
    : [];

  return {
    modalidade: modalidade as EventoEdicaoModalidadePagamentoFinanceiro,
    valorPagoAtoCentavos:
      asOptionalInteger(
        input.valorPagoAtoCentavos ?? input.valor_pago_ato_centavos,
      ) ?? null,
    formaPagamentoId:
      asOptionalInteger(input.formaPagamentoId ?? input.forma_pagamento_id) ?? null,
    formaPagamentoCodigo:
      asOptionalString(
        input.formaPagamentoCodigo ?? input.forma_pagamento_codigo,
      ) ?? null,
    observacoesPagamento:
      asOptionalString(
        input.observacoesPagamento ?? input.observacoes_pagamento,
      ) ?? null,
    parcelasContaInternaSelecionadas,
  };
}

export function validateEdicaoInscricaoPayload(
  input: unknown,
): EventoEdicaoInscricaoPayload {
  assert(isRecord(input), "payload invalido");
  assert(
    isNonEmptyString(input.edicaoId ?? input.edicao_id),
    "edicaoId e obrigatorio",
  );
  const origem = input.origemInscricao ?? input.origem_inscricao;
  assertEnum(origem, ORIGENS_INSCRICAO, "origemInscricao");

  const pagamentoNoAto =
    asOptionalBoolean(input.pagamentoNoAto ?? input.pagamento_no_ato, false) ??
    false;
  const destino = input.destinoFinanceiro ?? input.destino_financeiro;
  const pagamentoFinanceiroBruto =
    input.pagamentoFinanceiro ?? input.pagamento_financeiro;
  const pagamentoFinanceiro =
    pagamentoFinanceiroBruto !== undefined && pagamentoFinanceiroBruto !== null
      ? validatePagamentoFinanceiroInscricaoPayload(pagamentoFinanceiroBruto)
      : null;

  if (destino !== undefined) {
    assertEnum(destino, DESTINOS_FINANCEIROS_INSCRICAO, "destinoFinanceiro");
  }

  const participanteExternoBruto =
    input.participanteExterno ?? input.participante_externo;
  const participanteExterno =
    participanteExternoBruto && isRecord(participanteExternoBruto)
      ? validateParticipanteExternoPayload(participanteExternoBruto)
      : null;

  const alunoPessoaId = asOptionalInteger(input.alunoPessoaId ?? input.aluno_pessoa_id);
  const participanteExternoId = asOptionalString(
    input.participanteExternoId ?? input.participante_externo_id,
  );
  const participacoesArtisticasOrigem =
    input.participacoesArtisticas ?? input.participacoes_artisticas;
  const participacoesArtisticas = Array.isArray(participacoesArtisticasOrigem)
    ? participacoesArtisticasOrigem.map(validateParticipacaoArtisticaPayload)
    : [];
  const coreografiaVinculoIds = uniqueOrderedStrings([
    ...participacoesArtisticas.map((item) => item.coreografiaVinculoId),
    ...asStringArray(
      input.coreografiaVinculoIds ?? input.coreografia_vinculo_ids,
    ),
  ]);

  if (origem === "INSCRICAO_INTERNA") {
    assert(typeof alunoPessoaId === "number", "alunoPessoaId e obrigatorio");
  }

  if (origem === "INSCRICAO_EXTERNA") {
    assert(
      participanteExternoId ||
        (participanteExterno && isNonEmptyString(participanteExterno.nome)),
      "participante externo e obrigatorio",
    );
  }

  const destinoPadrao: EventoEdicaoDestinoFinanceiro =
    origem === "INSCRICAO_EXTERNA"
      ? "COBRANCA_AVULSA"
      : pagamentoFinanceiro?.modalidade === "ATO_TOTAL" || pagamentoNoAto
        ? "COBRANCA_DIRETA"
        : "CONTA_INTERNA";

  return {
    edicaoId: String(input.edicaoId ?? input.edicao_id),
    origemInscricao: origem as EventoEdicaoOrigemInscricao,
    alunoPessoaId: alunoPessoaId ?? null,
    responsavelFinanceiroId:
      asOptionalInteger(
        input.responsavelFinanceiroId ?? input.responsavel_financeiro_id,
      ) ?? null,
    contaInternaId:
      asOptionalInteger(input.contaInternaId ?? input.conta_interna_id) ?? null,
    participanteExternoId: participanteExternoId ?? null,
    participanteExterno,
    incluirEventoGeral: asOptionalBoolean(
      input.incluirEventoGeral ?? input.incluir_evento_geral,
      false,
    ),
    itemConfiguracaoIds: asStringArray(
      input.itemConfiguracaoIds ?? input.item_configuracao_ids,
    ),
    participacoesArtisticas,
    coreografiaVinculoIds,
    permitirCoreografiasDepois: asOptionalBoolean(
      input.permitirCoreografiasDepois ?? input.permitir_coreografias_depois,
      false,
    ),
    destinoFinanceiro:
      (destino as EventoEdicaoDestinoFinanceiro | undefined) ?? destinoPadrao,
    pagamentoNoAto,
    quantidadeParcelasContaInterna:
      asOptionalInteger(
        input.quantidadeParcelasContaInterna ??
          input.quantidade_parcelas_conta_interna,
      ) ?? null,
    formaPagamentoCodigo: asOptionalString(
      input.formaPagamentoCodigo ?? input.forma_pagamento_codigo,
    ),
    pagamentoFinanceiro,
    observacoes: asOptionalString(input.observacoes),
  };
}

export function validateEdicaoInscricaoUpdatePayload(
  input: unknown,
): EventoEdicaoInscricaoUpdatePayload {
  assert(isRecord(input), "payload invalido");
  assert(
    isNonEmptyString(input.inscricaoId ?? input.inscricao_id),
    "inscricaoId e obrigatorio",
  );
  assert(
    isNonEmptyString(input.edicaoId ?? input.edicao_id),
    "edicaoId e obrigatorio",
  );

  const statusInscricao = input.statusInscricao ?? input.status_inscricao;
  const statusFinanceiro = input.statusFinanceiro ?? input.status_financeiro;
  const destino = input.destinoFinanceiro ?? input.destino_financeiro;

  if (statusInscricao !== undefined) {
    assertEnum(statusInscricao, STATUS_INSCRICAO, "statusInscricao");
  }
  if (statusFinanceiro !== undefined) {
    assertEnum(statusFinanceiro, STATUS_FINANCEIRO_INSCRICAO, "statusFinanceiro");
  }
  if (destino !== undefined) {
    assertEnum(destino, DESTINOS_FINANCEIROS_INSCRICAO, "destinoFinanceiro");
  }

  return {
    inscricaoId: String(input.inscricaoId ?? input.inscricao_id),
    edicaoId: String(input.edicaoId ?? input.edicao_id),
    statusInscricao:
      statusInscricao as EventoEdicaoInscricaoUpdatePayload["statusInscricao"],
    statusFinanceiro:
      statusFinanceiro as EventoEdicaoInscricaoUpdatePayload["statusFinanceiro"],
    destinoFinanceiro:
      destino as EventoEdicaoInscricaoUpdatePayload["destinoFinanceiro"],
    pagamentoNoAto: asOptionalBoolean(
      input.pagamentoNoAto ?? input.pagamento_no_ato,
    ),
    gerarEmContaInterna: asOptionalBoolean(
      input.gerarEmContaInterna ?? input.gerar_em_conta_interna,
    ),
    quantidadeParcelasContaInterna:
      asOptionalInteger(
        input.quantidadeParcelasContaInterna ??
          input.quantidade_parcelas_conta_interna,
      ) ?? null,
    formaPagamentoCodigo: asOptionalString(
      input.formaPagamentoCodigo ?? input.forma_pagamento_codigo,
    ),
    observacoes: asOptionalString(input.observacoes),
  };
}

export function validateEdicaoInscricaoAdicionarItensPayload(
  input: unknown,
): EventoEdicaoInscricaoAdicionarItensPayload {
  assert(isRecord(input), "payload invalido");
  assert(
    isNonEmptyString(input.inscricaoId ?? input.inscricao_id),
    "inscricaoId e obrigatorio",
  );
  assert(
    isNonEmptyString(input.edicaoId ?? input.edicao_id),
    "edicaoId e obrigatorio",
  );

  const incluirEventoGeral = asOptionalBoolean(
    input.incluirEventoGeral ?? input.incluir_evento_geral,
    false,
  ) ?? false;
  const itemConfiguracaoIds = asStringArray(
    input.itemConfiguracaoIds ?? input.item_configuracao_ids,
  );
  const participacoesArtisticasOrigem =
    input.participacoesArtisticas ?? input.participacoes_artisticas;
  const participacoesArtisticas = Array.isArray(participacoesArtisticasOrigem)
    ? participacoesArtisticasOrigem.map(validateParticipacaoArtisticaPayload)
    : [];
  const coreografiaVinculoIds = uniqueOrderedStrings([
    ...participacoesArtisticas.map((item) => item.coreografiaVinculoId),
    ...asStringArray(
      input.coreografiaVinculoIds ?? input.coreografia_vinculo_ids,
    ),
  ]);

  assert(
    incluirEventoGeral ||
      itemConfiguracaoIds.length > 0 ||
      participacoesArtisticas.length > 0 ||
      coreografiaVinculoIds.length > 0,
    "selecione ao menos um item para ampliar a inscricao",
  );

  return {
    inscricaoId: String(input.inscricaoId ?? input.inscricao_id),
    edicaoId: String(input.edicaoId ?? input.edicao_id),
    incluirEventoGeral,
    itemConfiguracaoIds,
    participacoesArtisticas,
    coreografiaVinculoIds,
    observacoes: asOptionalString(input.observacoes),
  };
}

export function validateEdicaoInscricaoCancelarItemPayload(
  input: unknown,
): EventoEdicaoInscricaoCancelarItemPayload {
  assert(isRecord(input), "payload invalido");
  assert(
    isNonEmptyString(input.inscricaoId ?? input.inscricao_id),
    "inscricaoId e obrigatorio",
  );
  assert(
    isNonEmptyString(input.edicaoId ?? input.edicao_id),
    "edicaoId e obrigatorio",
  );
  assert(isNonEmptyString(input.itemId ?? input.item_id), "itemId e obrigatorio");

  return {
    inscricaoId: String(input.inscricaoId ?? input.inscricao_id),
    edicaoId: String(input.edicaoId ?? input.edicao_id),
    itemId: String(input.itemId ?? input.item_id),
    motivoCancelamento: asOptionalString(
      input.motivoCancelamento ?? input.motivo_cancelamento,
    ),
  };
}

export function validateSessaoAtividadePayload(
  input: unknown,
): EventoSessaoAtividadePayload {
  assert(isRecord(input), "payload inválido");
  assert(
    isNonEmptyString(input.sessaoId ?? input.sessao_id),
    "sessaoId é obrigatório",
  );
  assertEnum(
    input.tipoAtividade ?? input.tipo_atividade,
    TIPOS_ATIVIDADE,
    "tipoAtividade",
  );
  assert(isNonEmptyString(input.titulo), "titulo é obrigatório");
  return {
    sessaoId: String(input.sessaoId ?? input.sessao_id),
    localId: asOptionalString(input.localId ?? input.local_id),
    tipoAtividade: (input.tipoAtividade ??
      input.tipo_atividade) as EventoSessaoAtividadePayload["tipoAtividade"],
    titulo: String(input.titulo).trim(),
    descricao: asOptionalString(input.descricao),
    inicio: asOptionalString(input.inicio),
    fim: asOptionalString(input.fim),
    ordem: asOptionalInteger(input.ordem),
    abertaAoPublico: asOptionalBoolean(
      input.abertaAoPublico ?? input.aberta_ao_publico,
      false,
    ),
    coreografiaId: asOptionalString(input.coreografiaId ?? input.coreografia_id),
    turmaId: asOptionalInteger(input.turmaId ?? input.turma_id) ?? null,
    observacoes: asOptionalString(input.observacoes),
  };
}

export function validateCoreografiaEstiloPayload(
  input: unknown,
): CoreografiaEstiloPayload {
  assert(isRecord(input), "payload inválido");
  assert(isNonEmptyString(input.nome), "nome é obrigatório");
  const nome = String(input.nome).trim();
  const slug = asOptionalString(input.slug);
  return {
    nome,
    slug: slug ? slugify(slug) : slugify(nome),
    descricao: asOptionalString(input.descricao),
    ativo: asOptionalBoolean(input.ativo, true),
    ordemExibicao: asOptionalInteger(input.ordemExibicao ?? input.ordem_exibicao) ?? 0,
  };
}

export function validateCoreografiaEstiloUpdatePayload(
  input: unknown,
): CoreografiaEstiloUpdatePayload {
  assert(isRecord(input), "payload inválido");
  assert(
    isNonEmptyString(input.estiloId ?? input.estilo_id),
    "estiloId é obrigatório",
  );
  const slug = asOptionalString(input.slug);
  return {
    estiloId: String(input.estiloId ?? input.estilo_id),
    nome: isNonEmptyString(input.nome) ? String(input.nome).trim() : undefined,
    slug: slug === undefined ? undefined : slug ? slugify(slug) : null,
    descricao: asOptionalString(input.descricao),
    ativo: asOptionalBoolean(input.ativo),
    ordemExibicao:
      asOptionalInteger(input.ordemExibicao ?? input.ordem_exibicao) ?? undefined,
  };
}

export function validateCoreografiaMestrePayload(
  input: unknown,
): CoreografiaMestrePayload {
  assert(isRecord(input), "payload inválido");
  assert(isNonEmptyString(input.nome), "nome é obrigatório");
  assertEnum(
    input.tipoFormacao ?? input.tipo_formacao ?? "LIVRE",
    FORMACOES,
    "tipoFormacao",
  );
  assert(isNonEmptyString(input.estiloId ?? input.estilo_id), "estiloId é obrigatório");
  const tipoFormacao = (input.tipoFormacao ??
    input.tipo_formacao ??
    "LIVRE") as CoreografiaFormacao;
  const limites = normalizeCoreografiaLimites(
    tipoFormacao,
    asOptionalInteger(
      input.quantidadeMinimaParticipantes ?? input.quantidade_minima_participantes,
    ) ?? null,
    asOptionalInteger(
      input.quantidadeMaximaParticipantes ?? input.quantidade_maxima_participantes,
    ) ?? null,
  );
  return {
    nome: String(input.nome).trim(),
    descricao: asOptionalString(input.descricao),
    modalidade: asOptionalString(input.modalidade),
    tipoFormacao,
    quantidadeMinimaParticipantes: limites.minimo,
    quantidadeMaximaParticipantes: limites.maximo,
    duracaoEstimadaSegundos:
      asOptionalInteger(input.duracaoEstimadaSegundos ?? input.duracao_estimada_segundos) ??
      null,
    sugestaoMusica: asOptionalString(input.sugestaoMusica ?? input.sugestao_musica),
    linkMusica: asOptionalString(input.linkMusica ?? input.link_musica),
    estiloId: String(input.estiloId ?? input.estilo_id),
    professorResponsavelId:
      asOptionalInteger(input.professorResponsavelId ?? input.professor_responsavel_id) ??
      null,
    turmaBaseId: asOptionalInteger(input.turmaBaseId ?? input.turma_base_id) ?? null,
    observacoes: asOptionalString(input.observacoes),
    ativa: asOptionalBoolean(input.ativa, true),
  };
}

export function validateCoreografiaMestreUpdatePayload(
  input: unknown,
): CoreografiaMestreUpdatePayload {
  assert(isRecord(input), "payload inválido");
  assert(
    isNonEmptyString(input.coreografiaId ?? input.coreografia_id),
    "coreografiaId é obrigatório",
  );
  const tipoFormacao = input.tipoFormacao ?? input.tipo_formacao;
  if (tipoFormacao !== undefined) assertEnum(tipoFormacao, FORMACOES, "tipoFormacao");
  const minimo = asOptionalInteger(
    input.quantidadeMinimaParticipantes ?? input.quantidade_minima_participantes,
  );
  const maximo = asOptionalInteger(
    input.quantidadeMaximaParticipantes ?? input.quantidade_maxima_participantes,
  );
  const limites =
    tipoFormacao !== undefined || minimo !== undefined || maximo !== undefined
      ? normalizeCoreografiaLimites(
          (tipoFormacao ?? "LIVRE") as CoreografiaFormacao,
          minimo ?? null,
          maximo ?? null,
        )
      : null;
  return {
    coreografiaId: String(input.coreografiaId ?? input.coreografia_id),
    nome: isNonEmptyString(input.nome) ? String(input.nome).trim() : undefined,
    descricao: asOptionalString(input.descricao),
    modalidade: asOptionalString(input.modalidade),
    tipoFormacao: tipoFormacao as CoreografiaFormacao | undefined,
    quantidadeMinimaParticipantes: limites?.minimo,
    quantidadeMaximaParticipantes: limites?.maximo,
    duracaoEstimadaSegundos:
      asOptionalInteger(input.duracaoEstimadaSegundos ?? input.duracao_estimada_segundos) ??
      undefined,
    sugestaoMusica: asOptionalString(input.sugestaoMusica ?? input.sugestao_musica),
    linkMusica: asOptionalString(input.linkMusica ?? input.link_musica),
    estiloId: isNonEmptyString(input.estiloId ?? input.estilo_id)
      ? String(input.estiloId ?? input.estilo_id)
      : undefined,
    professorResponsavelId:
      asOptionalInteger(input.professorResponsavelId ?? input.professor_responsavel_id) ??
      undefined,
    turmaBaseId:
      asOptionalInteger(input.turmaBaseId ?? input.turma_base_id) ?? undefined,
    observacoes: asOptionalString(input.observacoes),
    ativa: asOptionalBoolean(input.ativa),
  };
}

export function validateEventoEdicaoCoreografiaVinculoPayload(
  input: unknown,
): EventoEdicaoCoreografiaVinculoPayload {
  assert(isRecord(input), "payload inválido");
  assert(
    isNonEmptyString(input.edicaoId ?? input.edicao_id),
    "edicaoId é obrigatório",
  );
  assert(
    isNonEmptyString(input.coreografiaId ?? input.coreografia_id),
    "coreografiaId é obrigatório",
  );
  return {
    edicaoId: String(input.edicaoId ?? input.edicao_id),
    coreografiaId: String(input.coreografiaId ?? input.coreografia_id),
    subeventoId: asOptionalString(input.subeventoId ?? input.subevento_id),
    ordemPrevistaApresentacao:
      asOptionalInteger(
        input.ordemPrevistaApresentacao ?? input.ordem_prevista_apresentacao,
      ) ?? null,
    valorParticipacaoCoreografiaCentavos:
      asOptionalInteger(
        input.valorParticipacaoCoreografiaCentavos ??
          input.valor_participacao_coreografia_centavos,
      ) ?? null,
    duracaoPrevistaNoEventoSegundos:
      asOptionalInteger(
        input.duracaoPrevistaNoEventoSegundos ??
          input.duracao_prevista_no_evento_segundos,
      ) ?? null,
    observacoesDoEvento: asOptionalString(
      input.observacoesDoEvento ?? input.observacoes_do_evento,
    ),
    ativa: asOptionalBoolean(input.ativa, true),
  };
}

export function validateEventoEdicaoCoreografiaVinculoUpdatePayload(
  input: unknown,
): EventoEdicaoCoreografiaVinculoUpdatePayload {
  assert(isRecord(input), "payload inválido");
  assert(
    isNonEmptyString(input.edicaoId ?? input.edicao_id),
    "edicaoId é obrigatório",
  );
  assert(
    isNonEmptyString(input.vinculoId ?? input.vinculo_id),
    "vinculoId é obrigatório",
  );
  return {
    edicaoId: String(input.edicaoId ?? input.edicao_id),
    vinculoId: String(input.vinculoId ?? input.vinculo_id),
    subeventoId: asOptionalString(input.subeventoId ?? input.subevento_id),
    ordemPrevistaApresentacao:
      asOptionalInteger(
        input.ordemPrevistaApresentacao ?? input.ordem_prevista_apresentacao,
      ) ?? undefined,
    valorParticipacaoCoreografiaCentavos:
      asOptionalInteger(
        input.valorParticipacaoCoreografiaCentavos ??
          input.valor_participacao_coreografia_centavos,
      ) ?? undefined,
    duracaoPrevistaNoEventoSegundos:
      asOptionalInteger(
        input.duracaoPrevistaNoEventoSegundos ??
          input.duracao_prevista_no_evento_segundos,
      ) ?? undefined,
    observacoesDoEvento: asOptionalString(
      input.observacoesDoEvento ?? input.observacoes_do_evento,
    ),
    ativa: asOptionalBoolean(input.ativa),
  };
}

export function validateCoreografiaParticipantePayload(
  input: unknown,
): EventoCoreografiaParticipantePayload {
  assert(isRecord(input), "payload inválido");
  assert(
    isNonEmptyString(input.coreografiaId ?? input.coreografia_id),
    "coreografiaId é obrigatório",
  );
  return {
    coreografiaId: String(input.coreografiaId ?? input.coreografia_id),
    pessoaId: asOptionalInteger(input.pessoaId ?? input.pessoa_id) ?? null,
    alunoId: asOptionalInteger(input.alunoId ?? input.aluno_id) ?? null,
    inscricaoId: asOptionalString(input.inscricaoId ?? input.inscricao_id),
    tipoParticipante: asOptionalString(input.tipoParticipante ?? input.tipo_participante),
    ordemInterna: asOptionalInteger(input.ordemInterna ?? input.ordem_interna) ?? null,
    papel: asOptionalString(input.papel),
    observacoes: asOptionalString(input.observacoes ?? input.observacao),
    ativo: asOptionalBoolean(input.ativo, true),
  };
}

export function validateTurmaVinculoPayload(
  input: unknown,
): EventoTurmaVinculoPayload {
  assert(isRecord(input), "payload inválido");
  assert(
    isNonEmptyString(input.edicaoId ?? input.edicao_id),
    "edicaoId é obrigatório",
  );
  const turmaId = asOptionalInteger(input.turmaId ?? input.turma_id);
  assert(typeof turmaId === "number", "turmaId é obrigatório");
  assertEnum(
    input.tipoVinculo ?? input.tipo_vinculo,
    TIPOS_VINCULO_TURMA,
    "tipoVinculo",
  );
  return {
    edicaoId: String(input.edicaoId ?? input.edicao_id),
    sessaoId: asOptionalString(input.sessaoId ?? input.sessao_id),
    turmaId,
    tipoVinculo: (input.tipoVinculo ??
      input.tipo_vinculo) as EventoTurmaVinculoPayload["tipoVinculo"],
    coreografiaId: asOptionalString(input.coreografiaId ?? input.coreografia_id),
    descricao: asOptionalString(input.descricao),
  };
}

export function validateContratacaoPayload(
  input: unknown,
): EventoContratacaoPayload {
  assert(isRecord(input), "payload inválido");
  assert(
    isNonEmptyString(input.edicaoId ?? input.edicao_id),
    "edicaoId é obrigatório",
  );
  assert(
    isNonEmptyString(input.tipoServico ?? input.tipo_servico),
    "tipoServico é obrigatório",
  );
  if (input.status !== undefined) {
    assertEnum(input.status, STATUS_CONTRATACAO, "status");
  }
  return {
    edicaoId: String(input.edicaoId ?? input.edicao_id),
    sessaoId: asOptionalString(input.sessaoId ?? input.sessao_id),
    prestadorPessoaId:
      asOptionalInteger(input.prestadorPessoaId ?? input.prestador_pessoa_id) ??
      null,
    tipoServico: String(input.tipoServico ?? input.tipo_servico).trim(),
    descricao: asOptionalString(input.descricao),
    valorPrevistoCentavos:
      asOptionalInteger(input.valorPrevistoCentavos ?? input.valor_previsto_centavos) ??
      0,
    valorContratadoCentavos:
      asOptionalInteger(
        input.valorContratadoCentavos ?? input.valor_contratado_centavos,
      ) ?? null,
    contratoAcessorioEmitidoId:
      asOptionalInteger(
        input.contratoAcessorioEmitidoId ?? input.contrato_acessorio_emitido_id,
      ) ?? null,
    contaPagarId:
      asOptionalInteger(input.contaPagarId ?? input.conta_pagar_id) ?? null,
    status: input.status as EventoContratacaoPayload["status"] | undefined,
    observacoes: asOptionalString(input.observacoes),
  };
}

export function validateFinanceiroReferenciaPayload(
  input: unknown,
): EventoFinanceiroReferenciaPayload {
  assert(isRecord(input), "payload inválido");
  assert(
    isNonEmptyString(input.edicaoId ?? input.edicao_id),
    "edicaoId é obrigatório",
  );
  assertEnum(input.natureza, NATUREZAS_FINANCEIRAS, "natureza");
  assertEnum(
    input.origemTipo ?? input.origem_tipo,
    ORIGENS_FINANCEIRAS,
    "origemTipo",
  );
  return {
    edicaoId: String(input.edicaoId ?? input.edicao_id),
    sessaoId: asOptionalString(input.sessaoId ?? input.sessao_id),
    natureza: input.natureza as EventoFinanceiroReferenciaPayload["natureza"],
    origemTipo: (input.origemTipo ??
      input.origem_tipo) as EventoFinanceiroReferenciaPayload["origemTipo"],
    origemId: asOptionalInteger(input.origemId ?? input.origem_id) ?? null,
    pessoaId: asOptionalInteger(input.pessoaId ?? input.pessoa_id) ?? null,
    descricao: asOptionalString(input.descricao),
    valorPrevistoCentavos:
      asOptionalInteger(input.valorPrevistoCentavos ?? input.valor_previsto_centavos) ??
      null,
    valorRealCentavos:
      asOptionalInteger(input.valorRealCentavos ?? input.valor_real_centavos) ?? null,
    contaInternaId:
      asOptionalInteger(input.contaInternaId ?? input.conta_interna_id) ?? null,
    cobrancaId: asOptionalInteger(input.cobrancaId ?? input.cobranca_id) ?? null,
    recebimentoId:
      asOptionalInteger(input.recebimentoId ?? input.recebimento_id) ?? null,
    contaPagarId:
      asOptionalInteger(input.contaPagarId ?? input.conta_pagar_id) ?? null,
    pagamentoContaPagarId:
      asOptionalInteger(
        input.pagamentoContaPagarId ?? input.pagamento_conta_pagar_id,
      ) ?? null,
    movimentoFinanceiroId:
      asOptionalInteger(
        input.movimentoFinanceiroId ?? input.movimento_financeiro_id,
      ) ?? null,
    observacoes: asOptionalString(input.observacoes),
  };
}

function validateEdicaoConfiguracaoItem(
  input: unknown,
): EventoEdicaoItemFinanceiroPayload {
  assert(isRecord(input), "item financeiro inválido");
  assert(isNonEmptyString(input.nome), "nome do item financeiro é obrigatório");
  assertEnum(input.tipoItem ?? input.tipo_item, TIPOS_ITEM_FINANCEIRO, "tipoItem");
  const modo = input.modoCobranca ?? input.modo_cobranca;
  if (modo !== undefined) assertEnum(modo, MODOS_COBRANCA_ITEM, "modoCobranca");
  return {
    id: isNonEmptyString(input.id) ? String(input.id) : undefined,
    codigo: asOptionalString(input.codigo),
    nome: String(input.nome).trim(),
    descricao: asOptionalString(input.descricao),
    tipoItem: (input.tipoItem ??
      input.tipo_item) as EventoEdicaoItemFinanceiroPayload["tipoItem"],
    modoCobranca:
      (modo as EventoEdicaoItemFinanceiroPayload["modoCobranca"] | undefined) ??
      "UNICO",
    valorCentavos: asOptionalInteger(input.valorCentavos ?? input.valor_centavos) ?? 0,
    ativo: asOptionalBoolean(input.ativo, true),
    ordem: asOptionalInteger(input.ordem) ?? null,
    metadata: asOptionalObject(input.metadata) ?? null,
  };
}

function validateEdicaoConfiguracaoRegraFinanceira(
  input: unknown,
): EventoEdicaoRegraFinanceiraPayload {
  assert(isRecord(input), "regra financeira invÃ¡lida");
  assertEnum(
    input.tipoRegra ?? input.tipo_regra,
    TIPOS_REGRA_FINANCEIRA_EDICAO,
    "tipoRegra",
  );
  const modoCalculo = input.modoCalculo ?? input.modo_calculo;
  if (modoCalculo !== undefined) {
    assertEnum(
      modoCalculo,
      MODOS_CALCULO_REGRA_FINANCEIRA,
      "modoCalculo",
    );
  }
  const formacaoCoreografia =
    input.formacaoCoreografia ?? input.formacao_coreografia;
  if (formacaoCoreografia !== undefined && formacaoCoreografia !== null) {
    assertEnum(formacaoCoreografia, FORMACOES, "formacaoCoreografia");
  }
  const quantidadeMinima =
    asOptionalInteger(input.quantidadeMinima ?? input.quantidade_minima) ?? null;
  const quantidadeMaxima =
    asOptionalInteger(input.quantidadeMaxima ?? input.quantidade_maxima) ?? null;
  if (
    quantidadeMinima !== null &&
    quantidadeMaxima !== null &&
    quantidadeMaxima < quantidadeMinima
  ) {
    throw new Error("quantidadeMaxima nao pode ser menor que quantidadeMinima");
  }

  return {
    id: isNonEmptyString(input.id) ? String(input.id) : undefined,
    tipoRegra: (input.tipoRegra ??
      input.tipo_regra) as EventoEdicaoRegraFinanceiraPayload["tipoRegra"],
    modoCalculo:
      (modoCalculo as EventoEdicaoRegraFinanceiraPayload["modoCalculo"] | undefined) ??
      "VALOR_FIXO",
    descricaoRegra: asOptionalString(input.descricaoRegra ?? input.descricao_regra),
    formacaoCoreografia:
      (formacaoCoreografia as EventoEdicaoRegraFinanceiraPayload["formacaoCoreografia"] | undefined) ??
      null,
    estiloId: asOptionalString(input.estiloId ?? input.estilo_id),
    modalidadeNome: asOptionalString(input.modalidadeNome ?? input.modalidade_nome),
    ordemProgressao:
      asOptionalInteger(input.ordemProgressao ?? input.ordem_progressao) ?? null,
    quantidadeMinima,
    quantidadeMaxima,
    valorCentavos:
      asOptionalInteger(
        input.valorCentavos ?? input.valor_centavos ?? input.valor,
      ) ?? 0,
    valorPorParticipanteCentavos:
      asOptionalInteger(
        input.valorPorParticipanteCentavos ??
          input.valorPorParticipante ??
          input.valor_por_participante_centavos ??
          input.valor_por_participante,
      ) ?? null,
    ativa: asOptionalBoolean(input.ativa, true),
    ordemAplicacao:
      asOptionalInteger(input.ordemAplicacao ?? input.ordem_aplicacao) ?? null,
    metadata: asOptionalObject(input.metadata) ?? null,
  };
}

export function validateEdicaoConfiguracaoPayload(
  input: unknown,
): EventoEdicaoConfiguracaoPayload {
  assert(isRecord(input), "payload inválido");
  assert(
    isNonEmptyString(input.edicaoId ?? input.edicao_id),
    "edicaoId é obrigatório",
  );
  const modoComposicao = input.modoComposicaoValor ?? input.modo_composicao_valor;
  const modoCobranca = input.modoCobranca ?? input.modo_cobranca;
  if (modoComposicao !== undefined) {
    assertEnum(modoComposicao, MODOS_COMPOSICAO_VALOR, "modoComposicaoValor");
  }
  if (modoCobranca !== undefined) {
    assertEnum(modoCobranca, MODOS_COBRANCA, "modoCobranca");
  }
  const itensOrigem = input.itensFinanceiros ?? input.itens_financeiros;
  const itens = Array.isArray(itensOrigem)
    ? itensOrigem.map(validateEdicaoConfiguracaoItem)
    : [];
  const regrasOrigem = input.regrasFinanceiras ?? input.regras_financeiras;
  const regrasFinanceiras = Array.isArray(regrasOrigem)
    ? regrasOrigem.map(validateEdicaoConfiguracaoRegraFinanceira)
    : [];
  return {
    edicaoId: String(input.edicaoId ?? input.edicao_id),
    cobraTaxaParticipacaoGeral: asOptionalBoolean(
      input.cobraTaxaParticipacaoGeral ?? input.cobra_taxa_participacao_geral,
      false,
    ),
    cobraPorCoreografia: asOptionalBoolean(
      input.cobraPorCoreografia ?? input.cobra_por_coreografia,
      false,
    ),
    cobraPorPacote: asOptionalBoolean(
      input.cobraPorPacote ?? input.cobra_por_pacote,
      false,
    ),
    permiteItensAdicionais: asOptionalBoolean(
      input.permiteItensAdicionais ?? input.permite_itens_adicionais,
      true,
    ),
    permitePagamentoNoAto: asOptionalBoolean(
      input.permitePagamentoNoAto ?? input.permite_pagamento_no_ato,
      true,
    ),
    permiteContaInterna: asOptionalBoolean(
      input.permiteContaInterna ?? input.permite_conta_interna,
      true,
    ),
    permiteParcelamentoContaInterna: asOptionalBoolean(
      input.permiteParcelamentoContaInterna ??
        input.permite_parcelamento_conta_interna,
      false,
    ),
    exigeInscricaoGeral: asOptionalBoolean(
      input.exigeInscricaoGeral ?? input.exige_inscricao_geral,
      true,
    ),
    permiteInscricaoPorCoreografia: asOptionalBoolean(
      input.permiteInscricaoPorCoreografia ??
        input.permite_inscricao_por_coreografia,
      true,
    ),
    permiteVincularCoreografiaDepois: asOptionalBoolean(
      input.permiteVincularCoreografiaDepois ??
        input.permite_vincular_coreografia_depois,
      true,
    ),
    participacaoPorAluno: asOptionalBoolean(
      input.participacaoPorAluno ?? input.participacao_por_aluno,
      true,
    ),
    participacaoPorTurma: asOptionalBoolean(
      input.participacaoPorTurma ?? input.participacao_por_turma,
      false,
    ),
    participacaoPorGrupo: asOptionalBoolean(
      input.participacaoPorGrupo ?? input.participacao_por_grupo,
      false,
    ),
    participacaoPorCoreografia: asOptionalBoolean(
      input.participacaoPorCoreografia ?? input.participacao_por_coreografia,
      true,
    ),
    permiteMultiplasCoreografiasAluno: asOptionalBoolean(
      input.permiteMultiplasCoreografiasAluno ??
        input.permite_multiplas_coreografias_aluno,
      true,
    ),
    valorTaxaParticipacaoCentavos:
      asOptionalInteger(
        input.valorTaxaParticipacaoCentavos ??
          input.valor_taxa_participacao_centavos,
      ) ?? 0,
    modoComposicaoValor:
      (modoComposicao as EventoEdicaoConfiguracaoPayload["modoComposicaoValor"] | undefined) ??
      "VALOR_FIXO",
    modoCobranca:
      (modoCobranca as EventoEdicaoConfiguracaoPayload["modoCobranca"] | undefined) ??
      "UNICA",
    quantidadeMaximaParcelas:
      asOptionalInteger(
        input.quantidadeMaximaParcelas ?? input.quantidade_maxima_parcelas,
      ) ?? 1,
    maximoParcelasContaInterna:
      asOptionalInteger(
        input.maximoParcelasContaInterna ??
          input.maximo_parcelas_conta_interna,
      ) ?? 1,
    competenciasElegiveisContaInterna: asCompetenciasArray(
      input.competenciasElegiveisContaInterna ??
        input.competencias_elegiveis_conta_interna,
    ),
    permiteCompetenciasAposEvento: asOptionalBoolean(
      input.permiteCompetenciasAposEvento ??
        input.permite_competencias_apos_evento,
      false,
    ),
    diaCorteOperacionalParcelamento:
      asOptionalInteger(
        input.diaCorteOperacionalParcelamento ??
          input.dia_corte_operacional_parcelamento,
      ) ?? null,
    geraContaInternaAutomaticamente: asOptionalBoolean(
      input.geraContaInternaAutomaticamente ??
        input.gera_conta_interna_automaticamente,
      false,
    ),
    regrasAdicionais:
      asOptionalObject(input.regrasAdicionais ?? input.regras_adicionais) ?? null,
    itensFinanceiros: itens,
    regrasFinanceiras,
  };
}

export function validateEdicaoCalendarioPayload(
  input: unknown,
): EventoEdicaoCalendarioPayload {
  assert(isRecord(input), "payload inválido");
  assert(
    isNonEmptyString(input.edicaoId ?? input.edicao_id),
    "edicaoId é obrigatório",
  );
  assertEnum(input.tipo, TIPOS_CALENDARIO, "tipo");
  assert(isNonEmptyString(input.titulo), "titulo é obrigatório");
  assert(isNonEmptyString(input.inicio), "inicio é obrigatório");
  return {
    edicaoId: String(input.edicaoId ?? input.edicao_id),
    tipo: input.tipo as EventoEdicaoCalendarioTipo,
    titulo: String(input.titulo).trim(),
    descricao: asOptionalString(input.descricao),
    inicio: String(input.inicio),
    fim: asOptionalString(input.fim),
    diaInteiro: asOptionalBoolean(input.diaInteiro ?? input.dia_inteiro, false),
    localNome: asOptionalString(input.localNome ?? input.local_nome),
    cidade: asOptionalString(input.cidade),
    endereco: asOptionalString(input.endereco),
    refleteNoCalendarioEscola: asOptionalBoolean(
      input.refleteNoCalendarioEscola ?? input.reflete_no_calendario_escola,
      false,
    ),
    turmaId: asOptionalInteger(input.turmaId ?? input.turma_id) ?? null,
    grupoId: asOptionalInteger(input.grupoId ?? input.grupo_id) ?? null,
    ordem: asOptionalInteger(input.ordem) ?? null,
    ativo: asOptionalBoolean(input.ativo, true),
  };
}

export function validateEdicaoCalendarioUpdatePayload(
  input: unknown,
): EventoEdicaoCalendarioUpdatePayload {
  assert(isRecord(input), "payload inválido");
  assert(
    isNonEmptyString(input.edicaoId ?? input.edicao_id),
    "edicaoId é obrigatório",
  );
  assert(isNonEmptyString(input.itemId ?? input.item_id), "itemId é obrigatório");
  if (input.tipo !== undefined) assertEnum(input.tipo, TIPOS_CALENDARIO, "tipo");
  return {
    edicaoId: String(input.edicaoId ?? input.edicao_id),
    itemId: String(input.itemId ?? input.item_id),
    tipo: input.tipo as EventoEdicaoCalendarioTipo | undefined,
    titulo: isNonEmptyString(input.titulo) ? String(input.titulo).trim() : undefined,
    descricao: asOptionalString(input.descricao),
    inicio: isNonEmptyString(input.inicio) ? String(input.inicio) : undefined,
    fim: asOptionalString(input.fim),
    diaInteiro: asOptionalBoolean(input.diaInteiro ?? input.dia_inteiro),
    localNome: asOptionalString(input.localNome ?? input.local_nome),
    cidade: asOptionalString(input.cidade),
    endereco: asOptionalString(input.endereco),
    refleteNoCalendarioEscola: asOptionalBoolean(
      input.refleteNoCalendarioEscola ?? input.reflete_no_calendario_escola,
    ),
    turmaId: asOptionalInteger(input.turmaId ?? input.turma_id) ?? undefined,
    grupoId: asOptionalInteger(input.grupoId ?? input.grupo_id) ?? undefined,
    ordem: asOptionalInteger(input.ordem) ?? undefined,
    ativo: asOptionalBoolean(input.ativo),
  };
}
