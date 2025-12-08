# 📘 Estado Atual do Módulo — Loja v0 (AJ Dance Store)
Snapshot: 2025-12-07  
Fonte principal: schema-supabase.sql (estado real do banco) + código atual (`src/app/api/loja/**`, `src/app/(private)/loja/**`, `src/app/(private)/administracao/loja/**`)  
Observação: este documento descreve a implementação **real** da Loja v0; o arquivo `docs/modelo-loja-v0.md` permanece como referência histórica.

## 1. Contexto geral
Loja v0 é a implementação provisória para a AJ Dance Store, focada em:
- Catálogo de produtos e fornecedores.
- Vendas simples (à vista e crediário interno), com itens e beneficiário por item.
- Entradas/ajustes de estoque básicos.
- Pedidos de compra para fornecedores (com recebimentos parciais).
- Integração financeira inicial (contas a pagar/receber) em evolução.
O modelo conceitual do v0 foi superado por evoluções no código e no schema; a realidade atual é a referência oficial.

## 2. Tabelas de banco relacionadas à Loja (estado real)
- **public.loja_produtos**  
  Campos principais: `id`, `codigo`, `nome`, `descricao`, `categoria`, `preco_venda_centavos`, `unidade`, `estoque_atual`, `ativo`, `observacoes`, timestamps. Pode incluir `fornecedor_principal_id` (opcional) e datas de criação/atualização; usada em vendas, estoque e compras.

- **public.loja_fornecedores**  
  `id`, `pessoa_id` (FK pessoas), `codigo_interno`, `ativo`, `observacoes`, timestamps.  
  Auxiliar: **public.loja_fornecedor_precos** (histórico de preços de custo por fornecedor/produto).

- **public.loja_vendas**  
  Cabeçalho de vendas: `id`, `cliente_pessoa_id`, `tipo_venda` (VENDA/CREDIARIO_INTERNO/ENTREGA_FIGURINO), `valor_total_centavos`, `desconto_centavos`, `forma_pagamento`, `status_pagamento`, `status_venda`, datas (venda, vencimento, cancelamento), observações, `vendedor_user_id`, `cobranca_id` (integração financeira), timestamps.
  Itens em **public.loja_venda_itens**: `id`, `venda_id`, `produto_id`, `quantidade`, `preco_unitario_centavos`, `total_centavos`, `beneficiario_pessoa_id`, `observacoes`.

- **public.loja_estoque_movimentos** (quando existente no schema atual)  
  Movimentos de estoque: `produto_id`, `tipo` (ENTRADA/SAIDA/AJUSTE), `quantidade`, `origem` (VENDA/CANCELAMENTO_VENDA/COMPRA/AJUSTE_MANUAL), `referencia_id`, `observacao`, `created_by`, `created_at`.

- **public.loja_pedidos_compra** (compras)  
  Cabeçalho: `id`, `fornecedor_id` (loja_fornecedores), `data_pedido`, `status` (RASCUNHO/EM_ANDAMENTO/PARCIAL/CONCLUIDO/CANCELADO), `valor_estimado_centavos`, `observacoes`, timestamps, `created_by`, `updated_by`, possivelmente `conta_pagar_id`.
  Itens: **public.loja_pedidos_compra_itens** (`pedido_id`, `produto_id`, `quantidade_solicitada`, `quantidade_recebida`, `preco_custo_centavos`, `observacoes`).
  Recebimentos: **public.loja_pedidos_compra_recebimentos** (`pedido_id`, `item_id`, `produto_id`, `quantidade_recebida`, `preco_custo_centavos`, `data_recebimento`, `observacao`, `created_by`, `created_at`).

### Integrações financeiras (estado atual)
- `loja_vendas.cobranca_id` referencia `cobrancas` (contas a receber) para crediário ou vendas à vista integradas.
- Compras podem preencher `conta_pagar_id` e gerar/atualizar `contas_pagar` / `contas_pagar_pagamentos` (pagamentos via módulo financeiro).
- Movimento financeiro/recebimentos: dependem do fluxo implementado nas rotas `/api/loja/vendas` e `/api/financeiro/contas-pagar/pagar`.

