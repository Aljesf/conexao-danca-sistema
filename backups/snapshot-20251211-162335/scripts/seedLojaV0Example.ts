import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Carrega variáveis de ambiente
// 1) .env (se existir)
// 2) .env.local (arquivo que você realmente está usando no projeto)
dotenv.config();
dotenv.config({ path: ".env.local" });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error(
      "❌ NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidos no ambiente. Verifique seu .env.local."
    );
    console.error("NEXT_PUBLIC_SUPABASE_URL =", url);
    console.error("SUPABASE_SERVICE_ROLE_KEY definido? ", !!serviceKey);
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey);

  console.log("🔌 Conectando ao Supabase para seed da Loja v0...");

  // 1) Criar pessoa cliente de teste
  console.log("👤 Criando pessoa CLIENTE de teste...");

  const { data: cliente, error: erroCliente } = await supabase
    .from("pessoas")
    .insert({
      nome: "Cliente Teste Loja v0",
      email: "cliente.loja+teste@exemplo.com",
      telefone: "(91) 00000-0000",
      tipo_pessoa: "FISICA",
      ativo: true,
    })
    .select("*")
    .single();

  if (erroCliente) {
    console.error("❌ Erro ao criar pessoa cliente:", erroCliente);
    process.exit(1);
  }

  console.log("✅ Cliente criado com id:", cliente.id);

  // 2) Criar pessoa fornecedor de teste
  console.log("🏢 Criando pessoa FORNECEDOR de teste...");

  const { data: fornecedorPessoa, error: erroFornecedorPessoa } = await supabase
    .from("pessoas")
    .insert({
      nome: "Fornecedor Teste Loja v0",
      nome_fantasia: "Fornecedor Teste Loja v0",
      cnpj: "00.000.000/0000-00",
      tipo_pessoa: "JURIDICA",
      ativo: true,
    })
    .select("*")
    .single();

  if (erroFornecedorPessoa) {
    console.error(
      "❌ Erro ao criar pessoa fornecedor:",
      erroFornecedorPessoa
    );
    process.exit(1);
  }

  console.log("✅ Pessoa fornecedor criada com id:", fornecedorPessoa.id);

  // 3) Marcar como fornecedor da loja
  console.log("📦 Registrando fornecedor em loja_fornecedores...");

  const { data: fornecedor, error: erroFornecedor } = await supabase
    .from("loja_fornecedores")
    .insert({
      pessoa_id: fornecedorPessoa.id,
      codigo_interno: "FORN_TESTE",
      observacoes: "Fornecedor de teste automático da Loja v0.",
      ativo: true,
    })
    .select("*")
    .single();

  if (erroFornecedor) {
    console.error("❌ Erro ao registrar fornecedor:", erroFornecedor);
    process.exit(1);
  }

  console.log("✅ Fornecedor criado com id:", fornecedor.id);

  // 4) Criar produto com preço e estoque
  console.log("🛍️ Criando produto de teste em loja_produtos...");

  const { data: produto, error: erroProduto } = await supabase
    .from("loja_produtos")
    .insert({
      codigo: "PROD_TESTE_LOJA_V0",
      nome: "Sapatilha Teste Loja v0",
      descricao: "Produto de teste criado automaticamente pelo seed.",
      categoria: "calçados",
      preco_venda_centavos: 7990, // R$ 79,90
      unidade: "PAR",
      estoque_atual: 10,
      ativo: true,
    })
    .select("*")
    .single();

  if (erroProduto) {
    console.error("❌ Erro ao criar produto:", erroProduto);
    process.exit(1);
  }

  console.log("✅ Produto criado com id:", produto.id);

  // 5) Registrar histórico de preço de custo para esse fornecedor/produto
  console.log("💰 Registrando preço de custo em loja_fornecedor_precos...");

  const { data: histPreco, error: erroHistPreco } = await supabase
    .from("loja_fornecedor_precos")
    .insert({
      fornecedor_id: fornecedor.id,
      produto_id: produto.id,
      preco_custo_centavos: 5000, // R$ 50,00
      data_referencia: new Date().toISOString().slice(0, 10),
      observacoes: "Seed automático Loja v0.",
    })
    .select("*")
    .single();

  if (erroHistPreco) {
    console.error(
      "⚠️ Erro ao registrar histórico de preço (não é fatal):",
      erroHistPreco
    );
  } else {
    console.log("✅ Histórico de preço registrado com id:", histPreco.id);
  }

  // 6) Criar uma venda simples com 1 item
  console.log("🧾 Criando venda de teste em loja_vendas + loja_venda_itens...");

  const { data: venda, error: erroVenda } = await supabase
    .from("loja_vendas")
    .insert({
      cliente_pessoa_id: cliente.id,
      tipo_venda: "VENDA",
      valor_total_centavos: 7990, // 1 unidade do produto
      desconto_centavos: 0,
      forma_pagamento: "AVISTA",
      status_pagamento: "PAGO",
      status_venda: "ATIVA",
      data_venda: new Date().toISOString(),
      observacoes: "Venda de teste criada pelo seed Loja v0.",
      observacao_vendedor: "Primeira venda gerada automaticamente.",
    })
    .select("*")
    .single();

  if (erroVenda) {
    console.error("❌ Erro ao criar venda:", erroVenda);
    process.exit(1);
  }

  console.log("✅ Venda criada com id:", venda.id);

  const { data: itemVenda, error: erroItem } = await supabase
    .from("loja_venda_itens")
    .insert({
      venda_id: venda.id,
      produto_id: produto.id,
      quantidade: 1,
      preco_unitario_centavos: 7990,
      total_centavos: 7990,
      beneficiario_pessoa_id: cliente.id,
      observacoes: "Item de teste.",
    })
    .select("*")
    .single();

  if (erroItem) {
    console.error("❌ Erro ao criar item da venda:", erroItem);
    process.exit(1);
  }

  console.log("✅ Item da venda criado com id:", itemVenda.id);

  console.log("🎉 Seed da Loja v0 concluído com sucesso!");
  console.log("➡ Cliente id:", cliente.id);
  console.log("➡ Fornecedor id:", fornecedor.id);
  console.log("➡ Produto id:", produto.id);
  console.log("➡ Venda id:", venda.id);
}

main().catch((err) => {
  console.error("❌ Erro inesperado no seed da Loja v0:", err);
  process.exit(1);
});
