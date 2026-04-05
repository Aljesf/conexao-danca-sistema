# Plano de correcao -- Duplicidade de cobrancas -- 2026-03-17

## SQL

- avaliar constraint ou indice parcial de protecao para impedir cobrancas mensais paralelas da mesma obrigacao
- avaliar view/consulta de auditoria permanente para detectar `MATRICULA/CARTAO_CONEXAO` convivendo com `FATURA_CREDITO_CONEXAO`
- se necessario, adicionar coluna ou regra explicita que diferencie `lancamento_origem` de `cobranca_canonica`

## API

- alterar `C:/Users/aliri/conexao-dados/src/app/api/matriculas/liquidacao-primeira/route.ts`
- para mensalidade cheia da Conta Interna, parar de criar `public.cobrancas` com `origem_tipo = 'MATRICULA'`
- manter apenas o lancamento da conta interna e o agendamento/garantia de fatura aberta

## API/servicos

- consolidar a geracao de cobranca canonica apenas nos endpoints modernos:
  - `C:/Users/aliri/conexao-dados/src/app/api/financeiro/credito-conexao/faturas/[id]/fechar/route.ts`
  - `C:/Users/aliri/conexao-dados/src/app/api/financeiro/credito-conexao/faturas/[id]/gerar-cobranca/route.ts`
- revisar ou aposentar o legado:
  - `C:/Users/aliri/conexao-dados/src/app/api/financeiro/credito-conexao/faturas/fechar/route.ts`
- ajustar reprocessamento:
  - `C:/Users/aliri/conexao-dados/src/app/api/escola/matriculas/[id]/reprocessar-financeiro/route.ts`
  - para reconstruir lancamentos/faturas sem recriar cobranca paralela de `MATRICULA`

## Estrategia de validacao

- recriar matricula com mensalidade cheia da Conta Interna e confirmar:
  - existe lancamento
  - existe fatura
  - nao existe cobranca `MATRICULA/CARTAO_CONEXAO`
  - a cobranca so nasce no fechamento/geracao da fatura
- reexecutar fechamento da mesma fatura e confirmar reaproveitamento da mesma cobranca
- rodar o diagnostico de duplicidade e confirmar ausencia de novos casos `MATRICULA_X_FATURA`

## Risco de regressao

- quebra do fluxo atual de exibicao se telas dependerem de cobranca `MATRICULA/CARTAO_CONEXAO`
- impacto em reprocessamentos antigos que inferem mensalidades a partir dessas cobrancas
- necessidade de ajustar consultas e dashboards que leem `origem_tipo = 'MATRICULA'`

## Ordem exata de implementacao

1. SQL
- decidir se havera protecao estrutural complementar
- manter diagnosticos para antes/depois

2. API
- mudar `liquidacao-primeira` para nao criar cobranca mensal da matricula
- manter somente lancamento + vinculo em fatura

3. API/servicos
- padronizar geracao de cobranca externa nos endpoints modernos da fatura
- desativar ou encapsular o fechamento legado
- ajustar reprocessamento para o mesmo modelo

4. Paginas/componentes
- revisar apenas se alguma tela estiver assumindo a existencia da cobranca `MATRICULA/CARTAO_CONEXAO`

5. Testes manuais
- matricula com entrada pro-rata
- matricula com mensalidade cheia
- fechamento de fatura
- rebuild/reprocessamento
- vinculo manual de cobranca a fatura

6. Atualizacao do estado-atual-do-projeto.md
- registrar a correcao aplicada
- registrar a remocao do fluxo paralelo
- registrar a validacao pos-correcao
