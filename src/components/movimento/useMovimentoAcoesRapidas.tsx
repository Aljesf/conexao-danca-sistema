"use client";

import { useCallback, useState } from "react";
import { MovimentoAcoesRapidasModal } from "@/components/movimento/MovimentoAcoesRapidasModal";

type PessoaSugestao = { id: string; label: string };

type PessoaApiItem = {
  id: number;
  nome?: string | null;
  razao_social?: string | null;
  nome_fantasia?: string | null;
  cpf?: string | null;
  cnpj?: string | null;
  email?: string | null;
};

function buildPessoaLabel(pessoa: PessoaApiItem): string {
  const primary = pessoa.nome ?? pessoa.razao_social ?? pessoa.nome_fantasia ?? "";
  const secondary = pessoa.email ?? pessoa.cpf ?? pessoa.cnpj ?? "";
  const label = [primary, secondary].filter((value) => Boolean(value)).join(" - ");
  return label || `#${pessoa.id}`;
}

async function searchPessoasDefault(term: string): Promise<PessoaSugestao[]> {
  const query = term.trim();
  if (!query || query.length < 2) return [];

  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { method: "GET" });
    if (!res.ok) return [];

    const json = (await res.json().catch(() => ({}))) as
      | { ok?: boolean; pessoas?: PessoaApiItem[] }
      | null;
    if (!json?.ok) return [];
    const pessoas = Array.isArray(json.pessoas) ? json.pessoas : [];

    return pessoas.map((pessoa) => ({
      id: String(pessoa.id),
      label: buildPessoaLabel(pessoa),
    }));
  } catch {
    return [];
  }
}

export function useMovimentoAcoesRapidas() {
  const [open, setOpen] = useState(false);

  const openModal = useCallback(() => setOpen(true), []);
  const closeModal = useCallback(() => setOpen(false), []);

  const Modal = (
    <MovimentoAcoesRapidasModal
      open={open}
      onClose={closeModal}
      searchPessoas={searchPessoasDefault}
    />
  );

  return { openModal, closeModal, Modal };
}
