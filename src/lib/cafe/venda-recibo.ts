export type CafeVendaReciboItem = {
  produto_id: number | null;
  produto_nome: string;
  quantidade: number;
  valor_unitario_centavos: number;
  subtotal_centavos: number;
};

export type CafeVendaRecibo = {
  id: number;
  numero_legivel: string;
  created_at: string;
  operador: {
    nome: string | null;
    user_id: string | null;
  };
  competencia: string | null;
  comprador: {
    pessoa_id: number | null;
    nome: string | null;
  };
  perfil_resolvido: string | null;
  forma_pagamento: string | null;
  tabela_preco: string | null;
  centro_custo: {
    id: number | null;
    nome: string | null;
  };
  total_centavos: number;
  cobranca_id: number | null;
  fatura_id: number | null;
  conta_interna_id: number | null;
  itens: CafeVendaReciboItem[];
};

function upper(value: string | null | undefined) {
  return typeof value === "string"
    ? value
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
    : "";
}

export function formatCafeVendaNumeroLegivel(id: number) {
  return `CAFE-${String(id).padStart(6, "0")}`;
}

export function formatCafePerfilResolvido(value: string | null | undefined) {
  const normalized = upper(value);
  switch (normalized) {
    case "ALUNO":
      return "Aluno";
    case "COLABORADOR":
      return "Colaborador";
    case "PESSOA_AVULSA":
      return "Pessoa avulsa";
    case "SEM_VINCULO":
      return "Sem vinculo";
    case "NAO_IDENTIFICADO":
      return "Nao identificado";
    default:
      return value?.trim() || null;
  }
}

export function formatCafeFormaPagamento(value: string | null | undefined) {
  const normalized = upper(value);
  switch (normalized) {
    case "DINHEIRO":
      return "Dinheiro";
    case "PIX":
      return "Pix";
    case "CARTAO":
      return "Cartao";
    case "CREDITO_AVISTA":
      return "Credito a vista";
    case "DEBITO":
      return "Debito";
    case "TICKET":
      return "Ticket";
    case "TRANSFERENCIA":
      return "Transferencia";
    case "CONTA_INTERNA_COLABORADOR":
    case "CONTA_INTERNA":
    case "CARTAO_CONEXAO_COLABORADOR":
    case "CARTAO_CONEXAO_COLAB":
      return "Conta interna do colaborador";
    case "CARTAO_CONEXAO_ALUNO":
    case "CREDITO_ALUNO":
      return "Conta interna do aluno";
    default:
      return value?.trim() || null;
  }
}
