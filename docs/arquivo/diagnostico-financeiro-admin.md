## Páginas encontradas (Admin Financeiro)

- `/admin/financeiro` → `src/app/(private)/admin/financeiro/page.tsx` — **mock** (mockSaldos, sem fetch).
- `/admin/financeiro/contas-pagar` → `.../contas-pagar/page.tsx` — **mock/seeds** (`seedContas`, `seedCategorias`, `seedPessoas`, TODO para substituir por Supabase).
- `/admin/financeiro/contas-receber` → `.../contas-receber/page.tsx` — **mock** (`seedCobrancas`).
- `/admin/financeiro/plano-contas` → `.../plano-contas/page.tsx` — **híbrido** (tem `seedPlanoContas` como fallback, mas chama GET/POST `/api/financeiro/plano-contas`).
- `/admin/financeiro/lancamentos-manuais` → `.../lancamentos-manuais/page.tsx` — **mock** (`seedAjustes`).
- `/admin/financeiro/movimento` → `.../movimento/page.tsx` — **real** (fetch `/api/financeiro/movimento` e `/api/financeiro/centros-custo`).
- `/admin/financeiro/centros-custo` → `.../centros-custo/page.tsx` — **real** (GET/POST/PUT `/api/financeiro/centros-custo`).
- `/admin/financeiro/contas-financeiras` → `.../contas-financeiras/page.tsx` — **real** (usa `/api/financeiro/contas-financeiras` e `/centros`).
- `/admin/financeiro/categorias` → `.../categorias/page.tsx` — **real** (carrega `/api/financeiro/plano-contas` e `/api/financeiro/categorias`).
- `/admin/financeiro/formas-pagamento` → `.../formas-pagamento/page.tsx` — **real** (chama `/contas-financeiras/centros`, `/formas-pagamento/dicionario`, `/formas-pagamento`, `/cartao/maquinas/opcoes`).
- `/admin/financeiro/cartao/configuracoes` → `.../cartao/configuracoes/page.tsx` — **real** (bandeiras, máquinas, regras, contas financeiras, centros).
- `/admin/financeiro/cartao/recebiveis` → `.../cartao/recebiveis/page.tsx` — **real** (GET/POST `/api/financeiro/cartao/recebiveis`).
- `/admin/financeiro/credito-conexao/*` (configurações, contas, faturas, fatura [id]) → páginas chamam as respectivas APIs `/api/financeiro/credito-conexao/...`.
- Relatórios (`/admin/relatorios/financeiro/*`) → sem fetch detectado, parecem **placeholders**.

## APIs mapeadas (principais)

- `/api/financeiro/contas-pagar` (POST) — insere em `contas_pagar`.
- `/api/financeiro/contas-pagar/[id]` (GET) — lê `contas_pagar` + `contas_pagar_pagamentos`.
- `/api/financeiro/contas-pagar/pagar` (POST) — usa `contas_pagar`, `contas_pagar_pagamentos`, `movimento_financeiro`, e pode atualizar `loja_pedidos_compra`/`itens` (status).
- `/api/financeiro/contas-financeiras` (+ `/centros`) — CRUD em `contas_financeiras`, relaciona `centros_custo`.
- `/api/financeiro/centros-custo` — CRUD em `centros_custo`.
- `/api/financeiro/categorias`, `/categorias-despesa`, `/categorias-receita` — CRUD/lista em `categorias_financeiras`.
- `/api/financeiro/plano-contas` — CRUD em `plano_contas`.
- `/api/financeiro/movimento` (GET) — lista `movimento_financeiro` com join `centros_custo`.
- `/api/financeiro/formas-pagamento` (+ `/dicionario`) — tabela `formas_pagamento` (dicionário estático + CRUD).
- `/api/financeiro/cartao/*` — diversas tabelas de cartão (`cartao_bandeiras`, `cartao_maquinas`, `cartao_regras`, `cartao_recebiveis`) e integração com `movimento_financeiro` ao liquidar recebível.
- `/api/financeiro/credito-conexao/*` — regras de parcelamento, contas e faturas (`credito_conexao_*`), com endpoints de fechar/incluir pendências.
- `/api/cobrancas` e `/api/financeiro/cobrancas/*` — operam `cobrancas` e registram pagamentos presenciais (gera `recebimentos` e possivelmente integra com cartão/boletos via NeoFin).
- `/api/loja/diagnostico/estoque-movimentos` e `/api/loja/estoque/movimentos` não são Financeiro, mas aparecem na busca.

