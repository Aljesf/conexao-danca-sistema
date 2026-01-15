"use client";

import { useCallback, useState } from "react";
import { MovimentoAcoesRapidasModal } from "@/components/movimento/MovimentoAcoesRapidasModal";

type PessoaSugestao = { id: string; label: string };

type PessoaApiItem = {
  id: number;
  nome?: string | null;
  cpf?: string | null;
  email?: string | null;
  telefone?: string | null;
};

function buildPessoaLabel(pessoa: PessoaApiItem): string {
  const parts = [pessoa.nome ?? "", pessoa.cpf ?? "", pessoa.email ?? "", pessoa.telefone ?? ""];
  const label = parts.filter((value) => Boolean(value)).join(" - ");
  return label || `#${pessoa.id}`;
}

async function searchPessoasDefault(term: string): Promise<PessoaSugestao[]> {
  const query = term.trim();
  if (!query) return [];

  try {
    const res = await fetch(`/api/pessoas?search=${encodeURIComponent(query)}`, {
      method: "GET",
    });
    if (!res.ok) return [];

    const json = (await res.json().catch(() => ({}))) as { pessoas?: PessoaApiItem[] };
    const pessoas = Array.isArray(json?.pessoas) ? json.pessoas : [];

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
