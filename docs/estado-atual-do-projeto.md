# Modulo atual

Dashboard Escola - refinamento de composicao de turmas

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

# Paginas / componentes concluidos

- `src/app/(private)/escola/page.tsx`
- `src/components/escola/EscolaTurmaComposicaoCard.tsx`

# Entregas do refinamento

- Novos KPIs institucionais agregados no topo do dashboard
- Filtro por curso na secao "Saude das Turmas"
- Receita mensal estimada por turma
- Receita mensal estimada agregada da Escola

# Pendencias

- Validar classificacao real de concessao no banco
- Validar regra oficial da receita estimada
- Definir futuramente indicador de sustentabilidade da turma

# Proximas acoes

1. Clique no card levando ao detalhe da turma
2. Filtro complementar por professor e turno
3. Evoluir indicador de sustentabilidade por turma
