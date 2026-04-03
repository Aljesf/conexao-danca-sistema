export type EventoEscolaListItem = {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo_evento: string;
  natureza_evento: string;
  abrangencia_evento: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type EventoEdicaoListItem = {
  id: string;
  evento_id: string;
  titulo_exibicao: string;
  tema: string | null;
  descricao: string | null;
  ano_referencia: number;
  status: string;
  data_inicio: string | null;
  data_fim: string | null;
  local_principal_nome: string | null;
  local_principal_endereco: string | null;
  local_principal_cidade: string | null;
  regulamento_resumo: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  evento?: EventoEscolaListItem | null;
};

export type EventoDiaItem = {
  id: string;
  edicao_id: string;
  data_evento: string;
  titulo: string | null;
  ordem: number | null;
  status: string;
  observacoes: string | null;
};

export type EventoSessaoItem = {
  id: string;
  edicao_id: string;
  dia_id: string;
  local_id: string | null;
  titulo: string;
  subtitulo: string | null;
  tipo_sessao: string;
  hora_inicio: string | null;
  hora_fim: string | null;
  ordem: number | null;
  status: string;
  capacidade_total: number | null;
  exige_ingresso: boolean;
  usa_mapa_lugares: boolean;
  permite_publico_externo: boolean;
  observacoes: string | null;
};

export type EventoEdicaoDetalheData = {
  edicao: EventoEdicaoListItem | null;
  dias: EventoDiaItem[];
  sessoes: EventoSessaoItem[];
};

export type EventoInscricaoItemResumo = {
  id: string;
  inscricao_id: string;
  modalidade_id: string | null;
  subevento_id: string | null;
  descricao: string | null;
  descricao_snapshot?: string | null;
  quantidade: number;
  valor_unitario_centavos: number;
  valor_total_centavos: number;
  obrigatorio: boolean;
  status: string;
  origem_item?: "INSCRICAO_INICIAL" | "AMPLIACAO_POSTERIOR";
  cancelado_em?: string | null;
  motivo_cancelamento?: string | null;
  observacoes: string | null;
  tipo_item?: "EVENTO_GERAL" | "ITEM_EDICAO" | "COREOGRAFIA";
  item_configuracao_id?: string | null;
  coreografia_vinculo_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type EventoPessoaResumo = {
  id: number;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  cpf: string | null;
  nascimento: string | null;
  ativo: boolean | null;
};

export type EventoParticipanteExternoResumo = {
  id: string;
  pessoa_id: number;
  documento?: string | null;
  responsavel_nome: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  pessoa?: EventoPessoaResumo | null;
  nome_exibicao?: string | null;
};

export type EventoFormaPagamentoResumo = {
  id: number;
  codigo: string;
  nome: string;
  tipo_base: string;
  ativo: boolean;
};

export type EventoContaInternaElegivelResumo = {
  contaId: number;
  tipoConta: "ALUNO" | "COLABORADOR";
  origemTitular: "ALUNO" | "RESPONSAVEL_FINANCEIRO" | "COLABORADOR";
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

export type EventoInscricaoParcelaContaInternaResumo = {
  id: string;
  inscricao_id: string;
  parcela_numero: number;
  total_parcelas: number;
  competencia: string;
  valor_centavos: number;
  data_vencimento?: string | null;
  conta_interna_id: number;
  cobranca_id: number | null;
  lancamento_conta_interna_id: number | null;
  fatura_conta_interna_id: number | null;
  status: string;
  observacoes: string | null;
};

export type EventoInscricaoResumo = {
  id: string;
  edicao_id: string;
  pessoa_id: number;
  aluno_pessoa_id: number | null;
  responsavel_financeiro_id: number | null;
  participante_externo_id?: string | null;
  conta_interna_id: number | null;
  origem_inscricao?: "INSCRICAO_INTERNA" | "INSCRICAO_EXTERNA";
  status_inscricao: string;
  status_financeiro: string;
  financeiro_status?: "PENDENTE" | "PROCESSANDO" | "CONCLUIDO" | "ERRO";
  financeiro_erro_codigo?: string | null;
  financeiro_erro_detalhe?: string | null;
  financeiro_processado_em?: string | null;
  data_inscricao: string;
  observacoes: string | null;
  destino_financeiro?: "CONTA_INTERNA" | "COBRANCA_DIRETA" | "COBRANCA_AVULSA";
  gerar_em_conta_interna?: boolean;
  pagamento_no_ato?: boolean;
  modalidade_pagamento_financeiro?: "ATO_TOTAL" | "CONTA_INTERNA_TOTAL" | "MISTO" | null;
  valor_total_centavos?: number;
  valor_pago_ato_centavos?: number;
  valor_saldo_conta_interna_centavos?: number;
  participante_nome_snapshot?: string | null;
  quantidade_parcelas_conta_interna?: number;
  cobranca_id?: number | null;
  cobranca_avulsa_id?: number | null;
  recebimento_id?: number | null;
  lancamento_conta_interna_id?: number | null;
  fatura_conta_interna_id?: number | null;
  forma_pagamento_codigo?: string | null;
  participante?: EventoPessoaResumo | null;
  aluno?: EventoPessoaResumo | null;
  responsavel_financeiro?: EventoPessoaResumo | null;
  participante_externo?: EventoParticipanteExternoResumo | null;
  itens?: EventoInscricaoItemResumo[];
  parcelas_conta_interna?: EventoInscricaoParcelaContaInternaResumo[];
};

export type CoreografiaEstiloResumo = {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  ativo: boolean;
  ordem_exibicao: number;
  created_at: string;
  updated_at: string;
};

export type CoreografiaFormacaoResumo = {
  id: string;
  codigo: "SOLO" | "DUO" | "TRIO" | "GRUPO" | "TURMA" | "LIVRE";
  nome: string;
  quantidade_minima_padrao: number;
  quantidade_maxima_padrao: number;
  quantidade_fixa: boolean;
  ativa: boolean;
  created_at: string;
  updated_at: string;
};

export type CoreografiaMestreResumo = {
  id: string;
  nome: string;
  descricao: string | null;
  modalidade: string | null;
  formacao_id: string;
  tipo_formacao: "SOLO" | "DUO" | "TRIO" | "GRUPO" | "TURMA" | "LIVRE";
  formacao: CoreografiaFormacaoResumo | null;
  quantidade_minima_participantes: number;
  quantidade_maxima_participantes: number;
  duracao_estimada_segundos: number | null;
  sugestao_musica: string | null;
  link_musica: string | null;
  estilo_id: string;
  estilo: CoreografiaEstiloResumo | null;
  professor_responsavel_id: number | null;
  turma_base_id: number | null;
  observacoes: string | null;
  ativa: boolean;
  created_at: string;
  updated_at: string;
};

export type EventoCoreografiaParticipanteResumo = {
  id: string;
  edicao_coreografia_id: string;
  pessoa_id: number | null;
  aluno_id: number | null;
  inscricao_id: string | null;
  tipo_participante: string | null;
  ordem_interna: number | null;
  ativo: boolean;
  papel: string | null;
  observacao: string | null;
};

export type EventoCoreografiaResumo = {
  id: string;
  edicao_id: string;
  coreografia_id: string;
  subevento_id: string | null;
  ordem_prevista_apresentacao: number | null;
  valor_participacao_coreografia_centavos: number | null;
  duracao_prevista_no_evento_segundos: number | null;
  observacoes_do_evento: string | null;
  ativa: boolean;
  created_at: string;
  updated_at: string;
  coreografia: CoreografiaMestreResumo;
  participantes?: EventoCoreografiaParticipanteResumo[];
  ocupacao_atual?: number;
  capacidade_disponivel?: number | null;
  lotada?: boolean;
};

export type EventoContratacaoResumo = {
  id: string;
  edicao_id: string;
  sessao_id: string | null;
  prestador_pessoa_id: number | null;
  tipo_servico: string;
  descricao: string | null;
  valor_previsto_centavos: number;
  valor_contratado_centavos: number | null;
  contrato_acessorio_emitido_id: number | null;
  conta_pagar_id: number | null;
  status: string;
  observacoes: string | null;
};

export type EventoFinanceiroReferenciaResumo = {
  id: string;
  edicao_id: string;
  sessao_id: string | null;
  natureza: string;
  origem_tipo: string;
  origem_id: number | null;
  pessoa_id: number | null;
  descricao: string | null;
  valor_previsto_centavos: number | null;
  valor_real_centavos: number | null;
  conta_interna_id: number | null;
  cobranca_id: number | null;
  recebimento_id: number | null;
  conta_pagar_id: number | null;
  pagamento_conta_pagar_id: number | null;
  movimento_financeiro_id: number | null;
  observacoes: string | null;
};

export type EventoEdicaoDetalheDataExpandido = EventoEdicaoDetalheData & {
  inscricoes: EventoInscricaoResumo[];
  coreografias: EventoCoreografiaResumo[];
  contratacoes: EventoContratacaoResumo[];
  referenciasFinanceiras: EventoFinanceiroReferenciaResumo[];
};

export const EVENTO_EDICAO_ABAS = [
  "resumo",
  "agenda",
  "inscricoes",
  "coreografias",
  "contratacoes",
  "financeiro",
] as const;

export type EventoEdicaoAba = (typeof EVENTO_EDICAO_ABAS)[number];

export type EventoBaseOption = {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo_evento: string;
  ativo: boolean;
};

export type EventoEdicaoConfiguracaoItem = {
  id?: string;
  codigo?: string | null;
  nome: string;
  descricao: string | null;
  tipo_item:
    | "FIGURINO"
    | "ENSAIO_EXTRA"
    | "KIT"
    | "MIDIA"
    | "TAXA_ADMINISTRATIVA"
    | "OUTRO";
  modo_cobranca:
    | "UNICO"
    | "POR_ALUNO"
    | "POR_TURMA"
    | "POR_GRUPO"
    | "POR_COREOGRAFIA"
    | "PACOTE";
  valor_centavos: number;
  ativo: boolean;
  ordem: number | null;
  metadata: Record<string, unknown> | null;
};

export type EventoEdicaoRegraFinanceiraData = {
  id?: string;
  tipo_regra:
    | "TAXA_GERAL"
    | "POR_FORMACAO"
    | "POR_MODALIDADE"
    | "POR_PROGRESSAO"
    | "POR_QUANTIDADE"
    | "ITEM_ADICIONAL";
  modo_calculo:
    | "VALOR_FIXO"
    | "VALOR_TOTAL_FAIXA"
    | "VALOR_POR_PARTICIPANTE"
    | "VALOR_INCREMENTAL";
  descricao_regra: string | null;
  formacao_coreografia:
    | "SOLO"
    | "DUO"
    | "TRIO"
    | "GRUPO"
    | "TURMA"
    | "LIVRE"
    | null;
  estilo_id: string | null;
  modalidade_nome: string | null;
  ordem_progressao: number | null;
  quantidade_minima: number | null;
  quantidade_maxima: number | null;
  valor_centavos: number;
  valor_por_participante_centavos: number | null;
  ativa: boolean;
  ordem_aplicacao: number | null;
  metadata: Record<string, unknown> | null;
};

export type EventoEdicaoConfiguracaoData = {
  id?: string;
  edicao_id: string;
  cobra_taxa_participacao_geral: boolean;
  cobra_por_coreografia: boolean;
  cobra_por_pacote: boolean;
  permite_itens_adicionais: boolean;
  permite_pagamento_no_ato: boolean;
  permite_conta_interna: boolean;
  permite_parcelamento_conta_interna: boolean;
  exige_inscricao_geral: boolean;
  permite_inscricao_por_coreografia: boolean;
  permite_vincular_coreografia_depois: boolean;
  participacao_por_aluno: boolean;
  participacao_por_turma: boolean;
  participacao_por_grupo: boolean;
  participacao_por_coreografia: boolean;
  permite_multiplas_coreografias_aluno: boolean;
  valor_taxa_participacao_centavos: number;
  modo_composicao_valor:
    | "VALOR_FIXO"
    | "POR_COREOGRAFIA"
    | "PACOTE"
    | "PERSONALIZADO";
  modo_cobranca: "UNICA" | "PARCELADA";
  quantidade_maxima_parcelas: number;
  maximo_parcelas_conta_interna: number;
  competencias_elegiveis_conta_interna: string[];
  permite_competencias_apos_evento: boolean;
  dia_corte_operacional_parcelamento: number | null;
  gera_conta_interna_automaticamente: boolean;
  regras_adicionais: Record<string, unknown> | null;
  itensFinanceiros: EventoEdicaoConfiguracaoItem[];
  regrasFinanceiras: EventoEdicaoRegraFinanceiraData[];
};

export type EventoEdicaoCalendarioTipo =
  | "INSCRICAO"
  | "ENSAIO"
  | "APRESENTACAO"
  | "REUNIAO"
  | "PRAZO_INTERNO"
  | "OUTRO";

export type EventoEdicaoCalendarioItem = {
  id: string;
  edicao_id: string;
  tipo: EventoEdicaoCalendarioTipo;
  titulo: string;
  descricao: string | null;
  inicio: string;
  fim: string | null;
  dia_inteiro: boolean;
  local_nome: string | null;
  cidade: string | null;
  endereco: string | null;
  reflete_no_calendario_escola: boolean;
  turma_id: number | null;
  grupo_id: number | null;
  ordem: number | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type EventoCalendarioTurmaOption = {
  turma_id: number;
  nome: string;
};

export type EventoCalendarioGrupoOption = {
  id: number;
  nome: string;
};

export type EventoEdicaoCalendarioData = {
  edicao: EventoEdicaoListItem | null;
  itens: EventoEdicaoCalendarioItem[];
  turmas: EventoCalendarioTurmaOption[];
  grupos: EventoCalendarioGrupoOption[];
};

export type EventoEdicaoCoreografiasData = {
  edicao: EventoEdicaoListItem | null;
  coreografias: EventoCoreografiaResumo[];
  coreografiasDisponiveis: CoreografiaMestreResumo[];
  estilos: CoreografiaEstiloResumo[];
  formacoes: CoreografiaFormacaoResumo[];
};

export type EventoEdicaoInscricoesData = {
  edicao: EventoEdicaoListItem | null;
  configuracao: EventoEdicaoConfiguracaoData | null;
  inscricoes: EventoInscricaoResumo[];
  coreografias: EventoCoreografiaResumo[];
  estilos: CoreografiaEstiloResumo[];
  formacoes: CoreografiaFormacaoResumo[];
  itensFinanceiros: EventoEdicaoConfiguracaoItem[];
  formasPagamento: EventoFormaPagamentoResumo[];
  dashboard: EventoEdicaoInscricoesDashboard;
};

export type EventoInscricaoParticipacaoArtistica = {
  localId: string;
  coreografiaVinculoId: string;
  formacao: CoreografiaMestreResumo["tipo_formacao"];
};

export type EventoEdicaoInscricoesDashboard = {
  totalInscritosAtivos: number;
  totalInscricoesCanceladas: number;
  totalItensAtivos: number;
  totalItensCancelados: number;
  valorPrevistoCentavos: number;
  valorArrecadadoCentavos: number;
  valorCanceladoCentavos: number;
};
