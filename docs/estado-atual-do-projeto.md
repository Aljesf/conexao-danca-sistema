## Modulo atual
Academico - Diario de Classe / Frequencia

## SQL concluido
- a tabela canonica `public.turma_aula_presencas` continua usando `registrado_por`, `created_at` e `updated_at`
- nenhuma coluna nova de autoria foi criada para frequencia
- a dependencia operacional de `registrado_por_auth_user_id` e `registrado_por_colaborador_id` foi removida do codigo e da migration operacional
- a migration `supabase/migrations/20260315_01_app_professor_dashboard_operacional.sql` foi ajustada para nao reintroduzir colunas fora do schema canonico

## APIs concluidas
- `src/lib/academico/frequencia.ts`
- `src/lib/academico/permissoes-frequencia.ts`
- `src/app/api/professor/diario-de-classe/aulas/[aulaId]/presencas/route.ts`
- `src/app/api/professor/diario-de-classe/aulas/[aulaId]/fechar/route.ts`
- `src/app/api/professor/diario-de-classe/turmas/[turmaId]/alunos/route.ts`
- `src/app/api/professor/frequencia/route.ts`
- `src/app/api/academico/diario/frequencia/route.ts`
- `src/app/api/academico/turmas/[id]/frequencia/route.ts`
- `src/app/api/pessoas/[id]/frequencia/route.ts`

## Regra de autorizacao consolidada
- administrador pode abrir, salvar, consultar e fechar a frequencia de qualquer turma
- professor vinculado em `turma_professores` com `ativo = true` pode operar apenas a propria turma
- usuario sem esses requisitos recebe `403` com mensagem controlada
- a permissao nao depende mais de coluna de auditoria inexistente no banco

## Paginas e comportamento
- `src/app/(private)/escola/diario-de-classe/page.tsx` continua consumindo as APIs do diario com mensagens controladas para `403` e erro interno
- `src/app/(private)/escola/academico/turmas/[turmaId]/page.tsx` exibe o historico consolidado por turma
- `src/app/(private)/pessoas/[id]/page.tsx` exibe a frequencia consolidada por aluno

## O que foi consolidado neste ciclo
- o erro 500 causado por `registrado_por_auth_user_id` foi removido do fluxo de save da chamada
- a autorizacao de frequencia deixou de aceitar bypass operacional amplo e passou a seguir apenas a regra `admin` ou `professor da turma`
- o front do diario deixou de receber mensagem tecnica de schema nesse fluxo
- o save da chamada segue idempotente por `aula_id + aluno_pessoa_id`
- o historico por turma e por aluno permanece reutilizando os helpers compartilhados de frequencia

## Validacao executada
- `rg -n "registrado_por_auth_user_id" src supabase`: sem resultados
- `rg -n "registrado_em" src supabase`: sem resultados
- `npx eslint` nos arquivos alterados do fluxo de frequencia: ok
- `npm run build`: ok
- `npm run lint`: falha por backlog preexistente fora do modulo academico

## Pendencias
- backlog global de lint ainda precisa ser resolvido separadamente se o repositorio continuar com erros fora do modulo academico
- a homologacao manual com perfis distintos continua recomendada para confirmar o comportamento de permissao em ambiente autenticado

## Versao do sistema
Sistema Conexao Danca - modulo academico de diario de classe e frequencia consolidada
Versao logica: v1.14 diario de classe com autorizacao explicita e schema de frequencia alinhado ao modelo canonico
