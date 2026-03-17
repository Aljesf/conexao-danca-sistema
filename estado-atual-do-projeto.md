# Módulo atual
Suporte ao Usuário / Sistema de Tickets

## SQL concluído
- tabela `suporte_tickets`
- triggers de código automático
- campos de contexto técnico
- prioridade, status e timestamps

## APIs concluídas
- `POST /api/suporte/tickets`
- `GET /api/suporte/tickets`
- `GET /api/suporte/tickets/[id]`
- `PATCH /api/suporte/tickets/[id]`
- `POST /api/suporte/upload` (screenshot)

## Páginas / componentes concluídos
- botão flutuante global de suporte
- modal de abertura de chamado
- separação erro do sistema / melhoria
- captura automática de contexto
- captura de screenshot com `html2canvas`
- sanitização de estilos incompatíveis (`oklch`)
- painel administrativo de tickets
- listagem com filtros
- tela de detalhe do ticket
- atualização de status e prioridade
- exportação de tickets

## Pendências
- comentários internos em ticket
- atribuição de responsável interno
- notificações automáticas
- painel de saúde do sistema

## PendÃªncias tÃ©cnicas de financeiro
- diagnÃ³stico concluÃ­do de duplicidade de cobranÃ§as no CrÃ©dito ConexÃ£o: 13 grupos duplicados e 27 cobranÃ§as envolvidas
- padrÃ£o forte de mistura entre `MATRICULA` e `FATURA_CREDITO_CONEXAO`, exigindo saneamento controlado e correÃ§Ã£o da causa raiz
- todos os grupos diagnosticados possuem `competencia_ano_mes` nula e pedem revisÃ£o do fluxo de geraÃ§Ã£o e consolidaÃ§Ã£o

## Saneamento controlado de financeiro
- etapa de saneamento controlado preparada em arquivos SQL locais
- casos `MATRICULA_X_FATURA` ja possuem lista de cancelamento revisavel
- casos `FATURA_DUPLA` e `TRIPLA_OU_MAIS` permanecem em revisao manual
- ainda nao houve alteracao de dados no banco

## Execucao do lote 1 de saneamento
- lote 1 de saneamento revisavel executado
- 6 cobrancas de origem `MATRICULA` foram canceladas de forma controlada
- casos `FATURA_DUPLA` e `TRIPLA_OU_MAIS` continuam pendentes de revisao manual
- proxima frente: investigacao da causa raiz no codigo

## Investigacao da causa raiz de duplicidade de cobrancas
- investigacao no codigo concluida nesta etapa, sem alteracao de regra de negocio e sem alteracao no banco
- hipotese principal: o fluxo de matricula cria cobranca mensal `MATRICULA` com subtipo `CARTAO_CONEXAO`, enquanto o fluxo de fechamento/geracao de fatura cria a cobranca canonica `FATURA_CREDITO_CONEXAO` sem coordenacao entre os dois fluxos
- ha falha de idempotencia transversal: existem guardas locais por `matricula + competencia` e por `fatura + cobranca`, mas nao existe guarda unica por pessoa + competencia + contexto financeiro para impedir cobrancas paralelas
- arquivos criticos mapeados: `src/app/api/matriculas/novo/route.ts`, `src/app/api/matriculas/liquidacao-primeira/route.ts`, `src/app/api/escola/matriculas/[id]/reprocessar-financeiro/route.ts`, `src/app/api/financeiro/credito-conexao/faturas/[id]/fechar/route.ts`, `src/app/api/financeiro/credito-conexao/faturas/[id]/gerar-cobranca/route.ts`, `src/app/api/financeiro/credito-conexao/faturas/fechar/route.ts`, `src/app/api/financeiro/credito-conexao/cobrancas/vincular-fatura/route.ts`, `src/lib/credito-conexao/upsertLancamentoPorCobranca.ts`, `src/lib/cobrancasNeofin.ts`, `src/lib/financeiro/creditoConexaoFaturas.ts`

## Correcao da causa raiz de duplicidade de cobrancas
- correcao da causa raiz iniciada e concluida nesta etapa, com ajuste de SQL e API
- a cobranca canonica da fatura virou fonte unica e passou a ter protecao de unicidade por `origem_tipo + origem_id` quando ativa
- a matricula nao gera mais cobranca paralela para mensalidade do Cartao Conexao nas rotas corrigidas; agora gera apenas lancamento elegivel ao faturamento
- a idempotencia da cobranca canonica foi centralizada em `src/lib/credito-conexao/getOrCreateCobrancaCanonicaFatura.ts`
- pendencia remanescente: saneamento manual dos casos `FATURA_DUPLA` e `TRIPLA_OU_MAIS` ainda existentes no diagnostico anterior, alem da revisao de fluxos legados fora do escopo desta etapa

## Bloqueios
nenhum

## Versão do sistema
Conectarte v0.9 — módulo de suporte implementado

## Próximas ações
- evolução do módulo financeiro
- melhorias no app de professores
- painel de monitoramento de erros do sistema
