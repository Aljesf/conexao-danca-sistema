# Modulo atual

Financeiro - consolidacao da conta interna por responsavel financeiro, mantendo a camada canonica de cobrancas, o fallback legado resiliente e a visibilidade completa das cobrancas.

## SQL concluido

- mantida a estabilizacao anterior da migracao canonica de `public.cobrancas`
- criada a migration `supabase/migrations/20260318_consolidar_conta_interna_por_responsavel.sql`
- a consolidacao foi adaptada para a estrutura real do projeto, usando `public.credito_conexao_contas` como tabela canonica de conta interna
- a migration garante:
  - `credito_conexao_contas.responsavel_financeiro_pessoa_id`
  - `credito_conexao_lancamentos.aluno_id`
  - `credito_conexao_lancamentos.matricula_id`
  - indices para responsavel, aluno e matricula
- a migration estrutural foi aplicada no banco local usado pela aplicacao sem reset de ambiente
- criada a rotina manual `supabase/sql/scripts/20260318_backfill_conta_responsavel.sql`
- o backfill manual nao foi executado nesta etapa para evitar atualizacao de dados sem revisao especifica

## APIs concluidas

- mantida a estabilizacao da rota `GET /api/financeiro/contas-a-receber`
- `src/lib/financeiro/cobranca-origem-canonica.ts` agora retorna tambem `contaInternaId`, `alunoNome` e `matriculaId` com fallback seguro
- `src/lib/financeiro/contas-receber-auditoria.ts` passou a:
  - carregar `aluno_id` e `matricula_id` dos lancamentos da conta interna
  - resolver nome do aluno e matricula a partir da matricula direta, do lancamento ou da composicao da fatura
  - propagar esses dados para lista, detalhe e fallback seguro
- `GET /api/financeiro/contas-a-receber/vencidas/por-pessoa` agora devolve `alunoNome` e `matriculaId`
- `GET /api/pessoas/[id]/resumo-financeiro` agora devolve `alunoNome` e `matriculaId`
- a leitura de conta interna por responsavel no resumo financeiro passou a procurar primeiro por `responsavel_financeiro_pessoa_id`, com fallback para `pessoa_titular_id`
- a criacao de lancamentos da matricula agora grava `aluno_id` e `matricula_id` em `credito_conexao_lancamentos`
- a criacao/uso automatico da conta interna na matricula passou a reutilizar a conta do responsavel financeiro e preencher `responsavel_financeiro_pessoa_id`

## Paginas/componentes concluidos

- `src/components/financeiro/contas-receber/CobrancasTable.tsx` agora prioriza `Conta interna #...` como principal quando existir conta consolidada
- a tabela exibe subcontexto com aluno e matricula sem esconder cobrancas legadas
- `src/components/financeiro/contas-receber/CobrancaAuditDetail.tsx` passou a mostrar conta interna, aluno e matricula no detalhe
- `src/components/pessoas/PessoaResumoFinanceiro.tsx` passou a exibir conta interna, aluno e matricula nas cobrancas canonicas
- a UI continua segura para itens sem conta interna preenchida, mantendo fallback legado e badge de revisao quando necessario

## Pendencias

- revisar e executar manualmente `supabase/sql/scripts/20260318_backfill_conta_responsavel.sql` quando houver janela segura
- saneamento manual dos casos em que ainda exista conta interna ausente na cobranca, mas a familia ja possua conta consolidada
- gerar evidencias visuais autenticadas da fila, do modal/lista de titulos, do resumo financeiro e do detalhe da cobranca
- consolidar o uso de `responsavel_financeiro_pessoa_id` nas demais leituras financeiras que ainda consultarem apenas `pessoa_titular_id`

## Bloqueios

- nao ha harness autenticado pronto para capturar prints reais das telas privadas nesta etapa
- o lint global do repositorio continua com passivo antigo fora do escopo em modulos nao alterados

## Versao do sistema

Conectarte v0.9 - contas a receber estabilizado e conta interna em consolidacao por responsavel financeiro, com lancamentos enriquecidos por aluno e matricula.

## Proximas acoes

- executar o backfill manual com revisao de dados
- preencher `conta_interna_id` nos casos canonicos ainda pendentes de saneamento fino
- validar visualmente as telas privadas com sessao autenticada
- consolidar de vez a conta interna do responsavel como contexto pai das cobrancas escolares

## Validacao

- `npx next lint --file ...` nos arquivos alterados nesta tarefa: ok
- `npm run build`: ok
- validacao funcional do helper `listarContasReceberAuditoria(...)`: ok
- amostras reais ja retornam `alunoNome` e `matriculaId` no payload canonico
- ha cobrancas reais retornando `contaInternaId` preenchido no payload canonico
- consulta SQL de consistencia no banco local:
  - nenhuma duplicidade atual de conta interna por responsavel encontrada
  - existem familias reais com 2 ou mais matriculas e apenas 1 conta interna associada
