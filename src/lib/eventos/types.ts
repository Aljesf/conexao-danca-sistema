export type EventoEscolaPayload = {
  titulo: string;
  descricao?: string | null;
  tipoEvento:
    | "REUNIAO"
    | "FESTIVAL"
    | "MOSTRA"
    | "ESPETACULO"
    | "WORKSHOP"
    | "FESTA"
    | "AUDICAO"
    | "AULA_ABERTA"
    | "APRESENTACAO_EXTERNA"
    | "OUTRO";
  naturezaEvento:
    | "PEDAGOGICO"
    | "ARTISTICO"
    | "INSTITUCIONAL"
    | "COMERCIAL"
    | "SOCIAL";
  abrangenciaEvento: "INTERNO" | "EXTERNO" | "HIBRIDO";
  publicoAlvo?: string | null;
  ativo?: boolean;
};

export type EventoEscolaUpdatePayload = {
  eventoId: string;
  titulo?: string;
  descricao?: string | null;
  tipoEvento?: EventoEscolaPayload["tipoEvento"];
  naturezaEvento?: EventoEscolaPayload["naturezaEvento"];
  abrangenciaEvento?: EventoEscolaPayload["abrangenciaEvento"];
  publicoAlvo?: string | null;
  ativo?: boolean;
};

export type EventoEdicaoPayload = {
  eventoId: string;
  tituloExibicao: string;
  tema?: string | null;
  descricao?: string | null;
  anoReferencia: number;
  status?:
    | "EM_PLANEJAMENTO"
    | "INSCRICOES_ABERTAS"
    | "EM_ANDAMENTO"
    | "ENCERRADO"
    | "CANCELADO";
  dataInicio?: string | null;
  dataFim?: string | null;
  localPrincipalNome?: string | null;
  localPrincipalEndereco?: string | null;
  localPrincipalCidade?: string | null;
  regulamentoResumo?: string | null;
  observacoes?: string | null;
};

export type EventoEdicaoUpdatePayload = {
  edicaoId: string;
  tituloExibicao?: string;
  tema?: string | null;
  descricao?: string | null;
  anoReferencia?: number;
  status?: EventoEdicaoPayload["status"];
  dataInicio?: string | null;
  dataFim?: string | null;
  localPrincipalNome?: string | null;
  localPrincipalEndereco?: string | null;
  localPrincipalCidade?: string | null;
  regulamentoResumo?: string | null;
  observacoes?: string | null;
};

export type EventoDiaPayload = {
  edicaoId: string;
  dataEvento: string;
  titulo?: string | null;
  ordem?: number | null;
  status?: "PLANEJADO" | "CONFIRMADO" | "EM_EXECUCAO" | "ENCERRADO" | "CANCELADO";
  observacoes?: string | null;
};

export type EventoSessaoPayload = {
  edicaoId: string;
  diaId: string;
  localId?: string | null;
  titulo: string;
  subtitulo?: string | null;
  tipoSessao:
    | "MANHA"
    | "TARDE"
    | "NOITE"
    | "EXTRA"
    | "ENSAIO"
    | "APRESENTACAO"
    | "WORKSHOP"
    | "CERIMONIA"
    | "OUTRO";
  horaInicio?: string | null;
  horaFim?: string | null;
  ordem?: number | null;
  status?: "PLANEJADA" | "ABERTA" | "EM_EXECUCAO" | "ENCERRADA" | "CANCELADA";
  capacidadeTotal?: number | null;
  exigeIngresso?: boolean;
  usaMapaLugares?: boolean;
  permitePublicoExterno?: boolean;
  observacoes?: string | null;
};

export type EventoModalidadePayload = {
  edicaoId: string;
  codigo?: string | null;
  nome: string;
  tipoModalidade:
    | "INSCRICAO"
    | "PARTICIPACAO"
    | "COREOGRAFIA"
    | "SOLO"
    | "DUO"
    | "TRIO"
    | "GRUPO"
    | "FIGURINO"
    | "WORKSHOP"
    | "ITEM_COMPLEMENTAR"
    | "OUTRO";
  descricao?: string | null;
  obrigatoria?: boolean;
  permiteMultiplasUnidades?: boolean;
  quantidadeMinima?: number | null;
  quantidadeMaxima?: number | null;
  ativo?: boolean;
};

