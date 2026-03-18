# Mapa tecnico - cobrancas e conta interna

Data: 2026-03-18

## Visao geral

Este diagnostico cobre as leituras reais usadas por:

- fila de cobranca vencida
- modal/lista "Ver titulos"
- painel financeiro da pessoa/aluno
- auditoria da cobranca

A montagem semantica da origem agora fica centralizada em:

- `src/lib/financeiro/contas-receber-auditoria.ts`
- `src/lib/financeiro/cobranca-origem-canonica.ts`

O fallback de label segue esta ordem:

1. `origem_label` salvo em `public.cobrancas`
2. label montada pelos campos canonicos
3. descricao legada / label herdada
4. `Origem em revisao`

## 1. Fila de cobranca vencida

- Arquivo da rota: `src/app/api/financeiro/contas-a-receber/route.ts`
- Nome da rota: `GET /api/financeiro/contas-a-receber`
- Tela consumidora: `src/app/(private)/admin/financeiro/contas-receber/page.tsx`
- Fonte principal: `listarContasReceberAuditoria()` em `src/lib/financeiro/contas-receber-auditoria.ts`

### Payload retornado

- `resumo`
- `top_devedores`
- `devedores_lista`
- `metricas_visao`
- `contextos_visao`
- `ranking_principal`
- `cobrancas_lista`
- `detalhe_cobranca`
- `composicao_fatura_conexao`
- `perdas_cancelamento`
- `paginacao`
- `filtros_aplicados`

### Onde a origem e montada

- A rota delega para `listarContasReceberAuditoria()`
- `buildItem()` em `src/lib/financeiro/contas-receber-auditoria.ts` monta os campos canonicos por cobranca
- `buildCanonicalOriginDisplay()` em `src/lib/financeiro/cobranca-origem-canonica.ts` decide:
  - label principal
  - label secundaria
  - label tecnica
  - badge de migracao

### O que a UI recebe

- Origem crua:
  - `origem_tipo`
  - `origem_subtipo`
  - `origem_id`
- Origem formatada:
  - `origem_label`
  - `origem_secundaria`
  - `origem_tecnica`
- Label tecnica:
  - `origem_tecnica`
- Label humana:
  - `origem_label`
- Campos canonicos novos:
  - `origem_agrupador_tipo`
  - `origem_agrupador_id`
  - `origem_item_tipo`
  - `origem_item_id`
  - `conta_interna_id`
  - `migracao_conta_interna_status`
  - aliases camelCase equivalentes

## 2. Modal "Ver titulos"

- Arquivo da rota: `src/app/api/financeiro/contas-a-receber/vencidas/por-pessoa/route.ts`
- Nome da rota: `GET /api/financeiro/contas-a-receber/vencidas/por-pessoa?pessoa_id=...`
- Tela consumidora: `src/app/(private)/admin/financeiro/contas-receber/page.tsx`
- Fonte principal: `listarTitulosVencidosPorPessoa()` em `src/lib/financeiro/contas-receber-auditoria.ts`

### Payload retornado

- `ok`
- `pessoa_id`
- `titulos[]`, com:
  - `cobranca_id`
  - `pessoa_id`
  - `vencimento`
  - `dias_atraso`
  - `valor_centavos`
  - `saldo_aberto_centavos`
  - `origem_tipo`
  - `origem_id`
  - `status_cobranca`
  - `bucket_vencimento`
  - `situacao_saas`
  - `origem_label`
  - `origem_secundaria`
  - `origem_tecnica`
  - `origem_badge_label`
  - `origem_badge_tone`
  - `origemAgrupadorTipo`
  - `origemAgrupadorId`
  - `origemItemTipo`
  - `origemItemId`
  - `contaInternaId`
  - `origemLabel`
  - `migracaoContaInternaStatus`

### Onde a origem e montada

- Os itens ja chegam prontos de `listarTitulosVencidosPorPessoa()`
- A rota apenas repassa os campos para JSON sem quebrar os legados

### O que a UI recebe

- Origem crua: sim
- Origem formatada: sim
- Label tecnica: sim
- Label humana: sim

## 3. Painel financeiro da pessoa/aluno

- Arquivo da rota: `src/app/api/pessoas/[id]/resumo-financeiro/route.ts`
- Nome da rota: `GET /api/pessoas/[id]/resumo-financeiro`
- Tela consumidora: `src/components/pessoas/PessoaResumoFinanceiro.tsx`
- Pagina consumidora: `src/app/(private)/pessoas/[id]/page.tsx`

### Payload retornado

- `pessoa_id`
- `responsavel_financeiro_id`
- `responsavel_financeiro`
- `cobrancas` (legado resumido)
- `cobrancas_canceladas_expurgaveis`
- `cobrancas_matricula` (compatibilidade)
- `cobrancas_canonicas`
- `faturas_credito_conexao`
- `agregados`

### Onde a origem e montada

- A rota chama `listarCobrancasEmAbertoPorPessoa()`
- O array `cobrancas_canonicas` nasce do mesmo `buildItem()` usado pela fila principal
- A montagem semantica nao fica na UI; a UI apenas escolhe prioridade de exibicao

### O que a UI recebe

- Origem crua: sim
- Origem formatada: sim, em `cobrancas_canonicas`
- Label tecnica: sim
- Label humana: sim

## 4. Auditoria da cobranca

### Modal de auditoria na fila

- Arquivo da rota: `src/app/api/financeiro/contas-a-receber/route.ts`
- Nome da rota: `GET /api/financeiro/contas-a-receber?...&detalhe_cobranca_id=...`
- Tela consumidora: `src/components/financeiro/contas-receber/CobrancaAuditDetail.tsx`

#### Payload retornado

- `detalhe_cobranca`, com:
  - `pessoa`
  - `cobranca`
  - `contexto_principal`
  - `origem_detalhada`
  - `origem_label`
  - `centro_custo`
  - `documento_vinculado`
  - `trilha_auditavel`
  - `composicao_fatura_conexao`

#### Onde a origem e montada

- `buildDetalhe()` em `src/lib/financeiro/contas-receber-auditoria.ts`
- O objeto `cobranca` replica os novos campos canonicos e os legados

#### O que a UI recebe

- Origem crua: sim
- Origem formatada: sim
- Label tecnica: sim
- Label humana: sim

### Pagina dedicada da cobranca

- Arquivo da pagina: `src/app/(private)/financeiro/cobrancas/[id]/page.tsx`
- Rota da pagina: `/financeiro/cobrancas/[id]`
- Observacao: nao usa rota HTTP interna; consulta Supabase direto no server component

#### Onde a origem e montada

- A pagina consulta `public.cobrancas`
- Quando os campos canonicos ainda nao existem no banco, ha fallback para o select legado
- Depois a pagina usa `buildCanonicalOriginDisplay()` para montar a apresentacao semantica

#### O que a UI recebe

- Origem crua: sim, exibida apenas em metadados
- Origem formatada: sim
- Label tecnica: sim
- Label humana: sim

## Conclusao

As leituras de fila vencida, modal de titulos e painel financeiro agora compartilham a mesma camada canonica. A pagina dedicada de auditoria continua fora da API, mas passou a usar a mesma regra semantica de exibicao e fallback.
