# Estado atual do projeto — Financeiro e rateio

## Centros de custo
- **FIN (Intermediação Financeira)** — ponto central para registrar recebimentos quando a cobrança não tem centro definido.
- **ESC / CAF** — usados como destino direto para cobranças de origem ESCOLA ou CAFE (quando configurados).

## Fluxo de pagamento presencial (cobranças)
1. Endpoint `POST /api/financeiro/cobrancas/registrar-pagamento-presencial`:
   - Autentica usuário.
   - Se `cobrancas.centro_custo_id` estiver vazio, busca automaticamente o centro `FIN`.
   - Marca a cobrança como `PAGO`, cria `recebimentos` com o centro de custo escolhido e registra `movimento_financeiro` de receita.
   - Envia baixa para a Neofin (quando há `neofin_charge_id`), sem reverter em caso de falha.
   - Dispara `processarClassificacaoFinanceira` para ratear o valor.

## Rateio financeiro (processarClassificacaoFinanceira)
- Entrada: cobrança paga (id, valor, origem_tipo/origem_id, data_pagamento).
- Limpa movimentos de rateio anteriores (`movimento_financeiro` com `origem = RATEIO_COBRANCA`).
- Regras:
  - **CREDITO_CONEXAO_FATURA**: não gera movimento final (somente FIN).
  - **ESCOLA**: cria receita para centro `ESC` (código).
  - **CAFE**: cria receita para centro `CAF` (código).
  - **LOJA_VENDA**: busca itens da venda, identifica subcategorias (`loja_produto_categoria_subcategoria`) e soma por `centro_custo_id` da subcategoria; cria receitas de rateio por centro.
  - Demais origens: nenhum rateio é criado.

## Observações
- Certifique-se de ter o centro de custo `FIN` criado (ver `SQL/centros_custo.sql`).
- Para o rateio de LOJA, é necessário que as subcategorias estejam configuradas com `centro_custo_id`.
- Movimentos de rateio usam `origem = RATEIO_COBRANCA` e `origem_id = <cobranca_id>` para facilitar auditoria/limpeza.
