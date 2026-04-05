# Diagnostico Tecnico -- Causa Raiz da Duplicidade de Cobrancas

## 1. Resumo executivo

O problema observado no banco foi a coexistencia de cobrancas equivalentes para a mesma pessoa e o mesmo valor, com dois padroes principais: `MATRICULA` x `FATURA_CREDITO_CONEXAO` e `FATURA_CREDITO_CONEXAO` duplicada. O lote 1 ja saneou os 6 casos revisaveis de `MATRICULA_X_FATURA`. O padrao remanescente ficou concentrado em `FATURA_DUPLA` e `TRIPLA_OU_MAIS`.

Pelo codigo, a causa mais forte nao e uma duplicidade interna simples do fluxo de matricula. O que existe e a combinacao de dois fluxos validos que criam cobranca para a mesma obrigacao sem coordenacao entre si:

- a matricula cria cobranca mensal com `origem_tipo = 'MATRICULA'` e `origem_subtipo = 'CARTAO_CONEXAO'`;
- o fechamento/geracao de cobranca da fatura cria ou mantem outra cobranca canonica com `origem_tipo = 'FATURA_CREDITO_CONEXAO'` ou legado `CREDITO_CONEXAO_FATURA`.

## 2. Fluxo real da matricula

Arquivo principal: `C:/Users/aliri/conexao-dados/src/app/api/matriculas/novo/route.ts`

Passo a passo relevante:

1. A rota cria a matricula e persiste execucoes/bolsas.
2. Ao final, chama `liquidarPrimeiraMatricula(...)`.
3. O modo automatico vira `LANCAR_NO_CARTAO` quando `resumoCusteio.familia_centavos > 0`, e `MOVIMENTO` quando a familia nao paga nada.
4. O tipo da primeira cobranca vem de `calcularPrimeiraCobranca(...)`, com branch para:
   - `ENTRADA_PRORATA`
   - `MENSALIDADE_CHEIA_CARTAO`

Arquivo executor real: `C:/Users/aliri/conexao-dados/src/app/api/matriculas/liquidacao-primeira/route.ts`

Onde nasce cobranca:

- Em `ensureCobrancaCartaoConexao(...)`, a mensalidade da matricula e criada/atualizada em `public.cobrancas` com:
  - `origem_tipo = 'MATRICULA'`
  - `origem_subtipo = 'CARTAO_CONEXAO'`
  - `origem_id = matriculaId`
  - `competencia_ano_mes = competencia`

Onde nasce lancamento:

- Logo depois, o fluxo chama `upsertLancamentoPorCobranca(...)`, que grava em `credito_conexao_lancamentos` por `cobranca_id`.
- Em seguida, vincula esse lancamento na fatura via `vincularLancamentoNaFatura(...)`.

Branchs relevantes:

- `ENTRADA_PRORATA` pode gerar entrada no ato e, se houver mensalidades da familia, disparar `gerarMensalidadesCartao()`.
- `MENSALIDADE_CHEIA_CARTAO` no modo `LANCAR_NO_CARTAO` cria cobranca da matricula para a competencia cheia e vincula o lancamento na fatura.

Risco de duplicidade encontrado:

- O helper `ensureCobrancaCartaoConexao(...)` protege apenas o universo `MATRICULA + CARTAO_CONEXAO + matriculaId + competencia`.
- Ele nao olha se ja existe cobranca canonica da fatura para a mesma pessoa/competencia/valor.
- Portanto, dentro do fluxo da matricula ha alguma idempotencia local, mas nao ha idempotencia entre matricula e fatura.

Sobre `vinculos_ids` e multiplas unidades de execucao:

- O fluxo de composicao agrega turmas/unidades, soma o total e chama `ensureCobrancaCartaoConexao(...)` uma vez por competencia.
- Isso indica que `vinculos_ids` e multiplas UEs, por si so, nao explicam o padrao principal de duplicidade `MATRICULA_X_FATURA`.
- Eles podem aumentar a complexidade operacional, mas o helper ainda reutiliza a mesma cobranca da matricula por competencia.

## 3. Fluxo real da Conta Interna

Arquivo inicial analisado: `C:/Users/aliri/conexao-dados/src/app/api/financeiro/credito-conexao/cobrancas/vincular-fatura/route.ts`

Conclusao sobre essa rota:

- ela nao cria cobranca nova;
- ela apenas vincula uma cobranca existente a uma fatura;
- ela tem protecao contra `fatura` ja ocupada por outra cobranca;
- ela limpa vinculos anteriores da mesma cobranca antes de reatribuir.

Pontos reais de criacao/consolidacao de cobranca da fatura:

### Fechamento moderno / geracao moderna

Arquivos:

- `C:/Users/aliri/conexao-dados/src/app/api/financeiro/credito-conexao/faturas/[id]/fechar/route.ts`
- `C:/Users/aliri/conexao-dados/src/app/api/financeiro/credito-conexao/faturas/[id]/gerar-cobranca/route.ts`

Comportamento:

- tentam localizar cobranca existente por:
  - `fatura.cobranca_id`, ou
  - `origem_tipo in ('FATURA_CREDITO_CONEXAO', 'CREDITO_CONEXAO_FATURA') and origem_id = fatura.id`
- se encontrarem, fazem update da cobranca existente;
- se nao encontrarem, criam nova cobranca canonica da fatura via `upsertCobrancaLocal(...)`;
- depois atualizam `credito_conexao_faturas.cobranca_id`.

Risco de duplicidade:

- esses fluxos nao consideram a cobranca criada pela matricula, porque ela tem `origem_tipo = 'MATRICULA'` e `origem_subtipo = 'CARTAO_CONEXAO'`;
- portanto, para a mesma obrigacao financeira, o fechamento da fatura enxerga “nao existe cobranca da fatura” e cria uma nova.

