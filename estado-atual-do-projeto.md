# Modulo atual

Financeiro - separacao correta entre conta interna como agrupador de intermediacao financeira, lancamento com centro de custo real e perdas por cancelamento com semantica detalhada.

## SQL concluido

- criado o diagnostico `supabase/sql/diagnosticos/20260318_diagnostico_centro_custo_real.sql`
- o diagnostico cobre:
  - lancamentos sem centro de custo
  - lancamentos com centro de custo diferente do esperado
  - cobrancas cujo centro de custo diverge do lancamento principal
  - contas internas cujo agrupador nao aponta para intermediacao financeira
  - matriculas canceladas com saldo aberto
  - consulta dedicada para a matricula `#7`
- criada a migration `supabase/migrations/20260318_reforco_cancelamento_real.sql`
- a migration adiciona:
  - `credito_conexao_lancamentos.centro_custo_id`
  - `matriculas.cancelamento_tipo`
  - `matriculas.gera_perda_financeira`
  - indices e comentario de uso semantico
- a migration estrutural foi aplicada no banco local usado pela aplicacao
- a aplicacao no banco foi feita diretamente via SQL, sem `supabase db push`, porque a pasta de migrations do projeto ja possui colisoes antigas de prefixo `20260318` e o push completo aumentaria o risco
- criado o script `supabase/sql/scripts/20260318_backfill_centro_custo_real.sql`
- o backfill seguro foi executado no banco local desta validacao
- resultado local apos o backfill:
  - `388` lancamentos com `centro_custo_id`
  - `0` lancamentos restantes sem `centro_custo_id`
- nenhuma conta interna teve centro de custo sobrescrito para `ESCOLA`

## APIs concluidas

- `src/lib/financeiro/contas-receber-auditoria.ts` agora separa:
  - centro do agrupador da conta interna
  - centro do lancamento real
  - centro derivado da cobranca
- a leitura de contas a receber continua canonica e resiliente, agora com `centro_custo_agrupador_*` e `centro_custo_lancamento_*`
- `src/lib/credito-conexao/upsertLancamentoPorCobranca.ts` passou a resolver `centro_custo_id` automaticamente para novos lancamentos:
  - `MATRICULA`, `MATRICULA_REPROCESSAR`, `MATRICULA_MENSAL`, `ESCOLA` -> `ESCOLA`
  - `CAFE` -> `CAFE`
  - `LOJA`, `LOJA_VENDA` -> `LOJA`
- criada a rota `GET /api/financeiro/perdas-cancelamento`
- a rota nova devolve lista detalhada com:
  - `matricula_id`
  - `aluno_nome`
  - `responsavel_nome`
  - `turma`
  - `data_cancelamento`
  - `valor_aberto`
  - `valor_potencial`
  - `status_financeiro`
  - `conta_interna_id`
  - cobrancas relacionadas
- os fluxos de cancelamento passaram a gravar os novos campos semanticos:
  - `src/app/api/matriculas/[id]/cancelar/route.ts`
  - `src/app/api/matriculas/[id]/encerrar/route.ts`
  - `src/app/api/matriculas/operacional/encerrar/route.ts`
- a classificacao de cancelamento usa semantica conservadora:
  - `DESISTENCIA_REAL` entra em perdas
  - `DUPLICIDADE`, `AJUSTE_SISTEMA`, `TRANSFERENCIA`, `TROCA_TURMA`, `OUTRO` nao entram
- enquanto houver historico legado sem os novos campos preenchidos, a lista detalhada usa fallback por motivo registrado sem gravar backfill automatico de cancelamento

## Paginas/componentes concluidos

- criada `src/components/financeiro/PerdasCancelamentoTable.tsx`
- a tela de perdas deixou de ser agregada e agora lista matriculas canceladas com detalhe por linha
- cada linha mostra:
  - matricula
  - aluno
  - responsavel
  - turma
  - valor aberto
  - valor potencial
  - status
  - link para cobranca principal quando existir
  - bloco expansivel com cobrancas relacionadas
- `src/app/(private)/admin/financeiro/contas-receber/page.tsx` passou a usar a tabela detalhada de perdas
- `src/components/financeiro/contas-receber/CobrancasTable.tsx` agora exibe de forma separada:
  - agrupador: `Intermediacao Financeira`
  - lancamento: `Escola`, `Cafe`, `Loja` ou revisao
  - cobranca derivada quando houver diferenca relevante
- `src/components/financeiro/contas-receber/CobrancaAuditDetail.tsx` passou a mostrar tres visoes distintas:
  - agrupador / conta interna
  - lancamento real
  - cobranca derivada
- a UI nao mistura mais o centro da conta interna com o centro real do lancamento

## Pendencias

- preencher explicitamente `cancelamento_tipo` e `gera_perda_financeira` nas matriculas antigas que ainda aparecem com `diagnostico_em_validacao = true`
- revisar e decidir um backfill especifico para `credito_conexao_contas.centro_custo_intermediacao_id`, porque o ambiente local ainda nao traz esse campo populado com `FIN` nas contas existentes
- revisar os casos de perda real que hoje aparecem sem cobranca aberta, para decidir se a leitura deve mostrar apenas perda potencial ou tambem impacto em aberto separado
- gerar evidencias visuais autenticadas da fila, da lista de perdas e do detalhe de cobranca
- avaliar padronizacao futura dos nomes de migration, porque a pasta atual tem colisoes de prefixo e dificulta `supabase db push`

## Bloqueios

- nao ha harness autenticado pronto para capturar prints reais das telas privadas nesta etapa
- o build do projeto passa, mas o `next build` deste repositorio esta configurado para pular validacao de tipos e lint
- por isso a validacao de qualidade desta tarefa foi feita com lint direcionado nos arquivos alterados

## Versao do sistema

Conectarte v0.9 - contas a receber com centro de custo separado entre agrupador e lancamento, e perdas por cancelamento detalhadas por matricula.

## Proximas acoes

- fazer o saneamento manual dos cancelamentos legados ainda inferidos por motivo
- decidir se havera backfill controlado especifico para `cancelamento_tipo` e `gera_perda_financeira`
- validar visualmente as telas privadas com sessao autenticada
- corrigir a padronizacao historica de nomes de migrations para voltar a usar `supabase db push` com menor risco

## Validacao

- `npm run build`: ok
- `npx next lint --file ...` nos arquivos alterados nesta tarefa: ok
- migration estrutural aplicada no banco local: ok
- backfill controlado de centro de custo real aplicado no banco local: ok
- validacao funcional com dados reais do helper `listarContasReceberAuditoria(...)`: ok
- amostras reais de contas a receber agora retornam:
  - `centro_custo_agrupador_nome = Intermediacao Financeira`
  - `centro_custo_lancamento_nome = Escola Conexao Danca`
- conferindo o banco local diretamente:
  - `377 / 377` lancamentos de matricula ficaram com centro de custo `ESCOLA`
  - `0 / 37` contas internas existentes possuem `centro_custo_intermediacao_id = FIN` gravado hoje
  - por regra desta rodada, esse campo nao foi sobrescrito automaticamente
- validacao funcional com dados reais do helper `listarPerdasCancelamentoDetalhadas(...)`: ok
- ha pelo menos `2` matriculas classificadas como `DESISTENCIA_REAL` na leitura detalhada de perdas do ambiente local
