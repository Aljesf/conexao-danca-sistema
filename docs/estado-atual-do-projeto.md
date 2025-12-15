# Estado atual do projeto - Financeiro e rateio

## Dashboard financeiro (Admin)
- Tela `/admin/financeiro` agora usa dados reais via `GET /api/financeiro/dashboard` (sem mocks).
- Endpoint consolida: `pagar_pendente` (contas_pagar status != PAGO), `receber_pendente` (cobrancas status != RECEBIDO/PAGO) e `saldo_periodo` (entradas/receitas - saidas/despesas de movimento_financeiro).
- Filtros aceitos: `data_inicio`, `data_fim`, `centro_custo_id`. Resumo por centro carrega nomes/codigos de `centros_custo` quando disponiveis.
- Fontes de dados: tabelas `contas_pagar`, `cobrancas`, `movimento_financeiro` e `centros_custo`.

## Dashboard financeiro inteligente
- Nova tela `/admin/financeiro` consome `GET /api/financeiro/dashboard-inteligente` (snapshot do dia, sem mocks).
- Endpoints: `GET /api/financeiro/dashboard-inteligente`, `POST /api/financeiro/dashboard-inteligente/reanalisar`, `POST /api/financeiro/dashboard-inteligente/cron-diario`, `GET /api/financeiro/dashboard-inteligente/historico`.
- Tabelas novas: `financeiro_snapshots` (consolidado diario, tendencia, serie, alertas) e `financeiro_analises_gpt` (ate 3 alertas + texto curto).
- Regras de calculo: caixa_hoje = sum movimentos ate hoje; entradas_30d = cobrancas pendentes por vencimento; saidas_30d = contas_pagar pendentes por vencimento; folego = caixa/(saidas/30); tendencia compara janela 30d atual vs anterior; serie 90d historico + 30d futuro; alertas simples (folego<10, saidas +20%, entradas -20%).
- Segurança: payload enviado ao GPT e restrito ao snapshot enxuto (sem dados pessoais); se OPENAI_API_KEY ausente, apenas alertas calculados sao retornados.

## Contas a pagar (Admin)
- Tela `/admin/financeiro/contas-pagar` usa dados reais via `GET /api/financeiro/contas-pagar` (sem seeds).
- Registro de pagamento via `POST /api/financeiro/contas-pagar/pagar` insere em `contas_pagar_pagamentos`, cria `movimento_financeiro` (DESPESA) e atualiza status/saldo.
- Detalhe via `GET /api/financeiro/contas-pagar/[id]` retorna pagamentos, `total_pago_centavos` e `saldo_centavos` (`saldo = max(valor_centavos - sum(principal+juros-desconto), 0)`).
- Ordenação: vencimento asc, id desc; filtros: status, centro_custo_id, categoria_id, pessoa_id, data_inicio/data_fim (vencimento).

## Contas a receber (Admin)
- Tela `/admin/financeiro/contas-receber` consome `GET /api/financeiro/contas-receber`.
- Registro de recebimento via `POST /api/financeiro/contas-receber/receber` insere em `recebimentos`, cria `movimento_financeiro` (ENTRADA origem=COBRANCA) e seta status RECEBIDO quando saldo zera.
- Cálculo: `total_recebido_centavos = sum(recebimentos.valor_centavos)`; `saldo_centavos = max(valor_centavos - total_recebido_centavos, 0)`; ordenação por vencimento asc, id desc; filtros: status, centro_custo_id, pessoa_id, data_inicio/data_fim.

## Centros de custo
- **FIN (Intermediacao Financeira)** - ponto central para registrar recebimentos quando a cobranca nao tem centro definido.
- **ESC / CAF** - usados como destino direto para cobrancas de origem ESCOLA ou CAFE (quando configurados).

## Fluxo de pagamento presencial (cobrancas)
1. Endpoint `POST /api/financeiro/cobrancas/registrar-pagamento-presencial`:
   - Autentica usuario.
   - Se `cobrancas.centro_custo_id` estiver vazio, busca automaticamente o centro `FIN`.
   - Marca a cobranca como `PAGO`, cria `recebimentos` com o centro de custo escolhido e registra `movimento_financeiro` de receita.
   - Envia baixa para a Neofin (quando ha `neofin_charge_id`), sem reverter em caso de falha.
   - Dispara `processarClassificacaoFinanceira` para ratear o valor.