### Fechamento legado

Arquivo:

- `C:/Users/aliri/conexao-dados/src/app/api/financeiro/credito-conexao/faturas/fechar/route.ts`

Comportamento:

- cria a fatura;
- chama `criarCobrancaLocalEEnviarNeofin(...)`;
- esse helper sempre faz `insert` em `public.cobrancas` antes de integrar com Neofin;
- a identidade usada no provider e `integrationIdentifier`, mas nao existe lookup previo local para reaproveitar cobranca.

Risco de duplicidade:

- se esse fluxo legado continuar acessivel, ele amplia o risco porque cria cobranca nova sem a politica de reaproveitamento do fluxo moderno.

### Rebuild/reprocessamento

Arquivo:

- `C:/Users/aliri/conexao-dados/src/app/api/escola/matriculas/[id]/reprocessar-financeiro/route.ts`

Comportamento:

- recria ou atualiza cobrancas mensais com `origem_tipo = 'MATRICULA'` e `origem_subtipo = 'CARTAO_CONEXAO'`;
- faz `upsertLancamentoPorCobranca(...)`;
- opcionalmente executa rebuild de fatura.

Risco de duplicidade:

- bloqueia reprocessamento se ja existirem cobrancas `MATRICULA/CARTAO_CONEXAO` da mesma matricula/competencia;
- mas continua sem coordenacao com a cobranca canonica de fatura.

### Idempotencia encontrada

Existe idempotencia parcial:

- `upsertLancamentoPorCobranca(...)` protege por `credito_conexao_lancamentos.cobranca_id`;
- `ensureCobrancaCartaoConexao(...)` protege por `pessoa_id + origem_tipo=MATRICULA + origem_id=matriculaId + origem_subtipo=CARTAO_CONEXAO + competencia`;
- `resolveCobrancaExistente(...)` protege o fluxo de fatura apenas dentro do universo de cobrancas de origem fatura.

Idempotencia ausente:

- nao existe guarda logica transversal por `pessoa + competencia + natureza da obrigacao + valor`;
- nao existe reaproveitamento da cobranca de matricula quando a fatura e fechada;
- nao existe constraint SQL que impeca duas cobrancas paralelas com identidades diferentes para a mesma mensalidade.

## 4. Hipotese principal da causa raiz

A hipotese mais forte, suportada pelo codigo real, e:

**combinacao de dois fluxos validos sem coordenacao: a matricula gera indevidamente uma cobranca operacional de mensalidade cheia (`MATRICULA/CARTAO_CONEXAO`) e o fechamento/rebuild da fatura gera a cobranca canonica da fatura (`FATURA_CREDITO_CONEXAO` ou `CREDITO_CONEXAO_FATURA`) sem reaproveitar a cobranca ja criada.**

Fatores que sustentam essa hipotese:

- a matricula cria cobranca mensal completa para a Conta Interna;
- a fatura fecha/gera cobranca usando outra identidade logica;
- a busca de cobranca existente no fluxo da fatura nao considera a cobranca da matricula;
- o reprocessamento repete o mesmo padrao de cobranca `MATRICULA/CARTAO_CONEXAO`;
- nao ha guarda de unicidade logica transversal no banco ou no codigo.

## 5. Arquivos criticos encontrados

- `C:/Users/aliri/conexao-dados/src/app/api/matriculas/novo/route.ts`
- `C:/Users/aliri/conexao-dados/src/lib/matriculas/liquidarPrimeiraMatricula.ts`
- `C:/Users/aliri/conexao-dados/src/app/api/matriculas/liquidacao-primeira/route.ts`
- `C:/Users/aliri/conexao-dados/src/lib/credito-conexao/upsertLancamentoPorCobranca.ts`
- `C:/Users/aliri/conexao-dados/src/app/api/financeiro/credito-conexao/cobrancas/vincular-fatura/route.ts`
- `C:/Users/aliri/conexao-dados/src/app/api/financeiro/credito-conexao/faturas/[id]/fechar/route.ts`
- `C:/Users/aliri/conexao-dados/src/app/api/financeiro/credito-conexao/faturas/[id]/gerar-cobranca/route.ts`
- `C:/Users/aliri/conexao-dados/src/app/api/financeiro/credito-conexao/faturas/fechar/route.ts`
- `C:/Users/aliri/conexao-dados/src/lib/cobrancasNeofin.ts`
- `C:/Users/aliri/conexao-dados/src/app/api/escola/matriculas/[id]/reprocessar-financeiro/route.ts`
- `C:/Users/aliri/conexao-dados/src/lib/financeiro/creditoConexaoFaturas.ts`

## 6. Correcao recomendada

Sem implementar ainda, o ponto que precisa virar fonte unica e a cobranca canonica da fatura da Conta Interna.

Recomendacoes:

- a rota de matricula nao deve criar cobranca mensal cheia em `public.cobrancas` para a Conta Interna;
- a matricula deve gerar apenas lancamento/agenda de faturamento, deixando a cobranca externa nascer exclusivamente do fechamento/geracao de cobranca da fatura;
- deve existir guarda de idempotencia transversal entre matricula e fatura, no minimo em codigo, e idealmente apoiada por protecao SQL;
- o fluxo legado `src/app/api/financeiro/credito-conexao/faturas/fechar/route.ts` deve ser removido, desativado ou redirecionado para o fluxo moderno;
- reprocessamento financeiro de matricula nao deve recriar cobranca `MATRICULA/CARTAO_CONEXAO` se a estrategia alvo for fatura canonica.
