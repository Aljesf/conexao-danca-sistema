export type CobrancaProviderCode = "NEOFIN";

export type CriarCobrancaInput = {
  pessoaId: number;
  descricao: string;
  valorCentavos: number;
  vencimentoISO: string; // YYYY-MM-DD
  referenciaInterna: { tipo: "FATURA_CREDITO_CONEXAO"; id: number };
};

export type CriarCobrancaOutput = {
  provider: CobrancaProviderCode;
  providerCobrancaId: string;
  status: "CRIADA" | "EMITIDA" | "ERRO";
  linkPagamento?: string | null;
  linhaDigitavel?: string | null;
  payload?: Record<string, unknown> | null;
};

export interface ICobrancaProvider {
  code: CobrancaProviderCode;
  criarCobranca(input: CriarCobrancaInput): Promise<CriarCobrancaOutput>;
}
