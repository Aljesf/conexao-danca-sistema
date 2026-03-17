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

## Bloqueios
nenhum

## Versão do sistema
Conectarte v0.9 — módulo de suporte implementado

## Próximas ações
- evolução do módulo financeiro
- melhorias no app de professores
- painel de monitoramento de erros do sistema
