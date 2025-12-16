export default function LojaHomePage() {
  return (
    <div className="p-6 space-y-6">
      <div className="border rounded-xl bg-white shadow-sm p-4">
        <h1 className="text-2xl font-semibold">AJ Dance Store — Início</h1>
        <p className="text-sm text-gray-600">
          Painel operacional da Loja. Use os atalhos abaixo e siga as orientações internas.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <a href="/loja/caixa" className="border rounded-xl bg-white shadow-sm p-4 hover:bg-gray-50">
          <div className="text-sm font-semibold">💳 Frente de caixa</div>
          <div className="text-xs text-gray-600 mt-1">Registrar vendas e recebimentos.</div>
        </a>

        <a
          href="/loja/produtos"
          className="border rounded-xl bg-white shadow-sm p-4 hover:bg-gray-50"
        >
          <div className="text-sm font-semibold">🏷️ Produtos</div>
          <div className="text-xs text-gray-600 mt-1">Consultar e manter catálogo (Loja v0).</div>
        </a>

        <a
          href="/loja/estoque"
          className="border rounded-xl bg-white shadow-sm p-4 hover:bg-gray-50"
        >
          <div className="text-sm font-semibold">📦 Estoque</div>
          <div className="text-xs text-gray-600 mt-1">Saldo, movimentos e ajustes manuais.</div>
        </a>

        <a
          href="/loja/fornecedores"
          className="border rounded-xl bg-white shadow-sm p-4 hover:bg-gray-50"
        >
          <div className="text-sm font-semibold">🚚 Fornecedores</div>
          <div className="text-xs text-gray-600 mt-1">Consulta e cadastro (quando habilitado).</div>
        </a>
      </div>

      <div className="border rounded-xl bg-white shadow-sm p-4 space-y-2">
        <div className="font-semibold">📌 Política rápida (para quem opera a loja)</div>
        <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
          <li>Confirmar comprador (quem paga) e beneficiário (quem usa) em cada item.</li>
          <li>Conferir forma de pagamento e, em cartão, selecionar maquininha/bandeira/parcelas.</li>
          <li>Antes de finalizar, revisar total e observações.</li>
          <li>Evitar “ajustes de estoque” sem justificativa: ajustes devem ser rastreáveis.</li>
        </ul>
      </div>
    </div>
  );
}
