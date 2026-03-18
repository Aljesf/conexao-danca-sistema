# Modulo atual

Dashboard Escola - composicao de turmas

# SQL concluido

- Nova view canonica para o dashboard da Escola:
  - `public.vw_escola_dashboard_turmas_composicao`

# APIs concluidas

- `/api/escola/dashboard` passa a devolver:
  - `kpis`
  - `series7d`
  - `trends30d`
  - `turmasComposicao`

# Paginas / componentes concluidos

- `src/app/(private)/escola/page.tsx`
- `src/components/escola/EscolaTurmaComposicaoCard.tsx`

# Pendencias

- Revisar regra de "matriculas efetivadas"
- Validar classificacao institucional de concessao
- Decidir proximos drill-downs por turma

# Proximas acoes

1. Clique no card levando ao detalhe da turma
2. Filtro por curso/professor/turno
3. Receita estimada por turma
