# Modulo atual

Financeiro - estabilizacao de contas a receber apos a migracao canonica de cobrancas para conta interna, com fallback seguro para schema legado e sem ocultar cobrancas ambigüas.

## SQL concluido

- criado o arquivo de conferencia `supabase/sql/diagnosticos/20260318_verificacao_migrations_contas_receber.sql`
- confirmada no banco da aplicacao a ausencia inicial das colunas canonicas em `public.cobrancas`
- confirmada no banco da aplicacao a ausencia inicial da tabela `public.auditoria_migracao_conta_interna_cobrancas`
- aplicadas no banco usado pelo app, sem reset de ambiente, as migrations:
  - `supabase/migrations/20260318_prepare_migracao_conta_interna_cobrancas.sql`
  - `supabase/migrations/20260318_create_auditoria_migracao_conta_interna.sql`
- validado depois da aplicacao que existem:
  - `origem_agrupador_tipo`
  - `origem_agrupador_id`
  - `origem_item_tipo`
  - `origem_item_id`
  - `conta_interna_id`
  - `origem_label`
  - `migracao_conta_interna_status`
  - `migracao_conta_interna_observacao`
- o backfill manual `supabase/sql/scripts/20260318_backfill_migracao_conta_interna_cobrancas.sql` nao foi executado nesta etapa para evitar risco desnecessario

## APIs concluidas

- estabilizada a rota principal `GET /api/financeiro/contas-a-receber`
- a rota principal agora tenta a leitura canonica completa e, se a montagem falhar, responde em modo degradado com fallback legado seguro em vez de retornar 500
- adicionados logs tecnicos por etapa na rota principal sem expor detalhes sensiveis ao cliente
- revisado `src/lib/financeiro/cobranca-origem-canonica.ts` para aceitar nulos, shape legado e retornar estrutura minima segura com `Origem em revisao` e status `AMBIGUO` quando necessario
- revisado `src/lib/financeiro/contas-receber-auditoria.ts` para:
  - proteger a montagem por item
  - proteger o detalhe da cobranca
  - manter registros legados validos
  - evitar esconder linhas quando a cobranca enriquecida nao estiver completa
  - oferecer fallback reutilizavel para a rota principal e para leituras por pessoa
- `GET /api/financeiro/contas-a-receber/vencidas/por-pessoa` e `GET /api/pessoas/[id]/resumo-financeiro` permanecem compatíveis e agora tambem herdaram a protecao do helper resiliente

## Paginas/componentes concluidos

- `src/app/(private)/admin/financeiro/contas-receber/page.tsx` ajustada para usar fallback visual seguro no modal e no fluxo de recebimento
- `src/components/financeiro/contas-receber/CobrancasTable.tsx` ajustada para nunca assumir `origem_label` presente e sempre renderizar uma origem segura
- `src/components/financeiro/contas-receber/CobrancaAuditDetail.tsx` ajustada para usar origem principal segura no detalhe
- `src/components/pessoas/PessoaResumoFinanceiro.tsx` continua exibindo `cobrancas_canonicas` sem esconder cobrancas sem `contaInternaId`
- `src/app/(private)/financeiro/cobrancas/[id]/page.tsx` continua operando com fallback quando o schema canonico nao estiver completo
- a UI preserva a visibilidade de cobrancas `AMBIGUO` com badge de revisao e sem remover linhas da tabela

## Pendencias

- executar o backfill manual de migracao semantica apenas depois da revisao fina dos dados
- saneamento manual dos casos `AMBIGUO`
- gerar evidencias visuais autenticadas da fila, do modal, do resumo financeiro e do detalhe da cobranca
- consolidar futuramente a desativacao progressiva das labels legadas quando o saneamento semantico estiver concluido

## Bloqueios

- `npm run lint -- --quiet` continua falhando por passivo antigo fora do escopo em modulos nao alterados, principalmente frentes de loja, perfis, permissoes e componentes legados
- nao ha harness autenticado pronto para capturar prints reais das telas privadas nesta etapa

## Versao do sistema

Conectarte v0.9 - contas a receber estabilizado apos a migracao canonica, com schema compativel e fallback legado resiliente.

## Proximas acoes

- revisar semanticamente as cobrancas marcadas como `AMBIGUO`
- executar o backfill controlado por blocos
- validar visualmente as telas privadas com sessao autenticada
- depois do saneamento fino, consolidar a conta interna do aluno como contexto pai definitivo

## Validacao

- `npx next lint --file ...` nos arquivos alterados nesta tarefa: ok
- `npm run build`: ok
- validacao funcional direta nos helpers principais: ok
- validacao local HTTP sem sessao:
  - `/login` respondeu `200`
  - `/financeiro/contas-receber` respondeu `307` para o fluxo de autenticacao
  - `/api/financeiro/contas-a-receber` respondeu `401` nao autenticado, sem 500
- validacao funcional de dados com Supabase admin:
  - `listarContasReceberAuditoria(...)`: ok
  - `listarContasReceberAuditoriaFallback(...)`: ok
  - `listarTitulosVencidosPorPessoa(...)`: ok
  - `listarCobrancasEmAbertoPorPessoa(...)`: ok
- `npm run lint -- --quiet`: falhou apenas por passivo antigo fora do escopo
