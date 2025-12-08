import "dotenv/config";
import { execSync } from "child_process";

async function run() {
  const BASE = "http://localhost:3000";

  console.log("=== 1) Rodando migrations (supabase db push) ===\n");

  try {
    execSync("supabase db push", { stdio: "inherit" });
    console.log("\n✔ Migration executada.\n");
  } catch (err) {
    console.error("❌ Erro ao rodar migration (supabase db push):", err);
    process.exit(1);
  }

  console.log("=== 2) Criando vendas automáticas via API ===\n");

  // ATENÇÃO: ajuste estes IDs conforme os registros reais do ambiente:
  // - cliente_pessoa_id: precisa existir em public.pessoas
  // - produto_id: precisa existir em public.loja_produtos
  const venda1 = {
    cliente_pessoa_id: 1,
    tipo_venda: "VENDA",
    forma_pagamento: "AVISTA",
    status_pagamento: "PAGO",
    observacoes: "Venda automática teste 1",
    itens: [
      {
        produto_id: 1,
        quantidade: 1,
        preco_unitario_centavos: 9000,
        beneficiario_pessoa_id: 1,
        observacoes: "Item teste 1",
      },
    ],
  };

  const venda2 = {
    cliente_pessoa_id: 1,
    tipo_venda: "CREDIARIO_INTERNO",
    forma_pagamento: "CREDIARIO_INTERNO",
    status_pagamento: "PENDENTE",
    data_vencimento: "2025-12-30",
    observacoes: "Venda automática teste 2 (crediário interno)",
    itens: [
      {
        produto_id: 1,
        quantidade: 2,
        preco_unitario_centavos: 5000,
        beneficiario_pessoa_id: 1,
      },
    ],
  };

  async function criarVenda(payload: any) {
    const res = await fetch(`${BASE}/api/loja/vendas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    console.log("Resposta da criação de venda:");
    console.log(json);

    if (!res.ok || !json.ok) {
      console.error("❌ Erro ao criar venda:", json.error);
      process.exit(1);
    }

    return json.data.id as number;
  }

  const id1 = await criarVenda(venda1);
  const id2 = await criarVenda(venda2);

  console.log(`\n✔ Vendas criadas com IDs: ${id1}, ${id2}`);

  console.log("\n=== 3) Testando GET /api/loja/vendas ===");
  const listaRes = await fetch(`${BASE}/api/loja/vendas`);
  const lista = await listaRes.json();
  console.log(lista);

  console.log(`\n=== 4) Testando GET /api/loja/vendas/${id1} ===`);
  const det1 = await fetch(`${BASE}/api/loja/vendas/${id1}`);
  console.log(await det1.json());

  console.log(`\n=== 5) Testando GET /api/loja/vendas/${id2} ===`);
  const det2 = await fetch(`${BASE}/api/loja/vendas/${id2}`);
  console.log(await det2.json());

  console.log("\n=== ✔ Testes concluídos com sucesso. ===\n");
}

run().catch((err) => {
  console.error("❌ ERRO INESPERADO:", err);
  process.exit(1);
});