## 3. Rotas API reais do módulo Loja (principais)
- `/api/loja/produtos` (GET/POST/PUT): listar/criar/atualizar produtos; suporta filtros de busca/ativo; aceita preço em centavos e opcional fornecedor principal.
- `/api/loja/fornecedores` (GET/POST/PUT): listar fornecedores (join com pessoas), criar/atualizar fornecedor.
- `/api/loja/estoque/entrada` (POST): entrada de estoque (novo produto ou reposição), opcional registro de custo por fornecedor.
- `/api/loja/estoque` e `/api/loja/estoque/movimentos` (se presentes): listar saldo e movimentos.
- `/api/loja/vendas` (GET/POST): listar vendas com filtros; criar venda (cabeçalho + itens, beneficiário por item, crediário interno cria cobrança).
- `/api/loja/vendas/[id]` (GET): detalhe da venda com itens/beneficiários; (POST/PUT para cancelamento, se implementado).
- `/api/loja/compras` (GET/POST): listar pedidos de compra; criar novo pedido (fornecedor + itens).
- `/api/loja/compras/[id]` (GET/POST): detalhe do pedido; registrar recebimentos (atualiza estoque e contas a pagar quando habilitado).
- `/api/loja/produtos/custo` ou fluxos equivalentes: registrar custo por fornecedor (quando chamado por estoque/recebimentos).
- `/api/loja/debug/**`: rotas de teste (se existirem) para criação de vendas de debug.

## 4. Páginas reais (rotas Next.js)
- Operação Loja (`src/app/(private)/loja/**`):
  - `/loja/caixa`: frente de caixa (comprador, beneficiário por item, pagamento/crediário, integração com `/api/loja/vendas`).
  - `/loja/produtos`: visão de consulta/gestão simples de produtos (exibe estoque e preços).
  - `/loja/estoque`: visão de estoque (saldo, movimentos; quando implementada).
  - `/loja/vendas`: lista histórico de vendas; `/loja/vendas/[id]`: detalhe/recibo.
  - `/loja/fornecedores`: consulta de fornecedores (somente leitura para equipe da loja).
  - Outras rotas previstas: pedidos escola/externos/trocas (placeholders, se presentes).

- Administração Loja (`src/app/(private)/administracao/loja/**`):
  - `/administracao/loja/gestao-estoque`: gestão completa de produtos (preço, custo, fornecedor, datas, estoque).
  - `/administracao/loja/compras` e `/administracao/loja/compras/[id]`: pedidos de compra, recebimentos, pagamentos (contas a pagar).
  - `/administracao/loja/fornecedores`: cadastro/edição de fornecedores (ligação a pessoas).
  - Outras páginas administrativas podem existir conforme contexto (configurações da loja, relatórios internos).

## 5. Integração atual com Financeiro
- Vendas: crediário interno gera cobrança (`cobrancas`) e pode integrar com recebimentos; vendas à vista podem registrar cobrança/recebimento pago, dependendo da rota.
- Compras: recebimentos podem criar/atualizar `contas_pagar` (centro de custo LOJA, categoria de compra de mercadoria) e registrar pagamentos via `/api/financeiro/contas-pagar/pagar`, gerando `movimento_financeiro` como despesa.
- Estoque: movimentos de venda/cancelamento/recebimento registram `loja_estoque_movimentos` e atualizam `estoque_atual`.

## 6. Limitações e pendências conhecidas (v0)
- Fluxos financeiros ainda parciais em alguns endpoints (nem todas as vendas/recebimentos criam movimentos financeiros completos).
- Rotas de pedidos externos/trocas/relatórios podem estar como placeholders.
- Integração de estoque pode não estar presente em todas as operações (validar `loja_estoque_movimentos` no ambiente).
- Documentos conceituais (`modelo-loja-v0.md`) estão defasados frente ao código; não usar como fonte única.

## 7. Próximos passos recomendados
- Consolidar integração financeira completa (cobranças/recebimentos para vendas; contas a pagar/pagamentos para compras).
+- Garantir consistência de estoque (entradas/saídas/cancelamentos) e exibir saldo confiável.
%- Refinar relatórios (vendas, estoque, compras, fornecedores) e alinhar com centros de custo/categorias financeiras.
%- Revisar UX do caixa e do admin de compras/estoque para a Loja v1.
%- Atualizar documentação sempre que tabelas ou rotas da Loja mudarem; este arquivo é a fonte oficial do estado atual.
