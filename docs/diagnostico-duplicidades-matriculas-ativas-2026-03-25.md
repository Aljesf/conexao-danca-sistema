# Diagnóstico de Duplicidades de Matrículas Ativas

Data de referência: 2026-03-25

## Resumo executivo

O banco ativo possui **10 pessoas** com **20 matrículas ATIVAS** concorrentes.

Leitura consolidada:

- Todos os 20 registros já receberam backfill em `public.matricula_itens`.
- Todos os 20 casos estão apoiados em **item legado mínimo**; não há granularidade histórica real reconstruída além de `1 matrícula -> 1 item legado`.
- `19` das `20` matrículas têm pelo menos um vínculo operacional em `public.turma_aluno`.
- `12` das `20` matrículas têm sinal financeiro ativo no diagnóstico:
  - `11` com cobranças ligadas diretamente à matrícula.
  - `1` com lançamentos de Cartão Conexão por competência.
- Há **1 caso com forte indício de matrícula duplicada sem uso**.
- Há **9 casos que exigem análise manual obrigatória**, porque existe concorrência operacional e/ou financeira real entre as matrículas ativas.

Risco principal:

Manter essas duplicidades abertas inviabiliza uma proteção SQL mais rígida contra duas matrículas ativas por pessoa, porque o banco já contém concorrência operacional e financeira real em parte dos casos. A próxima etapa deve ser saneamento manual assistido, com decisão explícita sobre qual matrícula permanece como contêiner canônico de módulos.

Observação:

Os totais financeiros abaixo representam a soma das cobranças e recebimentos ligados à matrícula no banco, não apenas saldo atual em aberto.

## Visão geral por categoria

### Caso com candidato claro a saneamento

- **Anna Alissa Demétrio Cruz Fonseca** (`pessoa_id = 76`): a matrícula `#31` está sem turma operacional e sem reflexo financeiro; a `#13` concentra uso real. Sugestão conservadora: `MANTER_E_REMOVER_OUTRA`.

### Casos com duas matrículas ativas e financeiro em ambas

- **Ana Beatriz Lima do Nascimento** (`pessoa_id = 56`)
- **Lara Macapuna Nascimento** (`pessoa_id = 140`)

Leitura técnica:

Esses casos já têm concorrência financeira nos dois lados. Não são candidatos seguros para limpeza automática. Exigem decisão manual sobre qual matrícula será a canônica e como os módulos vinculados devem ser preservados.

### Casos com uma matrícula financeiramente carregada e outra operacional ativa sem financeiro constituído

- **Cibele Beatriz do Nascimento Costa** (`pessoa_id = 195`)
- **Emily Marcelly Monteiro da Silva** (`pessoa_id = 159`)
- **Evelin do Santos Costa** (`pessoa_id = 72`)
- **Fernanda Gabriella Figueiredo da Silva** (`pessoa_id = 105`)
- **Lunna Moura Monteiro** (`pessoa_id = 157`)
- **Maitê Braga de Andrade Santana** (`pessoa_id = 99`)
- **Vanessa Gomes dos Santos** (`pessoa_id = 184`)

Leitura técnica:

Nesses casos já existe uso operacional em ambas as matrículas, mas o financeiro foi constituído apenas em uma delas. Isso sugere fragmentação de módulos em matrículas separadas. O saneamento futuro precisa escolher a matrícula canônica e verificar se a outra deve ser encerrada após migração operacional.

### Casos possivelmente de teste

Nenhum dos 10 casos ficou classificado como **claramente teste** a partir dos sinais de matrícula, item, turma e financeiro. O caso de **Evelin do Santos Costa** exige cuidado porque o nome também apareceu na bateria de testes do festival, mas aqui a matrícula possui sinais reais de turma e cobrança. Portanto, **não** deve ser tratada como teste sem revisão humana adicional.

## Lista dos 10 casos

### 1. Ana Beatriz Lima do Nascimento

