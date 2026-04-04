import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calcularComposicaoFinanceiraEventoEdicao,
  normalizeEventoEdicaoRegrasFinanceiras,
} from "@/lib/eventos/inscricaoPricing";
import {
  agendarFaturamentoMensalAluno,
  agendarFaturamentoMensalColaborador,
  criarLancamentoContaInterna,
  garantirContaInternaElegivelParaInscricaoInterna,
  listarContasInternasElegiveisParaInscricaoInterna,
} from "@/lib/financeiro/conta-interna";
import {
  archiveCoreografiaEstilo,
  archiveCoreografiaMestre,
  archiveEventoCoreografia,
  archiveEventoEdicaoCalendarioItem,
  archiveEventoEdicaoInscricao,
  ensureCoreografiaEstiloExists,
  ensureCoreografiaExists,
  ensureCoreografiaMestreExists,
  ensureDiaExists,
  ensureEdicaoExists,
  ensureEventoEdicaoCalendarioItemExists,
  ensureEventoExists,
  ensureGrupoExists,
  ensureInscricaoExists,
  ensureInscricaoItemExists,
  ensureParticipanteExternoExists,
  ensurePessoaExists,
  ensureSessaoExists,
  ensureTurmaExists,
  getAlunoMatriculaAtual,
  getCoreografiaFormacaoByCodigo,
  getCoreografiaFormacaoById,
  getCentroCustoPadraoEscolaId,
  getCoreografiaEstiloById,
  getEventoEdicaoConfiguracao,
  getEventoEdicaoFinanceiroContexto,
  getEventoEdicaoInscricaoById,
  getFormaPagamentoByCodigo,
  findEventoEdicaoInscricaoAtivaByParticipante,
  insertCoreografiaEstilo,
  insertCoreografiaMestre,
  insertEventoContratacao,
  insertEventoCoreografiaParticipante,
  insertEventoDia,
  insertEventoEdicao,
  insertEventoEdicaoCalendarioItem,
  insertEventoEdicaoCoreografiaVinculo,
  insertEventoEscola,
  insertEventoFinanceiroReferencia,
  insertEventoParticipanteExterno,
  insertEventoEdicaoInscricao,
  insertEventoEdicaoInscricaoItens,
  insertEventoEdicaoInscricaoItemMovimentosFinanceiros,
  insertEventoEdicaoInscricaoPagamento,
  insertCobrancaAvulsaEventoEdicaoInscricao,
  insertCobrancaEventoEdicaoInscricao,
  insertMovimentoFinanceiroReceita,
  insertRecebimentoEventoEdicaoInscricao,
  insertEventoInscricao,
  insertEventoInscricaoItem,
  insertEventoModalidade,
  insertEventoSessao,
  insertEventoSessaoAtividade,
  insertEventoTurmaVinculo,
  listCoreografiaEstilos,
  listCoreografiaFormacoes,
  listCoreografiasMestres,
  listEventoCoreografiasByEdicao,
  listEventoEdicaoCalendarioItems,
  listEventoEdicaoCoreografiaVinculosByIds,
  listEventoEdicaoInscricoes,
  listEventoEdicaoInscricaoParcelasContaInternaByInscricaoIds,
  listEventoEdicaoInscricaoItemMovimentosFinanceirosByInscricaoId,
  listEventoEdicaoItemFinanceirosByIds,
  listEventoParticipantesExternos,
  listEventoParticipantesExternosByIds,
  listPessoasByIds,
  listFormasPagamentoAtivas,
  replaceEventoEdicaoInscricaoParcelasContaInterna,
  updateCobrancaEventoEdicaoInscricaoVencimento,
  updateEventoEdicaoInscricaoItemCancelamento,
  updateCoreografiaEstilo,
  updateCoreografiaMestre,
  updateEventoEdicao,
  updateEventoEdicaoCalendarioItem,
  updateEventoEdicaoCoreografiaVinculo,
  updateEventoEdicaoInscricao,
  updateEventoEdicaoInscricaoFinanceiro,
  updateEventoEscola,
  updateEventoParticipanteExterno,
  upsertEventoEdicaoConfiguracao,
} from "@/lib/eventos/repository";
import type {
  CoreografiaFormacao,
  CoreografiaEstiloPayload,
  CoreografiaEstiloUpdatePayload,
  CoreografiaMestrePayload,
  CoreografiaMestreUpdatePayload,
  EventoContratacaoPayload,
  EventoCoreografiaParticipantePayload,
  EventoDiaPayload,
  EventoEdicaoCalendarioPayload,
  EventoEdicaoCalendarioUpdatePayload,
  EventoEdicaoConfiguracaoPayload,
  EventoEdicaoContaInternaElegivel,
  EventoEdicaoContaInternaOrigem,
  EventoEdicaoDestinoFinanceiro,
  EventoEdicaoInscricaoAdicionarItensPayload,
  EventoEdicaoInscricaoFinanceiroTecnicoStatus,
  EventoEdicaoInscricaoPayload,
  EventoEdicaoModalidadePagamentoFinanceiro,
  EventoEdicaoParcelaContaInternaPlano,
  EventoEdicaoInscricaoCancelarItemPayload,
  EventoEdicaoInscricaoUpdatePayload,
  EventoEdicaoOrigemInscricao,
  EventoEdicaoPayload,
  EventoEdicaoCoreografiaVinculoPayload,
  EventoEdicaoCoreografiaVinculoUpdatePayload,
  EventoEscolaPayload,
  EventoEscolaUpdatePayload,
  EventoFinanceiroReferenciaPayload,
  EventoParticipanteExternoPayload,
  EventoParticipanteExternoUpdatePayload,
  EventoInscricaoItemPayload,
  EventoInscricaoPayload,
  EventoModalidadePayload,
  EventoSessaoAtividadePayload,
  EventoSessaoPayload,
  EventoTurmaVinculoPayload,
  EventoEdicaoUpdatePayload,
} from "@/lib/eventos/types";

type DbClient = SupabaseClient;

/** M7: Carrega data_limite_exercicio de escola_config_financeira */
async function carregarDataLimiteExercicio(db: DbClient): Promise<string | null> {
  const { data } = await db
    .from("escola_config_financeira")
    .select("data_limite_exercicio")
    .limit(1)
    .maybeSingle();
  return (data as any)?.data_limite_exercicio ?? null;
}

type InscricaoItemPersistido = {
  id: string;
};

type DiagnosticoFinanceiroInscricao = {
  inscricaoId: string;
  destinoFinanceiro: EventoEdicaoDestinoFinanceiro;
  pagamentoNoAto: boolean;
  valorTotalCentavos: number;
  totalItensAtivos: number;
  totalMovimentosFinanceirosItem: number;
  totalParcelasContaInterna: number;
  totalCobrancasRelacionadas: number;
  totalRecebimentosRelacionados: number;
  totalLancamentosContaInternaRelacionados: number;
  totalMovimentosFinanceirosReceita: number;
  possuiReflexoFinanceiro: boolean;
  consistente: boolean;
  motivos: string[];
};

type ResultadoConstituicaoFinanceiraInscricao = {
  statusFinanceiro: "NAO_GERADO" | "PENDENTE" | "PARCIAL" | "PAGO" | "ISENTO" | "CANCELADO";
  valorTotalCentavos: number;
  valorPagoAtoCentavos: number;
  valorSaldoContaInternaCentavos: number;
  modalidadePagamentoFinanceiro: EventoEdicaoModalidadePagamentoFinanceiro;
  contaInternaId: number | null;
  destinoFinanceiro: EventoEdicaoDestinoFinanceiro;
  gerarEmContaInterna: boolean;
  pagamentoNoAto: boolean;
  quantidadeParcelasContaInterna: number;
  cobrancaId: number | null;
  cobrancaAvulsaId: number | null;
  recebimentoId: number | null;
  lancamentoContaInternaId: number | null;
  faturaContaInternaId: number | null;
  formaPagamentoCodigo: string | null;
};

class EventoInscricaoFinanceiroError extends Error {
  readonly code: string;
  readonly details: string;
  readonly httpStatus: number;
  readonly inscricaoId: string | null;

  constructor(params: {
    message: string;
    code: string;
    details?: string | null;
    httpStatus?: number;
    inscricaoId?: string | null;
  }) {
    super(params.message);
    this.name = "EventoInscricaoFinanceiroError";
    this.code = params.code;
    this.details = params.details?.trim() || params.message;
    this.httpStatus = params.httpStatus ?? 500;
    this.inscricaoId = params.inscricaoId ?? null;
  }
}

export async function criarEventoEscola(
  db: DbClient,
  payload: EventoEscolaPayload,
) {
  return insertEventoEscola(db, payload);
}

export async function atualizarEventoEscolaEvento(
  db: DbClient,
  payload: EventoEscolaUpdatePayload,
) {
  await ensureEventoExists(db, payload.eventoId);
  return updateEventoEscola(db, payload);
}

export async function criarEdicaoEvento(
  db: DbClient,
  payload: EventoEdicaoPayload,
) {
  await ensureEventoExists(db, payload.eventoId);
  return insertEventoEdicao(db, payload);
}

export async function atualizarEdicaoEvento(
  db: DbClient,
  payload: EventoEdicaoUpdatePayload,
) {
  await ensureEdicaoExists(db, payload.edicaoId);
  return updateEventoEdicao(db, payload);
}

export async function criarDiaEvento(db: DbClient, payload: EventoDiaPayload) {
  await ensureEdicaoExists(db, payload.edicaoId);
  return insertEventoDia(db, payload);
}

export async function criarSessaoEvento(
  db: DbClient,
  payload: EventoSessaoPayload,
) {
  await ensureEdicaoExists(db, payload.edicaoId);
  await ensureDiaExists(db, payload.diaId, payload.edicaoId);
  return insertEventoSessao(db, payload);
}

export async function criarModalidadeEvento(
  db: DbClient,
  payload: EventoModalidadePayload,
) {
  await ensureEdicaoExists(db, payload.edicaoId);
  return insertEventoModalidade(db, payload);
}

export async function criarInscricaoEvento(
  db: DbClient,
  payload: EventoInscricaoPayload,
) {
  await ensureEdicaoExists(db, payload.edicaoId);
  await ensurePessoaExists(db, payload.pessoaId);

  if (payload.alunoPessoaId) {
    await ensurePessoaExists(db, payload.alunoPessoaId);
  }

  if (payload.responsavelFinanceiroId) {
    await ensurePessoaExists(db, payload.responsavelFinanceiroId);
  }

  return insertEventoInscricao(db, payload);
}

export async function criarItemInscricaoEvento(
  db: DbClient,
  payload: EventoInscricaoItemPayload,
) {
  await ensureInscricaoExists(db, payload.inscricaoId);
  return insertEventoInscricaoItem(db, payload);
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function isoDateOnly(value?: string | null): string {
  const source = value ? new Date(value) : new Date();
  if (Number.isNaN(source.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return source.toISOString().slice(0, 10);
}

function competenciaAnoMes(value?: string | null): string {
  return isoDateOnly(value).slice(0, 7);
}

function normalizeFormaPagamentoCodigo(codigo: string): string {
  const normalizado = codigo.trim().toUpperCase();

  if (normalizado === "CARTAO") return "CREDITO_AVISTA";
  if (normalizado === "CARTAO_CREDITO_AVISTA") return "CREDITO_AVISTA";
  if (normalizado === "CARTAO_CREDITO_PARCELADO") return "CREDITO_PARCELADO";
  if (normalizado === "DINHEIRO") return "DINHEIRO";
  if (normalizado === "PIX") return "PIX";

  return normalizado;
}

const COMPETENCIA_REGEX = /^[0-9]{4}-[0-9]{2}$/;

function resumirErroOperacional(error: unknown): string {
  if (error instanceof Error) {
    const partes = [
      error.message.trim() || null,
      resumirErroOperacional((error as Error & { cause?: unknown }).cause),
    ].filter(
      (item): item is string =>
        Boolean(item) && item !== "erro_sem_detalhe",
    );

    if (partes.length > 0) {
      return Array.from(new Set(partes)).join(" | ");
    }
  }
  if (typeof error === "string" && error.trim()) return error.trim();
  if (typeof error === "object" && error !== null) {
    const record = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
      error?: unknown;
    };
    const partes = [
      typeof record.code === "string" && record.code.trim()
        ? `[${record.code.trim()}]`
        : null,
      typeof record.message === "string" && record.message.trim()
        ? record.message.trim()
        : null,
      typeof record.details === "string" && record.details.trim()
        ? record.details.trim()
        : null,
      typeof record.hint === "string" && record.hint.trim()
        ? `hint: ${record.hint.trim()}`
        : null,
      typeof record.error === "string" && record.error.trim()
        ? record.error.trim()
        : null,
    ].filter((item): item is string => Boolean(item));

    if (partes.length > 0) {
      return Array.from(new Set(partes)).join(" | ");
    }
  }
  return "erro_sem_detalhe";
}

function serializarErroOperacional(error: unknown): unknown {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack ?? null,
      cause: serializarErroOperacional(
        (error as Error & { cause?: unknown }).cause,
      ),
    };
  }

  if (typeof error === "object" && error !== null) return error;
  if (typeof error === "undefined") return null;
  return String(error);
}

