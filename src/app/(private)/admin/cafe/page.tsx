export default function AdminCafeHomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Ballet Cafe (Admin)</h1>
          <p className="mt-1 text-sm text-slate-600">
            Area administrativa do Cafe: insumos, produtos, receitas e precos.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <a href="/admin/cafe/insumos" className="rounded-xl border bg-white p-5 shadow-sm hover:bg-slate-50">
            <div className="text-sm font-semibold">Insumos</div>
            <div className="mt-1 text-sm text-slate-600">Cadastro, abastecimento manual e movimentos.</div>
          </a>

          <a href="/admin/cafe/produtos" className="rounded-xl border bg-white p-5 shadow-sm hover:bg-slate-50">
            <div className="text-sm font-semibold">Produtos</div>
            <div className="mt-1 text-sm text-slate-600">Cardapio: produto, preco e receita.</div>
          </a>

          <a
            href="/admin/cafe/tabelas-preco"
            className="rounded-xl border bg-white p-5 shadow-sm hover:bg-slate-50"
          >
            <div className="text-sm font-semibold">Tabelas de preco</div>
            <div className="mt-1 text-sm text-slate-600">Defina precos por perfil (Aluno, Colaborador).</div>
          </a>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold">Compras de insumo</div>
            <div className="mt-1 text-sm text-slate-600">Fase futura (fora do escopo atual).</div>
          </div>
        </div>
      </div>
    </div>
  );
}
