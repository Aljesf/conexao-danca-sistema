// src/types/endereco.ts
export type Endereco = {
  id: number;
  logradouro: string;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string;
  uf: string;
  cep: string | null;
  referencia: string | null;
  created_at: string;
  updated_at: string | null;
};
