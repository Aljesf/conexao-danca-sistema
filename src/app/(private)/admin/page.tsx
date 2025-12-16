export default function AdminHomePage() {
  return (
    <div className="p-6 space-y-6">
      <div className="border rounded-xl bg-white shadow-sm p-4">
        <h1 className="text-2xl font-semibold">Painel de administração</h1>
        <p className="text-sm text-gray-600">
          Central do contexto <b>Administração do Sistema</b>. Use os atalhos abaixo para acessar os
          módulos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <a
          href="/admin/financeiro"
          className="border rounded-xl bg-white shadow-sm p-4 hover:bg-gray-50"
        >
          <div className="text-sm font-semibold">💰 Financeiro</div>
          <div className="text-xs text-gray-600 mt-1">
            Estrutura, movimento, contas, cartões e Crédito Conexão.
          </div>
        </a>

        <a
          href="/admin/loja/gestao-estoque"
          className="border rounded-xl bg-white shadow-sm p-4 hover:bg-gray-50"
        >
          <div className="text-sm font-semibold">🛍️ Loja (Admin)</div>
          <div className="text-xs text-gray-600 mt-1">Compras, fornecedores, estoque e cadastros.</div>
        </a>

        <a href="/admin/usuarios" className="border rounded-xl bg-white shadow-sm p-4 hover:bg-gray-50">
          <div className="text-sm font-semibold">👤 Usuários</div>
          <div className="text-xs text-gray-600 mt-1">Admins, papéis (roles) e vínculos de acesso.</div>
        </a>

        <a
          href="/admin/relatorios/auditoria"
          className="border rounded-xl bg-white shadow-sm p-4 hover:bg-gray-50"
        >
          <div className="text-sm font-semibold">🕵️ Auditoria</div>
          <div className="text-xs text-gray-600 mt-1">Logs e rastreabilidade das ações do sistema.</div>
        </a>

        <a href="/admin/config/escola" className="border rounded-xl bg-white shadow-sm p-4 hover:bg-gray-50">
          <div className="text-sm font-semibold">🏫 Configurações das unidades</div>
          <div className="text-xs text-gray-600 mt-1">Escola, Loja e Ballet Café.</div>
        </a>

        <a href="/admin/ia" className="border rounded-xl bg-white shadow-sm p-4 hover:bg-gray-50">
          <div className="text-sm font-semibold">🤖 IA</div>
          <div className="text-xs text-gray-600 mt-1">
            Painel de IA interno (assistentes e análises).
          </div>
        </a>
      </div>
    </div>
  );
}