export type EventoInscricaoPayload = {
  edicaoId: string;
  pessoaId: number;
  alunoPessoaId?: number | null;
  responsavelFinanceiroId?: number | null;
  contaInternaId?: number | null;
  observacoes?: string | null;
};

export type EventoParticipanteExternoPayload = {
  participanteExternoId?: string;
  nome: string;
  dataNascimento?: string | null;
  documento?: string | null;
  telefone?: string | null;
  email?: string | null;
  responsavelNome?: string | null;
  observacoes?: string | null;
  ativo?: boolean;
};

export type EventoParticipanteExternoUpdatePayload = {
  participanteExternoId: string;
  nome?: string;
  dataNascimento?: string | null;
  documento?: string | null;
  telefone?: string | null;
  email?: string | null;
  responsavelNome?: string | null;
  observacoes?: string | null;
  ativo?: boolean;
};

export type EventoEdicaoOrigemInscricao =
  | "INSCRICAO_INTERNA"
  | "INSCRICAO_EXTERNA";

export type EventoEdicaoDestinoFinanceiro =
  | "CONTA_INTERNA"
  | "COBRANCA_DIRETA"
  | "COBRANCA_AVULSA";

export type EventoEdicaoModalidadePagamentoFinanceiro =
  | "ATO_TOTAL"
  | "CONTA_INTERNA_TOTAL"
  | "MISTO";

export type EventoEdicaoInscricaoFinanceiroTecnicoStatus =
  | "PENDENTE"
  | "PROCESSANDO"
  | "CONCLUIDO"
  | "ERRO";

export type EventoEdicaoContaInternaOrigem =
  | "ALUNO"
  | "RESPONSAVEL_FINANCEIRO"
  | "COLABORADOR";

export type EventoEdicaoContaInternaElegivel = {
  contaId: number;
  tipoConta: "ALUNO" | "COLABORADOR";
  origemTitular: EventoEdicaoContaInternaOrigem;
  titularPessoaId: number;
  responsavelFinanceiroPessoaId: number | null;
  diaVencimento: number | null;
  tipoFatura: "MENSAL" | null;
  tipoLiquidacao: "FATURA_MENSAL" | null;
  destinoLiquidacaoFatura:
    | "NEOFIN"
    | "PAGAMENTO_DIRETO_ESCOLA"
    | "INTEGRACAO_FOLHA_MES_SEGUINTE"
    | null;
  permiteParcelamento: boolean;
  descricao: string | null;
  label: string;
  prioridade: number;
  competenciasElegiveis: string[];
  maxParcelasDisponiveis: number;
};

export type EventoEdicaoParcelaContaInternaPlano = {
  parcelaNumero: number;
  totalParcelas: number;
  competencia: string;
  valorCentavos: number;
};

export type EventoEdicaoInscricaoPagamentoFinanceiroPayload = {
  modalidade: EventoEdicaoModalidadePagamentoFinanceiro;
  valorPagoAtoCentavos?: number | null;
  formaPagamentoId?: number | null;
  formaPagamentoCodigo?: string | null;
  observacoesPagamento?: string | null;
  parcelasContaInternaSelecionadas?: EventoEdicaoParcelaContaInternaPlano[];
};

export type EventoEdicaoInscricaoItemTipo =
  | "EVENTO_GERAL"
  | "ITEM_EDICAO"
  | "COREOGRAFIA";

export type EventoEdicaoInscricaoItemOrigem =
  | "INSCRICAO_INICIAL"
  | "AMPLIACAO_POSTERIOR";

export type EventoEdicaoInscricaoPayload = {
  edicaoId: string;
  origemInscricao: EventoEdicaoOrigemInscricao;
  alunoPessoaId?: number | null;
  responsavelFinanceiroId?: number | null;
  contaInternaId?: number | null;
  participanteExternoId?: string | null;
  participanteExterno?: EventoParticipanteExternoPayload | null;
  incluirEventoGeral?: boolean;
  itemConfiguracaoIds?: string[];
  participacoesArtisticas?: EventoEdicaoParticipacaoArtisticaPayload[];
  coreografiaVinculoIds?: string[];
  permitirCoreografiasDepois?: boolean;
  destinoFinanceiro?: EventoEdicaoDestinoFinanceiro;
  pagamentoNoAto?: boolean;
  quantidadeParcelasContaInterna?: number | null;
  formaPagamentoCodigo?: string | null;
  pagamentoFinanceiro?: EventoEdicaoInscricaoPagamentoFinanceiroPayload | null;
  observacoes?: string | null;
};

