## Modulo atual
Dashboard Escola + Calendario operacional + Diario de classe

## SQL concluido
- views e refinamentos para composicao por turma
- resumo institucional
- resumo por modalidade
- detalhamento operacional por vinculo/aluno para drill-down
- separacao de receita pagante e absorcao institucional

## APIs concluidas
- `src/app/api/escola/dashboard/route.ts`
- `src/app/api/escola/dashboard/detalhes/route.ts`
- `src/app/api/turmas/route.ts`
- `src/app/api/calendario/grade/route.ts`
- `src/app/api/professor/diario-de-classe/turmas/route.ts`

## Paginas / componentes concluidos
- `src/app/(private)/escola/page.tsx`
- `src/app/(private)/escola/calendario/page.tsx`
- `src/app/(private)/escola/diario-de-classe/page.tsx`
- `src/components/escola/EscolaTurmaComposicaoCard.tsx`
- `src/components/escola/EscolaDashboardAlunosModal.tsx`
- `src/components/turmas/TurmaResumoOperacional.tsx`

## O que foi consolidado neste chat
- cards institucionais refinados
- concessoes unificadas
- drill-down por pagantes, concessoes e alunos ativos
- leitura por modalidade filtrada
- receita total, receita pagante e absorcao institucional
- diario de classe com resumo operacional de turma
- grade do dia com metricas de ocupacao e perfil institucional
- grade do dia com cabecalho agregado por dia
- resumo operacional visual aprimorado por turma
- leitura de pagantes e concessoes do dia
- exibicao de capacidade e vagas
- reuso do mesmo resumo na frequencia
- padronizacao conceitual:
  - alunos ativos = ocupacao real
  - vagas disponiveis = capacidade - alunos ativos

## Pendencias
- abrir ficha do aluno ou matricula diretamente a partir do modal
- revisar turmas sem capacidade preenchida
- evoluir comparativos entre modalidades
- validar continuamente a regra de valor mensal por vinculo
- gerar validacao visual autenticada com prints do calendario e do diario

## Versao do sistema
Sistema Conexao Danca - Dashboard Escola
Versao logica: v1.0 consolidada do dashboard analitico da Escola

## Proximas acoes
1. drill-down com abertura da ficha do aluno/matricula
2. comparativo entre modalidades
3. indicadores de sustentabilidade por modalidade/turma
4. expandir o resumo operacional para outras listagens de turmas quando fizer sentido
