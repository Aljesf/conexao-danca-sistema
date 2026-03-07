import type { ReciboPagamentoSnapshot } from "@/lib/documentos/recibos/contrato-recibo";

export type VariaveisReciboDocumento = Record<string, string>;

function formatDateBR(value: string | null): string {
  if (!value) return "";
  const iso = value.slice(0, 10);
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function formatDateExtenso(value: string): string {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatBRL(centavos: number | null): string {
  return (Number(centavos ?? 0) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function normalizarCompetencia(value: string | null): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split("-");
    return `${month}/${year}`;
  }
  return value;
}

export function mapearVariaveisRecibo(
  snapshot: ReciboPagamentoSnapshot,
  extras?: {
    escola_nome?: string | null;
    cidade_data?: string | null;
  },
): VariaveisReciboDocumento {
  const escolaNome = extras?.escola_nome?.trim() || "Conexao Danca";
  const cidadeData =
    extras?.cidade_data?.trim() ||
    `${snapshot.cidade_emissao ?? "Salinopolis/PA"}, ${formatDateExtenso(snapshot.data_emissao)}.`;

  return {
    RECIBO_NUMERO: snapshot.recibo_numero,
    TIPO_RECIBO: snapshot.tipo_recibo,
    DATA_EMISSAO: formatDateBR(snapshot.data_emissao),
    DATA_PAGAMENTO: formatDateBR(snapshot.data_pagamento),
    CIDADE_EMISSAO: snapshot.cidade_emissao ?? "",
    CIDADE_DATA: cidadeData,
    ESCOLA_NOME: escolaNome,
    PESSOA_NOME: snapshot.pessoa_nome,
    PAGADOR_NOME: snapshot.pessoa_nome,
    PESSOA_DOCUMENTO: snapshot.pessoa_documento ?? "",
    PAGADOR_DOCUMENTO: snapshot.pessoa_documento ?? "",
    PAGADOR_CPF: snapshot.pessoa_documento ?? "",
    RESPONSAVEL_FINANCEIRO_NOME: snapshot.responsavel_financeiro_nome ?? "",
    ALUNO_NOME: snapshot.aluno_nome ?? snapshot.pessoa_nome,
    MATRICULA_ID: snapshot.matricula_id ? String(snapshot.matricula_id) : "",
    COBRANCA_ID: snapshot.cobranca_id ? String(snapshot.cobranca_id) : "",
    RECEBIMENTO_ID: String(snapshot.recebimento_id),
    COMPETENCIA: normalizarCompetencia(snapshot.competencia_ano_mes),
    DESCRICAO: snapshot.descricao,
    REFERENCIA: snapshot.origem_referencia_label,
    ORIGEM_TIPO: snapshot.origem_tipo ?? "",
    ORIGEM_REFERENCIA_LABEL: snapshot.origem_referencia_label,
    CONTA_INTERNA_LABEL: snapshot.conta_interna_label ?? "",
    CENTRO_CUSTO_NOME: snapshot.centro_custo_nome ?? "",
    OPERADOR_NOME: snapshot.operador_nome ?? snapshot.usuario_emissor ?? "",
    FORMA_PAGAMENTO: snapshot.forma_pagamento ?? "",
    VALOR_PAGO: formatBRL(snapshot.valor_pago_centavos),
    VALOR_PAGO_FORMATADO: snapshot.valor_pago_formatado,
    VALOR_TOTAL_REFERENCIA: formatBRL(snapshot.valor_total_referencia_centavos),
    OBSERVACOES: snapshot.observacoes ?? "",
  };
}