## Evidências de mocks/seeds

- `admin/financeiro/page.tsx`: comentário “Dados mockados”; usa `mockSaldos`.
- `admin/financeiro/contas-pagar/page.tsx`: `seedContas`, `seedCategorias`, `seedPessoas`; TODO para substituir por Supabase; alerta de pagamento “mock”.
- `admin/financeiro/contas-receber/page.tsx`: `seedCobrancas` (mock).
- `admin/financeiro/plano-contas/page.tsx`: `seedPlanoContas` como fallback.
- `admin/financeiro/lancamentos-manuais/page.tsx`: `seedAjustes` (mock).
- Relatórios `/admin/relatorios/financeiro/*`: nenhum fetch detectado (aparência de placeholder).

## Mapa UI → Endpoint → Tabelas

- `/admin/financeiro/movimento` → GET `/api/financeiro/movimento` → `movimento_financeiro` (join `centros_custo`).
- `/admin/financeiro/centros-custo` → `/api/financeiro/centros-custo` → `centros_custo`.
- `/admin/financeiro/contas-financeiras` → `/api/financeiro/contas-financeiras` + `/centros` → `contas_financeiras`, `centros_custo`.
- `/admin/financeiro/categorias` → `/api/financeiro/plano-contas`, `/api/financeiro/categorias` → `plano_contas`, `categorias_financeiras`.
- `/admin/financeiro/formas-pagamento` → `/api/financeiro/contas-financeiras/centros`, `/formas-pagamento`, `/formas-pagamento/dicionario`, `/cartao/maquinas/opcoes` → `contas_financeiras`, `formas_pagamento`, `cartao_maquinas`.
- `/admin/financeiro/cartao/recebiveis` → `/api/financeiro/cartao/recebiveis` → `cartao_recebiveis` (e insere `movimento_financeiro` ao registrar recebimento).
- `/admin/financeiro/credito-conexao/*` → `/api/financeiro/credito-conexao/...` → tabelas `credito_conexao_*` (regras, contas, faturas, lançamentos).
- `/admin/financeiro/contas-pagar` e `/contas-receber` (Admin) → **mock**; não chamam API.
- `/admin/relatorios/financeiro/*` → sem chamadas mapeadas (placeholder).

## Mapa de verdade do banco (schema)

- Contas a pagar: `contas_pagar` (campos: id, centro_custo_id, categoria_id, pessoa_id, descricao, valor_centavos, vencimento, data_pagamento, status, metodo_pagamento, observacoes, created_at, updated_at) + `contas_pagar_pagamentos` (conta_pagar_id, centro_custo_id, conta_financeira_id, valor_principal_centavos, juros_centavos, desconto_centavos, data_pagamento, metodo_pagamento, observacoes, usuario_id, created_at).
- Contas a receber: `cobrancas` (pessoa_id, descricao, valor_centavos, vencimento, status, metodo_pagamento, centro_custo_id, origem_tipo, origem_id, payloads) + `recebimentos` (cobranca_id, centro_custo_id, valor_centavos, data_pagamento, metodo_pagamento, observacoes, created_at).
- Movimento financeiro: `movimento_financeiro` (tipo, centro_custo_id, valor_centavos, data_movimento, origem, origem_id, descricao, usuario_id, created_at).

## Conclusão (real vs mock, prioridades)

- Telas críticas de operação (movimento, centros de custo, contas financeiras, categorias, formas de pagamento, cartão, crédito conexão) já consomem APIs reais.
- Telas-chave de contas a pagar/receber (Admin) ainda são **mockadas** e não usam as APIs existentes de contas_pagar/cobrancas; exigem priorização para substituir seeds e integrar Supabase.
- Relatórios financeiros em `/admin/relatorios/financeiro/*` aparentam placeholders (sem fetch).
- APIs principais estão implementadas e escrevem nas tabelas reais; destaque para `/api/financeiro/contas-pagar/pagar` que também insere em `movimento_financeiro` e atualiza pedidos de compra.
- “Contas a receber” no backend mapeia para `cobrancas` + `recebimentos`; não há UI Admin real consumindo essas tabelas ainda.