- `pessoa_id`: `56`
- Matrículas ativas: `#2`, `#103`
- Responsável: `Bruna do Socorro de Amorin de Lima`
- Leitura técnica: concorrência financeira e operacional nas duas matrículas. Caso ambíguo.
- Sugestão de ação: `ANALISE_MANUAL_OBRIGATORIA`

Resumo das matrículas:

- `#2`: `REGULAR`, `2026`, data da matrícula `2026-01-12`, turma de vínculo `Ballet Clássico - 3ª série/4ª série/+1 - Tarde - Seg/Qua - 2026`.
  Item: `#2`, origem `LEGADO`, descrição `Item legado - Ballet Clássico - 3ª série/4ª série/+1 - Tarde - Seg/Qua - 2026`, valor base/liquido `9.900`.
  Financeiro: `13` cobranças (`128.700`), `2` recebimentos (`19.800`), `0` lançamentos de Cartão Conexão.
- `#103`: `REGULAR`, `2026`, data da matrícula `2026-02-24`, turma de vínculo `Ballet Clássico - Pontas e Pas de Deux I - Noite - Sex - 2026`.
  Item: `#93`, origem `LEGADO`, descrição `Item legado - Ballet Clássico - Pontas e Pas de Deux I - Noite - Sex - 2026`, valor base/liquido `12.000`.
  Financeiro: `10` cobranças (`120.000`), `0` recebimentos, `0` lançamentos de Cartão Conexão.

### 2. Anna Alissa Demétrio Cruz Fonseca

- `pessoa_id`: `76`
- Matrículas ativas: `#13`, `#31`
- Responsável: `Halanna Denise de Oliveira Demétrio`
- Leitura técnica: `#13` concentra uso real; `#31` não tem turma operacional nem financeiro.
- Sugestão de ação: `MANTER_E_REMOVER_OUTRA`

Resumo das matrículas:

- `#13`: `REGULAR`, `2026`, data da matrícula `2026-01-14`, turma de vínculo `Ballet Clássico - 6ª série/7ª série - Noite - Seg/Qua - 2026`.
  Item: `#9`, origem `LEGADO`, descrição `Item legado - Ballet Clássico - 6ª série/7ª série - Noite - Seg/Qua - 2026`, valor base/liquido `30.334`.
  Operacional: `3` turmas ativas ligadas à matrícula.
  Financeiro: `11` cobranças (`333.674`), `1` recebimento (`30.334`), `0` lançamentos de Cartão Conexão.
- `#31`: `REGULAR`, `2026`, data da matrícula `2026-01-29`, turma de vínculo `Ballet Clássico - Pontas e Pas de Deux I - Noite - Sex - 2026`.
  Item: `#27`, origem `LEGADO`, descrição `Item legado - Ballet Clássico - Pontas e Pas de Deux I - Noite - Sex - 2026`, valor base/liquido `12.000`.
  Operacional: sem vínculo em `turma_aluno`.
  Financeiro: sem cobranças, sem recebimentos e sem lançamentos de Cartão Conexão.

### 3. Cibele Beatriz do Nascimento Costa

- `pessoa_id`: `195`
- Matrículas ativas: `#25`, `#50`
- Responsável: `Cledson Belo da Costa`
- Leitura técnica: uma matrícula com financeiro já constituído e outra com duas turmas operacionais sem financeiro.
- Sugestão de ação: `ANALISE_MANUAL_OBRIGATORIA`

Resumo das matrículas:

- `#25`: item `#21`, `LEGADO`, turma `Ballet Clássico - Pontas e Pas de Deux I - Noite - Sex - 2026`, valor `12.000`.
  Financeiro: `11` cobranças (`132.000`), `1` recebimento (`12.000`), sem lançamentos de Cartão Conexão.
- `#50`: item `#41`, `LEGADO`, turma inicial `Ballet Clássico - 6ª série/7ª série - Noite - Seg/Qua - 2026`, valor `44.000`.
  Operacional: `2` turmas ativas.
  Financeiro: sem cobranças, sem recebimentos e sem lançamentos.

