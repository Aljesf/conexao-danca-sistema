import "dotenv/config";

async function main() {
  const BASE = "http://localhost:3000";

  const payload = {
    cliente_pessoa_id: 1,
    tipo_venda: "VENDA",
    forma_pagamento: "AVISTA",
    status_pagamento: "PAGO",
    observacoes: "Teste rápido de venda",
    itens: [
      {
        produto_id: 1,
        quantidade: 1,
        preco_unitario_centavos: 1000,
        beneficiario_pessoa_id: 1
      }
    ]
  };

  console.log("Enviando venda de teste...");
  const res = await fetch(`${BASE}/api/loja/vendas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const json = await res.json();
  console.log("Resposta:");
  console.log(json);
}

main().catch((err) => console.error(err));