function limitarDetalheErro(value: string, max = 500): string {
  const normalized = value.trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 3)}...`;
}

function buildParticipanteLogLabel(params: {
  participanteNome: string | null;
  alunoPessoaId?: number | null;
  participanteExternoId?: string | null;
}) {
  if (params.participanteNome?.trim()) return params.participanteNome.trim();
  if (params.alunoPessoaId) return `aluno:${params.alunoPessoaId}`;
  if (params.participanteExternoId) return `externo:${params.participanteExternoId}`;
  return "participante_nao_identificado";
}

function logInscricaoEventoFinanceiro(
  etapa:
    | "INSCRICAO_EVENTO_CREATE_START"
    | "INSCRICAO_EVENTO_CREATE_FINANCEIRO_START"
    | "INSCRICAO_EVENTO_CREATE_FINANCEIRO_OK"
    | "INSCRICAO_EVENTO_CREATE_FINANCEIRO_ERROR"
    | "INSCRICAO_EVENTO_CREATE_END",
  payload: {
    edicaoId: string;
    inscricaoId?: string | null;
    origem: EventoEdicaoOrigemInscricao;
    destinoFinanceiro: EventoEdicaoDestinoFinanceiro;
    participante: string;
    totalCalculado: number;
    branchFinanceiro: string;
    erroResumido?: string | null;
  },
) {
  const logger =
    etapa === "INSCRICAO_EVENTO_CREATE_FINANCEIRO_ERROR" ? console.error : console.info;

  logger(etapa, {
    edicaoId: payload.edicaoId,
    inscricaoId: payload.inscricaoId ?? null,
    origem: payload.origem,
    destinoFinanceiro: payload.destinoFinanceiro,
    participante: payload.participante,
    totalCalculado: payload.totalCalculado,
    branchFinanceiro: payload.branchFinanceiro,
    erroResumido: payload.erroResumido ?? null,
  });
}

async function atualizarEstadoTecnicoFinanceiroInscricao(
  db: DbClient,
  inscricaoId: string,
  patch: {
    financeiroStatus: EventoEdicaoInscricaoFinanceiroTecnicoStatus;
    financeiroErroCodigo?: string | null;
    financeiroErroDetalhe?: string | null;
    financeiroProcessadoEm?: string | null;
  },
) {
  await updateEventoEdicaoInscricaoFinanceiro(db, inscricaoId, {
    financeiroStatus: patch.financeiroStatus,
    financeiroErroCodigo: patch.financeiroErroCodigo,
    financeiroErroDetalhe: patch.financeiroErroDetalhe,
    financeiroProcessadoEm: patch.financeiroProcessadoEm,
  });
}

async function diagnosticarFinanceiroInscricao(
  db: DbClient,
  params: {
    edicaoId: string;
    inscricaoId: string;
  },
): Promise<DiagnosticoFinanceiroInscricao> {
  const inscricao = await getEventoEdicaoInscricaoById(
    db,
    params.edicaoId,
    params.inscricaoId,
  );
  const movimentos =
    await listEventoEdicaoInscricaoItemMovimentosFinanceirosByInscricaoId(
      db,
      params.inscricaoId,
    );
  const parcelas = await listEventoEdicaoInscricaoParcelasContaInternaByInscricaoIds(db, [
    params.inscricaoId,
  ]);

  const itensAtivos = Array.isArray(inscricao.itens)
    ? inscricao.itens.filter((item) => item.status !== "CANCELADO")
    : [];
  const cobrancas = new Set<string>();
  const recebimentos = new Set<number>();
  const lancamentos = new Set<number>();

  if (typeof inscricao.cobranca_id === "number") {
    cobrancas.add(`c:${inscricao.cobranca_id}`);
  }
  if (typeof inscricao.cobranca_avulsa_id === "number") {
    cobrancas.add(`ca:${inscricao.cobranca_avulsa_id}`);
  }
  if (typeof inscricao.recebimento_id === "number") {
    recebimentos.add(Number(inscricao.recebimento_id));
  }
  if (typeof inscricao.lancamento_conta_interna_id === "number") {
    lancamentos.add(Number(inscricao.lancamento_conta_interna_id));
  }

  for (const movimento of movimentos as Array<Record<string, unknown>>) {
    if (typeof movimento.cobranca_id === "number") {
      cobrancas.add(`c:${Number(movimento.cobranca_id)}`);
    }
    if (typeof movimento.cobranca_avulsa_id === "number") {
      cobrancas.add(`ca:${Number(movimento.cobranca_avulsa_id)}`);
    }
    if (typeof movimento.recebimento_id === "number") {
      recebimentos.add(Number(movimento.recebimento_id));
    }
    if (typeof movimento.lancamento_conta_interna_id === "number") {
      lancamentos.add(Number(movimento.lancamento_conta_interna_id));
    }
  }

  for (const parcela of parcelas as Array<Record<string, unknown>>) {
    if (typeof parcela.cobranca_id === "number") {
      cobrancas.add(`c:${Number(parcela.cobranca_id)}`);
    }
    if (typeof parcela.lancamento_conta_interna_id === "number") {
      lancamentos.add(Number(parcela.lancamento_conta_interna_id));
    }
  }

  let totalMovimentosFinanceirosReceita = 0;
  const recebimentoIds = [...recebimentos];
  if (recebimentoIds.length > 0) {
    const { data: movimentosReceita, error: movimentosReceitaError } = await db
      .from("movimento_financeiro")
      .select("id,origem_id")
      .eq("tipo", "RECEITA")
      .eq("origem", "RECEBIMENTO")
      .in("origem_id", recebimentoIds);

    if (movimentosReceitaError) throw movimentosReceitaError;
    totalMovimentosFinanceirosReceita = (movimentosReceita ?? []).length;
  }

  const destinoFinanceiro =
    inscricao.destino_financeiro as EventoEdicaoDestinoFinanceiro;
  const pagamentoNoAto = inscricao.pagamento_no_ato === true;
  const valorTotalCentavosRegistrado =
    typeof inscricao.valor_total_centavos === "number"
      ? Number(inscricao.valor_total_centavos)
      : 0;
  const motivos: string[] = [];
  const totalItensAtivos = itensAtivos.length;
  const valorTotalCentavosItens = itensAtivos.reduce((acc, item) => {
    const valor =
      typeof item.valor_total_centavos === "number"
        ? Number(item.valor_total_centavos)
        : 0;
    return acc + valor;
  }, 0);
  const valorTotalCentavos = Math.max(
    valorTotalCentavosRegistrado,
    valorTotalCentavosItens,
  );
  const totalMovimentosFinanceirosItem = movimentos.length;
  const totalParcelasContaInterna = parcelas.length;
  const totalCobrancasRelacionadas = cobrancas.size;
  const totalRecebimentosRelacionados = recebimentos.size;
  const totalLancamentosContaInternaRelacionados = lancamentos.size;
  const exigeReflexoFinanceiro = valorTotalCentavos > 0 && totalItensAtivos > 0;

  if (exigeReflexoFinanceiro) {
    if (valorTotalCentavosRegistrado <= 0 && valorTotalCentavosItens > 0) {
      motivos.push("valor_total_inscricao_nao_atualizado");
    }

    if (totalMovimentosFinanceirosItem <= 0) {
      motivos.push("nenhum_vinculo_financeiro_por_item");
    }

    if (destinoFinanceiro === "CONTA_INTERNA") {
      if (totalParcelasContaInterna <= 0) {
        motivos.push("nenhuma_parcela_conta_interna");
      }
      if (totalCobrancasRelacionadas <= 0) {
        motivos.push("nenhuma_cobranca_relacionada");
      }
      if (totalLancamentosContaInternaRelacionados <= 0) {
        motivos.push("nenhum_lancamento_conta_interna");
      }
      if (pagamentoNoAto && totalRecebimentosRelacionados <= 0) {
        motivos.push("nenhum_recebimento_relacionado");
      }
      if (pagamentoNoAto && totalMovimentosFinanceirosReceita <= 0) {
        motivos.push("nenhum_movimento_financeiro_receita");
      }
    } else if (destinoFinanceiro === "COBRANCA_DIRETA") {
      if (!pagamentoNoAto && totalCobrancasRelacionadas <= 0) {
        motivos.push("nenhuma_cobranca_relacionada");
      }
      if (pagamentoNoAto && totalRecebimentosRelacionados <= 0) {
        motivos.push("nenhum_recebimento_relacionado");
      }
      if (pagamentoNoAto && totalMovimentosFinanceirosReceita <= 0) {
        motivos.push("nenhum_movimento_financeiro_receita");
      }
    } else {
      if (totalCobrancasRelacionadas <= 0) {
        motivos.push("nenhuma_cobranca_relacionada");
      }
      if (totalRecebimentosRelacionados <= 0) {
        motivos.push("nenhum_recebimento_relacionado");
      }
      if (totalMovimentosFinanceirosReceita <= 0) {
        motivos.push("nenhum_movimento_financeiro_receita");
      }
    }
  }

  const possuiReflexoFinanceiro =
    totalMovimentosFinanceirosItem > 0 ||
    totalParcelasContaInterna > 0 ||
    totalCobrancasRelacionadas > 0 ||
    totalRecebimentosRelacionados > 0 ||
    totalLancamentosContaInternaRelacionados > 0 ||
    totalMovimentosFinanceirosReceita > 0;

  return {
    inscricaoId: params.inscricaoId,
    destinoFinanceiro,
    pagamentoNoAto,
    valorTotalCentavos,
    totalItensAtivos,
    totalMovimentosFinanceirosItem,
    totalParcelasContaInterna,
    totalCobrancasRelacionadas,
    totalRecebimentosRelacionados,
    totalLancamentosContaInternaRelacionados,
    totalMovimentosFinanceirosReceita,
    possuiReflexoFinanceiro,
    consistente: motivos.length === 0,
    motivos,
  };
}

async function garantirPosValidacaoFinanceiraInscricao(
  db: DbClient,
  params: {
    edicaoId: string;
    inscricaoId: string;
  },
) {
  const diagnostico = await diagnosticarFinanceiroInscricao(db, params);
  if (diagnostico.consistente) {
    return diagnostico;
  }

  throw new EventoInscricaoFinanceiroError({
    message: "financeiro da inscricao inconsistente",
    code: "INSCRICAO_EVENTO_FINANCEIRO_INCONSISTENTE",
    details: `Falha na pos-validacao: ${diagnostico.motivos.join(", ")}.`,
    httpStatus: 500,
    inscricaoId: params.inscricaoId,
  });
}

function buildResumoOperacionalFinanceiro(params: {
  statusFinanceiro: string;
  destinoFinanceiro: EventoEdicaoDestinoFinanceiro;
  pagamentoNoAto: boolean;
  valorTotalCentavos: number;
  quantidadeParcelasContaInterna: number;
  cobrancaId: number | null;
  cobrancaAvulsaId: number | null;
  recebimentoId: number | null;
  lancamentoContaInternaId: number | null;
  faturaContaInternaId: number | null;
  diagnostico: DiagnosticoFinanceiroInscricao;
}) {
  return {
    statusFinanceiro: params.statusFinanceiro,
    destinoFinanceiro: params.destinoFinanceiro,
    pagamentoNoAto: params.pagamentoNoAto,
    valorTotalCentavos: params.valorTotalCentavos,
    quantidadeParcelasContaInterna: params.quantidadeParcelasContaInterna,
    cobrancaId: params.cobrancaId,
    cobrancaAvulsaId: params.cobrancaAvulsaId,
    recebimentoId: params.recebimentoId,
    lancamentoContaInternaId: params.lancamentoContaInternaId,
    faturaContaInternaId: params.faturaContaInternaId,
    totalMovimentosFinanceirosItem:
      params.diagnostico.totalMovimentosFinanceirosItem,
    totalParcelasContaInterna: params.diagnostico.totalParcelasContaInterna,
    totalCobrancasRelacionadas: params.diagnostico.totalCobrancasRelacionadas,
    totalRecebimentosRelacionados:
      params.diagnostico.totalRecebimentosRelacionados,
    totalLancamentosContaInternaRelacionados:
      params.diagnostico.totalLancamentosContaInternaRelacionados,
    totalMovimentosFinanceirosReceita:
      params.diagnostico.totalMovimentosFinanceirosReceita,
  };
}

function compareCompetencias(left: string, right: string) {
  return left.localeCompare(right);
}

function addMonthsToCompetencia(competencia: string, months: number) {
  const [yearRaw, monthRaw] = competencia.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const date = new Date(Date.UTC(year, month - 1, 1));
  date.setUTCMonth(date.getUTCMonth() + months);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function extractIsoDateOnly(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function resolveCompetenciaLimiteEvento(
  contexto: EventoEdicaoFinanceiroContexto,
): string | null {
  const dataBase =
    contexto.dataFim ??
    contexto.ultimaDataCalendario ??
    contexto.dataInicio ??
    null;

  return dataBase ? competenciaAnoMes(dataBase) : null;
}

async function carregarContextoFinanceiroEdicao(
  db: DbClient,
  edicaoId: string,
): Promise<EventoEdicaoFinanceiroContexto> {
  const contexto = await getEventoEdicaoFinanceiroContexto(db, edicaoId);
  const datasCalendario = (contexto.calendario ?? [])
    .flatMap((item) => [extractIsoDateOnly(item.fim), extractIsoDateOnly(item.inicio)])
    .filter((item): item is string => Boolean(item))
    .sort((left, right) => right.localeCompare(left));

  return {
    dataInicio: extractIsoDateOnly(contexto.edicao?.data_inicio),
    dataFim: extractIsoDateOnly(contexto.edicao?.data_fim),
    ultimaDataCalendario: datasCalendario[0] ?? null,
  };
}

function buildCompetenciasElegiveisContaInterna(params: {
  configuracao: ConfiguracaoInscricaoNormalizada;
  contexto: EventoEdicaoFinanceiroContexto;
  contaElegivel: EventoEdicaoContaInternaElegivel;
  hoje?: string | null;
  aplicarRestricaoParcelamento?: boolean;
  dataLimiteExercicio?: string | null;
}) {
  const hoje = isoDateOnly(params.hoje);
  const competenciaAtual = competenciaAnoMes(hoje);
  const aplicarRestricaoParcelamento =
    params.aplicarRestricaoParcelamento !== false;
  const usaCompetenciasExplicitas =
    params.configuracao.competenciasElegiveisContaInterna.length > 0;
  const competenciasBase =
    usaCompetenciasExplicitas
      ? params.configuracao.competenciasElegiveisContaInterna
      : Array.from(
          { length: Math.max(1, params.configuracao.maximoParcelasContaInterna) },
          (_, index) => addMonthsToCompetencia(competenciaAtual, index),
        );

  let competencias = Array.from(
    new Set(competenciasBase.filter((item) => COMPETENCIA_REGEX.test(item))),
  ).sort(compareCompetencias);

  if (usaCompetenciasExplicitas) {
    if (
      aplicarRestricaoParcelamento &&
      (!params.configuracao.permiteParcelamentoContaInterna ||
        !params.contaElegivel.permiteParcelamento)
    ) {
      return competencias.slice(0, 1);
    }

    return competencias;
  }

  const competenciaLimite = resolveCompetenciaLimiteEvento(params.contexto);
  if (!params.configuracao.permiteCompetenciasAposEvento && competenciaLimite) {
    competencias = competencias.filter(
      (item) => compareCompetencias(item, competenciaLimite) <= 0,
    );
  }

  // M7: Filtrar competências que ultrapassam data_limite_exercicio
  if (params.dataLimiteExercicio) {
    const limiteComp = params.dataLimiteExercicio.slice(0, 7); // YYYY-MM
    competencias = competencias.filter(
      (item) => compareCompetencias(item, limiteComp) <= 0,
    );
  }

  if (
    competencias.length === 0 &&
    !usaCompetenciasExplicitas &&
    compareCompetencias(competenciaAtual, competenciaLimite ?? "9999-12") <= 0
  ) {
    competencias = [competenciaAtual];
  }

  if (
    aplicarRestricaoParcelamento &&
    (!params.configuracao.permiteParcelamentoContaInterna ||
      !params.contaElegivel.permiteParcelamento)
  ) {
    return competencias.slice(0, 1);
  }

  return competencias;
}

function distribuirValorPorParcelas(
  valorTotalCentavos: number,
  quantidadeParcelas: number,
) {
  if (quantidadeParcelas <= 1) return [valorTotalCentavos];

  const base = Math.floor(valorTotalCentavos / quantidadeParcelas);
  const resto = valorTotalCentavos % quantidadeParcelas;

  return Array.from({ length: quantidadeParcelas }, (_, index) =>
    base + (index < resto ? 1 : 0),
  );
}

function buildParcelamentoContaInternaOptions(params: {
  valorTotalCentavos: number;
  configuracao: ConfiguracaoInscricaoNormalizada;
  contexto: EventoEdicaoFinanceiroContexto;
  contaElegivel: EventoEdicaoContaInternaElegivel;
  hoje?: string | null;
  dataLimiteExercicio?: string | null;
}): Array<{
  quantidadeParcelas: number;
  competencias: string[];
  parcelas: EventoEdicaoParcelaContaInternaPlano[];
}> {
  const competencias = buildCompetenciasElegiveisContaInterna(params);

  if (competencias.length === 0) return [];

  const maximoParcelas =
    params.configuracao.permiteParcelamentoContaInterna &&
      params.contaElegivel.permiteParcelamento
      ? Math.min(
          Math.max(1, params.configuracao.maximoParcelasContaInterna),
          competencias.length,
        )
      : 1;

  return Array.from({ length: maximoParcelas }, (_, index) => {
    const quantidadeParcelas = index + 1;
    const competenciasSelecionadas = competencias.slice(0, quantidadeParcelas);
    const valores = distribuirValorPorParcelas(
      params.valorTotalCentavos,
      quantidadeParcelas,
    );

    return {
      quantidadeParcelas,
      competencias: competenciasSelecionadas,
      parcelas: competenciasSelecionadas.map((competencia, parcelaIndex) => ({
        parcelaNumero: parcelaIndex + 1,
        totalParcelas: quantidadeParcelas,
        competencia,
        valorCentavos: valores[parcelaIndex] ?? 0,
      })),
    };
  });
}

type ConfiguracaoInscricaoNormalizada = {
  cobraTaxaParticipacaoGeral: boolean;
  cobraPorCoreografia: boolean;
  permiteItensAdicionais: boolean;
  permitePagamentoNoAto: boolean;
  permiteContaInterna: boolean;
  permiteParcelamentoContaInterna: boolean;
  exigeInscricaoGeral: boolean;
  permiteInscricaoPorCoreografia: boolean;
  permiteVincularCoreografiaDepois: boolean;
  geraContaInternaAutomaticamente: boolean;
  maximoParcelasContaInterna: number;
  competenciasElegiveisContaInterna: string[];
  permiteCompetenciasAposEvento: boolean;
  diaCorteOperacionalParcelamento: number | null;
  valorTaxaParticipacaoCentavos: number;
  regrasFinanceiras: ReturnType<typeof normalizeEventoEdicaoRegrasFinanceiras>;
};

function normalizeConfiguracaoInscricao(
  configuracao: Record<string, unknown> | null,
): ConfiguracaoInscricaoNormalizada {
  return {
    cobraTaxaParticipacaoGeral:
      configuracao?.cobra_taxa_participacao_geral === true,
    cobraPorCoreografia: configuracao?.cobra_por_coreografia === true,
    permiteItensAdicionais: configuracao?.permite_itens_adicionais !== false,
    permitePagamentoNoAto: configuracao?.permite_pagamento_no_ato !== false,
    permiteContaInterna: configuracao?.permite_conta_interna !== false,
    permiteParcelamentoContaInterna:
      configuracao?.permite_parcelamento_conta_interna === true,
    exigeInscricaoGeral: configuracao?.exige_inscricao_geral !== false,
    permiteInscricaoPorCoreografia:
      configuracao?.permite_inscricao_por_coreografia !== false,
    permiteVincularCoreografiaDepois:
      configuracao?.permite_vincular_coreografia_depois !== false,
    geraContaInternaAutomaticamente:
      configuracao?.gera_conta_interna_automaticamente === true,
    maximoParcelasContaInterna:
      typeof configuracao?.maximo_parcelas_conta_interna === "number" &&
        Number.isFinite(configuracao.maximo_parcelas_conta_interna) &&
        configuracao.maximo_parcelas_conta_interna > 0
        ? Math.trunc(configuracao.maximo_parcelas_conta_interna)
        : 1,
    competenciasElegiveisContaInterna: Array.isArray(
        configuracao?.competencias_elegiveis_conta_interna,
      )
      ? Array.from(
          new Set(
            configuracao.competencias_elegiveis_conta_interna.filter(
              (item): item is string =>
                typeof item === "string" &&
                /^[0-9]{4}-[0-9]{2}$/.test(item),
            ),
          ),
        ).sort((left, right) => left.localeCompare(right))
      : [],
    permiteCompetenciasAposEvento:
      configuracao?.permite_competencias_apos_evento === true,
    diaCorteOperacionalParcelamento:
      typeof configuracao?.dia_corte_operacional_parcelamento === "number" &&
        Number.isFinite(configuracao.dia_corte_operacional_parcelamento)
        ? Math.trunc(configuracao.dia_corte_operacional_parcelamento)
        : null,
    valorTaxaParticipacaoCentavos:
      typeof configuracao?.valor_taxa_participacao_centavos === "number"
        ? Number(configuracao.valor_taxa_participacao_centavos)
        : 0,
    regrasFinanceiras: normalizeEventoEdicaoRegrasFinanceiras(
      configuracao?.regrasFinanceiras ?? configuracao?.regras_financeiras ?? [],
    ),
  };
}

type EventoEdicaoFinanceiroContexto = {
  dataInicio: string | null;
  dataFim: string | null;
  ultimaDataCalendario: string | null;
};

type CoreografiaFormacaoRecord = {
  id: string;
  codigo: CoreografiaFormacao;
  nome: string;
  quantidade_minima_padrao: number;
  quantidade_maxima_padrao: number;
  quantidade_fixa: boolean;
  ativo: boolean | null;
};

type PessoaResumo = {
  id: number;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  cpf: string | null;
  nascimento: string | null;
  ativo: boolean | null;
};

type ParticipanteExternoResumo = {
  id: string;
  pessoa_id: number;
  documento: string | null;
  responsavel_nome: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

async function hydrateParticipantesExternosEvento(
  db: DbClient,
  rows: Record<string, unknown>[],
) {
  const participantes = rows as unknown as ParticipanteExternoResumo[];
  const pessoas = (await listPessoasByIds(
    db,
    participantes
      .map((item) => item.pessoa_id)
      .filter((item): item is number => typeof item === "number"),
  )) as unknown as PessoaResumo[];

  const pessoasPorId = new Map<number, PessoaResumo>(
    pessoas.map((item) => [item.id, item]),
  );

  return participantes.map((item) => ({
    ...item,
    pessoa: pessoasPorId.get(item.pessoa_id) ?? null,
    nome_exibicao:
      pessoasPorId.get(item.pessoa_id)?.nome ?? `Pessoa #${item.pessoa_id}`,
  }));
}

async function resolveCoreografiaFormacaoEvento(
  db: DbClient,
  params: {
    formacaoId?: string | null;
    tipoFormacao?: CoreografiaFormacao | null;
  },
): Promise<CoreografiaFormacaoRecord> {
  const formacao =
    params.formacaoId?.trim()
      ? await getCoreografiaFormacaoById(db, params.formacaoId)
      : await getCoreografiaFormacaoByCodigo(
          db,
          params.tipoFormacao ?? "LIVRE",
        );

  if (!formacao || formacao.ativa === false) {
    throw new Error("formacao artistica nao encontrada");
  }

  if (
    params.tipoFormacao &&
    formacao.codigo !== params.tipoFormacao
  ) {
    throw new Error("formacao artistica inconsistente com o tipo informado");
  }

  return formacao as CoreografiaFormacaoRecord;
}

function resolveLimitesCoreografiaPorFormacao(params: {
  formacao: CoreografiaFormacaoRecord;
  quantidadeMinima?: number | null;
  quantidadeMaxima?: number | null;
}) {
  if (params.formacao.quantidade_fixa) {
    return {
      minimo: params.formacao.quantidade_minima_padrao,
      maximo: params.formacao.quantidade_maxima_padrao,
    };
  }

  const minimo = Math.max(
    1,
    params.quantidadeMinima ?? params.formacao.quantidade_minima_padrao,
  );
  const maximo = Math.max(
    minimo,
    params.quantidadeMaxima ?? params.formacao.quantidade_maxima_padrao,
  );

  return { minimo, maximo };
}

async function hydrateInscricoesEvento(
  db: DbClient,
  rows: Record<string, unknown>[],
) {
  const inscricoes = rows;
  const inscricaoIds = inscricoes
    .map((row) => (typeof row.id === "string" ? row.id : null))
    .filter((item): item is string => Boolean(item));
  const pessoaIds = Array.from(
    new Set(
      inscricoes.flatMap((row) => {
        const ids = [
          row.pessoa_id,
          row.aluno_pessoa_id,
          row.responsavel_financeiro_id,
        ].filter((value): value is number => typeof value === "number");
        return ids;
      }),
    ),
  );
  const participanteIds = Array.from(
    new Set(
      inscricoes
        .map((row) => row.participante_externo_id)
        .filter((value): value is string => typeof value === "string"),
    ),
  );

  const [pessoas, participantesExternos, parcelasContaInterna] = await Promise.all([
    listPessoasByIds(db, pessoaIds),
    listEventoParticipantesExternosByIds(db, participanteIds),
    listEventoEdicaoInscricaoParcelasContaInternaByInscricaoIds(db, inscricaoIds),
  ]);

  const pessoasMap = new Map<number, Record<string, unknown>>(
    (pessoas as Record<string, unknown>[]).map((item) => [Number(item.id), item]),
  );
  const participantesExternosHydrated = await hydrateParticipantesExternosEvento(
    db,
    participantesExternos as Record<string, unknown>[],
  );
  const participantesExternosMap = new Map<string, Record<string, unknown>>(
    participantesExternosHydrated.map((item) => [String(item.id), item as Record<string, unknown>]),
  );
  const parcelasPorInscricao = new Map<string, Record<string, unknown>[]>();
  const faturaIds = Array.from(
    new Set(
      (parcelasContaInterna as Record<string, unknown>[])
        .map((item) =>
          typeof item.fatura_conta_interna_id === "number"
            ? item.fatura_conta_interna_id
            : null,
        )
        .filter((item): item is number => item !== null),
    ),
  );
  const faturasPorId = new Map<number, { data_vencimento: string | null }>();

  if (faturaIds.length > 0) {
    const { data: faturas, error: faturasError } = await db
      .from("credito_conexao_faturas")
      .select("id,data_vencimento")
      .in("id", faturaIds);

    if (faturasError) throw faturasError;

    for (const fatura of (faturas ?? []) as Array<Record<string, unknown>>) {
      const faturaId =
        typeof fatura.id === "number" ? Number(fatura.id) : null;
      if (!faturaId) continue;
      faturasPorId.set(faturaId, {
        data_vencimento:
          typeof fatura.data_vencimento === "string"
            ? fatura.data_vencimento
            : null,
      });
    }
  }

  for (const parcela of parcelasContaInterna as Record<string, unknown>[]) {
    const inscricaoId =
      typeof parcela.inscricao_id === "string" ? parcela.inscricao_id : null;
    if (!inscricaoId) continue;
    const faturaId =
      typeof parcela.fatura_conta_interna_id === "number"
        ? Number(parcela.fatura_conta_interna_id)
        : null;
    const atuais = parcelasPorInscricao.get(inscricaoId) ?? [];
    atuais.push({
      ...parcela,
      data_vencimento:
        (faturaId ? faturasPorId.get(faturaId)?.data_vencimento : null) ?? null,
    });
    parcelasPorInscricao.set(inscricaoId, atuais);
  }

  return inscricoes.map((row) => ({
    ...row,
    participante: typeof row.pessoa_id === "number" ? pessoasMap.get(row.pessoa_id) ?? null : null,
    aluno:
      typeof row.aluno_pessoa_id === "number"
        ? pessoasMap.get(row.aluno_pessoa_id) ?? null
        : null,
    responsavel_financeiro:
      typeof row.responsavel_financeiro_id === "number"
        ? pessoasMap.get(row.responsavel_financeiro_id) ?? null
        : null,
    participante_externo:
      typeof row.participante_externo_id === "string"
        ? participantesExternosMap.get(row.participante_externo_id) ?? null
        : null,
    parcelas_conta_interna:
      typeof row.id === "string" ? parcelasPorInscricao.get(row.id) ?? [] : [],
  }));
}

function buildDescricaoFinanceiraInscricao(params: {
  nomeEventoBase: string | null;
  tituloEdicao: string | null;
  participanteNome: string | null;
}) {
  const nomeEvento = params.nomeEventoBase?.trim() || "Evento da escola";
  const edicao = params.tituloEdicao?.trim() || "edicao";
  const participante = params.participanteNome?.trim() || "participante";
  return `${nomeEvento} - ${edicao} - Inscricao de ${participante}`;
}

function buildDescricaoFinanceiraInscricaoParcela(
  descricaoBase: string,
  plano: EventoEdicaoParcelaContaInternaPlano,
) {
  return `${descricaoBase} - Parcela ${plano.parcelaNumero}/${plano.totalParcelas} - Competencia ${plano.competencia}`;
}

function buildDescricaoFinanceiraAmpliacaoInscricao(
  descricaoBase: string,
) {
  return `${descricaoBase} - Ampliacao de participacao`;
}

type ResumoPagamentoFinanceiroInscricao = {
  modalidadePagamentoFinanceiro: EventoEdicaoModalidadePagamentoFinanceiro;
  destinoFinanceiro: EventoEdicaoDestinoFinanceiro;
  pagamentoNoAto: boolean;
  valorPagoAtoCentavos: number;
  valorSaldoContaInternaCentavos: number;
  quantidadeParcelasContaInterna: number;
  formaPagamentoCodigo: string | null;
  observacoesPagamento: string | null;
  parcelasContaInternaSelecionadasPayload: EventoEdicaoParcelaContaInternaPlano[];
};

type ItemFinanceiroRateio = {
  valorPagoAtoCentavos: number;
  valorSaldoContaInternaCentavos: number;
};

function distribuirValorPagoAtoEntreItens(
  itensFinanceiros: ItemFinanceiroInscricao[],
  valorPagoAtoCentavos: number,
): ItemFinanceiroRateio[] {
  let saldoRestante = Math.max(0, valorPagoAtoCentavos);

  return itensFinanceiros.map((item) => {
    const valorPagoNoItem = Math.min(item.valorTotalCentavos, saldoRestante);
    saldoRestante -= valorPagoNoItem;

    return {
      valorPagoAtoCentavos: valorPagoNoItem,
      valorSaldoContaInternaCentavos: Math.max(
        0,
        item.valorTotalCentavos - valorPagoNoItem,
      ),
    };
  });
}

function resolverPagamentoFinanceiroInscricao(params: {
  payload: EventoEdicaoInscricaoPayload;
  configuracao: ConfiguracaoInscricaoNormalizada;
  valorTotalCentavos: number;
}): ResumoPagamentoFinanceiroInscricao {
  const pagamentoPayload = params.payload.pagamentoFinanceiro;
  const modalidadePagamentoFinanceiro: EventoEdicaoModalidadePagamentoFinanceiro =
    params.payload.origemInscricao === "INSCRICAO_EXTERNA"
      ? "ATO_TOTAL"
      : pagamentoPayload?.modalidade ??
        (params.payload.pagamentoNoAto ? "ATO_TOTAL" : "CONTA_INTERNA_TOTAL");

  if (
    modalidadePagamentoFinanceiro !== "CONTA_INTERNA_TOTAL" &&
    !params.configuracao.permitePagamentoNoAto
  ) {
    throw new Error("a edicao nao permite pagamento no ato");
  }

  if (
    modalidadePagamentoFinanceiro !== "ATO_TOTAL" &&
    params.payload.origemInscricao === "INSCRICAO_INTERNA" &&
    !params.configuracao.permiteContaInterna
  ) {
    throw new Error("a edicao nao permite geracao em conta interna");
  }

  let valorPagoAtoCentavos = 0;
  if (modalidadePagamentoFinanceiro === "ATO_TOTAL") {
    valorPagoAtoCentavos = params.valorTotalCentavos;
  } else if (modalidadePagamentoFinanceiro === "MISTO") {
    const valorInformado = pagamentoPayload?.valorPagoAtoCentavos;
    if (typeof valorInformado !== "number" || !Number.isInteger(valorInformado)) {
      throw new Error("informe o valor pago no ato em centavos inteiros");
    }
    valorPagoAtoCentavos = valorInformado;
  }

  if (valorPagoAtoCentavos < 0) {
    throw new Error("valor_pago_ato_centavos nao pode ser negativo");
  }
  if (valorPagoAtoCentavos > params.valorTotalCentavos) {
    throw new Error("valor_pago_ato_centavos nao pode ser maior que o total");
  }

  const valorSaldoContaInternaCentavos =
    params.valorTotalCentavos - valorPagoAtoCentavos;

  if (
    modalidadePagamentoFinanceiro === "ATO_TOTAL" &&
    valorSaldoContaInternaCentavos !== 0
  ) {
    throw new Error("pagamento total no ato nao pode deixar saldo");
  }
  if (
    modalidadePagamentoFinanceiro === "CONTA_INTERNA_TOTAL" &&
    valorPagoAtoCentavos !== 0
  ) {
    throw new Error("conta interna total nao permite valor pago no ato");
  }
  if (
    modalidadePagamentoFinanceiro === "MISTO" &&
    (valorPagoAtoCentavos <= 0 || valorSaldoContaInternaCentavos <= 0)
  ) {
    throw new Error("pagamento misto exige entrada e saldo restante");
  }

  const formaPagamentoCodigoBase =
    pagamentoPayload?.formaPagamentoCodigo ?? params.payload.formaPagamentoCodigo ?? null;
  const formaPagamentoCodigo =
    valorPagoAtoCentavos > 0 && formaPagamentoCodigoBase
      ? normalizeFormaPagamentoCodigo(formaPagamentoCodigoBase)
      : valorPagoAtoCentavos > 0
        ? null
        : null;

  if (valorPagoAtoCentavos > 0 && !formaPagamentoCodigo) {
    throw new Error("formaPagamentoCodigo e obrigatorio quando houver pagamento no ato");
  }

  const parcelasContaInternaSelecionadasPayload =
    valorSaldoContaInternaCentavos > 0
      ? pagamentoPayload?.parcelasContaInternaSelecionadas ?? []
      : [];
  const quantidadeParcelasContaInterna =
    valorSaldoContaInternaCentavos > 0
      ? parcelasContaInternaSelecionadasPayload.length > 0
        ? parcelasContaInternaSelecionadasPayload.length
        : Math.max(1, params.payload.quantidadeParcelasContaInterna ?? 1)
      : 0;

  return {
    modalidadePagamentoFinanceiro,
    destinoFinanceiro:
      params.payload.origemInscricao === "INSCRICAO_EXTERNA"
        ? "COBRANCA_AVULSA"
        : valorSaldoContaInternaCentavos > 0
          ? "CONTA_INTERNA"
          : "COBRANCA_DIRETA",
    pagamentoNoAto: valorPagoAtoCentavos > 0,
    valorPagoAtoCentavos,
    valorSaldoContaInternaCentavos,
    quantidadeParcelasContaInterna,
    formaPagamentoCodigo,
    observacoesPagamento: pagamentoPayload?.observacoesPagamento ?? null,
    parcelasContaInternaSelecionadasPayload,
  };
}

