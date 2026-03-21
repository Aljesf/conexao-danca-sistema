## Modulo atual
Academico - Diario de Classe / Execucao de Aula / Frequencia

## SQL concluido
- a migration `supabase/migrations/20260320_evolucao_execucao_aula_e_frequencia.sql` evolui `public.turma_aulas` como entidade canonica da sessao real
- foram adicionados os campos `status_execucao`, `aberta_em`, `aberta_por`, `frequencia_salva_em`, `frequencia_salva_por` e `observacao_execucao`
- `PREVISTA` permanece como estado derivado da grade/encontros; os estados persistidos na aula real ficam em `PENDENTE`, `ABERTA`, `VALIDADA` e `NAO_REALIZADA`
- a autoria operacional continua sem colunas improvisadas em `turma_aula_presencas`; a frequencia por aluno segue em `registrado_por`

## APIs concluidas
- `src/lib/academico/execucao-aula.ts`
- `src/lib/academico/frequencia.ts`
- `src/app/api/professor/diario-de-classe/aulas/abrir/route.ts`
- `src/app/api/professor/diario-de-classe/aulas/[aulaId]/route.ts`
- `src/app/api/professor/diario-de-classe/aulas/[aulaId]/presencas/route.ts`
- `src/app/api/professor/diario-de-classe/aulas/[aulaId]/fechar/route.ts`
- `src/app/api/professor/diario-de-classe/aulas/[aulaId]/reabrir/route.ts`
- `src/app/api/professor/frequencia/route.ts`
- `src/app/api/academico/diario/frequencia/route.ts`
- `src/app/api/academico/turmas/[id]/aulas/[aulaId]/abrir/route.ts`
- `src/app/api/academico/turmas/[id]/frequencia/route.ts`
- `src/app/api/pessoas/[id]/frequencia/route.ts`
- `src/app/api/academico/turmas/grade/route.ts`

## Paginas/componentes concluidos
- `src/app/(private)/escola/diario-de-classe/page.tsx`
- `src/components/academico/frequencia/FrequenciaResumoTurmaCard.tsx`
- `src/components/academico/frequencia/FrequenciaHistoricoTurmaTable.tsx`
- `src/components/academico/frequencia/FrequenciaTurmaSection.tsx`
- `src/app/(private)/escola/academico/turmas/[turmaId]/page.tsx`
- `src/app/(private)/escola/academico/turmas/page.tsx`
- `src/app/(private)/escola/academico/turmas/grade/page.tsx`
- `src/components/pessoas/FrequenciaAlunoCard.tsx`
- `src/app/(private)/pessoas/[id]/page.tsx`

## O que foi consolidado neste ciclo
- o Diario de Classe passou a exibir nome legivel de quem abriu, salvou frequencia e fechou a aula, sem expor UUID bruto na interface
- a abertura da aula ficou rastreavel e idempotente, gravando `aberta_em` e `aberta_por`
- salvar frequencia agora registra `frequencia_salva_em` e `frequencia_salva_por`, sem validar a aula prematuramente
- a aula so conta como realizada quando fica `VALIDADA` no fechamento; aulas apenas abertas permanecem operacionais, mas nao entram no consolidado
- o historico da turma agora devolve aulas previstas, abertas, validadas, pendentes, nao realizadas, proximas aulas e alertas de lacuna operacional
- o historico do aluno passou a calcular percentual somente sobre aulas validadas
- a listagem `/escola/academico/turmas` saiu da tabela seca e foi reorganizada em painel operacional com filtros, cards-resumo, agrupamento e acoes rapidas
- a grade `/escola/academico/turmas/grade` ganhou sinalizacao da situacao operacional de hoje por turma
- o diagnostico de lentidao apontou dois fatores principais: falta de `loading.tsx`/`error.tsx` nas rotas privadas e consolidacao pesada por turma no SSR da listagem `/escola/academico/turmas`
- a listagem de turmas foi contida para usar snapshot operacional em lote, evitando calcular execucao profunda turma por turma no carregamento inicial
- o bloco `FrequenciaTurmaSection` passou a consultar um recorte operacional padrao de 60 dias para tras e 14 dias para frente, reduzindo payload e tempo de resposta no detalhe da turma
- as rotas privadas agora possuem fallback explicito de loading e erro, eliminando o comportamento de tela em branco durante transicoes lentas ou falhas de render

## Pendencias
- o painel de turmas ainda pode receber uma segunda etapa de performance caso o volume de turmas cresca e a consolidacao detalhada precise de cache ou agregacao materializada
- a nomenclatura visual entre `PENDENTE` e `NAO_REALIZADA` ainda pode ser refinada com a equipe pedagogica, mas a regra funcional ja esta aplicada
- a homologacao manual com perfis distintos continua recomendada para confirmar o fluxo completo em ambiente autenticado
- o historico completo de frequencia continua disponivel pela API com filtros, mas a tela da turma agora privilegia um recorte operacional para preservar responsividade

## Bloqueios
- `npm run lint` global continua falhando por backlog historico fora do modulo academico, principalmente em areas antigas de admin/loja
- o `next build` do projeto passa, mas o pipeline atual de build nao valida tipos nem lint por configuracao do repositorio

## Versao do sistema
Sistema Conexao Danca - modulo academico com execucao de aula rastreavel e frequencia consolidada
Versao logica: v1.15 diario de classe com abertura/validacao de aula e painel operacional de turmas

## Proximas acoes
- homologar com administrador e professor vinculado o fluxo completo: abrir aula, salvar frequencia, fechar, reabrir e revisar reflexo na turma e no aluno
- avaliar se vale materializar indicadores operacionais de turmas em view/helper dedicado para reduzir ainda mais consultas da listagem principal
- atacar o backlog global de lint em modulo separado para permitir fechamento limpo do repositorio
