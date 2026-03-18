## Modulo atual
Dashboard Escola - leitura institucional, leitura por modalidade e saude das turmas

## SQL concluido
- views e refinamentos para composicao por turma
- resumo institucional
- resumo por modalidade
- detalhamento operacional por vinculo/aluno para drill-down
- separacao de receita pagante e absorcao institucional

## APIs concluidas
- `src/app/api/escola/dashboard/route.ts`
- `src/app/api/escola/dashboard/detalhes/route.ts`

## Paginas / componentes concluidos
- `src/app/(private)/escola/page.tsx`
- `src/components/escola/EscolaTurmaComposicaoCard.tsx`
- `src/components/escola/EscolaDashboardAlunosModal.tsx`

## O que foi consolidado neste chat
- cards institucionais refinados
- concessoes unificadas
- drill-down por pagantes, concessoes e alunos ativos
- leitura por modalidade filtrada
- receita total, receita pagante e absorcao institucional
- padronizacao conceitual:
  - alunos ativos = ocupacao real
  - vagas disponiveis = capacidade - alunos ativos

## Pendencias
- abrir ficha do aluno ou matricula diretamente a partir do modal
- revisar turmas sem capacidade preenchida
- evoluir comparativos entre modalidades
- validar continuamente a regra de valor mensal por vinculo

## Versao do sistema
Sistema Conexao Danca - Dashboard Escola
Versao logica: v1.0 consolidada do dashboard analitico da Escola

## Proximas acoes
1. drill-down com abertura da ficha do aluno/matricula
2. comparativo entre modalidades
3. indicadores de sustentabilidade por modalidade/turma
