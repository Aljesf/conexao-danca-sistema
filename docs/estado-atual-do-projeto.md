# Módulo atual

Financeiro — Contas a Receber (Refatoração SaaS + Auditoria + Expurgo)

# SQL concluído

- Criação de migration de suporte ao expurgo lógico:
  - `cobrancas.expurgada`
  - `cobrancas.expurgada_em`
  - `cobrancas.expurgada_por`
  - `cobrancas.expurgo_motivo`
- Script diagnóstico de auditoria financeira:
  - `20260317_contas_receber_auditoria_contextos.sql`

# APIs concluídas

- Refatoração da API principal:
  - `/api/financeiro/contas-a-receber`
  - Payload unificado com:
    - resumo
    - devedores
    - cobranças
    - auditoria
    - composição de fatura
    - perdas por cancelamento

- Novas APIs:
  - `POST /api/financeiro/cobrancas/expurgar`
  - `POST /api/financeiro/cobrancas/expurgar-lote`
  - Suporte a expurgo lógico com auditoria unitária e em lote

- API de resumo financeiro da pessoa ajustada:
  - `/api/pessoas/[id]/resumo-financeiro`
  - Suporte a leitura de cobranças canceladas elegíveis a expurgo

# Páginas / componentes concluídos

Página principal:
- `/admin/financeiro/contas-receber`

Páginas e navegação relacionadas:
- `/pessoas/[id]?aba=financeiro`

Componentes criados/refatorados:
- `DevedoresTable`
- `CobrancasTable`
- `CobrancaAuditDetail`
- `PerdasCancelamentoCard`
- `ContasReceberFilters`
- `ResumoRankingTable`
- `PessoaResumoFinanceiro`

# Comportamentos implementados

- Separação por contexto financeiro:
  - Escola / Café / Loja / Outro

- Classificação por origem detalhada

- Filtros inteligentes com tipo de período

- KPIs adaptados por visão:
  - Vencidas
  - A vencer
  - Recebidas
  - Inconsistências

- Ranking dinâmico por visão

- Exclusão de cobranças `CANCELADA` da leitura financeira principal

- Implementação de expurgo lógico:
  - remove da UI principal
  - remove de KPIs
  - remove de dashboard financeiro
  - mantém rastreabilidade

- Visão de inconsistências para análise técnica

- Navegação direta da cobrança para o resumo financeiro da pessoa

- Seleção múltipla de cobranças canceladas elegíveis a expurgo

- Agrupamento por origem para expurgo em lote no resumo financeiro da pessoa

# Pendências

- Garantir aplicação da migration de expurgo em todos os ambientes ativos
- Validar operacionalmente o expurgo em lote em sessão autenticada de uso real
- Evoluir a classificação formal de cancelamento:
  - cancelamento real vs técnico
- Coletar feedback de operação para ajustes finos de UX

# Bloqueios

Nenhum bloqueio técnico crítico.

# Versão do sistema

Sistema Conexão Dança — Financeiro
Versão lógica: v2.1 (Contas a Receber SaaS + Auditoria + Expurgo + Expurgo em lote)

# Próximas ações

1. Uso real do módulo para validação operacional
2. Ajustes finos de UX baseados no uso
3. Validação assistida do expurgo em lote
4. Evolução da classificação de cancelamentos
5. Expansão dos critérios de auditoria conforme feedback financeiro
