"use client";

import { useState } from "react";

export default function MovimentoButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* BOTÃO FLUTUANTE */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="
          fixed
          bottom-6 right-6
          z-50
          flex items-center justify-center
          h-16 w-16 rounded-full
          bg-violet-600 text-white text-3xl
          shadow-lg shadow-violet-500/40
          hover:bg-violet-700
          transition
        "
        aria-label="Ações do Movimento Conexão Dança"
      >
        💜
      </button>

      {/* MODAL / PAINEL */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm md:items-center">
          <div className="w-full max-w-3xl rounded-t-3xl bg-white p-6 shadow-xl md:rounded-3xl md:p-8">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-400">
                  Movimento Conexão Dança
                </p>
                <h2 className="text-lg font-semibold text-slate-900 md:text-xl">
                  Ações rápidas
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 hover:bg-slate-200"
              >
                Fechar
              </button>
            </div>

            {/* CARDS de ação — placeholders */}
            <div className="grid gap-3 md:grid-cols-2">
              <button className="rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 text-left hover:border-violet-200 hover:bg-violet-100">
                <div className="mb-1 text-2xl">🎓</div>
                <p className="text-sm font-semibold text-slate-800">
                  Registrar bolsa / bolsista
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Adicionar ou atualizar dados de bolsa.
                </p>
              </button>

              <button className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-left hover:border-rose-200 hover:bg-rose-100">
                <div className="mb-1 text-2xl">❤️</div>
                <p className="text-sm font-semibold text-slate-800">
                  Registrar ação social
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Registrar participação em campanhas ou doações.
                </p>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
