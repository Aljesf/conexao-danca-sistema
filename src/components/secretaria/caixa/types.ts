export type SecretariaPessoaResumo = {
  id: number;
  nome: string | null;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
};

export type SecretariaContaOrigemTotal = {
  origem: string;
  valor_em_aberto_centavos: number;
  quantidade_lancamentos: number;
};

export type SecretariaContaFaturaResumo = {
  id: number;
  competencia: string;
  status: string;
  status_operacional: string;
  valor_original_centavos: number;
  valor_pago_centavos: number;
  saldo_restante_centavos: number;
  data_vencimento: string | null;
  cobranca_externa_vinculada: {
    cobranca_id: number | null;
    status: string | null;
    valor_centavos: number | null;
    neofin_charge_id: string | null;
    neofin_invoice_id: string | null;
    link_pagamento: string | null;
  } | null;
};

export type SecretariaContaLancamentoResumo = {
  id: number;
  fatura_id: number | null;
  origem_sistema: string;
  origem_id: number | null;
  descricao: string;
  data_lancamento: string | null;
  valor_original_centavos: number;
  valor_pago_centavos: number;
  saldo_restante_centavos: number;
  status_operacional: string;
  referencia_item: string | null;
  aluno_nome: string | null;
  status_base: string;
  motivo_cancelamento: string | null;
  cancelado_em: string | null;
  cancelado_por_user_id: string | null;
  possui_recebimento: boolean;
  pode_receber: boolean;
  pode_cancelar: boolean;
};

export type SecretariaContaFaturaAgrupada = SecretariaContaFaturaResumo & {
  lancamentos: SecretariaContaLancamentoResumo[];
};

export type SecretariaContaInternaDetalhe = {
  conta_id: number;
  tipo_conta: string;
  tipo_titular: string | null;
  descricao_exibicao: string | null;
  pessoa_titular: SecretariaPessoaResumo | null;
  responsavel_financeiro: SecretariaPessoaResumo | null;
  alunos_relacionados: SecretariaPessoaResumo[];
  saldo_total_em_aberto_centavos: number;
  total_vencido_centavos: number;
  total_a_vencer_centavos: number;
  proxima_fatura: SecretariaContaFaturaResumo | null;
  totais_por_origem: SecretariaContaOrigemTotal[];
  faturas: SecretariaContaFaturaAgrupada[];
  lancamentos_sem_fatura: SecretariaContaLancamentoResumo[];
  possui_lancamentos_sem_fatura: boolean;
  total_lancamentos_monitorados: number;
};

export type SecretariaContaInternaResumo = {
  pessoa: SecretariaPessoaResumo | null;
  responsavel_financeiro: SecretariaPessoaResumo | null;
  conta_conexao_id: number;
  tipo_conta: string;
  tipo_titular: string | null;
  descricao_exibicao: string | null;
  saldo_total_em_aberto_centavos: number;
  total_vencido_centavos: number;
  total_a_vencer_centavos: number;
  proxima_fatura: SecretariaContaFaturaResumo | null;
  alunos_relacionados: SecretariaPessoaResumo[];
  faturas_resumidas: SecretariaContaFaturaResumo[];
  lancamentos_resumidos: SecretariaContaLancamentoResumo[];
  totais_por_origem: SecretariaContaOrigemTotal[];
};

export type SecretariaPagamentoIntegracaoExterna = {
  status: "NAO_AVALIADA" | "SINCRONIZADA" | "REVISAO_MANUAL" | "IGNORADA" | "ERRO";
  detalhe: string;
  payload: Record<string, unknown> | null;
};

export type SecretariaPagamentoRow = {
  id: number;
  alvo_tipo: string;
  alvo_id: number;
  conta_interna_id: number;
  fatura_id: number | null;
  lancamento_id: number | null;
  valor_informado_centavos: number;
  forma_pagamento_codigo: string;
  conta_financeira_id: number | null;
  data_pagamento: string;
  observacao: string | null;
  operador_user_id: string | null;
  integracao_externa_status: string;
  integracao_externa_payload: Record<string, unknown> | null;
  created_at: string;
};

export type SecretariaPagamentoResponse = {
  ok: true;
  pagamento: SecretariaPagamentoRow | null;
  detalhe: SecretariaContaInternaDetalhe;
  integracao_externa: SecretariaPagamentoIntegracaoExterna;
  redirecionamento: {
    recebimento_id: number | null;
    documento_emitido_id: number | null;
    preview_url: string | null;
    documento_url: string | null;
    rota_sugerida: string | null;
  };
};

export type SecretariaFormaPagamentoOpcao = {
  id?: number;
  forma_pagamento_codigo: string;
  descricao_exibicao: string;
  conta_financeira_id: number | null;
  tipo_base?: string | null;
  exige_troco?: boolean;
  formas_pagamento?: {
    id?: number;
    nome?: string | null;
    codigo?: string | null;
    tipo_base?: string | null;
  } | null;
  contas_financeiras?: {
    id?: number;
    codigo?: string | null;
    nome?: string | null;
  } | null;
};

export type SecretariaContaFinanceiraOpcao = {
  id: number;
  codigo: string | null;
  nome: string;
  centro_custo_id: number | null;
  ativo?: boolean | null;
};

export type SecretariaRecebimentoAlvo =
  | {
      tipo: "FATURA";
      item: SecretariaContaFaturaResumo;
    }
  | {
      tipo: "LANCAMENTO";
      item: SecretariaContaLancamentoResumo;
    };
