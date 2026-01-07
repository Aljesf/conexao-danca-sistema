"use client";
import PessoaSearchBox, { PessoaSearchItem } from "@/components/PessoaSearchBox";

export type PessoaOption = {
  id: number;
  nome: string;
  telefone?: string | null;
  email?: string | null;
};

type Props = {
  label: string;
  valueId: number | null;
  onChangeId: (id: number | null, pessoa?: PessoaOption | null) => void;
  placeholder?: string;
  allowCreate?: boolean;
};

export function PessoaPicker({
  label,
  valueId,
  onChangeId,
  placeholder,
  allowCreate = true,
}: Props) {
  return (
    <PessoaSearchBox
      label={label}
      placeholder={placeholder}
      valueId={valueId}
      allowCreate={allowCreate}
      onChange={(pessoa: PessoaSearchItem | null) => {
        if (!pessoa) {
          onChangeId(null, null);
          return;
        }
        onChangeId(pessoa.id, {
          id: pessoa.id,
          nome: pessoa.nome ?? "Sem nome",
          telefone: pessoa.telefone ?? null,
          email: pessoa.email ?? null,
        });
      }}
    />
  );
}
