"use client";

import Link from "next/link";

export default function AdminLojaProdutosPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-xs tracking-widest text-slate-500">LOJA (ADMIN)</div>
          <h1 className="mt-2 text-2xl font-semibold">Produtos</h1>
          <p className="mt-1 text-sm text-slate-600">
            Tela dedicada para cadastro e gestao de produtos (separada da Gestao de Estoque).
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/admin/loja/gestao-estoque"
              className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Ir para Gestao de Estoque
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">
            (Placeholder) Proximo passo: inserir o formulario completo de cadastro de produto, com categoria/subcategoria + modal.
          </p>
        </div>
      </div>
    </div>
  );
}