export type EventoEdicaoInscricaoUpdatePayload = {
  inscricaoId: string;
  edicaoId: string;
  statusInscricao?: "RASCUNHO" | "CONFIRMADA" | "CANCELADA";
  statusFinanceiro?:
    | "NAO_GERADO"
    | "PENDENTE"
    | "PARCIAL"
    | "PAGO"
    | "ISENTO"
    | "CANCELADO";
  destinoFinanceiro?: EventoEdicaoDestinoFinanceiro;
  pagamentoNoAto?: boolean;
  gerarEmContaInterna?: boolean;
  quantidadeParcelasContaInterna?: number | null;
  formaPagamentoCodigo?: string | null;
  observacoes?: string | null;
};

export type EventoEdicaoInscricaoAdicionarItensPayload = {
  inscricaoId: string;
  edicaoId: string;
  incluirEventoGeral?: boolean;
  itemConfiguracaoIds?: string[];
  participacoesArtisticas?: EventoEdicaoParticipacaoArtisticaPayload[];
  coreografiaVinculoIds?: string[];
  observacoes?: string | null;
};

export type EventoEdicaoParticipacaoArtisticaPayload = {
  coreografiaVinculoId: string;
  formacao?: CoreografiaFormacao | null;
};

export type EventoEdicaoInscricaoCancelarItemPayload = {
  inscricaoId: string;
  edicaoId: string;
  itemId: string;
  motivoCancelamento?: string | null;
};

export type EventoInscricaoItemPayload = {
  inscricaoId: string;
  modalidadeId?: string | null;
  subeventoId?: string | null;
  descricao?: string | null;
  quantidade?: number;
  valorUnitarioCentavos?: number;
  obrigatorio?: boolean;
  observacoes?: string | null;
};

export type ApiResponseSuccess<T> = {
  ok: true;
  data: T;
};

export type ApiResponseError = {
  ok: false;
  error: string;
  details?: string;
};

export type EventoSessaoAtividadePayload = {
  sessaoId: string;
  localId?: string | null;
  tipoAtividade:
    | "CREDENCIAMENTO"
    | "ABERTURA"
    | "ENSAIO"
    | "ENSAIO_GERAL"
    | "ENTREGA_FIGURINO"
    | "CAMARIM"
    | "APRESENTACAO"
    | "PREMIACAO"
    | "INTERVALO"
    | "WORKSHOP"
    | "REUNIAO"
    | "MONTAGEM"
    | "DESMONTAGEM"
    | "OUTRO";
  titulo: string;
  descricao?: string | null;
  inicio?: string | null;
  fim?: string | null;
  ordem?: number | null;
  abertaAoPublico?: boolean;
  coreografiaId?: string | null;
  turmaId?: number | null;
  observacoes?: string | null;
};

export type CoreografiaFormacao =
  | "SOLO"
  | "DUO"
  | "TRIO"
  | "GRUPO"
  | "TURMA"
  | "LIVRE";

