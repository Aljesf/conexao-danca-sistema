"use client";

import { useMovimentoAcoesRapidas } from "@/components/movimento/useMovimentoAcoesRapidas";

export default function MovimentoButton() {
  const { openModal, Modal } = useMovimentoAcoesRapidas();

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-violet-600 text-xl text-white shadow-lg shadow-violet-500/40 transition hover:bg-violet-700"
        aria-label="Movimento Conexao Danca"
      >
        M
      </button>
      {Modal}
    </>
  );
}