## Rateio financeiro (processarClassificacaoFinanceira)
- Entrada: cobranca paga (id, valor, origem_tipo/origem_id, data_pagamento).
- Limpa movimentos de rateio anteriores (`movimento_financeiro` com `origem = RATEIO_COBRANCA`).
- Regras:
  - **CREDITO_CONEXAO_FATURA**: nao gera movimento final (somente FIN).
  - **ESCOLA**: cria receita para centro `ESC` (codigo).
  - **CAFE**: cria receita para centro `CAF` (codigo).
  - **LOJA_VENDA**: busca itens da venda, identifica subcategorias (`loja_produto_categoria_subcategoria`) e soma por `centro_custo_id` da subcategoria; cria receitas de rateio por centro.
  - Demais origens: nenhum rateio e criado.

### Taxa de parcelamento (Credito Conexao)
- Ao classificar `CREDITO_CONEXAO_FATURA`, busca a regra ativa em `credito_conexao_regras_parcelas` (tipo_conta, faixa de parcelas, valor minimo).
- Calcula `taxa_centavos = round(valor_cobranca * (taxa_percentual/100)) + taxa_fixa_centavos`.
- Lanca movimento de receita com `origem = TAXA_CREDITO_CONEXAO` usando o `centro_custo_id` da regra (ou FIN como fallback).
- O principal (valor da cobranca) segue para rateio normal; a taxa e movimento separado.

## Observacoes
- Certifique-se de ter o centro de custo `FIN` criado (ver `SQL/centros_custo.sql`).
- Para o rateio de LOJA, e necessario que as subcategorias estejam configuradas com `centro_custo_id`.
- Movimentos de rateio usam `origem = RATEIO_COBRANCA` e `origem_id = <cobranca_id>` para facilitar auditoria/limpeza.

### Auditoria rapida (SQL)
- Movimentos de taxa/rateio por cobranca:
  `select origem, origem_id, count(*) qtd from movimento_financeiro where origem_id = <COBRANCA_ID> and origem in ('RATEIO_COBRANCA','TAXA_CREDITO_CONEXAO') group by origem, origem_id;`
- Movimento do recebimento vinculado a cobranca:
  `select mf.* from movimento_financeiro mf join recebimentos r on r.id = mf.origem_id where mf.origem = 'RECEBIMENTO' and r.cobranca_id = <COBRANCA_ID> order by mf.id desc;`

## Regra de integridade - Credito Conexao
- Fatura so pode ser paga se houver lancamentos vinculados (tabela `credito_conexao_fatura_lancamentos`). Sem lancamentos, o pagamento presencial retorna erro `fatura_sem_lancamentos`.
- Motivo: preservar consistencia contabil e evitar recebimentos/rateios sem consumo.
- Impacto: taxa (`TAXA_CREDITO_CONEXAO`) e rateio (`RATEIO_COBRANCA`) so sao gerados quando existem lancamentos; idempotencia mantem movimentos se ja houver classificacao.

## Fechar fatura (Credito Conexao)
- Endpoint `/api/financeiro/credito-conexao/faturas/[id]/fechar`:
  - Recalcula compras, numero de parcelas e taxa de parcelamento (regra ativa em `credito_conexao_regras_parcelas`).
  - Atualiza `valor_total_centavos`, `valor_taxas_centavos`, vencimento e status da fatura (ABERTA).
  - Cria ou atualiza a cobranca (`origem_tipo = CREDITO_CONEXAO_FATURA`), respeitando `force=true` para recriar/atualizar.
- Se a fatura nao tiver lancamentos (`credito_conexao_fatura_lancamentos`), bloqueia com `fatura_sem_lancamentos`.
- UI: botao "Fechar fatura" no detalhe, visivel quando status e PAGA; mostra erro amigavel se nao houver lancamentos.

## Venda com Cartao Conexao (Loja)
- Forma de pagamento base `CARTAO_CONEXAO` exige `conta_conexao_id` e `numero_parcelas` no payload.
- Ao finalizar a venda, cria/atualiza um registro em `credito_conexao_lancamentos` (`origem_sistema = LOJA`, `origem_id = venda.id`) com status `PENDENTE_FATURA`.
- Nao cria cobranca/recebimento no ato; o valor sera faturado posteriormente.

## Incluir pendencias na fatura
- Endpoint `/api/financeiro/credito-conexao/faturas/incluir-pendencias` cria (se necessario) a fatura do periodo e move lancamentos `PENDENTE_FATURA` (origem LOJA por padrao) para ela, marcando-os como `FATURADO`.
- Recalcula `valor_total_centavos` da fatura apenas com as compras (taxa segue no fechar).
- Botao "Incluir pendencias" disponivel na lista de faturas (Admin) para disparar o processo por conta.
