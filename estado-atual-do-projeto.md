# Modulo atual

Financeiro — Contas a Receber (FINALIZADO)

## SQL concluido

- Estrutura de conta interna consolidada por responsavel financeiro
- Campos canonicos de cobranca preservando compatibilidade com legado
- Auditoria de eventos de cobranca em `public.cobrancas_historico_eventos`
- Cancelamento logico e ajuste manual de vencimento com trilha auditavel
- Reforco semantico de cancelamento real em matriculas
- Backfills controlados para origem canonica e centro de custo real
- Reset operacional do Cafe sem exclusao fisica, com cancelamento de cobrancas, lancamentos e neutralizacao das comandas financeiras legadas

## APIs concluidas

- Contas a receber
- Alteracao de vencimento
- Cancelamento de cobranca
- Perdas por cancelamento
- Resumo financeiro por pessoa
- Detalhe da cobranca com historico
- Leitura operacional do Cafe protegida contra cobrancas canceladas na lista ativa

## Paginas/componentes concluidos

- Lista de cobrancas
- Filtros
- Detalhe da cobranca
- Perdas por cancelamento
- Acoes operacionais de receber, cancelar e alterar vencimento
- Exibicao semantica de origem e conta interna por responsavel financeiro

## Pendencias

- Renegociacao avancada (futuro)

## Bloqueios

- Nenhum

## Versao do sistema

v1.0-financeiro-contas-receber

## Proximas acoes

- Renegociacao estruturada
- Dashboard financeiro consolidado

## Validacao

- `npm run build`: ok
- Reset operacional do Cafe aplicado no banco local do app:
  - 4/4 cobrancas Cafe canceladas
  - 11/11 lancamentos Cafe cancelados
  - 13/13 comandas financeiras relacionadas marcadas como `CANCELADO`
  - nenhum registro fora do universo Cafe recebeu `RESET_OPERACIONAL_CAFE`
- Leitura operacional do Cafe validada por script:
  - sem filtro ativo: 6 registros restantes
  - filtro `status_pagamento=CANCELADO`: 13 registros auditaveis
