## Objetivo
Validar o alinhamento da tela de competencia ativa com a mesma carteira operacional de contas a receber, removendo cancelados, expurgados e cobrancas que nao pertencem mais ao fluxo oficial da conta interna.

## Fonte da verdade adotada
- fonte antiga da competencia ativa:
  - `src/app/api/financeiro/credito-conexao/cobrancas/route.ts`
  - leitura direta de `vw_financeiro_cobrancas_operacionais`
- fonte canonica nova:
  - `src/lib/financeiro/competenciaAtiva/resolverCarteiraOperacionalPorCompetencia.ts`
  - elegibilidade derivada de `vw_financeiro_contas_receber_flat`
  - exclusao operacional via `cobrancas.status` e `cobrancas.expurgada`
  - enriquecimento final reaproveitado de `vw_financeiro_cobrancas_operacionais` apenas para cobrancas oficiais elegiveis

## Comandos executados
Em 19/03/2026, com `.env.local` carregado:

```powershell
npx eslint src/lib/financeiro/competenciaAtiva/resolverCarteiraOperacionalPorCompetencia.ts src/app/api/financeiro/credito-conexao/cobrancas/route.ts src/app/(private)/admin/financeiro/credito-conexao/cobrancas/page.tsx src/components/financeiro/credito-conexao/CobrancasMensaisResumo.tsx src/components/financeiro/credito-conexao/CobrancasCompetenciaCard.tsx src/components/financeiro/credito-conexao/CobrancaStatusSection.tsx src/components/financeiro/credito-conexao/CobrancaRow.tsx src/components/financeiro/credito-conexao/CompetenciaTabs.tsx src/components/financeiro/credito-conexao/VincularCobrancaFaturaDialog.tsx
npx tsx -r dotenv/config -
```

O script `tsx` comparou:
- a listagem antiga da view `vw_financeiro_cobrancas_operacionais`
- a saida nova de `resolverCarteiraOperacionalPorCompetencia(...)`
- os metadados reais de `cobrancas`

## Resultado comparativo
- total antigo na competencia ativa: `422`
- total novo na competencia ativa: `315`
- total removido da tela: `107`
- motivos confirmados na base:
  - `96` cancelados
  - `11` expurgados

Conclusao:
- a divergencia principal vinha da leitura direta da view operacional, que ainda carregava cobrancas canceladas/expurgadas
- a tela nova passa a refletir a mesma carteira oficial usada em contas a receber

## Cenario A - item cancelado na matricula
Amostras reais removidas da tela:
- cobranca `#412`
  - competencia `2026-03`
  - `status_operacional` antigo na tela: `PAGO`
  - `status_real`: `CANCELADA`
  - descricao: `Entrada (reprocessamento matricula)`
- cobranca `#287`
  - competencia `2026-02`
  - `status_operacional` antigo na tela: `PENDENTE_VENCIDO`
  - `status_real`: `CANCELADA`
  - descricao: `Mensalidade (reprocessamento matricula)`

Resultado apos a correcao:
- itens cancelados deixam de aparecer na competencia ativa
- o cancelamento real passa a prevalecer sobre a classificacao operacional herdada da view antiga

## Cenario B - item valido e a vencer
Amostra real mantida na tela:
- cobranca `#444`
- competencia `2026-04`
- `status_operacional`: `PENDENTE_A_VENCER`
- `fatura_id`: `28`
- `fatura_competencia`: `2026-04`
- descricao exibida: `Mensalidade Conexao Danca - 2026-04 - Fatura #28`

Resultado:
- o item continua visivel
- a leitura segue a carteira oficial
- o vinculo com fatura aparece na mesma competencia da cobranca

## Cenario C - item ja vinculado a fatura/cobranca
Amostras reais confirmadas:
- cobranca `#348` -> fatura `#275` -> competencia `2026-03`
- cobranca `#377` -> fatura `#111` -> competencia `2026-03`
- cobranca `#376` -> fatura `#75` -> competencia `2026-03`

Resultado:
- a tela continua exibindo a cobranca oficial vinculada
- o texto principal agora fala em fatura vinculada e cobranca vinculada
- nao houve duplicidade visual nas amostras validadas

## Cenario D - item reprocessado/substituido
Os casos removidos por cancelamento mostram o padrao esperado de substituicao:
- `origem_tipo = MATRICULA`
- descricoes como `Mensalidade (reprocessamento matricula)` e `Entrada (reprocessamento matricula)`
- `status_real = CANCELADA`

Resultado:
- apenas a versao operacional ainda elegivel permanece na tela
- a versao cancelada/substituida nao compoe mais a carteira da competencia ativa

## Sanidade final da nova saida
Checagem direta na saida nova do helper:
- total de itens novos: `315`
- cancelados restantes: `0`
- expurgados restantes: `0`

## Linguagem da tela
Textos atualizados para o dominio atual:
- `Conta interna do aluno - carteira operacional por competencia`
- `Leitura da carteira real de contas a receber por competencia`
- `Fatura vinculada`
- `Vincular a fatura oficial`
- `Ver cobranca vinculada`

O termo `matricula` deixa de ser o eixo principal da cobranca na UI e passa a aparecer apenas como origem quando existir no dado.

## Limitacao atual
- a validacao visual autenticada e os prints reais da rota privada continuam dependentes de sessao local ativa
- por isso, a evidencia desta tarefa ficou registrada por comparacao real de base e por lint/build, nao por captura automatica da tela
