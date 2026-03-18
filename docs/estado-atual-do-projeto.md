# Modulo atual

Dashboard Escola - refino analitico do drill-down por vinculo

# SQL concluido

- View canonica de composicao por turma:
  - `public.vw_escola_dashboard_turmas_composicao`
- View agregada institucional:
  - `public.vw_escola_dashboard_resumo_institucional`
- View de detalhamento operacional por vinculo ativo:
  - `public.vw_escola_dashboard_alunos_detalhe`

# APIs concluidas

- `/api/escola/dashboard` devolve:
  - `kpis`
  - `series7d`
  - `trends30d`
  - `resumoInstitucional`
  - `turmasComposicao`
  - `cursosDisponiveis`
- `/api/escola/dashboard/detalhes` suporta drill-down por:
  - alunos ativos
  - pagantes
  - concessoes
  - concessoes integrais
  - concessoes parciais

# Paginas / componentes concluidos

- `src/app/(private)/escola/page.tsx`
- `src/components/escola/EscolaTurmaComposicaoCard.tsx`
- `src/components/escola/EscolaDashboardAlunosModal.tsx`

# Entregas do refinamento

- Unificacao de concessoes nos cards de turma
- Remocao da composicao institucional redundante da turma
- Drill-down por alunos ativos, pagantes e concessoes
- Modal institucional com repeticao correta por vinculo/turma
- Modal da turma agrupado por serie/nivel
- Exibicao de valor mensal nos drill-downs

# Pendencias

- Validar classificacao real de concessao no banco
- Validar regra definitiva do valor mensal por vinculo
- No futuro, permitir abertura direta da ficha do aluno/matricula

# Proximas acoes

1. Permitir abertura contextual da ficha do aluno a partir do modal
2. Evoluir indicadores de sustentabilidade por turma
3. Expandir drill-down para receita e demais grupos operacionais
