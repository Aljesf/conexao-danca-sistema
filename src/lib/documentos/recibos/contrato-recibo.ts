export type TipoRecibo = "PAGAMENTO_CONFIRMADO" | "MENSAL_CONSOLIDADO";

export type OrigemRecibo =
  | "RECEBIMENTO"
  | "COBRANCA_QUITADA"
  | "COBRANCA_AVULSA"
  | "CONTA_INTERNA_COMPETENCIA";

export type ReciboPagamentoItem = {
  cobranca_id: number | null;
  recebimento_id: number | null;
  competencia_ano_mes: string | null;
  descricao: string;
  data_pagamento: string | null;
  valor_pago_centavos: number;
  valor_total_referencia_centavos: number | null;
  saldo_pos_pagamento_centavos: number | null;
  origem_tipo: string | null;
  origem_referencia_label: string;
  conta_interna_tipo: string | null;
  conta_interna_label: string | null;
};

export type ReciboPagamentoSnapshot = {
  tipo_recibo: "PAGAMENTO_CONFIRMADO";
  origem_recibo: OrigemRecibo;
  recibo_numero: string;
  data_emissao: string;
  data_pagamento: string;
  cidade_emissao: string | null;
  pessoa_id: number;
  pessoa_nome: string;
  pessoa_documento: string | null;
  responsavel_financeiro_nome: string | null;
  cobranca_id: number | null;
  recebimento_id: number;
  competencia_ano_mes: string | null;
  descricao: string;
  valor_pago_centavos: number;
  valor_pago_formatado: string;
  valor_total_referencia_centavos: number | null;
  saldo_pos_pagamento_centavos: number | null;
  origem_tipo: string | null;
  origem_referencia_label: string;
  centro_custo_id: number | null;
  centro_custo_nome: string | null;
  conta_interna_tipo: string | null;
  conta_interna_label: string | null;
  observacoes: string | null;
  operador_nome: string | null;
  usuario_emissor: string | null;
  timestamp_emissao: string;
  itens: ReciboPagamentoItem[];
  gaps: string[];
};

export type ReciboMensalConsolidadoSnapshot = {
  tipo_recibo: "MENSAL_CONSOLIDADO";
  origem_recibo: "CONTA_INTERNA_COMPETENCIA";
  recibo_numero: string;
  data_emissao: string;
  cidade_emissao: string | null;
  pessoa_id: number;
  pessoa_nome: string;
  pessoa_documento: string | null;
  responsavel_financeiro_nome: string | null;
  competencia_ano_mes: string;
  conta_interna_tipo: string | null;
  conta_interna_label: string | null;
  total_pago_centavos: number;
  total_pago_formatado: string;
  centro_custo_nome: string | null;
  operador_nome: string | null;
  usuario_emissor: string | null;
  timestamp_emissao: string;
  itens: ReciboPagamentoItem[];
  gaps: string[];
};