export type CoreografiaFormacaoResumo = {
  id: string;
  codigo: CoreografiaFormacao;
  nome: string;
  quantidadeMinimaPadrao: number;
  quantidadeMaximaPadrao: number;
  quantidadeFixa: boolean;
  ativa: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CoreografiaEstiloPayload = {
  nome: string;
  slug?: string | null;
  descricao?: string | null;
  ativo?: boolean;
  ordemExibicao?: number;
};

export type CoreografiaEstiloUpdatePayload = {
  estiloId: string;
  nome?: string;
  slug?: string | null;
  descricao?: string | null;
  ativo?: boolean;
  ordemExibicao?: number;
};

export type CoreografiaMestrePayload = {
  nome: string;
  descricao?: string | null;
  modalidade?: string | null;
  formacaoId?: string | null;
  tipoFormacao?: CoreografiaFormacao;
  quantidadeMinimaParticipantes?: number | null;
  quantidadeMaximaParticipantes?: number | null;
  duracaoEstimadaSegundos?: number | null;
  sugestaoMusica?: string | null;
  linkMusica?: string | null;
  estiloId: string;
  professorResponsavelId?: number | null;
  turmaBaseId?: number | null;
  observacoes?: string | null;
  ativa?: boolean;
};

export type CoreografiaMestreUpdatePayload = {
  coreografiaId: string;
  nome?: string;
  descricao?: string | null;
  modalidade?: string | null;
  formacaoId?: string | null;
  tipoFormacao?: CoreografiaFormacao;
  quantidadeMinimaParticipantes?: number | null;
  quantidadeMaximaParticipantes?: number | null;
  duracaoEstimadaSegundos?: number | null;
  sugestaoMusica?: string | null;
  linkMusica?: string | null;
  estiloId?: string;
  professorResponsavelId?: number | null;
  turmaBaseId?: number | null;
  observacoes?: string | null;
  ativa?: boolean;
};

export type EventoEdicaoCoreografiaVinculoPayload = {
  edicaoId: string;
  coreografiaId: string;
  subeventoId?: string | null;
  ordemPrevistaApresentacao?: number | null;
  valorParticipacaoCoreografiaCentavos?: number | null;
  duracaoPrevistaNoEventoSegundos?: number | null;
  observacoesDoEvento?: string | null;
  ativa?: boolean;
};

export type EventoEdicaoCoreografiaVinculoUpdatePayload = {
  edicaoId: string;
  vinculoId: string;
  subeventoId?: string | null;
  ordemPrevistaApresentacao?: number | null;
  valorParticipacaoCoreografiaCentavos?: number | null;
  duracaoPrevistaNoEventoSegundos?: number | null;
  observacoesDoEvento?: string | null;
  ativa?: boolean;
};

export type EventoCoreografiaParticipantePayload = {
  coreografiaId: string;
  pessoaId?: number | null;
  alunoId?: number | null;
  inscricaoId?: string | null;
  tipoParticipante?: string | null;
  ordemInterna?: number | null;
  papel?: string | null;
  observacoes?: string | null;
  ativo?: boolean;
};

export type EventoTurmaVinculoPayload = {
  edicaoId: string;
  sessaoId?: string | null;
  turmaId: number;
  tipoVinculo: "ENSAIO" | "CURSO_LIVRE" | "OFICINA" | "APOIO" | "OUTRO";
  coreografiaId?: string | null;
  descricao?: string | null;
};

export type EventoContratacaoPayload = {
  edicaoId: string;
  sessaoId?: string | null;
  prestadorPessoaId?: number | null;
  tipoServico: string;
  descricao?: string | null;
  valorPrevistoCentavos?: number;
  valorContratadoCentavos?: number | null;
  contratoAcessorioEmitidoId?: number | null;
  contaPagarId?: number | null;
  status?: "RASCUNHO" | "CONTRATADO" | "EM_EXECUCAO" | "CONCLUIDO" | "CANCELADO";
  observacoes?: string | null;
};

export type EventoFinanceiroReferenciaPayload = {
  edicaoId: string;
  sessaoId?: string | null;
  natureza: "RECEITA" | "DESPESA";
  origemTipo:
    | "INSCRICAO_EVENTO"
    | "ITEM_INSCRICAO_EVENTO"
    | "CONTA_INTERNA"
    | "COBRANCA"
    | "RECEBIMENTO"
    | "CONTA_PAGAR"
    | "PAGAMENTO_CONTA_PAGAR"
    | "MOVIMENTO_FINANCEIRO"
    | "INGRESSO"
    | "PEDIDO_INGRESSO"
    | "AJUSTE_MANUAL";
  origemId?: number | null;
  pessoaId?: number | null;
  descricao?: string | null;
  valorPrevistoCentavos?: number | null;
  valorRealCentavos?: number | null;
  contaInternaId?: number | null;
  cobrancaId?: number | null;
  recebimentoId?: number | null;
  contaPagarId?: number | null;
  pagamentoContaPagarId?: number | null;
  movimentoFinanceiroId?: number | null;
  observacoes?: string | null;
};

export type EventoEdicaoItemFinanceiroPayload = {
  id?: string;
  codigo?: string | null;
  nome: string;
  descricao?: string | null;
  tipoItem:
    | "FIGURINO"
    | "ENSAIO_EXTRA"
    | "KIT"
    | "MIDIA"
    | "TAXA_ADMINISTRATIVA"
    | "OUTRO";
  modoCobranca?:
    | "UNICO"
    | "POR_ALUNO"
    | "POR_TURMA"
    | "POR_GRUPO"
    | "POR_COREOGRAFIA"
    | "PACOTE";
  valorCentavos?: number;
  ativo?: boolean;
  ordem?: number | null;
  metadata?: Record<string, unknown> | null;
};

export type EventoEdicaoRegraFinanceiraTipo =
  | "TAXA_GERAL"
  | "POR_FORMACAO"
  | "POR_MODALIDADE"
  | "POR_PROGRESSAO"
  | "POR_QUANTIDADE"
  | "ITEM_ADICIONAL";

export type EventoEdicaoRegraFinanceiraModoCalculo =
  | "VALOR_FIXO"
  | "VALOR_TOTAL_FAIXA"
  | "VALOR_POR_PARTICIPANTE"
  | "VALOR_INCREMENTAL";

export type EventoEdicaoRegraFinanceiraPayload = {
  id?: string;
  tipoRegra: EventoEdicaoRegraFinanceiraTipo;
  modoCalculo?: EventoEdicaoRegraFinanceiraModoCalculo;
  descricaoRegra?: string | null;
  formacaoCoreografia?: CoreografiaFormacao | null;
  estiloId?: string | null;
  modalidadeNome?: string | null;
  ordemProgressao?: number | null;
  quantidadeMinima?: number | null;
  quantidadeMaxima?: number | null;
  valorCentavos?: number;
  valorPorParticipanteCentavos?: number | null;
  ativa?: boolean;
  ordemAplicacao?: number | null;
  metadata?: Record<string, unknown> | null;
};

export type EventoEdicaoConfiguracaoPayload = {
  edicaoId: string;
  cobraTaxaParticipacaoGeral?: boolean;
  cobraPorCoreografia?: boolean;
  cobraPorPacote?: boolean;
  permiteItensAdicionais?: boolean;
  permitePagamentoNoAto?: boolean;
  permiteContaInterna?: boolean;
  permiteParcelamentoContaInterna?: boolean;
  exigeInscricaoGeral?: boolean;
  permiteInscricaoPorCoreografia?: boolean;
  permiteVincularCoreografiaDepois?: boolean;
  participacaoPorAluno?: boolean;
  participacaoPorTurma?: boolean;
  participacaoPorGrupo?: boolean;
  participacaoPorCoreografia?: boolean;
  permiteMultiplasCoreografiasAluno?: boolean;
  valorTaxaParticipacaoCentavos?: number;
  modoComposicaoValor?:
    | "VALOR_FIXO"
    | "POR_COREOGRAFIA"
    | "PACOTE"
    | "PERSONALIZADO";
  modoCobranca?: "UNICA" | "PARCELADA";
  quantidadeMaximaParcelas?: number;
  maximoParcelasContaInterna?: number;
  competenciasElegiveisContaInterna?: string[];
  permiteCompetenciasAposEvento?: boolean;
  diaCorteOperacionalParcelamento?: number | null;
  geraContaInternaAutomaticamente?: boolean;
  regrasAdicionais?: Record<string, unknown> | null;
  itensFinanceiros?: EventoEdicaoItemFinanceiroPayload[];
  regrasFinanceiras?: EventoEdicaoRegraFinanceiraPayload[];
};

export type EventoEdicaoCalendarioTipo =
  | "INSCRICAO"
  | "ENSAIO"
  | "APRESENTACAO"
  | "REUNIAO"
  | "PRAZO_INTERNO"
  | "OUTRO";

export type EventoEdicaoCalendarioPayload = {
  edicaoId: string;
  tipo: EventoEdicaoCalendarioTipo;
  titulo: string;
  descricao?: string | null;
  inicio: string;
  fim?: string | null;
  diaInteiro?: boolean;
  localNome?: string | null;
  cidade?: string | null;
  endereco?: string | null;
  refleteNoCalendarioEscola?: boolean;
  turmaId?: number | null;
  grupoId?: number | null;
  ordem?: number | null;
  ativo?: boolean;
};

export type EventoEdicaoCalendarioUpdatePayload = {
  edicaoId: string;
  itemId: string;
  tipo?: EventoEdicaoCalendarioTipo;
  titulo?: string;
  descricao?: string | null;
  inicio?: string;
  fim?: string | null;
  diaInteiro?: boolean;
  localNome?: string | null;
  cidade?: string | null;
  endereco?: string | null;
  refleteNoCalendarioEscola?: boolean;
  turmaId?: number | null;
  grupoId?: number | null;
  ordem?: number | null;
  ativo?: boolean;
};