type ItemFinanceiroInscricao = {
  tipoItem: "EVENTO_GERAL" | "ITEM_EDICAO" | "COREOGRAFIA";
  itemConfiguracaoId: string | null;
  coreografiaVinculoId: string | null;
  descricaoSnapshot: string;
  quantidade: number;
  valorUnitarioCentavos: number;
  valorTotalCentavos: number;
  obrigatorio: boolean;
  observacoes?: string | null;
  origemItem?: "INSCRICAO_INICIAL" | "AMPLIACAO_POSTERIOR";
};

type ParcelaFinanceiraRegistrada = {
  parcelaNumero: number;
  totalParcelas: number;
  competencia: string;
  valorCentavos: number;
  contaInternaId: number;
  cobrancaId: number | null;
  lancamentoContaInternaId: number | null;
  faturaContaInternaId: number | null;
  recebimentoId: number | null;
  status: string;
  observacoes: string;
};

async function constituirFinanceiroInscricaoEdicaoEvento(
  db: DbClient,
  params: {
    edicaoId: string;
    inscricaoId: string;
    origemInscricao: EventoEdicaoOrigemInscricao;
    destinoFinanceiro: EventoEdicaoDestinoFinanceiro;
    pagamentoNoAto: boolean;
    modalidadePagamentoFinanceiro: EventoEdicaoModalidadePagamentoFinanceiro;
    pessoaFinanceiraId: number;
    participanteNome: string | null;
    valorTotalCentavos: number;
    valorPagoAtoCentavos: number;
    valorSaldoContaInternaCentavos: number;
    contaInternaId: number | null;
    diaVencimentoContaInterna: number | null;
    contaInternaSelecionada: EventoEdicaoContaInternaElegivel | null;
    quantidadeParcelasContaInterna: number;
    parcelasContaInternaSelecionadas: EventoEdicaoParcelaContaInternaPlano[];
    formaPagamentoCodigo: string | null;
    observacoesPagamento: string | null;
    itensFinanceiros: ItemFinanceiroInscricao[];
    itensPersistidos: InscricaoItemPersistido[];
    options?: { userId?: string | null };
  },
): Promise<ResultadoConstituicaoFinanceiraInscricao> {
  const { data: edicaoDetalhe, error: edicaoDetalheError } = await db
    .from("eventos_escola_edicoes")
    .select("titulo_exibicao, evento:eventos_escola(titulo)")
    .eq("id", params.edicaoId)
    .maybeSingle();

  if (edicaoDetalheError) throw edicaoDetalheError;

  const eventoBase = firstRelation(
    edicaoDetalhe?.evento as { titulo: string } | { titulo: string }[] | null,
  );
  const descricaoFinanceira = buildDescricaoFinanceiraInscricao({
    nomeEventoBase:
      eventoBase && typeof eventoBase.titulo === "string" ? eventoBase.titulo : null,
    tituloEdicao:
      typeof edicaoDetalhe?.titulo_exibicao === "string"
        ? edicaoDetalhe.titulo_exibicao
        : null,
    participanteNome: params.participanteNome,
  });

  const centroCustoId = await getCentroCustoPadraoEscolaId(db);
  const hoje = isoDateOnly();
  const competencia = competenciaAnoMes(hoje);
  const formaPagamento =
    params.valorPagoAtoCentavos > 0 && params.formaPagamentoCodigo
      ? await getFormaPagamentoByCodigo(db, params.formaPagamentoCodigo)
      : null;

  if (params.valorPagoAtoCentavos > 0 && !formaPagamento) {
    throw new Error("forma de pagamento nao encontrada");
  }

  if (
    params.valorSaldoContaInternaCentavos > 0 &&
    params.origemInscricao === "INSCRICAO_INTERNA" &&
    params.destinoFinanceiro === "CONTA_INTERNA" &&
    params.parcelasContaInternaSelecionadas.length === 0
  ) {
    throw new Error("parcelamento de conta interna nao resolvido para a inscricao");
  }

  let cobrancaId: number | null = null;
  let cobrancaAvulsaId: number | null = null;
  let recebimentoId: number | null = null;
  let lancamentoContaInternaId: number | null = null;
  let faturaContaInternaId: number | null = null;
  const rateioItens = distribuirValorPagoAtoEntreItens(
    params.itensFinanceiros,
    params.valorPagoAtoCentavos,
  );
  const movimentosFinanceirosItens: Array<{
    inscricaoId: string;
    inscricaoItemId: string;
    tipoMovimento?: "CONSTITUICAO" | "CANCELAMENTO_SEM_ESTORNO" | "AJUSTE_MANUAL";
    destinoFinanceiro: "CONTA_INTERNA" | "COBRANCA_DIRETA" | "COBRANCA_AVULSA";
    competencia?: string | null;
    parcelaNumero?: number | null;
    totalParcelas?: number | null;
    valorCentavos: number;
    contaInternaId?: number | null;
    cobrancaId?: number | null;
    cobrancaAvulsaId?: number | null;
    recebimentoId?: number | null;
    lancamentoContaInternaId?: number | null;
    faturaContaInternaId?: number | null;
    observacoes?: string | null;
  }> = [];

  async function registrarRecebimentoImediato(registro: {
    valorCentavos: number;
    observacoes: string;
    origemSistema: string;
    cobrancaId?: number | null;
    tipoPagamento: "ATO" | "AJUSTE" | "QUITACAO";
  }) {
    const recebimento = await insertRecebimentoEventoEdicaoInscricao(db, {
      cobrancaId: registro.cobrancaId ?? null,
      centroCustoId,
      valorCentavos: registro.valorCentavos,
      dataPagamento: `${hoje}T00:00:00`,
      metodoPagamento: params.formaPagamentoCodigo ?? "OUTRO",
      formaPagamentoCodigo: params.formaPagamentoCodigo,
      origemSistema: registro.origemSistema,
      observacoes: registro.observacoes,
    });

    const recebimentoRegistradoId = Number(recebimento.id);
    let movimentoFinanceiroId: number | null = null;

    if (centroCustoId) {
      const movimento = await insertMovimentoFinanceiroReceita(db, {
        centroCustoId,
        valorCentavos: registro.valorCentavos,
        dataMovimento: `${hoje}T00:00:00`,
        origem: "RECEBIMENTO",
        origemId: recebimentoRegistradoId,
        descricao: registro.observacoes,
        usuarioId: params.options?.userId ?? null,
      });
      movimentoFinanceiroId = Number(movimento.id);
    }

    await insertEventoEdicaoInscricaoPagamento(db, {
      inscricaoId: params.inscricaoId,
      tipoPagamento: registro.tipoPagamento,
      formaPagamentoId:
        formaPagamento && typeof formaPagamento.id === "number"
          ? Number(formaPagamento.id)
          : null,
      valorCentavos: registro.valorCentavos,
      recebimentoId: recebimentoRegistradoId,
      movimentoFinanceiroId,
      observacoes: params.observacoesPagamento ?? registro.observacoes,
      createdBy: params.options?.userId ?? null,
    });

    return {
      recebimentoId: recebimentoRegistradoId,
      movimentoFinanceiroId,
    };
  }

  if (params.valorTotalCentavos > 0) {
    if (
      params.origemInscricao === "INSCRICAO_INTERNA" &&
      params.destinoFinanceiro === "CONTA_INTERNA"
    ) {
      if (!params.contaInternaId) {
        throw new Error("conta interna nao resolvida para a inscricao");
      }

      if (params.valorPagoAtoCentavos > 0) {
        const observacaoRecebimento =
          `Inscricao ${params.inscricaoId} - ${descricaoFinanceira} - pagamento no ato`;
        const recebimentoRegistro = await registrarRecebimentoImediato({
          valorCentavos: params.valorPagoAtoCentavos,
          observacoes: observacaoRecebimento,
          origemSistema: "EVENTO_ESCOLA",
          tipoPagamento:
            params.modalidadePagamentoFinanceiro === "ATO_TOTAL" ? "QUITACAO" : "ATO",
        });

        recebimentoId = recebimentoRegistro.recebimentoId;

        await insertEventoFinanceiroReferencia(db, {
          edicaoId: params.edicaoId,
          natureza: "RECEITA",
          origemTipo: "RECEBIMENTO",
          origemId: recebimentoId,
          pessoaId: params.pessoaFinanceiraId,
          descricao: `${descricaoFinanceira} - valor pago no ato`,
          valorPrevistoCentavos: params.valorPagoAtoCentavos,
          valorRealCentavos: params.valorPagoAtoCentavos,
          recebimentoId,
          movimentoFinanceiroId: recebimentoRegistro.movimentoFinanceiroId ?? undefined,
          observacoes: `Inscricao ${params.inscricaoId} - pagamento no ato`,
        });

        for (const [itemIndex, itemPersistido] of params.itensPersistidos.entries()) {
          const itemFinanceiro = params.itensFinanceiros[itemIndex];
          const rateio = rateioItens[itemIndex];
          if (!itemFinanceiro || !rateio || rateio.valorPagoAtoCentavos <= 0) continue;

          movimentosFinanceirosItens.push({
            inscricaoId: params.inscricaoId,
            inscricaoItemId: itemPersistido.id,
            destinoFinanceiro: "COBRANCA_DIRETA",
            valorCentavos: rateio.valorPagoAtoCentavos,
            recebimentoId,
            observacoes:
              `Pagamento no ato da inscricao ${params.inscricaoId} - ` +
              `${itemFinanceiro.descricaoSnapshot}`,
          });
        }
      }

      const parcelasRegistradas: ParcelaFinanceiraRegistrada[] = [];
      for (const parcela of params.parcelasContaInternaSelecionadas) {
        const descricaoParcela = buildDescricaoFinanceiraInscricaoParcela(
          descricaoFinanceira,
          parcela,
        );
        // 1A: vencimento provisório = último dia da competência (não hoje)
        const vencimentoProvisorio = (() => {
          const [anoComp, mesComp] = parcela.competencia.split("-").map(Number);
          if (anoComp && mesComp) {
            const ultimoDia = new Date(anoComp, mesComp, 0).getDate();
            return `${anoComp}-${String(mesComp).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;
          }
          return hoje;
        })();
        const cobrancaParcela = await insertCobrancaEventoEdicaoInscricao(db, {
          origemEventoInscricaoId: params.inscricaoId,
          pessoaId: params.pessoaFinanceiraId,
          descricao: descricaoParcela,
          valorCentavos: parcela.valorCentavos,
          vencimento: vencimentoProvisorio,
          status: "PENDENTE",
          centroCustoId,
          contaInternaId: params.contaInternaId,
          metodoPagamento: null,
          dataPagamento: null,
          observacoes:
            `Inscricao ${params.inscricaoId} do modulo de eventos - ` +
            `parcela ${parcela.parcelaNumero}/${parcela.totalParcelas}`,
          origemLabel:
            `${params.inscricaoId}:` +
            `${parcela.competencia}:${parcela.parcelaNumero}`,
          competenciaAnoMes: parcela.competencia,
          parcelaNumero: parcela.parcelaNumero,
          totalParcelas: parcela.totalParcelas,
        });

        const cobrancaParcelaId = Number(cobrancaParcela.id);
        const recebimentoParcelaId: number | null = null;

        const lancamento = await criarLancamentoContaInterna({
          supabase: db,
          cobrancaId: cobrancaParcelaId,
          contaInternaId: params.contaInternaId,
          competencia: parcela.competencia,
          valorCentavos: parcela.valorCentavos,
          descricao: descricaoParcela,
          origemSistema: "ESCOLA",
          origemId: cobrancaParcelaId,
          composicaoJson: {
            modulo: "eventos_escola",
            inscricao_id: params.inscricaoId,
            edicao_id: params.edicaoId,
            parcela_numero: parcela.parcelaNumero,
            total_parcelas: parcela.totalParcelas,
            competencia: parcela.competencia,
            itens: params.itensFinanceiros.map((item) => ({
              tipo: item.tipoItem,
              descricao: item.descricaoSnapshot,
              valor_centavos: item.valorTotalCentavos,
            })),
          },
          referenciaItem:
            `evento-inscricao:${params.inscricaoId}:` +
            `competencia:${parcela.competencia}:parcela:${parcela.parcelaNumero}`,
        });

        const lancamentoId = Number(lancamento.id);
        const fatura =
          params.contaInternaSelecionada?.origemTitular === "COLABORADOR"
            ? await agendarFaturamentoMensalColaborador({
                supabase: db,
                contaInternaId: params.contaInternaId,
                competencia: parcela.competencia,
                diaVencimento: params.diaVencimentoContaInterna,
                lancamentoId,
              })
            : await agendarFaturamentoMensalAluno({
                supabase: db,
                contaInternaId: params.contaInternaId,
                competencia: parcela.competencia,
                diaVencimento: params.diaVencimentoContaInterna,
                lancamentoId,
              });

        const faturaId = Number(fatura.fatura_id);
        const vencimentoFatura =
          typeof fatura.data_vencimento === "string" && fatura.data_vencimento
            ? fatura.data_vencimento
            : hoje;

        await updateCobrancaEventoEdicaoInscricaoVencimento(db, {
          cobrancaId: cobrancaParcelaId,
          vencimento: vencimentoFatura,
        });

        await insertEventoFinanceiroReferencia(db, {
          edicaoId: params.edicaoId,
          natureza: "RECEITA",
          origemTipo: "CONTA_INTERNA",
          pessoaId: params.pessoaFinanceiraId,
          descricao: descricaoParcela,
          valorPrevistoCentavos: parcela.valorCentavos,
          contaInternaId: params.contaInternaId,
          cobrancaId: cobrancaParcelaId,
          observacoes:
            `Inscricao ${params.inscricaoId} - ` +
            `parcela ${parcela.parcelaNumero}/${parcela.totalParcelas}`,
        });

        parcelasRegistradas.push({
          parcelaNumero: parcela.parcelaNumero,
          totalParcelas: parcela.totalParcelas,
          competencia: parcela.competencia,
          valorCentavos: parcela.valorCentavos,
          contaInternaId: params.contaInternaId,
          cobrancaId: cobrancaParcelaId,
          lancamentoContaInternaId: lancamentoId,
          faturaContaInternaId: faturaId,
          recebimentoId: recebimentoParcelaId,
          status: "PENDENTE",
          observacoes:
            `Inscricao ${params.inscricaoId} - ` +
            `parcela ${parcela.parcelaNumero}/${parcela.totalParcelas}`,
        });
      }

      if (parcelasRegistradas.length > 0) {
        const [primeiraParcela] = parcelasRegistradas;
        cobrancaId = primeiraParcela.cobrancaId;
        lancamentoContaInternaId = primeiraParcela.lancamentoContaInternaId;
        faturaContaInternaId = primeiraParcela.faturaContaInternaId;
      }

      for (const [itemIndex, itemPersistido] of params.itensPersistidos.entries()) {
        const itemFinanceiro = params.itensFinanceiros[itemIndex];
        const rateio = rateioItens[itemIndex];
        const valorBaseRateado =
          rateio?.valorSaldoContaInternaCentavos ?? itemFinanceiro?.valorTotalCentavos ?? 0;
        if (!itemFinanceiro || valorBaseRateado <= 0) continue;

        const distribuicaoItem = distribuirValorPorParcelas(
          valorBaseRateado,
          parcelasRegistradas.length,
        );

        parcelasRegistradas.forEach((parcela, parcelaIndex) => {
          const valorCentavos = distribuicaoItem[parcelaIndex] ?? 0;
          if (valorCentavos <= 0) return;

          movimentosFinanceirosItens.push({
            inscricaoId: params.inscricaoId,
            inscricaoItemId: itemPersistido.id,
            destinoFinanceiro: "CONTA_INTERNA",
            competencia: parcela.competencia,
            parcelaNumero: parcela.parcelaNumero,
            totalParcelas: parcela.totalParcelas,
            valorCentavos,
            contaInternaId: parcela.contaInternaId,
            cobrancaId: parcela.cobrancaId,
            lancamentoContaInternaId: parcela.lancamentoContaInternaId,
            faturaContaInternaId: parcela.faturaContaInternaId,
            observacoes:
              `Constituicao inicial da inscricao ${params.inscricaoId} - ` +
              `${itemFinanceiro.descricaoSnapshot}`,
          });
        });
      }

      await replaceEventoEdicaoInscricaoParcelasContaInterna(
        db,
        params.inscricaoId,
        parcelasRegistradas,
      );
    } else if (params.origemInscricao === "INSCRICAO_EXTERNA") {
      const observacaoAvulsa = `Inscricao ${params.inscricaoId} - ${descricaoFinanceira}`;
      const cobrancaAvulsa = await insertCobrancaAvulsaEventoEdicaoInscricao(db, {
        pessoaId: params.pessoaFinanceiraId,
        valorCentavos: params.valorTotalCentavos,
        vencimento: hoje,
        status: "PAGO",
        meio: "OUTRO",
        observacao: observacaoAvulsa,
        pagoEm: `${hoje}T00:00:00`,
      });

      cobrancaAvulsaId = Number(cobrancaAvulsa.id);

      const recebimentoRegistro = await registrarRecebimentoImediato({
        valorCentavos: params.valorTotalCentavos,
        observacoes: observacaoAvulsa,
        origemSistema: "COBRANCA_AVULSA",
        tipoPagamento: "QUITACAO",
      });
      recebimentoId = recebimentoRegistro.recebimentoId;

      await insertEventoFinanceiroReferencia(db, {
        edicaoId: params.edicaoId,
        natureza: "RECEITA",
        origemTipo: "RECEBIMENTO",
        origemId: recebimentoId,
        pessoaId: params.pessoaFinanceiraId,
        descricao: descricaoFinanceira,
        valorPrevistoCentavos: params.valorTotalCentavos,
        valorRealCentavos: params.valorTotalCentavos,
        recebimentoId,
        movimentoFinanceiroId: recebimentoRegistro.movimentoFinanceiroId ?? undefined,
        observacoes: `Inscricao ${params.inscricaoId}`,
      });

      for (const [itemIndex, itemPersistido] of params.itensPersistidos.entries()) {
        const itemFinanceiro = params.itensFinanceiros[itemIndex];
        if (!itemFinanceiro || itemFinanceiro.valorTotalCentavos <= 0) continue;

        movimentosFinanceirosItens.push({
          inscricaoId: params.inscricaoId,
          inscricaoItemId: itemPersistido.id,
          destinoFinanceiro: "COBRANCA_AVULSA",
          valorCentavos: itemFinanceiro.valorTotalCentavos,
          cobrancaAvulsaId,
          recebimentoId,
          observacoes:
            `Constituicao inicial da inscricao ${params.inscricaoId} - ` +
            `${itemFinanceiro.descricaoSnapshot}`,
        });
      }
    } else {
      if (params.valorPagoAtoCentavos > 0 && params.valorSaldoContaInternaCentavos === 0) {
        const recebimentoRegistro = await registrarRecebimentoImediato({
          valorCentavos: params.valorPagoAtoCentavos,
          observacoes: `Inscricao ${params.inscricaoId} - ${descricaoFinanceira}`,
          origemSistema: "EVENTO_ESCOLA",
          tipoPagamento: "QUITACAO",
        });

        recebimentoId = recebimentoRegistro.recebimentoId;

        await insertEventoFinanceiroReferencia(db, {
          edicaoId: params.edicaoId,
          natureza: "RECEITA",
          origemTipo: "RECEBIMENTO",
          origemId: recebimentoId,
          pessoaId: params.pessoaFinanceiraId,
          descricao: descricaoFinanceira,
          valorPrevistoCentavos: params.valorPagoAtoCentavos,
          valorRealCentavos: params.valorPagoAtoCentavos,
          recebimentoId,
          movimentoFinanceiroId: recebimentoRegistro.movimentoFinanceiroId ?? undefined,
          observacoes: `Inscricao ${params.inscricaoId}`,
        });
      } else {
        const valorParaCobranca =
          params.valorSaldoContaInternaCentavos > 0
            ? params.valorSaldoContaInternaCentavos
            : params.valorTotalCentavos;
        // 1A: vencimento = último dia da competência (não hoje)
        const vencProvDireto = (() => {
          const [ac, mc] = competencia.split("-").map(Number);
          if (ac && mc) {
            const ud = new Date(ac, mc, 0).getDate();
            return `${ac}-${String(mc).padStart(2, "0")}-${String(ud).padStart(2, "0")}`;
          }
          return hoje;
        })();
        const cobranca = await insertCobrancaEventoEdicaoInscricao(db, {
          origemEventoInscricaoId: params.inscricaoId,
          pessoaId: params.pessoaFinanceiraId,
          descricao: descricaoFinanceira,
          valorCentavos: valorParaCobranca,
          vencimento: vencProvDireto,
          status: "PENDENTE",
          centroCustoId,
          metodoPagamento: null,
          dataPagamento: null,
          observacoes: `Inscricao ${params.inscricaoId} do modulo de eventos`,
          origemLabel: params.inscricaoId,
          competenciaAnoMes: competencia,
        });

        cobrancaId = Number(cobranca.id);

        await insertEventoFinanceiroReferencia(db, {
          edicaoId: params.edicaoId,
          natureza: "RECEITA",
          origemTipo: "COBRANCA",
          origemId: cobrancaId,
          pessoaId: params.pessoaFinanceiraId,
          descricao: descricaoFinanceira,
          valorPrevistoCentavos: valorParaCobranca,
          cobrancaId,
          observacoes: `Inscricao ${params.inscricaoId}`,
        });
      }

      for (const [itemIndex, itemPersistido] of params.itensPersistidos.entries()) {
        const itemFinanceiro = params.itensFinanceiros[itemIndex];
        const rateio = rateioItens[itemIndex];
        const valorCentavos =
          params.valorPagoAtoCentavos > 0 && params.valorSaldoContaInternaCentavos === 0
            ? rateio?.valorPagoAtoCentavos ?? itemFinanceiro?.valorTotalCentavos ?? 0
            : rateio?.valorSaldoContaInternaCentavos ??
              itemFinanceiro?.valorTotalCentavos ??
              0;
        if (!itemFinanceiro || valorCentavos <= 0) continue;

        movimentosFinanceirosItens.push({
          inscricaoId: params.inscricaoId,
          inscricaoItemId: itemPersistido.id,
          destinoFinanceiro: "COBRANCA_DIRETA",
          valorCentavos,
          cobrancaId,
          recebimentoId,
          observacoes:
            `Constituicao inicial da inscricao ${params.inscricaoId} - ` +
            `${itemFinanceiro.descricaoSnapshot}`,
        });
      }
    }
  }

  if (movimentosFinanceirosItens.length > 0) {
    await insertEventoEdicaoInscricaoItemMovimentosFinanceiros(
      db,
      movimentosFinanceirosItens,
    );
  }

  return {
    statusFinanceiro:
      params.valorTotalCentavos <= 0
        ? "ISENTO"
        : params.valorPagoAtoCentavos > 0 &&
            params.valorSaldoContaInternaCentavos > 0
          ? "PARCIAL"
          : params.valorPagoAtoCentavos > 0
          ? "PAGO"
          : "PENDENTE",
    valorTotalCentavos: params.valorTotalCentavos,
    valorPagoAtoCentavos: params.valorPagoAtoCentavos,
    valorSaldoContaInternaCentavos: params.valorSaldoContaInternaCentavos,
    modalidadePagamentoFinanceiro: params.modalidadePagamentoFinanceiro,
    contaInternaId: params.contaInternaId,
    destinoFinanceiro: params.destinoFinanceiro,
    gerarEmContaInterna: params.destinoFinanceiro === "CONTA_INTERNA",
    pagamentoNoAto: params.pagamentoNoAto,
    quantidadeParcelasContaInterna: params.quantidadeParcelasContaInterna,
    cobrancaId,
    cobrancaAvulsaId,
    recebimentoId,
    lancamentoContaInternaId,
    faturaContaInternaId,
    formaPagamentoCodigo: params.formaPagamentoCodigo,
  };
}

function buildInscricaoItemIdentityKey(item: {
  tipoItem?: string | null;
  itemConfiguracaoId?: string | null;
  coreografiaVinculoId?: string | null;
  tipo_item?: string | null;
  item_configuracao_id?: string | null;
  coreografia_vinculo_id?: string | null;
}) {
  const tipo = item.tipoItem ?? item.tipo_item ?? "ITEM_EDICAO";
  const itemConfiguracaoId =
    item.itemConfiguracaoId ?? item.item_configuracao_id ?? null;
  const coreografiaVinculoId =
    item.coreografiaVinculoId ?? item.coreografia_vinculo_id ?? null;

  if (tipo === "EVENTO_GERAL") return "EVENTO_GERAL";
  if (tipo === "COREOGRAFIA") return `COREOGRAFIA:${coreografiaVinculoId ?? "sem-vinculo"}`;
  return `ITEM_EDICAO:${itemConfiguracaoId ?? "sem-item"}`;
}

async function carregarSelecoesItensInscricao(
  db: DbClient,
  params: {
    edicaoId: string;
    itemConfiguracaoIds?: string[];
    coreografiaVinculoIds?: string[];
  },
) {
  const [itensConfiguracao, coreografiasSelecionadas] = await Promise.all([
    listEventoEdicaoItemFinanceirosByIds(
      db,
      params.edicaoId,
      params.itemConfiguracaoIds ?? [],
    ),
    listEventoEdicaoCoreografiaVinculosByIds(
      db,
      params.edicaoId,
      params.coreografiaVinculoIds ?? [],
    ),
  ]);

  if ((params.itemConfiguracaoIds?.length ?? 0) !== itensConfiguracao.length) {
    throw new Error("um ou mais itens financeiros nao foram encontrados");
  }

  if (
    (params.coreografiaVinculoIds?.length ?? 0) !== coreografiasSelecionadas.length
  ) {
    throw new Error("uma ou mais coreografias nao foram encontradas");
  }

  return {
    itensConfiguracao,
    coreografiasSelecionadas,
  };
}

function resolveParticipacoesArtisticasCoreografiaIds(params: {
  participacoesArtisticas?: Array<{
    coreografiaVinculoId: string;
  }> | null;
  coreografiaVinculoIds?: string[] | null;
}) {
  return Array.from(
    new Set([
      ...((params.participacoesArtisticas ?? []).map(
        (item) => item.coreografiaVinculoId,
      ) ?? []),
      ...(params.coreografiaVinculoIds ?? []),
    ]),
  );
}

function buildEventoCoreografiaOcupacaoMap(params: {
  coreografias: Record<string, unknown>[];
  inscricoes: Record<string, unknown>[];
}) {
  const ocupacao = new Map<string, Set<string>>();

  const ensureSet = (coreografiaId: string) => {
    const atual = ocupacao.get(coreografiaId);
    if (atual) return atual;
    const novo = new Set<string>();
    ocupacao.set(coreografiaId, novo);
    return novo;
  };

  for (const vinculo of params.coreografias) {
    const vinculoId = typeof vinculo.id === "string" ? vinculo.id : null;
    if (!vinculoId) continue;

    const participantes = Array.isArray(vinculo.participantes)
      ? vinculo.participantes.filter(
          (item): item is Record<string, unknown> =>
            typeof item === "object" && item !== null && item.ativo !== false,
        )
      : [];

    const ocupantes = ensureSet(vinculoId);
    for (const participante of participantes) {
      if (typeof participante.inscricao_id === "string") {
        ocupantes.add(`inscricao:${participante.inscricao_id}`);
      } else if (typeof participante.aluno_id === "number") {
        ocupantes.add(`aluno:${participante.aluno_id}`);
      } else if (typeof participante.pessoa_id === "number") {
        ocupantes.add(`pessoa:${participante.pessoa_id}`);
      } else if (typeof participante.id === "string") {
        ocupantes.add(`elenco:${participante.id}`);
      }
    }
  }

  for (const inscricao of params.inscricoes) {
    if (inscricao.status_inscricao === "CANCELADA") continue;
    const inscricaoId = typeof inscricao.id === "string" ? inscricao.id : null;
    if (!inscricaoId) continue;

    const itens = Array.isArray(inscricao.itens)
      ? inscricao.itens.filter(
          (item): item is Record<string, unknown> =>
            typeof item === "object" &&
            item !== null &&
            item.status !== "CANCELADO" &&
            item.tipo_item === "COREOGRAFIA" &&
            typeof item.coreografia_vinculo_id === "string",
        )
      : [];

    for (const item of itens) {
      const ocupantes = ensureSet(String(item.coreografia_vinculo_id));
      ocupantes.add(`inscricao:${inscricaoId}`);
    }
  }

  return ocupacao;
}

async function validarCapacidadeCoreografiasEdicaoEvento(params: {
  db: DbClient;
  edicaoId: string;
  coreografiaVinculoIds: string[];
}) {
  if (params.coreografiaVinculoIds.length === 0) return;

  const [coreografiasEdicao, inscricoes] = await Promise.all([
    listEventoCoreografiasByEdicao(params.db, params.edicaoId),
    listarInscricoesEdicaoEvento(params.db, params.edicaoId),
  ]);

  const ocupacao = buildEventoCoreografiaOcupacaoMap({
    coreografias: coreografiasEdicao as Record<string, unknown>[],
    inscricoes: inscricoes as Record<string, unknown>[],
  });
  const coreografiasSelecionadas = new Map<string, Record<string, unknown>>(
    (coreografiasEdicao as Record<string, unknown>[]).map((item) => [
      String(item.id),
      item,
    ]),
  );

  for (const coreografiaVinculoId of params.coreografiaVinculoIds) {
    const vinculo = coreografiasSelecionadas.get(coreografiaVinculoId);
    if (!vinculo) {
      throw new Error("uma ou mais coreografias nao foram encontradas");
    }

    const coreografia =
      typeof vinculo.coreografia === "object" && vinculo.coreografia !== null
        ? (vinculo.coreografia as Record<string, unknown>)
        : null;
    const capacidadeMaxima =
      typeof coreografia?.quantidade_maxima_participantes === "number"
        ? Number(coreografia.quantidade_maxima_participantes)
        : null;

    if (!capacidadeMaxima || capacidadeMaxima <= 0) continue;

    const ocupacaoAtual = ocupacao.get(coreografiaVinculoId)?.size ?? 0;
    if (ocupacaoAtual >= capacidadeMaxima) {
      const nome = typeof coreografia?.nome === "string" ? coreografia.nome : "Coreografia";
      throw new Error(
        `${nome} atingiu a lotacao permitida para a formacao configurada.`,
      );
    }
  }
}

function comporItensFinanceirosInscricao(params: {
  configuracao: ConfiguracaoInscricaoNormalizada;
  incluirEventoGeral: boolean;
  itensConfiguracao: Record<string, unknown>[];
  coreografiasSelecionadas: Record<string, unknown>[];
  origemItem: "INSCRICAO_INICIAL" | "AMPLIACAO_POSTERIOR";
}): ItemFinanceiroInscricao[] {
  const composicao = calcularComposicaoFinanceiraEventoEdicao({
    configuracao: {
      cobra_taxa_participacao_geral:
        params.configuracao.cobraTaxaParticipacaoGeral,
      valor_taxa_participacao_centavos:
        params.configuracao.valorTaxaParticipacaoCentavos,
      cobra_por_coreografia: params.configuracao.cobraPorCoreografia,
      regrasFinanceiras: params.configuracao.regrasFinanceiras,
    },
    incluirEventoGeral: params.incluirEventoGeral,
    itensConfiguracao: params.itensConfiguracao.map((item) => ({
      id: String(item.id),
      nome: String(item.nome),
      valor_centavos:
        typeof item.valor_centavos === "number" ? Number(item.valor_centavos) : 0,
    })),
    coreografiasSelecionadas: params.coreografiasSelecionadas.map((item) => {
      const coreografia = firstRelation(
        item.coreografia as
          | {
              id: string;
              nome: string;
              modalidade?: string | null;
              tipo_formacao: string;
              estilo_id?: string | null;
              estilo?: { nome?: string | null }[] | { nome?: string | null } | null;
            }[]
          | {
              id: string;
              nome: string;
              modalidade?: string | null;
              tipo_formacao: string;
              estilo_id?: string | null;
              estilo?: { nome?: string | null }[] | { nome?: string | null } | null;
            }
          | null,
      );
      const estilo = firstRelation(
        coreografia?.estilo as
          | { nome?: string | null }[]
          | { nome?: string | null }
          | null,
      );

      return {
        id: String(item.id),
        valor_participacao_coreografia_centavos:
          typeof item.valor_participacao_coreografia_centavos === "number"
            ? Number(item.valor_participacao_coreografia_centavos)
            : null,
        coreografia: {
          nome: coreografia?.nome ?? "Sem nome",
          modalidade:
            typeof coreografia?.modalidade === "string"
              ? coreografia.modalidade
              : null,
          tipo_formacao:
            (coreografia?.tipo_formacao as
              | "SOLO"
              | "DUO"
              | "TRIO"
              | "GRUPO"
              | "TURMA"
              | "LIVRE"
              | undefined) ?? "LIVRE",
          estilo_id:
            typeof coreografia?.estilo_id === "string" ? coreografia.estilo_id : null,
          estilo: estilo ? { nome: estilo.nome ?? null } : null,
        },
      };
    }),
  });

  return composicao.linhas.map((linha) => ({
    tipoItem: linha.tipo,
    itemConfiguracaoId: linha.itemConfiguracaoId,
    coreografiaVinculoId: linha.coreografiaVinculoId,
    descricaoSnapshot: linha.label,
    quantidade: 1,
    valorUnitarioCentavos: linha.valorCentavos,
    valorTotalCentavos: linha.valorCentavos,
    obrigatorio:
      linha.tipo === "EVENTO_GERAL" ? params.configuracao.exigeInscricaoGeral : false,
    observacoes: linha.detalhePrincipal,
    origemItem: params.origemItem,
  }));
}

function mergeParcelasResumoComDelta(params: {
  parcelasAtuais: Array<Record<string, unknown>>;
  parcelasDelta: EventoEdicaoParcelaContaInternaPlano[];
  contaInternaId: number;
  observacao: string;
}) {
  const mapa = new Map<
    string,
    {
      parcelaNumero: number;
      totalParcelas: number;
      competencia: string;
      valorCentavos: number;
      contaInternaId: number;
      cobrancaId?: number | null;
      lancamentoContaInternaId?: number | null;
      faturaContaInternaId?: number | null;
      status?: string;
      observacoes?: string | null;
    }
  >();

  for (const parcela of params.parcelasAtuais) {
    if (
      typeof parcela.competencia !== "string" ||
      typeof parcela.parcela_numero !== "number" ||
      typeof parcela.total_parcelas !== "number"
    ) {
      continue;
    }

    mapa.set(parcela.competencia, {
      parcelaNumero: Number(parcela.parcela_numero),
      totalParcelas: Number(parcela.total_parcelas),
      competencia: parcela.competencia,
      valorCentavos:
        typeof parcela.valor_centavos === "number" ? Number(parcela.valor_centavos) : 0,
      contaInternaId:
        typeof parcela.conta_interna_id === "number"
          ? Number(parcela.conta_interna_id)
          : params.contaInternaId,
      cobrancaId:
        typeof parcela.cobranca_id === "number" ? Number(parcela.cobranca_id) : null,
      lancamentoContaInternaId:
        typeof parcela.lancamento_conta_interna_id === "number"
          ? Number(parcela.lancamento_conta_interna_id)
          : null,
      faturaContaInternaId:
        typeof parcela.fatura_conta_interna_id === "number"
          ? Number(parcela.fatura_conta_interna_id)
          : null,
      status: typeof parcela.status === "string" ? parcela.status : "PENDENTE",
      observacoes:
        typeof parcela.observacoes === "string" ? parcela.observacoes : null,
    });
  }

  for (const parcela of params.parcelasDelta) {
    const atual = mapa.get(parcela.competencia);
    if (atual) {
      atual.valorCentavos += parcela.valorCentavos;
      atual.totalParcelas = Math.max(atual.totalParcelas, parcela.totalParcelas);
      atual.observacoes = params.observacao;
      mapa.set(parcela.competencia, atual);
      continue;
    }

    mapa.set(parcela.competencia, {
      parcelaNumero: parcela.parcelaNumero,
      totalParcelas: parcela.totalParcelas,
      competencia: parcela.competencia,
      valorCentavos: parcela.valorCentavos,
      contaInternaId: params.contaInternaId,
      cobrancaId: null,
      lancamentoContaInternaId: null,
      faturaContaInternaId: null,
      status: "PENDENTE",
      observacoes: params.observacao,
    });
  }

  return Array.from(mapa.values()).sort(
    (left, right) => left.parcelaNumero - right.parcelaNumero,
  );
}

function buildContaInternaElegivelLabel(
  origemTitular: EventoEdicaoContaInternaOrigem,
): string {
  if (origemTitular === "ALUNO") return "Conta interna do aluno";
  if (origemTitular === "RESPONSAVEL_FINANCEIRO") {
    return "Conta interna do responsavel financeiro";
  }
  return "Conta interna do colaborador";
}

function buildMensagemContaInternaNaoEncontrada() {
  return "nao foi encontrada conta interna ativa elegivel para esta inscricao. Ative ou crie uma conta interna adequada para continuar.";
}

function buildMensagemContaInternaMultipla() {
  return "mais de uma conta interna ativa elegivel foi encontrada. Selecione a conta de destino para continuar.";
}

export async function listarContasInternasElegiveisInscricaoEdicaoEvento(
  db: DbClient,
  params: {
    edicaoId: string;
    alunoPessoaId: number;
    responsavelFinanceiroId?: number | null;
  },
): Promise<EventoEdicaoContaInternaElegivel[]> {
  await ensureEdicaoExists(db, params.edicaoId);
  await ensurePessoaExists(db, params.alunoPessoaId);

  if (params.responsavelFinanceiroId) {
    await ensurePessoaExists(db, params.responsavelFinanceiroId);
  }

  const contas = await listarContasInternasElegiveisParaInscricaoInterna({
    supabase: db,
    alunoPessoaId: params.alunoPessoaId,
    responsavelFinanceiroPessoaId: params.responsavelFinanceiroId ?? null,
    incluirContaColaborador: true,
  });

  const configuracaoRaw = await getEventoEdicaoConfiguracao(db, params.edicaoId);
  const configuracao = normalizeConfiguracaoInscricao(
    (configuracaoRaw as Record<string, unknown> | null) ?? null,
  );
  const contexto = await carregarContextoFinanceiroEdicao(db, params.edicaoId);
  const dataLimiteExercicio = await carregarDataLimiteExercicio(db);

  return contas.map((conta) => ({
    ...(() => {
      const contaElegivel: EventoEdicaoContaInternaElegivel = {
        contaId: conta.conta_id,
        tipoConta: conta.tipo,
        origemTitular: conta.tipo_titular,
        titularPessoaId: conta.titular_pessoa_id,
        responsavelFinanceiroPessoaId: conta.responsavel_financeiro_pessoa_id,
        diaVencimento: conta.dia_vencimento,
        tipoFatura: conta.tipo_fatura,
        tipoLiquidacao: conta.tipo_liquidacao,
        destinoLiquidacaoFatura: conta.destino_liquidacao_fatura,
        permiteParcelamento: conta.permite_parcelamento,
        descricao: conta.descricao,
        label: buildContaInternaElegivelLabel(conta.tipo_titular),
        prioridade: conta.prioridade,
        competenciasElegiveis: [],
        maxParcelasDisponiveis: 1,
      };
      const competenciasElegiveis = buildCompetenciasElegiveisContaInterna({
        configuracao,
        contexto,
        contaElegivel,
        aplicarRestricaoParcelamento: false,
        dataLimiteExercicio,
      });
      const permiteParcelamentoEvento =
        configuracao.permiteParcelamentoContaInterna &&
        competenciasElegiveis.length > 1;
      const maxParcelasDisponiveis = Math.max(
        1,
        Math.min(
          competenciasElegiveis.length || 1,
          permiteParcelamentoEvento
            ? Math.max(1, configuracao.maximoParcelasContaInterna)
            : 1,
          ),
      );

      return {
        contaId: conta.conta_id,
        tipoConta: conta.tipo,
        origemTitular: conta.tipo_titular,
        titularPessoaId: conta.titular_pessoa_id,
        responsavelFinanceiroPessoaId: conta.responsavel_financeiro_pessoa_id,
        diaVencimento: conta.dia_vencimento,
        tipoFatura: conta.tipo_fatura,
        tipoLiquidacao: conta.tipo_liquidacao,
        destinoLiquidacaoFatura: conta.destino_liquidacao_fatura,
        permiteParcelamento: permiteParcelamentoEvento,
        descricao: conta.descricao,
        label: buildContaInternaElegivelLabel(conta.tipo_titular),
        prioridade: conta.prioridade,
        competenciasElegiveis,
        maxParcelasDisponiveis,
      };
    })(),
  }));
}

export async function garantirContaInternaElegivelInscricaoEdicaoEvento(
  db: DbClient,
  params: {
    edicaoId: string;
    alunoPessoaId: number;
    responsavelFinanceiroId?: number | null;
  },
): Promise<EventoEdicaoContaInternaElegivel[]> {
  await ensureEdicaoExists(db, params.edicaoId);
  await ensurePessoaExists(db, params.alunoPessoaId);

  if (params.responsavelFinanceiroId) {
    await ensurePessoaExists(db, params.responsavelFinanceiroId);
  }

  await garantirContaInternaElegivelParaInscricaoInterna({
    supabase: db,
    alunoPessoaId: params.alunoPessoaId,
    responsavelFinanceiroPessoaId: params.responsavelFinanceiroId ?? null,
  });

  return listarContasInternasElegiveisInscricaoEdicaoEvento(db, params);
}

export async function listarParticipantesExternosEvento(
  db: DbClient,
  query?: string | null,
) {
  const participantes = await listEventoParticipantesExternos(db, { ativo: true });
  const hydrated = await hydrateParticipantesExternosEvento(
    db,
    participantes as Record<string, unknown>[],
  );

  if (!query || query.trim().length < 2) {
    return hydrated;
  }

  const termo = query.trim().toLowerCase();

  return hydrated.filter((item) => {
    const pessoa = item.pessoa as Record<string, unknown> | null;
    const alvo = [
      item.nome_exibicao,
      item.documento ?? "",
      typeof pessoa?.email === "string" ? pessoa.email : "",
      typeof pessoa?.telefone === "string" ? pessoa.telefone : "",
      typeof pessoa?.cpf === "string" ? pessoa.cpf : "",
    ]
      .join(" ")
      .toLowerCase();

    return alvo.includes(termo);
  });
}

export async function criarParticipanteExternoEvento(
  db: DbClient,
  payload: EventoParticipanteExternoPayload,
  options?: { userId?: string | null },
) {
  return insertEventoParticipanteExterno(db, payload, options?.userId ?? null);
}

export async function atualizarParticipanteExternoEvento(
  db: DbClient,
  payload: EventoParticipanteExternoUpdatePayload,
  options?: { userId?: string | null },
) {
  await ensureParticipanteExternoExists(db, payload.participanteExternoId);
  return updateEventoParticipanteExterno(db, payload, options?.userId ?? null);
}

export async function listarFormasPagamentoEvento(db: DbClient) {
  return listFormasPagamentoAtivas(db);
}

export async function listarInscricoesEdicaoEvento(
  db: DbClient,
  edicaoId: string,
) {
  await ensureEdicaoExists(db, edicaoId);
  const inscricoes = await listEventoEdicaoInscricoes(db, edicaoId);
  return hydrateInscricoesEvento(db, inscricoes as Record<string, unknown>[]);
}

export async function buscarInscricaoEdicaoEvento(
  db: DbClient,
  edicaoId: string,
  inscricaoId: string,
) {
  await ensureEdicaoExists(db, edicaoId);
  const inscricao = await getEventoEdicaoInscricaoById(db, edicaoId, inscricaoId);
  const [hydrated] = await hydrateInscricoesEvento(db, [
    inscricao as Record<string, unknown>,
  ]);
  return hydrated;
}

export async function criarInscricaoEdicaoEvento(
  db: DbClient,
  payload: EventoEdicaoInscricaoPayload,
  options?: { userId?: string | null },
) {
  const [, configuracaoRaw] = await Promise.all([
    ensureEdicaoExists(db, payload.edicaoId),
    getEventoEdicaoConfiguracao(db, payload.edicaoId),
  ]);

  const configuracao = normalizeConfiguracaoInscricao(
    (configuracaoRaw as Record<string, unknown> | null) ?? null,
  );
  const modalidadePagamentoFinanceiroSolicitada: EventoEdicaoModalidadePagamentoFinanceiro =
    payload.origemInscricao === "INSCRICAO_EXTERNA"
      ? "ATO_TOTAL"
      : payload.pagamentoFinanceiro?.modalidade ??
        (payload.pagamentoNoAto ? "ATO_TOTAL" : "CONTA_INTERNA_TOTAL");
  let modalidadePagamentoFinanceiro = modalidadePagamentoFinanceiroSolicitada;
  let pagamentoNoAto = modalidadePagamentoFinanceiroSolicitada !== "CONTA_INTERNA_TOTAL";
  let destinoFinanceiro: EventoEdicaoDestinoFinanceiro =
    payload.origemInscricao === "INSCRICAO_EXTERNA"
      ? "COBRANCA_AVULSA"
      : modalidadePagamentoFinanceiroSolicitada === "ATO_TOTAL"
        ? "COBRANCA_DIRETA"
        : "CONTA_INTERNA";
  let valorPagoAtoCentavos = 0;
  let valorSaldoContaInternaCentavos = 0;
  let formaPagamentoCodigo: string | null = null;
  let observacoesPagamento: string | null = null;

  if (
    payload.itemConfiguracaoIds?.length &&
    !configuracao.permiteItensAdicionais
  ) {
    throw new Error("a edicao nao permite itens adicionais");
  }

  const coreografiaVinculoIds = resolveParticipacoesArtisticasCoreografiaIds({
    participacoesArtisticas: payload.participacoesArtisticas,
    coreografiaVinculoIds: payload.coreografiaVinculoIds,
  });

  await validarCapacidadeCoreografiasEdicaoEvento({
    db,
    edicaoId: payload.edicaoId,
    coreografiaVinculoIds,
  });

  if (
    coreografiaVinculoIds.length > 0 &&
    !configuracao.permiteInscricaoPorCoreografia
  ) {
    throw new Error("a edicao nao permite inscricao por coreografia");
  }

  if (
    payload.permitirCoreografiasDepois &&
    !configuracao.permiteVincularCoreografiaDepois
  ) {
    throw new Error("a edicao nao permite vincular coreografias depois");
  }

  let participanteNome: string | null = null;
  let pessoaFinanceiraId: number;
  let alunoPessoaId: number | null = null;
  let responsavelFinanceiroId: number | null = null;
  let participanteExternoId: string | null = null;
  let contaInternaId: number | null = null;
  let diaVencimentoContaInterna: number | null = null;
  let contaInternaSelecionada: EventoEdicaoContaInternaElegivel | null = null;
  let quantidadeParcelasContaInterna = 1;
  let parcelasContaInternaSelecionadas: EventoEdicaoParcelaContaInternaPlano[] = [];

  if (payload.origemInscricao === "INSCRICAO_INTERNA") {
    alunoPessoaId = payload.alunoPessoaId ?? null;
    if (!alunoPessoaId) {
      throw new Error("alunoPessoaId e obrigatorio");
    }

    await ensurePessoaExists(db, alunoPessoaId);
    const matriculaAtual = await getAlunoMatriculaAtual(db, alunoPessoaId);
    responsavelFinanceiroId =
      payload.responsavelFinanceiroId ??
      (typeof matriculaAtual?.responsavel_financeiro_id === "number"
        ? Number(matriculaAtual.responsavel_financeiro_id)
        : null);

    if (responsavelFinanceiroId) {
      await ensurePessoaExists(db, responsavelFinanceiroId);
    }

    pessoaFinanceiraId = responsavelFinanceiroId ?? alunoPessoaId;

    if (destinoFinanceiro === "CONTA_INTERNA") {
      const contasElegiveis =
        await listarContasInternasElegiveisInscricaoEdicaoEvento(db, {
          edicaoId: payload.edicaoId,
          alunoPessoaId,
          responsavelFinanceiroId,
        });

      if (contasElegiveis.length === 0) {
        throw new Error(buildMensagemContaInternaNaoEncontrada());
      }

      if (payload.contaInternaId) {
        contaInternaSelecionada =
          contasElegiveis.find((item) => item.contaId === payload.contaInternaId) ??
          null;

        if (!contaInternaSelecionada) {
          throw new Error("a conta interna selecionada nao e elegivel para esta inscricao");
        }
      } else if (contasElegiveis.length === 1) {
        [contaInternaSelecionada] = contasElegiveis;
      } else {
        throw new Error(buildMensagemContaInternaMultipla());
      }

      contaInternaId = contaInternaSelecionada.contaId;
      diaVencimentoContaInterna = contaInternaSelecionada.diaVencimento;
      pessoaFinanceiraId = contaInternaSelecionada.titularPessoaId;
    }
    const pessoas = await listPessoasByIds(db, [alunoPessoaId]);
    participanteNome =
      typeof pessoas[0]?.nome === "string" ? String(pessoas[0].nome) : null;
  } else {
    let participanteExterno = payload.participanteExternoId
      ? await ensureParticipanteExternoExists(db, payload.participanteExternoId)
      : null;

    if (!participanteExterno) {
      if (!payload.participanteExterno) {
        throw new Error("participante externo e obrigatorio");
      }

      participanteExterno = await insertEventoParticipanteExterno(
        db,
        payload.participanteExterno,
        options?.userId ?? null,
      );
    }

    participanteExternoId = String(participanteExterno.id);
    pessoaFinanceiraId = Number(participanteExterno.pessoa_id);
    const pessoas = await listPessoasByIds(db, [pessoaFinanceiraId]);
    participanteNome =
      typeof pessoas[0]?.nome === "string" ? String(pessoas[0].nome) : null;
  }

  const inscricaoAtivaExistente = await findEventoEdicaoInscricaoAtivaByParticipante(db, {
    edicaoId: payload.edicaoId,
    alunoPessoaId,
    participanteExternoId,
  });

  if (inscricaoAtivaExistente) {
    throw new Error(
      "ja existe uma inscricao ativa para esta pessoa nesta edicao. A ampliacao por novos itens deve usar a mesma inscricao.",
    );
  }

  const incluirEventoGeral = configuracao.exigeInscricaoGeral
    ? true
    : payload.incluirEventoGeral ?? false;

  const { itensConfiguracao, coreografiasSelecionadas } =
    await carregarSelecoesItensInscricao(db, {
      edicaoId: payload.edicaoId,
      itemConfiguracaoIds: payload.itemConfiguracaoIds ?? [],
      coreografiaVinculoIds,
    });

  const itensFinanceiros = comporItensFinanceirosInscricao({
    configuracao,
    incluirEventoGeral,
    itensConfiguracao: itensConfiguracao as Record<string, unknown>[],
    coreografiasSelecionadas: coreografiasSelecionadas as Record<string, unknown>[],
    origemItem: "INSCRICAO_INICIAL",
  });

  if (
    itensFinanceiros.length === 0 &&
    !payload.permitirCoreografiasDepois
  ) {
    throw new Error("selecione ao menos um item para a inscricao");
  }

  const valorTotalCentavos = itensFinanceiros.reduce(
    (acc, item) => acc + item.valorTotalCentavos,
    0,
  );

  const resumoPagamentoFinanceiro = resolverPagamentoFinanceiroInscricao({
    payload,
    configuracao,
    valorTotalCentavos,
  });

  modalidadePagamentoFinanceiro =
    resumoPagamentoFinanceiro.modalidadePagamentoFinanceiro;
  pagamentoNoAto = resumoPagamentoFinanceiro.pagamentoNoAto;
  destinoFinanceiro = resumoPagamentoFinanceiro.destinoFinanceiro;
  valorPagoAtoCentavos = resumoPagamentoFinanceiro.valorPagoAtoCentavos;
  valorSaldoContaInternaCentavos =
    resumoPagamentoFinanceiro.valorSaldoContaInternaCentavos;
  formaPagamentoCodigo = resumoPagamentoFinanceiro.formaPagamentoCodigo;
  observacoesPagamento = resumoPagamentoFinanceiro.observacoesPagamento;
  quantidadeParcelasContaInterna =
    resumoPagamentoFinanceiro.quantidadeParcelasContaInterna;

  if (
    payload.origemInscricao === "INSCRICAO_INTERNA" &&
    destinoFinanceiro === "CONTA_INTERNA" &&
    valorSaldoContaInternaCentavos > 0
  ) {
    if (!contaInternaSelecionada) {
      throw new Error("conta interna nao resolvida para a inscricao");
    }

    const contextoFinanceiroEdicao = await carregarContextoFinanceiroEdicao(
      db,
      payload.edicaoId,
    );
    const dataLimExerc1 = await carregarDataLimiteExercicio(db);
    const opcoesParcelamento = buildParcelamentoContaInternaOptions({
      valorTotalCentavos: valorSaldoContaInternaCentavos,
      configuracao,
      contexto: contextoFinanceiroEdicao,
      contaElegivel: contaInternaSelecionada,
      dataLimiteExercicio: dataLimExerc1,
    });

    if (opcoesParcelamento.length === 0) {
      throw new Error(
        "nao ha competencias elegiveis disponiveis para gerar a inscricao em conta interna.",
      );
    }

    const quantidadeSolicitada = Math.max(1, quantidadeParcelasContaInterna);
    const opcaoSelecionada =
      opcoesParcelamento.find(
        (item) => item.quantidadeParcelas === quantidadeSolicitada,
      ) ?? null;

    if (!opcaoSelecionada) {
      throw new Error(
        "o parcelamento selecionado nao e elegivel para esta inscricao.",
      );
    }

    quantidadeParcelasContaInterna = opcaoSelecionada.quantidadeParcelas;
    parcelasContaInternaSelecionadas = opcaoSelecionada.parcelas;

    if (resumoPagamentoFinanceiro.parcelasContaInternaSelecionadasPayload.length > 0) {
      const parcelasInformadas =
        resumoPagamentoFinanceiro.parcelasContaInternaSelecionadasPayload;
      const parcelasConferidas =
        parcelasInformadas.length === parcelasContaInternaSelecionadas.length &&
        parcelasInformadas.every((parcela, index) => {
          const esperada = parcelasContaInternaSelecionadas[index];
          return (
            Boolean(esperada) &&
            esperada.parcelaNumero === parcela.parcelaNumero &&
            esperada.totalParcelas === parcela.totalParcelas &&
            esperada.competencia === parcela.competencia &&
            esperada.valorCentavos === parcela.valorCentavos
          );
        });

      if (!parcelasConferidas) {
        throw new Error(
          "as parcelas da conta interna informadas nao correspondem ao saldo calculado",
        );
      }
    }
  }

  const branchFinanceiro =
    modalidadePagamentoFinanceiro === "MISTO"
      ? `${destinoFinanceiro}:MISTO`
      : pagamentoNoAto
        ? `${destinoFinanceiro}:QUITACAO_IMEDIATA`
        : destinoFinanceiro;
  const participanteLogLabel = buildParticipanteLogLabel({
    participanteNome,
    alunoPessoaId,
    participanteExternoId,
  });

  logInscricaoEventoFinanceiro("INSCRICAO_EVENTO_CREATE_START", {
    edicaoId: payload.edicaoId,
    origem: payload.origemInscricao,
    destinoFinanceiro,
    participante: participanteLogLabel,
    totalCalculado: valorTotalCentavos,
    branchFinanceiro,
  });

  const inscricao = await insertEventoEdicaoInscricao(db, {
    ...payload,
    destinoFinanceiro,
    pagamentoNoAto,
    formaPagamentoCodigo,
    participanteExternoId,
    alunoPessoaId,
    responsavelFinanceiroId,
    pessoaId: pessoaFinanceiraId,
    contaInternaId,
    quantidadeParcelasContaInterna,
    participanteNomeSnapshot: participanteNome,
    modalidadePagamentoFinanceiro,
    valorTotalCentavos,
    valorPagoAtoCentavos,
    valorSaldoContaInternaCentavos,
  });

  const itensInseridos =
    itensFinanceiros.length > 0
      ? await insertEventoEdicaoInscricaoItens(
          db,
          itensFinanceiros.map((item) => ({
            ...item,
            inscricaoId: String(inscricao.id),
          })),
        )
      : [];

  await atualizarEstadoTecnicoFinanceiroInscricao(db, String(inscricao.id), {
    financeiroStatus: "PROCESSANDO",
    financeiroErroCodigo: null,
    financeiroErroDetalhe: null,
    financeiroProcessadoEm: null,
  });

  logInscricaoEventoFinanceiro("INSCRICAO_EVENTO_CREATE_FINANCEIRO_START", {
    edicaoId: payload.edicaoId,
    inscricaoId: String(inscricao.id),
    origem: payload.origemInscricao,
    destinoFinanceiro,
    participante: participanteLogLabel,
    totalCalculado: valorTotalCentavos,
    branchFinanceiro,
  });

  try {
  const resultadoFinanceiro = await constituirFinanceiroInscricaoEdicaoEvento(db, {
    edicaoId: payload.edicaoId,
    inscricaoId: String(inscricao.id),
    origemInscricao: payload.origemInscricao,
    destinoFinanceiro,
    pagamentoNoAto,
    modalidadePagamentoFinanceiro,
    pessoaFinanceiraId,
    participanteNome,
    valorTotalCentavos,
    valorPagoAtoCentavos,
    valorSaldoContaInternaCentavos,
    contaInternaId,
    diaVencimentoContaInterna,
    contaInternaSelecionada,
    quantidadeParcelasContaInterna,
    parcelasContaInternaSelecionadas,
    formaPagamentoCodigo,
    observacoesPagamento,
    itensFinanceiros,
    itensPersistidos: itensInseridos.map((item) => ({ id: String(item.id) })),
    options,
  });

  /*
  let nomeEventoBase: string | null = null;
  let tituloEdicao: string | null = null;

  const { data: edicaoDetalhe, error: edicaoDetalheError } = await db
    .from("eventos_escola_edicoes")
    .select("titulo_exibicao, evento:eventos_escola(titulo)")
    .eq("id", payload.edicaoId)
    .maybeSingle();

  if (edicaoDetalheError) throw edicaoDetalheError;
  tituloEdicao =
    typeof edicaoDetalhe?.titulo_exibicao === "string"
      ? edicaoDetalhe.titulo_exibicao
      : null;
  const eventoBase = firstRelation(
    edicaoDetalhe?.evento as { titulo: string } | { titulo: string }[] | null,
  );
  nomeEventoBase =
    eventoBase && typeof eventoBase.titulo === "string" ? eventoBase.titulo : null;

  const descricaoFinanceira = buildDescricaoFinanceiraInscricao({
    nomeEventoBase,
    tituloEdicao,
    participanteNome,
  });

  const centroCustoId = await getCentroCustoPadraoEscolaId(db);
  const hoje = isoDateOnly();
  const competencia = competenciaAnoMes(hoje);
  const formaPagamentoCodigo = payload.formaPagamentoCodigo
    ? normalizeFormaPagamentoCodigo(payload.formaPagamentoCodigo)
    : null;

  if (pagamentoNoAto) {
    if (!formaPagamentoCodigo) {
      throw new Error("formaPagamentoCodigo e obrigatorio para pagamento no ato");
    }

    const formaPagamento = await getFormaPagamentoByCodigo(db, formaPagamentoCodigo);
    if (!formaPagamento) {
      throw new Error("forma de pagamento nao encontrada");
    }
  }

  let cobrancaId: number | null = null;
  let cobrancaAvulsaId: number | null = null;
  let recebimentoId: number | null = null;
  let lancamentoContaInternaId: number | null = null;
  let faturaContaInternaId: number | null = null;
  const movimentosFinanceirosItens: Array<{
    inscricaoId: string;
    inscricaoItemId: string;
    tipoMovimento?: "CONSTITUICAO" | "CANCELAMENTO_SEM_ESTORNO" | "AJUSTE_MANUAL";
    destinoFinanceiro: "CONTA_INTERNA" | "COBRANCA_DIRETA" | "COBRANCA_AVULSA";
    competencia?: string | null;
    parcelaNumero?: number | null;
    totalParcelas?: number | null;
    valorCentavos: number;
    contaInternaId?: number | null;
    cobrancaId?: number | null;
    cobrancaAvulsaId?: number | null;
    recebimentoId?: number | null;
    lancamentoContaInternaId?: number | null;
    faturaContaInternaId?: number | null;
    observacoes?: string | null;
  }> = [];

  if (valorTotalCentavos > 0) {
    if (
      payload.origemInscricao === "INSCRICAO_INTERNA" &&
      destinoFinanceiro === "CONTA_INTERNA"
    ) {
      if (!contaInternaId) {
        throw new Error("conta interna nao resolvida para a inscricao");
      }

      const parcelasRegistradas: Array<{
        parcelaNumero: number;
        totalParcelas: number;
        competencia: string;
        valorCentavos: number;
        contaInternaId: number;
        cobrancaId: number;
        lancamentoContaInternaId: number;
        faturaContaInternaId: number;
        recebimentoId: number | null;
        status: string;
        observacoes: string;
      }> = [];
      for (const parcela of parcelasContaInternaSelecionadas) {
        const descricaoParcela = buildDescricaoFinanceiraInscricaoParcela(
          descricaoFinanceira,
          parcela,
        );
        // 1A: vencimento provisório = último dia da competência
        const vencimentoProvReproc = (() => {
          const [ac, mc] = parcela.competencia.split("-").map(Number);
          if (ac && mc) {
            const ud = new Date(ac, mc, 0).getDate();
            return `${ac}-${String(mc).padStart(2, "0")}-${String(ud).padStart(2, "0")}`;
          }
          return hoje;
        })();
        const cobrancaParcela = await insertCobrancaEventoEdicaoInscricao(db, {
          origemEventoInscricaoId: String(inscricao.id),
          pessoaId: pessoaFinanceiraId,
          descricao: descricaoParcela,
          valorCentavos: parcela.valorCentavos,
          vencimento: pagamentoNoAto ? hoje : vencimentoProvReproc,
          status: pagamentoNoAto ? "PAGO" : "PENDENTE",
          centroCustoId,
          contaInternaId,
          metodoPagamento: pagamentoNoAto ? formaPagamentoCodigo : null,
          dataPagamento: pagamentoNoAto ? hoje : null,
          observacoes:
            `Inscricao ${inscricao.id} do modulo de eventos · ` +
            `parcela ${parcela.parcelaNumero}/${parcela.totalParcelas}`,
          origemLabel: `${inscricao.id}:${parcela.competencia}:${parcela.parcelaNumero}`,
          competenciaAnoMes: parcela.competencia,
          parcelaNumero: parcela.parcelaNumero,
          totalParcelas: parcela.totalParcelas,
        });

        const cobrancaParcelaId = Number(cobrancaParcela.id);
        let recebimentoParcelaId: number | null = null;

        if (pagamentoNoAto) {
          const recebimentoParcela = await insertRecebimentoEventoEdicaoInscricao(db, {
            cobrancaId: cobrancaParcelaId,
            centroCustoId,
            valorCentavos: parcela.valorCentavos,
            dataPagamento: `${hoje}T00:00:00`,
            metodoPagamento: formaPagamentoCodigo ?? "OUTRO",
            formaPagamentoCodigo,
            origemSistema: "EVENTO_ESCOLA",
            observacoes: descricaoParcela,
          });

          recebimentoParcelaId = Number(recebimentoParcela.id);

          if (centroCustoId) {
            await insertMovimentoFinanceiroReceita(db, {
              centroCustoId,
              valorCentavos: parcela.valorCentavos,
              dataMovimento: `${hoje}T00:00:00`,
              origem: "RECEBIMENTO",
              origemId: recebimentoParcelaId,
              descricao: descricaoParcela,
              usuarioId: options?.userId ?? null,
            });
          }
        }

        const lancamento = await criarLancamentoContaInterna({
          supabase: db,
          cobrancaId: cobrancaParcelaId,
          contaInternaId,
          competencia: parcela.competencia,
          valorCentavos: parcela.valorCentavos,
          descricao: descricaoParcela,
          origemSistema: "ESCOLA",
          origemId: cobrancaParcelaId,
          composicaoJson: {
            modulo: "eventos_escola",
            inscricao_id: inscricao.id,
            edicao_id: payload.edicaoId,
            parcela_numero: parcela.parcelaNumero,
            total_parcelas: parcela.totalParcelas,
            competencia: parcela.competencia,
            itens: itensFinanceiros.map((item) => ({
              tipo: item.tipoItem,
              descricao: item.descricaoSnapshot,
              valor_centavos: item.valorTotalCentavos,
            })),
          },
          referenciaItem:
            `evento-inscricao:${inscricao.id}:` +
            `competencia:${parcela.competencia}:parcela:${parcela.parcelaNumero}`,
        });

        const lancamentoId = Number(lancamento.id);
        const fatura =
          contaInternaSelecionada?.origemTitular === "COLABORADOR"
            ? await agendarFaturamentoMensalColaborador({
                supabase: db,
                contaInternaId,
                competencia: parcela.competencia,
                diaVencimento: diaVencimentoContaInterna,
                lancamentoId,
              })
            : await agendarFaturamentoMensalAluno({
                supabase: db,
                contaInternaId,
                competencia: parcela.competencia,
                diaVencimento: diaVencimentoContaInterna,
                lancamentoId,
              });

        const faturaId = Number(fatura.fatura_id);
        const vencimentoFaturaReproc =
          typeof fatura.data_vencimento === "string" && fatura.data_vencimento
            ? fatura.data_vencimento
            : vencimentoProvReproc;

        await updateCobrancaEventoEdicaoInscricaoVencimento(db, {
          cobrancaId: cobrancaParcelaId,
          vencimento: vencimentoFaturaReproc,
        });

        await insertEventoFinanceiroReferencia(db, {
          edicaoId: payload.edicaoId,
          natureza: "RECEITA",
          origemTipo: pagamentoNoAto ? "RECEBIMENTO" : "CONTA_INTERNA",
          origemId: pagamentoNoAto ? recebimentoParcelaId : undefined,
          pessoaId: pessoaFinanceiraId,
          descricao: descricaoParcela,
          valorPrevistoCentavos: parcela.valorCentavos,
          valorRealCentavos: pagamentoNoAto ? parcela.valorCentavos : undefined,
          contaInternaId,
          cobrancaId: cobrancaParcelaId,
          recebimentoId: pagamentoNoAto ? recebimentoParcelaId : undefined,
          observacoes:
            `Inscricao ${inscricao.id} · ` +
            `parcela ${parcela.parcelaNumero}/${parcela.totalParcelas}`,
        });

        parcelasRegistradas.push({
          parcelaNumero: parcela.parcelaNumero,
          totalParcelas: parcela.totalParcelas,
          competencia: parcela.competencia,
          valorCentavos: parcela.valorCentavos,
          contaInternaId,
          cobrancaId: cobrancaParcelaId,
          lancamentoContaInternaId: lancamentoId,
          faturaContaInternaId: faturaId,
          recebimentoId: recebimentoParcelaId,
          status: pagamentoNoAto ? "PAGO" : "PENDENTE",
          observacoes:
            `Inscricao ${inscricao.id} · ` +
            `parcela ${parcela.parcelaNumero}/${parcela.totalParcelas}`,
        });
      }

      if (parcelasRegistradas.length > 0) {
        const [primeiraParcela] = parcelasRegistradas;
        cobrancaId = primeiraParcela.cobrancaId;
        lancamentoContaInternaId = primeiraParcela.lancamentoContaInternaId;
        faturaContaInternaId = primeiraParcela.faturaContaInternaId;
        recebimentoId = primeiraParcela.recebimentoId;
      }

      for (const [itemIndex, itemInserido] of itensInseridos.entries()) {
        const itemFinanceiro = itensFinanceiros[itemIndex];
        if (!itemFinanceiro || itemFinanceiro.valorTotalCentavos <= 0) continue;

        const distribuicaoItem = distribuirValorPorParcelas(
          itemFinanceiro.valorTotalCentavos,
          parcelasRegistradas.length,
        );

        parcelasRegistradas.forEach((parcela, parcelaIndex) => {
          const valorCentavos = distribuicaoItem[parcelaIndex] ?? 0;
          if (valorCentavos <= 0) return;

          movimentosFinanceirosItens.push({
            inscricaoId: String(inscricao.id),
            inscricaoItemId: String(itemInserido.id),
            destinoFinanceiro: "CONTA_INTERNA",
            competencia: parcela.competencia,
            parcelaNumero: parcela.parcelaNumero,
            totalParcelas: parcela.totalParcelas,
            valorCentavos,
            contaInternaId: parcela.contaInternaId,
            cobrancaId: parcela.cobrancaId,
            lancamentoContaInternaId: parcela.lancamentoContaInternaId,
            faturaContaInternaId: parcela.faturaContaInternaId,
            observacoes:
              `Constituicao inicial da inscricao ${inscricao.id} - ` +
              `${itemFinanceiro.descricaoSnapshot}`,
          });
        });
      }

      await replaceEventoEdicaoInscricaoParcelasContaInterna(
        db,
        String(inscricao.id),
        parcelasRegistradas,
      );
    } else if (payload.origemInscricao === "INSCRICAO_EXTERNA") {
      const cobrancaAvulsa = await insertCobrancaAvulsaEventoEdicaoInscricao(db, {
        pessoaId: pessoaFinanceiraId,
        valorCentavos: valorTotalCentavos,
        vencimento: hoje,
        status: "PAGO",
        meio: "OUTRO",
        observacao: descricaoFinanceira,
        pagoEm: `${hoje}T00:00:00`,
      });

      cobrancaAvulsaId = Number(cobrancaAvulsa.id);

      const recebimento = await insertRecebimentoEventoEdicaoInscricao(db, {
        cobrancaId: null,
        centroCustoId,
        valorCentavos: valorTotalCentavos,
        dataPagamento: `${hoje}T00:00:00`,
        metodoPagamento: formaPagamentoCodigo ?? "OUTRO",
        formaPagamentoCodigo,
        origemSistema: "COBRANCA_AVULSA",
        observacoes: descricaoFinanceira,
      });

      recebimentoId = Number(recebimento.id);

      if (centroCustoId) {
        await insertMovimentoFinanceiroReceita(db, {
          centroCustoId,
          valorCentavos: valorTotalCentavos,
          dataMovimento: `${hoje}T00:00:00`,
          origem: "RECEBIMENTO",
          origemId: recebimentoId,
          descricao: descricaoFinanceira,
          usuarioId: options?.userId ?? null,
        });
      }

      await insertEventoFinanceiroReferencia(db, {
        edicaoId: payload.edicaoId,
        natureza: "RECEITA",
        origemTipo: "RECEBIMENTO",
        origemId: recebimentoId,
        pessoaId: pessoaFinanceiraId,
        descricao: descricaoFinanceira,
        valorPrevistoCentavos: valorTotalCentavos,
        valorRealCentavos: valorTotalCentavos,
        recebimentoId,
        observacoes: `Inscricao ${inscricao.id}`,
      });

      for (const [itemIndex, itemInserido] of itensInseridos.entries()) {
        const itemFinanceiro = itensFinanceiros[itemIndex];
        if (!itemFinanceiro || itemFinanceiro.valorTotalCentavos <= 0) continue;

        movimentosFinanceirosItens.push({
          inscricaoId: String(inscricao.id),
          inscricaoItemId: String(itemInserido.id),
          destinoFinanceiro: "COBRANCA_AVULSA",
          valorCentavos: itemFinanceiro.valorTotalCentavos,
          cobrancaAvulsaId,
          recebimentoId,
          observacoes:
            `Constituicao inicial da inscricao ${inscricao.id} - ` +
            `${itemFinanceiro.descricaoSnapshot}`,
        });
      }
    } else {
      const vencProvDiretoReproc = (() => {
        const [ac, mc] = competencia.split("-").map(Number);
        if (ac && mc) {
          const ud = new Date(ac, mc, 0).getDate();
          return `${ac}-${String(mc).padStart(2, "0")}-${String(ud).padStart(2, "0")}`;
        }
        return hoje;
      })();
      const cobranca = await insertCobrancaEventoEdicaoInscricao(db, {
        origemEventoInscricaoId: String(inscricao.id),
        pessoaId: pessoaFinanceiraId,
        descricao: descricaoFinanceira,
        valorCentavos: valorTotalCentavos,
        vencimento: pagamentoNoAto ? hoje : vencProvDiretoReproc,
        status: pagamentoNoAto ? "PAGO" : "PENDENTE",
        centroCustoId,
        metodoPagamento: pagamentoNoAto ? formaPagamentoCodigo : null,
        dataPagamento: pagamentoNoAto ? hoje : null,
        observacoes: `Inscricao ${inscricao.id} do modulo de eventos`,
        origemLabel: String(inscricao.id),
        competenciaAnoMes: competencia,
      });

      cobrancaId = Number(cobranca.id);

      if (pagamentoNoAto) {
        const recebimento = await insertRecebimentoEventoEdicaoInscricao(db, {
          cobrancaId,
          centroCustoId,
          valorCentavos: valorTotalCentavos,
          dataPagamento: `${hoje}T00:00:00`,
          metodoPagamento: formaPagamentoCodigo ?? "OUTRO",
          formaPagamentoCodigo,
          origemSistema: "EVENTO_ESCOLA",
          observacoes: descricaoFinanceira,
        });

        recebimentoId = Number(recebimento.id);

        if (centroCustoId) {
          await insertMovimentoFinanceiroReceita(db, {
            centroCustoId,
            valorCentavos: valorTotalCentavos,
            dataMovimento: `${hoje}T00:00:00`,
            origem: "RECEBIMENTO",
            origemId: recebimentoId,
            descricao: descricaoFinanceira,
            usuarioId: options?.userId ?? null,
          });
        }

        await insertEventoFinanceiroReferencia(db, {
          edicaoId: payload.edicaoId,
          natureza: "RECEITA",
          origemTipo: "RECEBIMENTO",
          origemId: recebimentoId,
          pessoaId: pessoaFinanceiraId,
          descricao: descricaoFinanceira,
          valorPrevistoCentavos: valorTotalCentavos,
          valorRealCentavos: valorTotalCentavos,
          cobrancaId,
          recebimentoId,
          observacoes: `Inscricao ${inscricao.id}`,
        });

        for (const [itemIndex, itemInserido] of itensInseridos.entries()) {
          const itemFinanceiro = itensFinanceiros[itemIndex];
          if (!itemFinanceiro || itemFinanceiro.valorTotalCentavos <= 0) continue;

          movimentosFinanceirosItens.push({
            inscricaoId: String(inscricao.id),
            inscricaoItemId: String(itemInserido.id),
            destinoFinanceiro: "COBRANCA_DIRETA",
            valorCentavos: itemFinanceiro.valorTotalCentavos,
            cobrancaId,
            recebimentoId,
            observacoes:
              `Constituicao inicial da inscricao ${inscricao.id} - ` +
              `${itemFinanceiro.descricaoSnapshot}`,
          });
        }
      } else {
        await insertEventoFinanceiroReferencia(db, {
          edicaoId: payload.edicaoId,
          natureza: "RECEITA",
          origemTipo: "COBRANCA",
          origemId: cobrancaId,
          pessoaId: pessoaFinanceiraId,
          descricao: descricaoFinanceira,
          valorPrevistoCentavos: valorTotalCentavos,
          cobrancaId,
          observacoes: `Inscricao ${inscricao.id}`,
        });

        for (const [itemIndex, itemInserido] of itensInseridos.entries()) {
          const itemFinanceiro = itensFinanceiros[itemIndex];
          if (!itemFinanceiro || itemFinanceiro.valorTotalCentavos <= 0) continue;

          movimentosFinanceirosItens.push({
            inscricaoId: String(inscricao.id),
            inscricaoItemId: String(itemInserido.id),
            destinoFinanceiro: "COBRANCA_DIRETA",
            valorCentavos: itemFinanceiro.valorTotalCentavos,
            cobrancaId,
            observacoes:
              `Constituicao inicial da inscricao ${inscricao.id} - ` +
              `${itemFinanceiro.descricaoSnapshot}`,
          });
        }
      }
    }
  }

  if (movimentosFinanceirosItens.length > 0) {
    await insertEventoEdicaoInscricaoItemMovimentosFinanceiros(
      db,
      movimentosFinanceirosItens,
    );
  }
  */

  await updateEventoEdicaoInscricaoFinanceiro(db, String(inscricao.id), {
    statusInscricao: "CONFIRMADA",
    statusFinanceiro: resultadoFinanceiro.statusFinanceiro,
    contaInternaId: resultadoFinanceiro.contaInternaId,
    destinoFinanceiro: resultadoFinanceiro.destinoFinanceiro,
    gerarEmContaInterna: resultadoFinanceiro.gerarEmContaInterna,
    pagamentoNoAto: resultadoFinanceiro.pagamentoNoAto,
    modalidadePagamentoFinanceiro:
      resultadoFinanceiro.modalidadePagamentoFinanceiro,
    quantidadeParcelasContaInterna:
      resultadoFinanceiro.quantidadeParcelasContaInterna,
    valorTotalCentavos: resultadoFinanceiro.valorTotalCentavos,
    valorPagoAtoCentavos: resultadoFinanceiro.valorPagoAtoCentavos,
    valorSaldoContaInternaCentavos:
      resultadoFinanceiro.valorSaldoContaInternaCentavos,
    cobrancaId: resultadoFinanceiro.cobrancaId,
    cobrancaAvulsaId: resultadoFinanceiro.cobrancaAvulsaId,
    recebimentoId: resultadoFinanceiro.recebimentoId,
    lancamentoContaInternaId: resultadoFinanceiro.lancamentoContaInternaId,
    faturaContaInternaId: resultadoFinanceiro.faturaContaInternaId,
    formaPagamentoCodigo: resultadoFinanceiro.formaPagamentoCodigo,
    financeiroStatus: "PROCESSANDO",
    financeiroErroCodigo: null,
    financeiroErroDetalhe: null,
    financeiroProcessadoEm: null,
  });

  await garantirPosValidacaoFinanceiraInscricao(db, {
    edicaoId: payload.edicaoId,
    inscricaoId: String(inscricao.id),
  });

  await updateEventoEdicaoInscricaoFinanceiro(db, String(inscricao.id), {
    financeiroStatus: "CONCLUIDO",
    financeiroErroCodigo: null,
    financeiroErroDetalhe: null,
    financeiroProcessadoEm: new Date().toISOString(),
  });

  logInscricaoEventoFinanceiro("INSCRICAO_EVENTO_CREATE_FINANCEIRO_OK", {
    edicaoId: payload.edicaoId,
    inscricaoId: String(inscricao.id),
    origem: payload.origemInscricao,
    destinoFinanceiro,
    participante: participanteLogLabel,
    totalCalculado: valorTotalCentavos,
    branchFinanceiro,
  });

  const resposta = await buscarInscricaoEdicaoEvento(
    db,
    payload.edicaoId,
    String(inscricao.id),
  );

  logInscricaoEventoFinanceiro("INSCRICAO_EVENTO_CREATE_END", {
    edicaoId: payload.edicaoId,
    inscricaoId: String(inscricao.id),
    origem: payload.origemInscricao,
    destinoFinanceiro,
    participante: participanteLogLabel,
    totalCalculado: valorTotalCentavos,
    branchFinanceiro,
  });

  return resposta;
  } catch (error) {
    console.error("INSCRICAO_EVENTO_CREATE_FINANCEIRO_EXCEPTION", {
      edicaoId: payload.edicaoId,
      inscricaoId: String(inscricao.id),
      origem: payload.origemInscricao,
      destinoFinanceiro,
      branchFinanceiro,
      error: serializarErroOperacional(error),
    });

    const erroBase =
      error instanceof EventoInscricaoFinanceiroError
        ? error
        : new EventoInscricaoFinanceiroError({
            message: "falha ao constituir financeiro da inscricao",
            code: "INSCRICAO_EVENTO_CREATE_FINANCEIRO_ERROR",
            details: limitarDetalheErro(
              `Inscricao ${String(inscricao.id)}: ${resumirErroOperacional(error)}`,
            ),
            httpStatus: 500,
            inscricaoId: String(inscricao.id),
          });

    let statusFinanceiroErro: "NAO_GERADO" | "PARCIAL" = "NAO_GERADO";

    try {
      const diagnosticoErro = await diagnosticarFinanceiroInscricao(db, {
        edicaoId: payload.edicaoId,
        inscricaoId: String(inscricao.id),
      });
      statusFinanceiroErro = diagnosticoErro.possuiReflexoFinanceiro
        ? "PARCIAL"
        : "NAO_GERADO";
    } catch {
      statusFinanceiroErro = "NAO_GERADO";
    }

    logInscricaoEventoFinanceiro("INSCRICAO_EVENTO_CREATE_FINANCEIRO_ERROR", {
      edicaoId: payload.edicaoId,
      inscricaoId: String(inscricao.id),
      origem: payload.origemInscricao,
      destinoFinanceiro,
      participante: participanteLogLabel,
      totalCalculado: valorTotalCentavos,
      branchFinanceiro,
      erroResumido: erroBase.details,
    });

    await updateEventoEdicaoInscricaoFinanceiro(db, String(inscricao.id), {
      statusInscricao: "RASCUNHO",
      statusFinanceiro: statusFinanceiroErro,
      destinoFinanceiro,
      pagamentoNoAto,
      modalidadePagamentoFinanceiro,
      quantidadeParcelasContaInterna,
      valorTotalCentavos,
      valorPagoAtoCentavos,
      valorSaldoContaInternaCentavos,
      formaPagamentoCodigo,
      financeiroStatus: "ERRO",
      financeiroErroCodigo: erroBase.code,
      financeiroErroDetalhe: erroBase.details,
      financeiroProcessadoEm: null,
    });

    throw erroBase;
  }
}

export async function reprocessarFinanceiroInscricaoEdicaoEvento(
  db: DbClient,
  params: {
    edicaoId: string;
    inscricaoId: string;
  },
  options?: { userId?: string | null },
) {
  await ensureEdicaoExists(db, params.edicaoId);
  const inscricaoBase = await ensureInscricaoExists(db, params.inscricaoId);

  if (inscricaoBase.edicao_id !== params.edicaoId) {
    throw new Error("inscricao nao encontrada para a edicao informada");
  }

  const inscricaoAtual = await buscarInscricaoEdicaoEvento(
    db,
    params.edicaoId,
    params.inscricaoId,
  );
  const diagnosticoAntes = await diagnosticarFinanceiroInscricao(db, params);
  const financeiroStatusAtual =
    typeof inscricaoAtual.financeiro_status === "string"
      ? inscricaoAtual.financeiro_status
      : "PENDENTE";
  const destinoFinanceiro =
    inscricaoAtual.destino_financeiro as EventoEdicaoDestinoFinanceiro;
  const pagamentoNoAto = inscricaoAtual.pagamento_no_ato === true;
  const modalidadePagamentoFinanceiro =
    (inscricaoAtual.modalidade_pagamento_financeiro as
      | EventoEdicaoModalidadePagamentoFinanceiro
      | null) ??
    (pagamentoNoAto ? "ATO_TOTAL" : "CONTA_INTERNA_TOTAL");
  const valorTotalAtualCentavos =
    typeof inscricaoAtual.valor_total_centavos === "number"
      ? Number(inscricaoAtual.valor_total_centavos)
      : 0;
  const valorPagoAtoCentavosAtual =
    typeof inscricaoAtual.valor_pago_ato_centavos === "number"
      ? Number(inscricaoAtual.valor_pago_ato_centavos)
      : pagamentoNoAto
        ? valorTotalAtualCentavos
        : 0;
  const valorSaldoContaInternaCentavosAtual =
    typeof inscricaoAtual.valor_saldo_conta_interna_centavos === "number"
      ? Number(inscricaoAtual.valor_saldo_conta_interna_centavos)
      : Math.max(0, valorTotalAtualCentavos - valorPagoAtoCentavosAtual);
  const quantidadeParcelasContaInternaAtual =
    typeof inscricaoAtual.quantidade_parcelas_conta_interna === "number" &&
    inscricaoAtual.quantidade_parcelas_conta_interna >= 0
      ? Number(inscricaoAtual.quantidade_parcelas_conta_interna)
      : valorSaldoContaInternaCentavosAtual > 0
        ? 1
        : 0;

  if (diagnosticoAntes.consistente && financeiroStatusAtual !== "ERRO") {
    throw new EventoInscricaoFinanceiroError({
      message: "inscricao ja possui financeiro consistente",
      code: "INSCRICAO_EVENTO_REPROCESSAMENTO_DESNECESSARIO",
      details: "A inscricao ja atende aos reflexos financeiros minimos esperados.",
      httpStatus: 409,
      inscricaoId: params.inscricaoId,
    });
  }

  if (diagnosticoAntes.consistente) {
    await updateEventoEdicaoInscricaoFinanceiro(db, params.inscricaoId, {
      statusInscricao: "CONFIRMADA",
      financeiroStatus: "CONCLUIDO",
      financeiroErroCodigo: null,
      financeiroErroDetalhe: null,
      financeiroProcessadoEm: new Date().toISOString(),
    });

    return {
      acao: "reaproveitado",
      diagnosticoAntes,
      diagnosticoDepois: diagnosticoAntes,
      resumoFinanceiro: buildResumoOperacionalFinanceiro({
        statusFinanceiro: inscricaoAtual.status_financeiro,
        destinoFinanceiro,
        pagamentoNoAto,
        valorTotalCentavos: valorTotalAtualCentavos,
        quantidadeParcelasContaInterna: quantidadeParcelasContaInternaAtual,
        cobrancaId:
          typeof inscricaoAtual.cobranca_id === "number"
            ? Number(inscricaoAtual.cobranca_id)
            : null,
        cobrancaAvulsaId:
          typeof inscricaoAtual.cobranca_avulsa_id === "number"
            ? Number(inscricaoAtual.cobranca_avulsa_id)
            : null,
        recebimentoId:
          typeof inscricaoAtual.recebimento_id === "number"
            ? Number(inscricaoAtual.recebimento_id)
            : null,
        lancamentoContaInternaId:
          typeof inscricaoAtual.lancamento_conta_interna_id === "number"
            ? Number(inscricaoAtual.lancamento_conta_interna_id)
            : null,
        faturaContaInternaId:
          typeof inscricaoAtual.fatura_conta_interna_id === "number"
            ? Number(inscricaoAtual.fatura_conta_interna_id)
            : null,
        diagnostico: diagnosticoAntes,
      }),
      inscricao: await buscarInscricaoEdicaoEvento(db, params.edicaoId, params.inscricaoId),
    };
  }

  if (diagnosticoAntes.possuiReflexoFinanceiro) {
    throw new EventoInscricaoFinanceiroError({
      message: "reprocessamento bloqueado por risco de duplicidade",
      code: "INSCRICAO_EVENTO_REPROCESSAMENTO_BLOQUEADO_DUPLICIDADE",
      details:
        `Ja existem reflexos financeiros parciais para a inscricao. ` +
        `Motivos: ${diagnosticoAntes.motivos.join(", ")}.`,
      httpStatus: 409,
      inscricaoId: params.inscricaoId,
    });
  }

  const itensAtivos = Array.isArray(inscricaoAtual.itens)
    ? inscricaoAtual.itens.filter((item) => item.status !== "CANCELADO")
    : [];
  const itensFinanceiros: ItemFinanceiroInscricao[] = itensAtivos.map((item) => ({
    tipoItem: item.tipo_item ?? "ITEM_EDICAO",
    itemConfiguracaoId: item.item_configuracao_id ?? null,
    coreografiaVinculoId: item.coreografia_vinculo_id ?? null,
    descricaoSnapshot:
      item.descricao_snapshot ?? item.descricao ?? "Item da inscricao",
    quantidade: item.quantidade,
    valorUnitarioCentavos: item.valor_unitario_centavos,
    valorTotalCentavos: item.valor_total_centavos,
    obrigatorio: item.obrigatorio,
    observacoes: item.observacoes,
    origemItem: item.origem_item ?? "INSCRICAO_INICIAL",
  }));
  const valorTotalCentavos = itensFinanceiros.reduce(
    (acc, item) => acc + item.valorTotalCentavos,
    0,
  );
  const origemInscricao =
    inscricaoAtual.origem_inscricao as EventoEdicaoOrigemInscricao;
  const formaPagamentoCodigo =
    typeof inscricaoAtual.forma_pagamento_codigo === "string"
      ? normalizeFormaPagamentoCodigo(inscricaoAtual.forma_pagamento_codigo)
      : null;
  const contaInternaId =
    typeof inscricaoAtual.conta_interna_id === "number"
      ? Number(inscricaoAtual.conta_interna_id)
      : null;
  let diaVencimentoContaInterna: number | null = null;
  let contaInternaSelecionada: EventoEdicaoContaInternaElegivel | null = null;
  let parcelasContaInternaSelecionadas: EventoEdicaoParcelaContaInternaPlano[] = [];
  const quantidadeParcelasContaInterna = quantidadeParcelasContaInternaAtual;

  if (origemInscricao === "INSCRICAO_INTERNA" && destinoFinanceiro === "CONTA_INTERNA") {
    const alunoId =
      typeof inscricaoAtual.aluno_pessoa_id === "number"
        ? Number(inscricaoAtual.aluno_pessoa_id)
        : null;
    if (!alunoId) {
      throw new EventoInscricaoFinanceiroError({
        message: "nao foi possivel resolver o aluno da inscricao",
        code: "INSCRICAO_EVENTO_REPROCESSAMENTO_SEM_ALUNO",
        httpStatus: 409,
        inscricaoId: params.inscricaoId,
      });
    }

    const contasElegiveis = await listarContasInternasElegiveisInscricaoEdicaoEvento(db, {
      edicaoId: params.edicaoId,
      alunoPessoaId: alunoId,
      responsavelFinanceiroId:
        typeof inscricaoAtual.responsavel_financeiro_id === "number"
          ? Number(inscricaoAtual.responsavel_financeiro_id)
          : null,
    });

    contaInternaSelecionada =
      contasElegiveis.find((item) => item.contaId === contaInternaId) ?? null;
    if (!contaInternaSelecionada || !contaInternaId) {
      throw new EventoInscricaoFinanceiroError({
        message: "conta interna nao elegivel para reprocessamento",
        code: "INSCRICAO_EVENTO_REPROCESSAMENTO_CONTA_INTERNA_INVALIDA",
        httpStatus: 409,
        inscricaoId: params.inscricaoId,
      });
    }

    diaVencimentoContaInterna = contaInternaSelecionada.diaVencimento;
    const configuracaoRaw = await getEventoEdicaoConfiguracao(db, params.edicaoId);
    const configuracao = normalizeConfiguracaoInscricao(
      (configuracaoRaw as Record<string, unknown> | null) ?? null,
    );
    const contextoFinanceiroEdicao = await carregarContextoFinanceiroEdicao(
      db,
      params.edicaoId,
    );
    const dataLimExerc2 = await carregarDataLimiteExercicio(db);
    const opcoesParcelamento = buildParcelamentoContaInternaOptions({
      valorTotalCentavos: valorSaldoContaInternaCentavosAtual,
      configuracao,
      contexto: contextoFinanceiroEdicao,
      contaElegivel: contaInternaSelecionada,
      dataLimiteExercicio: dataLimExerc2,
    });
    const opcaoSelecionada =
      opcoesParcelamento.find(
        (item) => item.quantidadeParcelas === quantidadeParcelasContaInterna,
      ) ?? null;

    if (!opcaoSelecionada) {
      throw new EventoInscricaoFinanceiroError({
        message: "parcelamento atual nao e elegivel para reprocessamento",
        code: "INSCRICAO_EVENTO_REPROCESSAMENTO_PARCELAMENTO_INVALIDO",
        httpStatus: 409,
        inscricaoId: params.inscricaoId,
      });
    }

    parcelasContaInternaSelecionadas = opcaoSelecionada.parcelas;
  }

  await atualizarEstadoTecnicoFinanceiroInscricao(db, params.inscricaoId, {
    financeiroStatus: "PROCESSANDO",
    financeiroErroCodigo: null,
    financeiroErroDetalhe: null,
    financeiroProcessadoEm: null,
  });

  const resultadoFinanceiro = await constituirFinanceiroInscricaoEdicaoEvento(db, {
    edicaoId: params.edicaoId,
    inscricaoId: params.inscricaoId,
    origemInscricao,
    destinoFinanceiro,
    pagamentoNoAto,
    modalidadePagamentoFinanceiro,
    pessoaFinanceiraId: Number(inscricaoAtual.pessoa_id),
    participanteNome: inscricaoAtual.participante_nome_snapshot ?? null,
    valorTotalCentavos,
    valorPagoAtoCentavos: valorPagoAtoCentavosAtual,
    valorSaldoContaInternaCentavos: valorSaldoContaInternaCentavosAtual,
    contaInternaId,
    diaVencimentoContaInterna,
    contaInternaSelecionada,
    quantidadeParcelasContaInterna,
    parcelasContaInternaSelecionadas,
    formaPagamentoCodigo,
    observacoesPagamento: null,
    itensFinanceiros,
    itensPersistidos: itensAtivos.map((item) => ({ id: item.id })),
    options,
  });

  await updateEventoEdicaoInscricaoFinanceiro(db, params.inscricaoId, {
    statusInscricao: "CONFIRMADA",
    statusFinanceiro: resultadoFinanceiro.statusFinanceiro,
    contaInternaId: resultadoFinanceiro.contaInternaId,
    destinoFinanceiro: resultadoFinanceiro.destinoFinanceiro,
    gerarEmContaInterna: resultadoFinanceiro.gerarEmContaInterna,
    pagamentoNoAto: resultadoFinanceiro.pagamentoNoAto,
    modalidadePagamentoFinanceiro:
      resultadoFinanceiro.modalidadePagamentoFinanceiro,
    quantidadeParcelasContaInterna:
      resultadoFinanceiro.quantidadeParcelasContaInterna,
    valorTotalCentavos: resultadoFinanceiro.valorTotalCentavos,
    valorPagoAtoCentavos: resultadoFinanceiro.valorPagoAtoCentavos,
    valorSaldoContaInternaCentavos:
      resultadoFinanceiro.valorSaldoContaInternaCentavos,
    cobrancaId: resultadoFinanceiro.cobrancaId,
    cobrancaAvulsaId: resultadoFinanceiro.cobrancaAvulsaId,
    recebimentoId: resultadoFinanceiro.recebimentoId,
    lancamentoContaInternaId: resultadoFinanceiro.lancamentoContaInternaId,
    faturaContaInternaId: resultadoFinanceiro.faturaContaInternaId,
    formaPagamentoCodigo: resultadoFinanceiro.formaPagamentoCodigo,
    financeiroStatus: "PROCESSANDO",
    financeiroErroCodigo: null,
    financeiroErroDetalhe: null,
    financeiroProcessadoEm: null,
  });

  const diagnosticoDepois = await garantirPosValidacaoFinanceiraInscricao(db, params);

  await updateEventoEdicaoInscricaoFinanceiro(db, params.inscricaoId, {
    financeiroStatus: "CONCLUIDO",
    financeiroErroCodigo: null,
    financeiroErroDetalhe: null,
    financeiroProcessadoEm: new Date().toISOString(),
  });

  return {
    acao: "criado",
    diagnosticoAntes,
    diagnosticoDepois,
    resumoFinanceiro: buildResumoOperacionalFinanceiro({
      statusFinanceiro: resultadoFinanceiro.statusFinanceiro,
      destinoFinanceiro: resultadoFinanceiro.destinoFinanceiro,
      pagamentoNoAto: resultadoFinanceiro.pagamentoNoAto,
      valorTotalCentavos: resultadoFinanceiro.valorTotalCentavos,
      quantidadeParcelasContaInterna:
        resultadoFinanceiro.quantidadeParcelasContaInterna,
      cobrancaId: resultadoFinanceiro.cobrancaId,
      cobrancaAvulsaId: resultadoFinanceiro.cobrancaAvulsaId,
      recebimentoId: resultadoFinanceiro.recebimentoId,
      lancamentoContaInternaId: resultadoFinanceiro.lancamentoContaInternaId,
      faturaContaInternaId: resultadoFinanceiro.faturaContaInternaId,
      diagnostico: diagnosticoDepois,
    }),
    inscricao: await buscarInscricaoEdicaoEvento(db, params.edicaoId, params.inscricaoId),
  };
}

export async function atualizarInscricaoEdicaoEvento(
  db: DbClient,
  payload: EventoEdicaoInscricaoUpdatePayload,
) {
  await ensureEdicaoExists(db, payload.edicaoId);
  const inscricao = await ensureInscricaoExists(db, payload.inscricaoId);

  if (inscricao.edicao_id !== payload.edicaoId) {
    throw new Error("inscricao nao encontrada para a edicao informada");
  }

  return updateEventoEdicaoInscricao(db, payload);
}

export async function adicionarItensInscricaoEdicaoEvento(
  db: DbClient,
  payload: EventoEdicaoInscricaoAdicionarItensPayload,
  options?: { userId?: string | null },
) {
  await ensureEdicaoExists(db, payload.edicaoId);
  const inscricaoBase = await ensureInscricaoExists(db, payload.inscricaoId);

  if (inscricaoBase.edicao_id !== payload.edicaoId) {
    throw new Error("inscricao nao encontrada para a edicao informada");
  }

  if (inscricaoBase.status_inscricao === "CANCELADA") {
    throw new Error("nao e possivel ampliar uma inscricao cancelada");
  }

  const configuracaoRaw = await getEventoEdicaoConfiguracao(db, payload.edicaoId);
  const configuracao = normalizeConfiguracaoInscricao(
    (configuracaoRaw as Record<string, unknown> | null) ?? null,
  );

  if ((payload.itemConfiguracaoIds?.length ?? 0) > 0 && !configuracao.permiteItensAdicionais) {
    throw new Error("a edicao nao permite itens adicionais");
  }

  const coreografiaVinculoIds = resolveParticipacoesArtisticasCoreografiaIds({
    participacoesArtisticas: payload.participacoesArtisticas,
    coreografiaVinculoIds: payload.coreografiaVinculoIds,
  });

  await validarCapacidadeCoreografiasEdicaoEvento({
    db,
    edicaoId: payload.edicaoId,
    coreografiaVinculoIds,
  });

  if (
    coreografiaVinculoIds.length > 0 &&
    !configuracao.permiteInscricaoPorCoreografia
  ) {
    throw new Error("a edicao nao permite inscricao por coreografia");
  }

  const inscricaoAtual = (await buscarInscricaoEdicaoEvento(
    db,
    payload.edicaoId,
    payload.inscricaoId,
  )) as Record<string, unknown>;

  const itensAtivosAtuais = Array.isArray(inscricaoAtual.itens)
    ? inscricaoAtual.itens.filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" &&
          item !== null &&
          item.status !== "CANCELADO",
      )
    : [];

  if (
    payload.incluirEventoGeral &&
    itensAtivosAtuais.some((item) => (item.tipo_item ?? item.tipoItem) === "EVENTO_GERAL")
  ) {
    throw new Error("a inscricao ja possui o item geral ativo");
  }

  const { itensConfiguracao, coreografiasSelecionadas } =
    await carregarSelecoesItensInscricao(db, {
      edicaoId: payload.edicaoId,
      itemConfiguracaoIds: payload.itemConfiguracaoIds ?? [],
      coreografiaVinculoIds,
    });

  const itensFinanceiros = comporItensFinanceirosInscricao({
    configuracao,
    incluirEventoGeral: payload.incluirEventoGeral ?? false,
    itensConfiguracao: itensConfiguracao as Record<string, unknown>[],
    coreografiasSelecionadas: coreografiasSelecionadas as Record<string, unknown>[],
    origemItem: "AMPLIACAO_POSTERIOR",
  });

  const chavesAtivas = new Set(
    itensAtivosAtuais.map((item) => buildInscricaoItemIdentityKey(item)),
  );

  for (const item of itensFinanceiros) {
    const chave = buildInscricaoItemIdentityKey(item);
    if (chavesAtivas.has(chave)) {
      throw new Error("um dos itens selecionados ja esta ativo nesta inscricao");
    }
  }

  if (itensFinanceiros.length === 0) {
    throw new Error("selecione ao menos um item para ampliar a inscricao");
  }

  const itensInseridos = await insertEventoEdicaoInscricaoItens(
    db,
    itensFinanceiros.map((item) => ({
      ...item,
      inscricaoId: payload.inscricaoId,
    })),
  );

  const valorDeltaCentavos = itensFinanceiros.reduce(
    (acc, item) => acc + item.valorTotalCentavos,
    0,
  );

  const participanteNome =
    (typeof inscricaoAtual.participante_nome_snapshot === "string" &&
    inscricaoAtual.participante_nome_snapshot.trim()
      ? inscricaoAtual.participante_nome_snapshot.trim()
      : null) ??
    (typeof (inscricaoAtual.aluno as Record<string, unknown> | null)?.nome === "string"
      ? String((inscricaoAtual.aluno as Record<string, unknown>).nome)
      : null) ??
    (typeof (inscricaoAtual.participante as Record<string, unknown> | null)?.nome === "string"
      ? String((inscricaoAtual.participante as Record<string, unknown>).nome)
      : null) ??
    `Pessoa #${String(inscricaoAtual.pessoa_id ?? "-")}`;

  const nomeEventoBase =
    typeof (inscricaoAtual.edicao_evento_base as Record<string, unknown> | null)?.titulo === "string"
      ? String((inscricaoAtual.edicao_evento_base as Record<string, unknown>).titulo)
      : null;
  const tituloEdicao =
    typeof (inscricaoAtual.edicao_titulo_exibicao as string | null) === "string"
      ? String(inscricaoAtual.edicao_titulo_exibicao)
      : null;

  const { data: edicaoDetalhe, error: edicaoDetalheError } = await db
    .from("eventos_escola_edicoes")
    .select("titulo_exibicao, evento:eventos_escola(titulo)")
    .eq("id", payload.edicaoId)
    .maybeSingle();

  if (edicaoDetalheError) throw edicaoDetalheError;

  const tituloEdicaoEfetivo =
    tituloEdicao ??
    (typeof edicaoDetalhe?.titulo_exibicao === "string"
      ? edicaoDetalhe.titulo_exibicao
      : null);
  const eventoBase = firstRelation(
    edicaoDetalhe?.evento as { titulo: string } | { titulo: string }[] | null,
  );
  const nomeEventoBaseEfetivo =
    nomeEventoBase ??
    (eventoBase && typeof eventoBase.titulo === "string" ? eventoBase.titulo : null);

  const descricaoFinanceiraBase = buildDescricaoFinanceiraAmpliacaoInscricao(
    buildDescricaoFinanceiraInscricao({
      nomeEventoBase: nomeEventoBaseEfetivo,
      tituloEdicao: tituloEdicaoEfetivo,
      participanteNome,
    }),
  );

  const centroCustoId = await getCentroCustoPadraoEscolaId(db);
  const hoje = isoDateOnly();
  const competencia = competenciaAnoMes(hoje);
  const origemInscricao = inscricaoBase.origem_inscricao as EventoEdicaoOrigemInscricao;
  const destinoFinanceiro =
    inscricaoBase.destino_financeiro as EventoEdicaoDestinoFinanceiro;
  const pagamentoNoAto = inscricaoBase.pagamento_no_ato === true;
  const contaInternaIdAtual =
    typeof inscricaoBase.conta_interna_id === "number"
      ? Number(inscricaoBase.conta_interna_id)
      : null;
  const pessoaFinanceiraId = Number(inscricaoBase.pessoa_id);
  const formaPagamentoCodigo = inscricaoBase.forma_pagamento_codigo
    ? normalizeFormaPagamentoCodigo(String(inscricaoBase.forma_pagamento_codigo))
    : null;

  const movimentosFinanceirosItens: Array<{
    inscricaoId: string;
    inscricaoItemId: string;
    tipoMovimento?: "CONSTITUICAO" | "CANCELAMENTO_SEM_ESTORNO" | "AJUSTE_MANUAL";
    destinoFinanceiro: "CONTA_INTERNA" | "COBRANCA_DIRETA" | "COBRANCA_AVULSA";
    competencia?: string | null;
    parcelaNumero?: number | null;
    totalParcelas?: number | null;
    valorCentavos: number;
    contaInternaId?: number | null;
    cobrancaId?: number | null;
    cobrancaAvulsaId?: number | null;
    recebimentoId?: number | null;
    lancamentoContaInternaId?: number | null;
    faturaContaInternaId?: number | null;
    observacoes?: string | null;
  }> = [];

  let novoStatusFinanceiro =
    inscricaoBase.status_financeiro as
      | "NAO_GERADO"
      | "PENDENTE"
      | "PARCIAL"
      | "PAGO"
      | "ISENTO"
      | "CANCELADO";

  if (valorDeltaCentavos > 0) {
    if (
      origemInscricao === "INSCRICAO_INTERNA" &&
      destinoFinanceiro === "CONTA_INTERNA"
    ) {
      if (!contaInternaIdAtual) {
        throw new Error("conta interna nao resolvida para ampliar a inscricao");
      }

      const contasElegiveis = await listarContasInternasElegiveisInscricaoEdicaoEvento(
        db,
        {
          edicaoId: payload.edicaoId,
          alunoPessoaId:
            typeof inscricaoBase.aluno_pessoa_id === "number"
              ? Number(inscricaoBase.aluno_pessoa_id)
              : 0,
          responsavelFinanceiroId:
            typeof inscricaoBase.responsavel_financeiro_id === "number"
              ? Number(inscricaoBase.responsavel_financeiro_id)
              : null,
        },
      );

      const contaInternaSelecionada =
        contasElegiveis.find((item) => item.contaId === contaInternaIdAtual) ?? null;

      if (!contaInternaSelecionada) {
        throw new Error(
          "a conta interna atual da inscricao nao esta mais elegivel para ampliacao",
        );
      }

      const parcelasAtuais = Array.isArray(inscricaoAtual.parcelas_conta_interna)
        ? [...inscricaoAtual.parcelas_conta_interna]
            .filter(
              (item): item is Record<string, unknown> =>
                typeof item === "object" && item !== null,
            )
            .sort(
              (left, right) =>
                Number(left.parcela_numero ?? 0) - Number(right.parcela_numero ?? 0),
            )
        : [];

      let parcelasBase: EventoEdicaoParcelaContaInternaPlano[] = parcelasAtuais.map(
        (item) => ({
          parcelaNumero: Number(item.parcela_numero ?? 0),
          totalParcelas: Number(item.total_parcelas ?? 1),
          competencia: String(item.competencia ?? ""),
          valorCentavos: 0,
        }),
      );

      if (parcelasBase.length === 0) {
        const contextoFinanceiroEdicao = await carregarContextoFinanceiroEdicao(
          db,
          payload.edicaoId,
        );
        const dataLimExerc3 = await carregarDataLimiteExercicio(db);
        const opcoesParcelamento = buildParcelamentoContaInternaOptions({
          valorTotalCentavos: valorDeltaCentavos,
          configuracao,
          contexto: contextoFinanceiroEdicao,
          contaElegivel: contaInternaSelecionada,
          dataLimiteExercicio: dataLimExerc3,
        });
        const quantidadeParcelas =
          typeof inscricaoBase.quantidade_parcelas_conta_interna === "number" &&
          inscricaoBase.quantidade_parcelas_conta_interna > 0
            ? Number(inscricaoBase.quantidade_parcelas_conta_interna)
            : 1;
        const opcaoSelecionada =
          opcoesParcelamento.find(
            (item) => item.quantidadeParcelas === quantidadeParcelas,
          ) ?? opcoesParcelamento[0] ?? null;

        if (!opcaoSelecionada) {
          throw new Error(
            "nao ha competencias elegiveis disponiveis para ampliar a inscricao em conta interna.",
          );
        }

        parcelasBase = opcaoSelecionada.parcelas.map((item) => ({
          ...item,
          valorCentavos: 0,
        }));
      }

      const valoresDelta = distribuirValorPorParcelas(
        valorDeltaCentavos,
        parcelasBase.length,
      );
      const parcelasDelta = parcelasBase.map((parcela, index) => ({
        ...parcela,
        valorCentavos: valoresDelta[index] ?? 0,
      }));
      const parcelasRegistradas: ParcelaFinanceiraRegistrada[] = [];

      for (const parcela of parcelasDelta) {
        const descricaoParcela = buildDescricaoFinanceiraInscricaoParcela(
          descricaoFinanceiraBase,
          parcela,
        );
        // 1A: vencimento provisório = último dia da competência
        const vencimentoProvAmpliacao = (() => {
          const [ac, mc] = parcela.competencia.split("-").map(Number);
          if (ac && mc) {
            const ud = new Date(ac, mc, 0).getDate();
            return `${ac}-${String(mc).padStart(2, "0")}-${String(ud).padStart(2, "0")}`;
          }
          return hoje;
        })();
        const cobrancaParcela = await insertCobrancaEventoEdicaoInscricao(db, {
          origemEventoInscricaoId: payload.inscricaoId,
          pessoaId: pessoaFinanceiraId,
          descricao: descricaoParcela,
          valorCentavos: parcela.valorCentavos,
          vencimento: pagamentoNoAto ? hoje : vencimentoProvAmpliacao,
          status: pagamentoNoAto ? "PAGO" : "PENDENTE",
          centroCustoId,
          contaInternaId: contaInternaIdAtual,
          metodoPagamento: pagamentoNoAto ? formaPagamentoCodigo : null,
          dataPagamento: pagamentoNoAto ? hoje : null,
          observacoes:
            `Ampliacao da inscricao ${payload.inscricaoId} - ` +
            `parcela ${parcela.parcelaNumero}/${parcela.totalParcelas}`,
          origemLabel:
            `${payload.inscricaoId}:ampliacao:` +
            `${parcela.competencia}:${parcela.parcelaNumero}`,
          competenciaAnoMes: parcela.competencia,
          parcelaNumero: parcela.parcelaNumero,
          totalParcelas: parcela.totalParcelas,
        });

        const cobrancaParcelaId = Number(cobrancaParcela.id);
        let recebimentoParcelaId: number | null = null;

        if (pagamentoNoAto) {
          const recebimentoParcela = await insertRecebimentoEventoEdicaoInscricao(db, {
            cobrancaId: cobrancaParcelaId,
            centroCustoId,
            valorCentavos: parcela.valorCentavos,
            dataPagamento: `${hoje}T00:00:00`,
            metodoPagamento: formaPagamentoCodigo ?? "OUTRO",
            formaPagamentoCodigo,
            origemSistema: "EVENTO_ESCOLA",
            observacoes: descricaoParcela,
          });

          recebimentoParcelaId = Number(recebimentoParcela.id);

          if (centroCustoId) {
            await insertMovimentoFinanceiroReceita(db, {
              centroCustoId,
              valorCentavos: parcela.valorCentavos,
              dataMovimento: `${hoje}T00:00:00`,
              origem: "RECEBIMENTO",
              origemId: recebimentoParcelaId,
              descricao: descricaoParcela,
              usuarioId: options?.userId ?? null,
            });
          }
        }
        const lancamento = await criarLancamentoContaInterna({
          supabase: db,
          cobrancaId: cobrancaParcelaId,
          contaInternaId: contaInternaIdAtual,
          competencia: parcela.competencia,
          valorCentavos: parcela.valorCentavos,
          descricao: descricaoParcela,
          origemSistema: "ESCOLA",
          origemId: cobrancaParcelaId,
          composicaoJson: {
            modulo: "eventos_escola",
            inscricao_id: payload.inscricaoId,
            edicao_id: payload.edicaoId,
            tipo: "AMPLIACAO_INSCRICAO",
            itens: itensFinanceiros.map((item) => ({
              tipo: item.tipoItem,
              descricao: item.descricaoSnapshot,
              valor_centavos: item.valorTotalCentavos,
            })),
          },
          referenciaItem:
            `evento-inscricao:${payload.inscricaoId}:ampliacao:` +
            `competencia:${parcela.competencia}:parcela:${parcela.parcelaNumero}`,
        });

        const lancamentoId = Number(lancamento.id);
        const fatura =
          contaInternaSelecionada.origemTitular === "COLABORADOR"
            ? await agendarFaturamentoMensalColaborador({
                supabase: db,
                contaInternaId: contaInternaIdAtual,
                competencia: parcela.competencia,
                diaVencimento: contaInternaSelecionada.diaVencimento,
                lancamentoId,
              })
            : await agendarFaturamentoMensalAluno({
                supabase: db,
                contaInternaId: contaInternaIdAtual,
                competencia: parcela.competencia,
                diaVencimento: contaInternaSelecionada.diaVencimento,
                lancamentoId,
              });

        const faturaId = Number(fatura.fatura_id);
        const vencimentoFaturaAmpl =
          typeof fatura.data_vencimento === "string" && fatura.data_vencimento
            ? fatura.data_vencimento
            : vencimentoProvAmpliacao;

        await updateCobrancaEventoEdicaoInscricaoVencimento(db, {
          cobrancaId: cobrancaParcelaId,
          vencimento: vencimentoFaturaAmpl,
        });

        await insertEventoFinanceiroReferencia(db, {
          edicaoId: payload.edicaoId,
          natureza: "RECEITA",
          origemTipo: pagamentoNoAto ? "RECEBIMENTO" : "CONTA_INTERNA",
          origemId: pagamentoNoAto ? recebimentoParcelaId : undefined,
          pessoaId: pessoaFinanceiraId,
          descricao: descricaoParcela,
          valorPrevistoCentavos: parcela.valorCentavos,
          valorRealCentavos: pagamentoNoAto ? parcela.valorCentavos : undefined,
          contaInternaId: contaInternaIdAtual,
          cobrancaId: cobrancaParcelaId,
          recebimentoId: pagamentoNoAto ? recebimentoParcelaId : undefined,
          observacoes:
            `Ampliacao da inscricao ${payload.inscricaoId} - ` +
            `parcela ${parcela.parcelaNumero}/${parcela.totalParcelas}`,
        });

        parcelasRegistradas.push({
          parcelaNumero: parcela.parcelaNumero,
          totalParcelas: parcela.totalParcelas,
          competencia: parcela.competencia,
          valorCentavos: parcela.valorCentavos,
          contaInternaId: contaInternaIdAtual,
          cobrancaId: cobrancaParcelaId,
          lancamentoContaInternaId: lancamentoId,
          faturaContaInternaId: faturaId,
          recebimentoId: recebimentoParcelaId,
          status: pagamentoNoAto ? "PAGO" : "PENDENTE",
          observacoes:
            `Ampliacao da inscricao ${payload.inscricaoId} - ` +
            `parcela ${parcela.parcelaNumero}/${parcela.totalParcelas}`,
        });
      }

      for (const [itemIndex, itemInserido] of itensInseridos.entries()) {
        const itemFinanceiro = itensFinanceiros[itemIndex];
        if (!itemFinanceiro || itemFinanceiro.valorTotalCentavos <= 0) continue;

        const distribuicaoItem = distribuirValorPorParcelas(
          itemFinanceiro.valorTotalCentavos,
          parcelasRegistradas.length,
        );

        parcelasRegistradas.forEach((parcela, parcelaIndex) => {
          const valorCentavos = distribuicaoItem[parcelaIndex] ?? 0;
          if (valorCentavos <= 0) return;

          movimentosFinanceirosItens.push({
            inscricaoId: payload.inscricaoId,
            inscricaoItemId: String(itemInserido.id),
            destinoFinanceiro: "CONTA_INTERNA",
            competencia: parcela.competencia,
            parcelaNumero: parcela.parcelaNumero,
            totalParcelas: parcela.totalParcelas,
            valorCentavos,
            contaInternaId: parcela.contaInternaId,
            cobrancaId: parcela.cobrancaId,
            lancamentoContaInternaId: parcela.lancamentoContaInternaId,
            faturaContaInternaId: parcela.faturaContaInternaId,
            observacoes:
              `Ampliacao da inscricao ${payload.inscricaoId} - ` +
              `${itemFinanceiro.descricaoSnapshot}`,
          });
        });
      }

      const parcelasResumo = mergeParcelasResumoComDelta({
        parcelasAtuais,
        parcelasDelta,
        contaInternaId: contaInternaIdAtual,
        observacao: `Ampliacao da inscricao ${payload.inscricaoId}`,
      });
      await replaceEventoEdicaoInscricaoParcelasContaInterna(
        db,
        payload.inscricaoId,
        parcelasResumo,
      );

      novoStatusFinanceiro = pagamentoNoAto ? "PAGO" : "PENDENTE";
    } else if (origemInscricao === "INSCRICAO_EXTERNA") {
      if (!formaPagamentoCodigo) {
        throw new Error(
          "a inscricao externa precisa ter forma de pagamento para registrar ampliacao no ato",
        );
      }

      const cobrancaAvulsa = await insertCobrancaAvulsaEventoEdicaoInscricao(db, {
        pessoaId: pessoaFinanceiraId,
        valorCentavos: valorDeltaCentavos,
        vencimento: hoje,
        status: "PAGO",
        meio: "OUTRO",
        observacao: descricaoFinanceiraBase,
        pagoEm: `${hoje}T00:00:00`,
      });
      const cobrancaAvulsaId = Number(cobrancaAvulsa.id);

      const recebimento = await insertRecebimentoEventoEdicaoInscricao(db, {
        cobrancaId: null,
        centroCustoId,
        valorCentavos: valorDeltaCentavos,
        dataPagamento: `${hoje}T00:00:00`,
        metodoPagamento: formaPagamentoCodigo,
        formaPagamentoCodigo,
        origemSistema: "COBRANCA_AVULSA",
        observacoes: descricaoFinanceiraBase,
      });
      const recebimentoId = Number(recebimento.id);

      if (centroCustoId) {
        await insertMovimentoFinanceiroReceita(db, {
          centroCustoId,
          valorCentavos: valorDeltaCentavos,
          dataMovimento: `${hoje}T00:00:00`,
          origem: "RECEBIMENTO",
          origemId: recebimentoId,
          descricao: descricaoFinanceiraBase,
          usuarioId: options?.userId ?? null,
        });
      }

      await insertEventoFinanceiroReferencia(db, {
        edicaoId: payload.edicaoId,
        natureza: "RECEITA",
        origemTipo: "RECEBIMENTO",
        origemId: recebimentoId,
        pessoaId: pessoaFinanceiraId,
        descricao: descricaoFinanceiraBase,
        valorPrevistoCentavos: valorDeltaCentavos,
        valorRealCentavos: valorDeltaCentavos,
        recebimentoId,
        observacoes: `Ampliacao da inscricao ${payload.inscricaoId}`,
      });

      for (const [itemIndex, itemInserido] of itensInseridos.entries()) {
        const itemFinanceiro = itensFinanceiros[itemIndex];
        if (!itemFinanceiro || itemFinanceiro.valorTotalCentavos <= 0) continue;
        movimentosFinanceirosItens.push({
          inscricaoId: payload.inscricaoId,
          inscricaoItemId: String(itemInserido.id),
          destinoFinanceiro: "COBRANCA_AVULSA",
          valorCentavos: itemFinanceiro.valorTotalCentavos,
          cobrancaAvulsaId,
          recebimentoId,
          observacoes:
            `Ampliacao da inscricao ${payload.inscricaoId} - ` +
            `${itemFinanceiro.descricaoSnapshot}`,
        });
      }

      novoStatusFinanceiro = "PAGO";
    } else {
      const vencProvDiretoAmpl = (() => {
        const [ac, mc] = competencia.split("-").map(Number);
        if (ac && mc) {
          const ud = new Date(ac, mc, 0).getDate();
          return `${ac}-${String(mc).padStart(2, "0")}-${String(ud).padStart(2, "0")}`;
        }
        return hoje;
      })();
      const cobranca = await insertCobrancaEventoEdicaoInscricao(db, {
        origemEventoInscricaoId: payload.inscricaoId,
        pessoaId: pessoaFinanceiraId,
        descricao: descricaoFinanceiraBase,
        valorCentavos: valorDeltaCentavos,
        vencimento: pagamentoNoAto ? hoje : vencProvDiretoAmpl,
        status: pagamentoNoAto ? "PAGO" : "PENDENTE",
        centroCustoId,
        metodoPagamento: pagamentoNoAto ? formaPagamentoCodigo : null,
        dataPagamento: pagamentoNoAto ? hoje : null,
        observacoes: `Ampliacao da inscricao ${payload.inscricaoId}`,
        origemLabel: `${payload.inscricaoId}:ampliacao`,
        competenciaAnoMes: competencia,
      });
      const cobrancaId = Number(cobranca.id);
      let recebimentoId: number | null = null;

      if (pagamentoNoAto) {
        if (!formaPagamentoCodigo) {
          throw new Error(
            "a inscricao precisa ter forma de pagamento para registrar ampliacao no ato",
          );
        }

        const recebimento = await insertRecebimentoEventoEdicaoInscricao(db, {
          cobrancaId,
          centroCustoId,
          valorCentavos: valorDeltaCentavos,
          dataPagamento: `${hoje}T00:00:00`,
          metodoPagamento: formaPagamentoCodigo,
          formaPagamentoCodigo,
          origemSistema: "EVENTO_ESCOLA",
          observacoes: descricaoFinanceiraBase,
        });

        recebimentoId = Number(recebimento.id);

        if (centroCustoId) {
          await insertMovimentoFinanceiroReceita(db, {
            centroCustoId,
            valorCentavos: valorDeltaCentavos,
            dataMovimento: `${hoje}T00:00:00`,
            origem: "RECEBIMENTO",
            origemId: recebimentoId,
            descricao: descricaoFinanceiraBase,
            usuarioId: options?.userId ?? null,
          });
        }

        await insertEventoFinanceiroReferencia(db, {
          edicaoId: payload.edicaoId,
          natureza: "RECEITA",
          origemTipo: "RECEBIMENTO",
          origemId: recebimentoId,
          pessoaId: pessoaFinanceiraId,
          descricao: descricaoFinanceiraBase,
          valorPrevistoCentavos: valorDeltaCentavos,
          valorRealCentavos: valorDeltaCentavos,
          cobrancaId,
          recebimentoId,
          observacoes: `Ampliacao da inscricao ${payload.inscricaoId}`,
        });
      } else {
        await insertEventoFinanceiroReferencia(db, {
          edicaoId: payload.edicaoId,
          natureza: "RECEITA",
          origemTipo: "COBRANCA",
          origemId: cobrancaId,
          pessoaId: pessoaFinanceiraId,
          descricao: descricaoFinanceiraBase,
          valorPrevistoCentavos: valorDeltaCentavos,
          cobrancaId,
          observacoes: `Ampliacao da inscricao ${payload.inscricaoId}`,
        });
      }

      for (const [itemIndex, itemInserido] of itensInseridos.entries()) {
        const itemFinanceiro = itensFinanceiros[itemIndex];
        if (!itemFinanceiro || itemFinanceiro.valorTotalCentavos <= 0) continue;
        movimentosFinanceirosItens.push({
          inscricaoId: payload.inscricaoId,
          inscricaoItemId: String(itemInserido.id),
          destinoFinanceiro: "COBRANCA_DIRETA",
          valorCentavos: itemFinanceiro.valorTotalCentavos,
          cobrancaId,
          recebimentoId,
          observacoes:
            `Ampliacao da inscricao ${payload.inscricaoId} - ` +
            `${itemFinanceiro.descricaoSnapshot}`,
        });
      }

      novoStatusFinanceiro = pagamentoNoAto ? "PAGO" : "PENDENTE";
    }
  }

  if (movimentosFinanceirosItens.length > 0) {
    await insertEventoEdicaoInscricaoItemMovimentosFinanceiros(
      db,
      movimentosFinanceirosItens,
    );
  }

  await updateEventoEdicaoInscricaoFinanceiro(db, payload.inscricaoId, {
    statusInscricao: "CONFIRMADA",
    statusFinanceiro: novoStatusFinanceiro,
    valorTotalCentavos:
      (typeof inscricaoBase.valor_total_centavos === "number"
        ? Number(inscricaoBase.valor_total_centavos)
        : 0) + valorDeltaCentavos,
  });

  return buscarInscricaoEdicaoEvento(db, payload.edicaoId, payload.inscricaoId);
}

export async function cancelarItemInscricaoEdicaoEvento(
  db: DbClient,
  payload: EventoEdicaoInscricaoCancelarItemPayload,
) {
  await ensureEdicaoExists(db, payload.edicaoId);
  const inscricao = await ensureInscricaoExists(db, payload.inscricaoId);

  if (inscricao.edicao_id !== payload.edicaoId) {
    throw new Error("inscricao nao encontrada para a edicao informada");
  }

  const item = await ensureInscricaoItemExists(db, payload.itemId);
  if (item.inscricao_id !== payload.inscricaoId) {
    throw new Error("item da inscricao nao encontrado");
  }

  if (item.status === "CANCELADO") {
    throw new Error("o item informado ja esta cancelado");
  }

  await updateEventoEdicaoInscricaoItemCancelamento(db, {
    inscricaoId: payload.inscricaoId,
    itemId: payload.itemId,
    motivoCancelamento: payload.motivoCancelamento ?? null,
  });

  await insertEventoEdicaoInscricaoItemMovimentosFinanceiros(db, [
    {
      inscricaoId: payload.inscricaoId,
      inscricaoItemId: payload.itemId,
      tipoMovimento: "CANCELAMENTO_SEM_ESTORNO",
      destinoFinanceiro:
        inscricao.destino_financeiro as
          | "CONTA_INTERNA"
          | "COBRANCA_DIRETA"
          | "COBRANCA_AVULSA",
      contaInternaId:
        typeof inscricao.conta_interna_id === "number"
          ? Number(inscricao.conta_interna_id)
          : null,
      valorCentavos:
        typeof item.valor_total_centavos === "number"
          ? Number(item.valor_total_centavos)
          : 0,
      observacoes:
        payload.motivoCancelamento?.trim() ||
        "Cancelamento parcial sem estorno automatico nesta etapa.",
    },
  ]);

  return buscarInscricaoEdicaoEvento(db, payload.edicaoId, payload.inscricaoId);
}

export async function arquivarInscricaoEdicaoEvento(
  db: DbClient,
  edicaoId: string,
  inscricaoId: string,
) {
  await ensureEdicaoExists(db, edicaoId);
  const inscricao = await ensureInscricaoExists(db, inscricaoId);

  if (inscricao.edicao_id !== edicaoId) {
    throw new Error("inscricao nao encontrada para a edicao informada");
  }

  await archiveEventoEdicaoInscricao(db, edicaoId, inscricaoId);
  return buscarInscricaoEdicaoEvento(db, edicaoId, inscricaoId);
}

export async function criarAtividadeSessaoEvento(
  db: DbClient,
  payload: EventoSessaoAtividadePayload,
) {
  await ensureSessaoExists(db, payload.sessaoId);

  if (payload.coreografiaId) {
    await ensureCoreografiaExists(db, payload.coreografiaId);
  }

  if (payload.turmaId) {
    await ensureTurmaExists(db, payload.turmaId);
  }

  return insertEventoSessaoAtividade(db, payload);
}

export async function criarCoreografiaMestreEvento(
  db: DbClient,
  payload: CoreografiaMestrePayload,
) {
  await ensureCoreografiaEstiloExists(db, payload.estiloId);

  if (payload.professorResponsavelId) {
    await ensurePessoaExists(db, payload.professorResponsavelId);
  }

  if (payload.turmaBaseId) {
    await ensureTurmaExists(db, payload.turmaBaseId);
  }

  const formacao = await resolveCoreografiaFormacaoEvento(db, {
    formacaoId: payload.formacaoId ?? null,
    tipoFormacao: payload.tipoFormacao ?? null,
  });
  const limites = resolveLimitesCoreografiaPorFormacao({
    formacao,
    quantidadeMinima: payload.quantidadeMinimaParticipantes ?? null,
    quantidadeMaxima: payload.quantidadeMaximaParticipantes ?? null,
  });

  return insertCoreografiaMestre(db, {
    ...payload,
    formacaoId: formacao.id,
    tipoFormacao: formacao.codigo,
    quantidadeMinimaParticipantes: limites.minimo,
    quantidadeMaximaParticipantes: limites.maximo,
  });
}

export async function listarCoreografiasMestresEvento(db: DbClient) {
  return listCoreografiasMestres(db);
}

export async function listarCoreografiaEstilosEvento(db: DbClient) {
  return listCoreografiaEstilos(db);
}

export async function listarCoreografiaFormacoesEvento(db: DbClient) {
  return listCoreografiaFormacoes(db);
}

export async function buscarCoreografiaEstiloEvento(
  db: DbClient,
  estiloId: string,
) {
  return getCoreografiaEstiloById(db, estiloId);
}

export async function criarCoreografiaEstiloEvento(
  db: DbClient,
  payload: CoreografiaEstiloPayload,
) {
  return insertCoreografiaEstilo(db, payload);
}

export async function atualizarCoreografiaEstiloEvento(
  db: DbClient,
  payload: CoreografiaEstiloUpdatePayload,
) {
  await ensureCoreografiaEstiloExists(db, payload.estiloId);
  return updateCoreografiaEstilo(db, payload);
}

export async function arquivarCoreografiaEstiloEvento(
  db: DbClient,
  estiloId: string,
) {
  await ensureCoreografiaEstiloExists(db, estiloId);
  return archiveCoreografiaEstilo(db, estiloId);
}

export async function atualizarCoreografiaMestreEvento(
  db: DbClient,
  payload: CoreografiaMestreUpdatePayload,
) {
  const coreografiaAtual = await ensureCoreografiaMestreExists(
    db,
    payload.coreografiaId,
  );

  if (payload.estiloId) {
    await ensureCoreografiaEstiloExists(db, payload.estiloId);
  }

  if (payload.professorResponsavelId) {
    await ensurePessoaExists(db, payload.professorResponsavelId);
  }

  if (payload.turmaBaseId) {
    await ensureTurmaExists(db, payload.turmaBaseId);
  }

  const formacao = await resolveCoreografiaFormacaoEvento(db, {
    formacaoId:
      payload.formacaoId ??
      (typeof coreografiaAtual.formacao_id === "string"
        ? coreografiaAtual.formacao_id
        : null),
    tipoFormacao:
      payload.tipoFormacao ??
      ((typeof coreografiaAtual.tipo_formacao === "string"
        ? coreografiaAtual.tipo_formacao
        : null) as CoreografiaFormacao | null),
  });
  const limites = resolveLimitesCoreografiaPorFormacao({
    formacao,
    quantidadeMinima:
      payload.quantidadeMinimaParticipantes ??
      (typeof coreografiaAtual.quantidade_minima_participantes === "number"
        ? Number(coreografiaAtual.quantidade_minima_participantes)
        : null),
    quantidadeMaxima:
      payload.quantidadeMaximaParticipantes ??
      (typeof coreografiaAtual.quantidade_maxima_participantes === "number"
        ? Number(coreografiaAtual.quantidade_maxima_participantes)
        : null),
  });

  return updateCoreografiaMestre(db, {
    ...payload,
    formacaoId: formacao.id,
    tipoFormacao: formacao.codigo,
    quantidadeMinimaParticipantes: limites.minimo,
    quantidadeMaximaParticipantes: limites.maximo,
  });
}

export async function arquivarCoreografiaMestreEvento(
  db: DbClient,
  coreografiaId: string,
) {
  await ensureCoreografiaMestreExists(db, coreografiaId);
  return archiveCoreografiaMestre(db, coreografiaId);
}

export async function vincularCoreografiaEdicaoEvento(
  db: DbClient,
  payload: EventoEdicaoCoreografiaVinculoPayload,
) {
  await ensureEdicaoExists(db, payload.edicaoId);
  await ensureCoreografiaMestreExists(db, payload.coreografiaId);
  return insertEventoEdicaoCoreografiaVinculo(db, payload);
}

export async function listarCoreografiasEdicaoEvento(
  db: DbClient,
  edicaoId: string,
) {
  await ensureEdicaoExists(db, edicaoId);
  const [coreografias, inscricoes] = await Promise.all([
    listEventoCoreografiasByEdicao(db, edicaoId),
    listarInscricoesEdicaoEvento(db, edicaoId),
  ]);
  const ocupacao = buildEventoCoreografiaOcupacaoMap({
    coreografias: coreografias as Record<string, unknown>[],
    inscricoes: inscricoes as Record<string, unknown>[],
  });

  return (coreografias as Record<string, unknown>[]).map((vinculo) => {
    const coreografia =
      typeof vinculo.coreografia === "object" && vinculo.coreografia !== null
        ? (vinculo.coreografia as Record<string, unknown>)
        : null;
    const capacidadeMaxima =
      typeof coreografia?.quantidade_maxima_participantes === "number"
        ? Number(coreografia.quantidade_maxima_participantes)
        : null;
    const ocupacaoAtual =
      typeof vinculo.id === "string" ? ocupacao.get(vinculo.id)?.size ?? 0 : 0;

    return {
      ...vinculo,
      ocupacao_atual: ocupacaoAtual,
      capacidade_disponivel:
        typeof capacidadeMaxima === "number"
          ? Math.max(capacidadeMaxima - ocupacaoAtual, 0)
          : null,
      lotada:
        typeof capacidadeMaxima === "number" &&
        capacidadeMaxima > 0 &&
        ocupacaoAtual >= capacidadeMaxima,
    };
  });
}

export async function atualizarVinculoCoreografiaEdicaoEvento(
  db: DbClient,
  payload: EventoEdicaoCoreografiaVinculoUpdatePayload,
) {
  await ensureEdicaoExists(db, payload.edicaoId);
  const vinculo = await ensureCoreografiaExists(db, payload.vinculoId);

  if (vinculo.edicao_id !== payload.edicaoId) {
    throw new Error("coreografia nao encontrada para a edicao informada");
  }

  return updateEventoEdicaoCoreografiaVinculo(db, payload);
}

export async function arquivarCoreografiaEvento(
  db: DbClient,
  edicaoId: string,
  coreografiaId: string,
) {
  await ensureEdicaoExists(db, edicaoId);
  const vinculo = await ensureCoreografiaExists(db, coreografiaId);

  if (vinculo.edicao_id !== edicaoId) {
    throw new Error("coreografia nao encontrada para a edicao informada");
  }

  return archiveEventoCoreografia(db, edicaoId, coreografiaId);
}

export async function adicionarParticipanteCoreografiaEvento(
  db: DbClient,
  payload: EventoCoreografiaParticipantePayload,
) {
  await ensureCoreografiaExists(db, payload.coreografiaId);

  if (payload.pessoaId) {
    await ensurePessoaExists(db, payload.pessoaId);
  }

  return insertEventoCoreografiaParticipante(db, payload);
}

export async function criarTurmaVinculoEvento(
  db: DbClient,
  payload: EventoTurmaVinculoPayload,
) {
  await ensureEdicaoExists(db, payload.edicaoId);
  await ensureTurmaExists(db, payload.turmaId);

  if (payload.sessaoId) {
    await ensureSessaoExists(db, payload.sessaoId);
  }

  if (payload.coreografiaId) {
    await ensureCoreografiaExists(db, payload.coreografiaId);
  }

  return insertEventoTurmaVinculo(db, payload);
}

export async function criarContratacaoEvento(
  db: DbClient,
  payload: EventoContratacaoPayload,
) {
  await ensureEdicaoExists(db, payload.edicaoId);

  if (payload.sessaoId) {
    await ensureSessaoExists(db, payload.sessaoId);
  }

  if (payload.prestadorPessoaId) {
    await ensurePessoaExists(db, payload.prestadorPessoaId);
  }

  return insertEventoContratacao(db, payload);
}

export async function criarReferenciaFinanceiraEvento(
  db: DbClient,
  payload: EventoFinanceiroReferenciaPayload,
) {
  await ensureEdicaoExists(db, payload.edicaoId);

  if (payload.sessaoId) {
    await ensureSessaoExists(db, payload.sessaoId);
  }

  if (payload.pessoaId) {
    await ensurePessoaExists(db, payload.pessoaId);
  }

  return insertEventoFinanceiroReferencia(db, payload);
}

export async function buscarConfiguracaoEdicaoEvento(
  db: DbClient,
  edicaoId: string,
) {
  await ensureEdicaoExists(db, edicaoId);
  return getEventoEdicaoConfiguracao(db, edicaoId);
}

export async function salvarConfiguracaoEdicaoEvento(
  db: DbClient,
  payload: EventoEdicaoConfiguracaoPayload,
) {
  await ensureEdicaoExists(db, payload.edicaoId);
  return upsertEventoEdicaoConfiguracao(db, payload);
}

export async function listarCalendarioEdicaoEvento(
  db: DbClient,
  edicaoId: string,
) {
  await ensureEdicaoExists(db, edicaoId);
  return listEventoEdicaoCalendarioItems(db, edicaoId);
}

export async function criarItemCalendarioEdicaoEvento(
  db: DbClient,
  payload: EventoEdicaoCalendarioPayload,
) {
  await ensureEdicaoExists(db, payload.edicaoId);

  if (payload.turmaId) {
    await ensureTurmaExists(db, payload.turmaId);
  }

  if (payload.grupoId) {
    await ensureGrupoExists(db, payload.grupoId);
  }

  return insertEventoEdicaoCalendarioItem(db, payload);
}

export async function atualizarItemCalendarioEdicaoEvento(
  db: DbClient,
  payload: EventoEdicaoCalendarioUpdatePayload,
) {
  await ensureEdicaoExists(db, payload.edicaoId);
  await ensureEventoEdicaoCalendarioItemExists(db, payload.itemId, payload.edicaoId);

  if (payload.turmaId) {
    await ensureTurmaExists(db, payload.turmaId);
  }

  if (payload.grupoId) {
    await ensureGrupoExists(db, payload.grupoId);
  }

  return updateEventoEdicaoCalendarioItem(db, payload);
}

export async function arquivarItemCalendarioEdicaoEvento(
  db: DbClient,
  edicaoId: string,
  itemId: string,
) {
  await ensureEdicaoExists(db, edicaoId);
  await ensureEventoEdicaoCalendarioItemExists(db, itemId, edicaoId);
  return archiveEventoEdicaoCalendarioItem(db, edicaoId, itemId);
}