### 4. Emily Marcelly Monteiro da Silva

- `pessoa_id`: `159`
- Matrículas ativas: `#101`, `#119`
- Responsável: `Rosely de Souza Monteiro`
- Leitura técnica: a matrícula `#101` mantém várias turmas operacionais; a `#119` já possui lançamentos de Cartão Conexão por competência.
- Sugestão de ação: `ANALISE_MANUAL_OBRIGATORIA`

Resumo das matrículas:

- `#101`: item `#91`, `LEGADO`, turma `Ballet Clássico - 3ª série/4ª série/+1 - Tarde - Seg/Qua - 2026`, valor `62.000`.
  Operacional: `3` turmas ativas.
  Financeiro: sem cobranças, sem recebimentos e sem lançamentos.
- `#119`: item `#100`, `LEGADO`, turma `Ballet Clássico - Pontas e Pas de Deux I - Noite - Sex - 2026`, valor `12.000`.
  Financeiro: `10` lançamentos de Cartão Conexão (`120.000`) nas competências `2026-03` a `2026-12`.

### 5. Evelin do Santos Costa

- `pessoa_id`: `72`
- Matrículas ativas: `#46`, `#113`
- Responsável: `Evelin do Santos Costa`
- Leitura técnica: há uso operacional real nas duas matrículas; não é seguro classificar como teste apenas pelo nome.
- Sugestão de ação: `ANALISE_MANUAL_OBRIGATORIA`

Resumo das matrículas:

- `#46`: item `#37`, `LEGADO`, turma `Hip Hop - 6ª Série/7ª Série  - Noite - Ter/Qui - 2026`, valor `18.000`.
  Financeiro: sem cobranças, sem recebimentos e sem lançamentos.
- `#113`: item `#99`, `LEGADO`, turma `Jazz Dance - 6ª Série/7ª Série  - Noite - Ter/Qui - 2026`, valor `15.000`.
  Financeiro: `9` cobranças (`135.000`), `0` recebimentos, `0` lançamentos de Cartão Conexão.

### 6. Fernanda Gabriella Figueiredo da Silva

- `pessoa_id`: `105`
- Matrículas ativas: `#30`, `#67`
- Responsável: `Gabrielle Ferreira Figueiredo`
- Leitura técnica: padrão de fragmentação semelhante ao de Cibele, com uma matrícula financeira e outra operacional.
- Sugestão de ação: `ANALISE_MANUAL_OBRIGATORIA`

Resumo das matrículas:

- `#30`: item `#26`, `LEGADO`, turma `Ballet Clássico - Pontas e Pas de Deux I - Noite - Sex - 2026`, valor `12.000`.
  Financeiro: `13` cobranças (`156.000`), `1` recebimento (`12.000`).
- `#67`: item `#58`, `LEGADO`, turma `Jazz Dance - 6ª Série/7ª Série  - Noite - Ter/Qui - 2026`, valor `22.000`.
  Financeiro: sem cobranças, sem recebimentos e sem lançamentos.

### 7. Lara Macapuna Nascimento

- `pessoa_id`: `140`
- Matrículas ativas: `#19`, `#104`
- Responsável: `Karla Paulo do Nascimento`
- Leitura técnica: concorrência financeira e operacional nos dois lados. Caso de alto cuidado.
- Sugestão de ação: `ANALISE_MANUAL_OBRIGATORIA`

Resumo das matrículas:

- `#19`: item `#15`, `LEGADO`, turma `Ballet Clássico - 1ª série/2ª série - Tarde - Seg/Qua - 2026`, valor `22.000`.
  Financeiro: `13` cobranças (`282.700`), `2` recebimentos (`40.700`).
- `#104`: item `#94`, `LEGADO`, turma `Jazz Dance - 1ª Série/2ª Série  - Tarde - Ter/Qui - 2026`, valor `15.000`.
  Financeiro: `11` cobranças (`165.000`), `1` recebimento (`15.000`).

