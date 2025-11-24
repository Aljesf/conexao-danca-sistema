// Enums do banco representados como strings no front

export type GeneroPessoa =
  | "MASCULINO"
  | "FEMININO"
  | "OUTRO"
  | "NAO_INFORMADO";

export type EstadoCivilPessoa =
  | "SOLTEIRO"
  | "CASADO"
  | "DIVORCIADO"
  | "VIUVO"
  | "UNIAO_ESTAVEL"
  | "OUTRO";

export type TipoPessoa = "FISICA" | "JURIDICA";

// ---------------------------------------------
// NOVO TIPO DE ENDEREÇO (pedido pelo Chat1)
// ---------------------------------------------
export type EnderecoPessoa = {
  logradouro: string;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  referencia: string | null;
};

// ---------------------------------------------
// TYPE PESSOA PRINCIPAL
// ---------------------------------------------
export type Pessoa = {
  id: number;

  // vínculo técnico com usuário / auth
  user_id: string | null;

  // identificação
  nome: string;
  nome_social: string | null;

  tipo_pessoa: TipoPessoa;

  // documentos (PF / PJ)
  cpf: string | null;
  cnpj: string | null;
  razao_social: string | null;
  nome_fantasia: string | null;
  inscricao_estadual: string | null;

  // dados pessoais
  nascimento: string | null;
  genero: GeneroPessoa;
  estado_civil: EstadoCivilPessoa | null;
  nacionalidade: string | null;
  naturalidade: string | null;

  // contato
  email: string | null;
  telefone: string | null;
  telefone_secundario: string | null;

  // endereço antigo jsonb (vamos migrar depois)
  endereco: EnderecoPessoa | null;

  // sistema / negócios
  ativo: boolean | null;
  observacoes: string | null;
  neofin_customer_id: string | null;
  foto_url: string | null;

  // timestamps
  created_at: string | null;
  updated_at: string | null;

  // auditoria
  created_by: string | null;
  updated_by: string | null;

  // nomes resolvidos via join em profiles (opcionais)
  created_by_name?: string | null;
  updated_by_name?: string | null;
};
