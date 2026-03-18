# Modulo atual

Dashboard Escola - drill-down operacional por alunos

# SQL concluido

- Refinamento da view canonica do dashboard da Escola:
  - `public.vw_escola_dashboard_turmas_composicao`
- Nova view agregada institucional:
  - `public.vw_escola_dashboard_resumo_institucional`

# APIs concluidas

- `/api/escola/dashboard` passa a devolver:
  - `kpis`
  - `series7d`
  - `trends30d`
  - `resumoInstitucional`
  - `turmasComposicao`
  - `cursosDisponiveis`
- Nova rota de drill-down:
  - `/api/escola/dashboard/detalhes`

# Paginas / componentes concluidos

- `src/app/(private)/escola/page.tsx`
- `src/components/escola/EscolaTurmaComposicaoCard.tsx`

# Entregas do refinamento

- Novos KPIs institucionais agregados no topo do dashboard
- Filtro por curso na secao "Saude das Turmas"
- Receita mensal estimada por turma
- Receita mensal estimada agregada da Escola
- Card institucional de concessoes consolidado
- Modal de listagem operacional por pagantes e concessoes
- Dashboard Escola com drill-down operacional por alunos

# Pendencias

- Validar classificacao real de concessao no banco
- Validar regra oficial da receita estimada
- Definir futuramente indicador de sustentabilidade da turma
- Futuramente permitir clique tambem em receita e demais grupos

# Proximas acoes

1. Clique no card levando ao detalhe da turma
2. Filtro complementar por professor e turno
3. Evoluir indicador de sustentabilidade por turma
