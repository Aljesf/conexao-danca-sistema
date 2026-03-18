# Modulo atual

Financeiro - migracao semantica de cobrancas para conta interna do aluno, com preservacao de legado e sem ocultar valores em aberto.

## SQL concluido

- criado o diagnostico `supabase/sql/diagnosticos/20260318_diagnostico_migracao_cobrancas_conta_interna.sql`
- criados os campos canonicos em `public.cobrancas` via `supabase/migrations/20260318_prepare_migracao_conta_interna_cobrancas.sql`
- criada a auditoria de migracao em `public.auditoria_migracao_conta_interna_cobrancas` via `supabase/migrations/20260318_create_auditoria_migracao_conta_interna.sql`
- criado o backfill controlado e nao destrutivo em `supabase/sql/scripts/20260318_backfill_migracao_conta_interna_cobrancas.sql`
- nenhum campo legado foi removido
- nenhuma cobranca foi recriada, cancelada ou alterada por migration nesta etapa

## APIs concluidas

- `GET /api/financeiro/contas-a-receber` segue compatível e agora entrega leitura canonica com:
  - `origemAgrupadorTipo`
  - `origemAgrupadorId`
  - `origemItemTipo`
  - `origemItemId`
  - `contaInternaId`
  - `origemLabel`
  - `migracaoContaInternaStatus`
  - campos auxiliares `origem_label`, `origem_secundaria`, `origem_tecnica` e badge
- `GET /api/financeiro/contas-a-receber/vencidas/por-pessoa` agora retorna os mesmos campos canonicos sem quebrar o payload antigo
- `GET /api/pessoas/[id]/resumo-financeiro` passou a expor `cobrancas_canonicas`, mantendo `cobrancas_matricula` por compatibilidade
- o mapa tecnico das rotas reais foi documentado em `docs/diagnosticos/20260318_mapa_api_cobrancas_conta_interna.md`

## Paginas/componentes concluidos

- `src/components/financeiro/contas-receber/CobrancasTable.tsx` agora exibe origem semantica como destaque principal e usa badge de migracao
- `src/components/financeiro/contas-receber/CobrancaAuditDetail.tsx` passou a mostrar metadados canonicos, status da migracao e origem tecnica apenas como apoio
- `src/app/(private)/admin/financeiro/contas-receber/page.tsx` ajustado para o modal "Titulos vencidos" exibir origem semantica
- `src/components/pessoas/PessoaResumoFinanceiro.tsx` agora usa `cobrancas_canonicas` para nao esconder cobrancas fora da matricula e manter casos ambiguos visiveis
- `src/app/(private)/financeiro/cobrancas/[id]/page.tsx` passou a usar leitura semantica canonica com fallback seguro quando as colunas novas ainda nao existem no banco
- a UI foi ajustada para:
  - nao destacar mais `MATRICULA #x` e `FATURA_CREDITO_CONEXAO #x` como label principal
  - mostrar "Conta interna do aluno" como contexto pai quando houver `contaInternaId`
  - manter cobrancas diretas fora da conta interna visiveis e explicitamente rotuladas
  - manter casos `AMBIGUO` visiveis com sinalizacao de revisao

## Pendencias

- executar as migrations e revisar o diagnostico no banco real antes de rodar o backfill
- executar o backfill controlado por blocos e conferir os `SELECT`s finais de conferencia
- saneamento manual dos casos marcados como `AMBIGUO`, se existirem
- consolidar em etapa futura a desativacao gradual das labels legadas na UI depois da migracao validada
- gerar evidencias visuais autenticadas da fila vencida, do modal de titulos e do painel financeiro

## Bloqueios

- `npm run lint` continua falhando por erros antigos e fora deste escopo em modulos de loja, perfis, permissoes, formularios e outros arquivos nao alterados nesta frente
- nao ha harness de navegador autenticado pronto no repositório para gerar prints confiaveis das telas privadas nesta etapa

## Versao do sistema

Conectarte v0.9 - estrutura de migracao de cobrancas para conta interna preparada, com leitura canonica ativa na API e na UI.

## Proximas acoes

- aplicar `20260318_prepare_migracao_conta_interna_cobrancas.sql`
- aplicar `20260318_create_auditoria_migracao_conta_interna.sql`
- revisar a saida do diagnostico `20260318_diagnostico_migracao_cobrancas_conta_interna.sql`
- executar `20260318_backfill_migracao_conta_interna_cobrancas.sql` de forma controlada
- revisar manualmente os casos `AMBIGUO`
- depois da revisao semantica, consolidar a conta interna do aluno como contexto pai definitivo

## Validacao

- `npm run build`: ok
- `npm run lint -- --quiet`: falhou por passivo antigo fora dos arquivos alterados
- `npx next lint --file ...` nos arquivos alterados nesta frente: ok
