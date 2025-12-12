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

### Taxa de parcelamento (Crédito Conexão)
- Ao classificar `CREDITO_CONEXAO_FATURA`, busca a regra ativa em `credito_conexao_regras_parcelas` (tipo_conta, faixa de parcelas, valor mínimo).
- Calcula `taxa_centavos = round(valor_cobranca * (taxa_percentual/100)) + taxa_fixa_centavos`.
- Lança movimento de receita com `origem = TAXA_CREDITO_CONEXAO` usando o `centro_custo_id` da regra (ou FIN como fallback).
- O principal (valor da cobrança) segue para rateio normal; a taxa é movimento separado.

## Observações
- Certifique-se de ter o centro de custo `FIN` criado (ver `SQL/centros_custo.sql`).
- Para o rateio de LOJA, é necessário que as subcategorias estejam configuradas com `centro_custo_id`.
- Movimentos de rateio usam `origem = RATEIO_COBRANCA` e `origem_id = <cobranca_id>` para facilitar auditoria/limpeza.

### Auditoria rápida (SQL)
- Movimentos de taxa/rateio por cobrança:
  `select origem, origem_id, count(*) qtd from movimento_financeiro where origem_id = <COBRANCA_ID> and origem in ('RATEIO_COBRANCA','TAXA_CREDITO_CONEXAO') group by origem, origem_id;`
- Movimento do recebimento vinculado à cobrança:
  `select mf.* from movimento_financeiro mf join recebimentos r on r.id = mf.origem_id where mf.origem = 'RECEBIMENTO' and r.cobranca_id = <COBRANCA_ID> order by mf.id desc;`

## Regra de integridade — Crédito Conexão
- Fatura só pode ser paga se houver lançamentos vinculados (tabela `credito_conexao_fatura_lancamentos`). Sem lançamentos, o pagamento presencial retorna erro `fatura_sem_lancamentos`.
- Motivo: preservar consistência contábil e evitar recebimentos/rateios sem consumo.
- Impacto: taxa (`TAXA_CREDITO_CONEXAO`) e rateio (`RATEIO_COBRANCA`) só são gerados quando existem lançamentos; idempotência mantém movimentos se já houver classificação.

## Fechar fatura (Crédito Conexão)
- Endpoint `/api/financeiro/credito-conexao/faturas/[id]/fechar`:
  - Recalcula compras, número de parcelas e taxa de parcelamento (regra ativa em `credito_conexao_regras_parcelas`).
  - Atualiza `valor_total_centavos`, `valor_taxas_centavos`, vencimento e status da fatura (ABERTA).
  - Cria ou atualiza a cobrança (`origem_tipo = CREDITO_CONEXAO_FATURA`), respeitando `force=true` para recriar/atualizar.
- Se a fatura não tiver lançamentos (`credito_conexao_fatura_lancamentos`), bloqueia com `fatura_sem_lancamentos`.
- UI: botão “Fechar fatura” no detalhe, visível quando status ≠ PAGA; mostra erro amigável se não houver lançamentos.
