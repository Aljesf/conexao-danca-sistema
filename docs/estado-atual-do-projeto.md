## Modulo atual
Academico - Diario de Classe / Frequencia

## SQL concluido
- nenhum campo temporal novo foi necessario em `turma_aula_presencas`
- o schema canonico ja estava correto com `created_at` e `updated_at`
- o repositorio foi realinhado para usar apenas a auditoria temporal canonica da tabela de presencas
- a migration `supabase/migrations/20260315_01_app_professor_dashboard_operacional.sql` foi ajustada para nao criar mais a coluna temporal incorreta
- os indices canônicos de frequencia permanecem os mesmos da base original:
  - `idx_turma_aula_presencas_aula_id`
  - `idx_turma_aula_presencas_aluno_id`
  - `turma_aula_presencas_unq_aula_aluno`

## APIs concluidas
- `src/lib/academico/frequencia.ts`
- `src/app/api/professor/diario-de-classe/aulas/[aulaId]/presencas/route.ts`
- `src/app/api/professor/diario-de-classe/aulas/[aulaId]/fechar/route.ts`
- `src/app/api/professor/diario-de-classe/turmas/[turmaId]/alunos/route.ts`
- `src/app/api/academico/turmas/[id]/frequencia/route.ts`
- `src/app/api/pessoas/[id]/frequencia/route.ts`
- o endpoint do diario passou a retornar payload consolidado com:
  - turma
  - aula
  - alunos com status de presenca
  - resumo operacional e de chamada
- o save da chamada segue idempotente por `aula_id + aluno_pessoa_id`

## Paginas / componentes concluidos
- `src/app/(private)/escola/diario-de-classe/page.tsx`
- `src/app/(private)/escola/academico/turmas/[turmaId]/page.tsx`
- `src/app/(private)/pessoas/[id]/page.tsx`
- `src/components/academico/frequencia/FrequenciaResumoTurmaCard.tsx`
- `src/components/academico/frequencia/FrequenciaHistoricoTurmaTable.tsx`
- `src/components/academico/frequencia/FrequenciaTurmaSection.tsx`
- `src/components/pessoas/FrequenciaAlunoCard.tsx`

## O que foi consolidado neste ciclo
- o erro 500 do diario causado pelo desacoplamento entre API e schema foi removido no back-end e no SQL versionado
- o front do diario foi corrigido para reabrir uma aula mostrando `PRESENTE` corretamente, em vez de voltar como pendente
- o fechamento da chamada agora considera os alunos ativos da turma no contexto da frequencia, evitando pendencias artificiais de historico
- a frequencia ficou centralizada em helper compartilhado, reutilizado por diario, detalhe da turma e perfil da pessoa
- a pagina da turma passou a exibir:
  - percentual medio da turma
  - ultimas aulas registradas
  - tabela resumida por aluno
  - historico completo reutilizando a API `/api/academico/turmas/[id]/frequencia`
- o perfil da pessoa/aluno passou a exibir:
  - turmas com historico de frequencia
  - percentual por turma
  - presencas recentes
  - faltas/justificativas e status consolidado
- a busca final pela coluna incorreta ficou zerada em codigo, SQL e documentacao

## Validacao executada
- busca final pela coluna incorreta: ok, sem resultados em `src`, `supabase` e `docs`
- `npx eslint` nos arquivos alterados pelo fluxo de frequencia: ok
- `npm run build`: ok
- `npm run lint`: continua falhando por backlog preexistente fora do escopo deste modulo

## Pendencias
- backlog global de lint em modulos antigos de admin/loja continua aberto e impede `npm run lint` limpo no repositório inteiro
- se houver nova rodada de refatoracao ampla da pagina da turma, ela deve partir da base agora estabilizada de frequencia, sem reintroduzir regra duplicada

## Bloqueios
- `npm run lint` nao zera por erros antigos e nao relacionados ao diario/frequencia
- o `build` atual segue configurado para pular validacao de lint e tipos durante a etapa de `next build`

## Versao do sistema
Sistema Conexao Danca - modulo academico de diario de classe e frequencia consolidada
Versao logica: v1.13 diario de classe alinhado ao schema canonico e historico reutilizavel por turma e aluno

## Proximas acoes
1. homologar em sessao autenticada o fluxo completo do diario: abrir aula, salvar, reabrir, fechar e reconsultar
2. validar com usuarios do academico se o percentual consolidado deve tratar `JUSTIFICADA` apenas como falta justificada ou como presenca abonada
3. atacar o backlog global de lint do repositório em uma frente separada, sem misturar com o modulo academico