### 8. Lunna Moura Monteiro

- `pessoa_id`: `157`
- Matrículas ativas: `#24`, `#56`
- Responsável: `Maria de Nazaré de Sousa Moura Monteiro`
- Leitura técnica: uma matrícula com financeiro constituído e outra com uso operacional sem financeiro.
- Sugestão de ação: `ANALISE_MANUAL_OBRIGATORIA`

Resumo das matrículas:

- `#24`: item `#20`, `LEGADO`, turma `Ballet Clássico - 3ª série/4ª série/+1 - Tarde - Seg/Qua - 2026`, valor `11.000`.
  Financeiro: `11` cobranças (`121.000`), `1` recebimento (`11.000`).
- `#56`: item `#47`, `LEGADO`, turma `Jazz Dance - 3ª Série/4ª Série /+1 - Tarde - Ter/Qui - 2026`, valor `22.000`.
  Financeiro: sem cobranças, sem recebimentos e sem lançamentos.

### 9. Maitê Braga de Andrade Santana

- `pessoa_id`: `99`
- Matrículas ativas: `#22`, `#88`
- Responsável: `Adryele de Souza Braga`
- Leitura técnica: uma matrícula financeira já aberta e outra operacional ativa sem financeiro.
- Sugestão de ação: `ANALISE_MANUAL_OBRIGATORIA`

Resumo das matrículas:

- `#22`: item `#18`, `LEGADO`, turma `Jazz Dance - 3ª Série/4ª Série /+1 - Tarde - Ter/Qui - 2026`, valor `15.000`.
  Financeiro: `11` cobranças (`165.000`), `0` recebimentos, `0` lançamentos de Cartão Conexão.
- `#88`: item `#78`, `LEGADO`, turma `Ballet Clássico - 3ª série/4ª série/+1 - Tarde - Seg/Qua - 2026`, valor `22.000`.
  Financeiro: sem cobranças, sem recebimentos e sem lançamentos.

### 10. Vanessa Gomes dos Santos

- `pessoa_id`: `184`
- Matrículas ativas: `#81`, `#106`
- Responsável: `Vânia do Socorro Gomes Corrêa`
- Leitura técnica: a `#81` sustenta três vínculos operacionais; a `#106` concentra o financeiro.
- Sugestão de ação: `ANALISE_MANUAL_OBRIGATORIA`

Resumo das matrículas:

- `#81`: item `#71`, `LEGADO`, turma `Ballet Clássico - 3ª série/4ª série/+1 - Tarde - Seg/Qua - 2026`, valor `62.000`.
  Operacional: `3` turmas ativas.
  Financeiro: sem cobranças, sem recebimentos e sem lançamentos.
- `#106`: item `#96`, `LEGADO`, turma `Ballet Clássico - Pontas e Pas de Deux I - Noite - Sex - 2026`, valor `12.000`.
  Financeiro: `10` cobranças (`120.000`), `1` recebimento (`12.000`).

## Próxima etapa sugerida

Saneamento manual assistido, por menor risco:

1. Validar e limpar primeiro o caso de **Anna Alissa** (`#31`), que já aparece como duplicidade sem uso.
2. Depois atacar os **7 casos com uma matrícula financeiramente carregada e outra operacional ativa sem financeiro**, porque a decisão costuma ser preservar uma matrícula canônica e migrar o módulo/turma da outra.
3. Deixar por último os **2 casos com financeiro ativo nas duas matrículas** (`Ana Beatriz` e `Lara`), porque exigem revisão mais cuidadosa de cobranças e recebimentos já constituídos.

## Conclusão

O banco ativo ainda não está pronto para uma proteção estrutural mais forte contra duas matrículas ativas por pessoa. O diagnóstico mostra que quase todos os casos têm uso real e precisam de decisão manual. Nesta rodada, apenas **Anna Alissa Demétrio Cruz Fonseca** apresenta um candidato claro e conservador para saneamento direto.
