# Relatorio Decisorio Final - Duplicidades Remanescentes

## Grupos FATURA_DUPLA
- Alanna Costa Alves, pessoa `85`, valor `12000`, ids `[241, 376]`, ids vinculados `[241, 376]`, ordem `241 -> 376`, decisao sugerida final: nao cancelar automaticamente. As duas cobrancas estao vinculadas a faturas distintas (`2026-02` e `2026-03`), entao o grupo heuristico e falso positivo por `competencia_ano_mes` nula.
- Barbara Lilian Miranda de Souza, pessoa `46`, valor `16500`, ids `[240, 377]`, ids vinculados `[240, 377]`, ordem `240 -> 377`, decisao sugerida final: nao cancelar automaticamente. As duas cobrancas canônicas pertencem a faturas distintas (`2026-02` e `2026-03`).
- Halanna Denise de Oliveira Demetrio, pessoa `75`, valor `30334`, ids `[242, 373]`, ids vinculados `[242, 373]`, ordem `242 -> 373`, decisao sugerida final: nao cancelar automaticamente. As duas cobrancas canônicas pertencem a faturas distintas (`2026-02` e `2026-03`).
- Maria de Nazare de Sousa Moura Monteiro, pessoa `156`, valor `11000`, ids `[234, 371]`, ids vinculados `[234, 371]`, ordem `234 -> 371`, decisao sugerida final: nao cancelar automaticamente. As duas cobrancas canônicas pertencem a faturas distintas (`2026-02` e `2026-03`).
- Maria Madalena de Vasconcelos, pessoa `79`, valor `16500`, ids `[243, 375]`, ids vinculados `[243, 375]`, ordem `243 -> 375`, decisao sugerida final: nao cancelar automaticamente. As duas cobrancas canônicas pertencem a faturas distintas (`2026-02` e `2026-03`).
- Tedy de Figueiredo da Costa Pinheiro, pessoa `87`, valor `12000`, ids `[231, 370]`, ids vinculados `[231, 370]`, ordem `231 -> 370`, decisao sugerida final: nao cancelar automaticamente. As duas cobrancas canônicas pertencem a faturas distintas (`2026-02` e `2026-03`).

## Grupo TRIPLA_OU_MAIS
- Carla Velasco Silvestre Lujan, pessoa `59`, valor `42000`, ids `[25, 245, 374]`, ids vinculados `[245, 374]`, ordem `25 -> 245 -> 374`, decisao sugerida final: revisao manual. Os ids `245` e `374` pertencem a faturas distintas (`2026-02` e `2026-03`). O id `25` e uma cobranca historica de matricula sem competencia explicita e ficou fora de qualquer cancelamento automatico.

## Criterio adotado
- O agrupamento heuristico original por `pessoa_id + competencia_ano_mes + valor_centavos` continua produzindo falsos positivos quando a cobranca canônica da fatura tem `competencia_ano_mes` nula.
- Para decidir o saneamento final, o criterio real considerado foi `pessoa_id + competencia_real + valor_centavos`, onde `competencia_real` = `cobrancas.competencia_ano_mes` ou `credito_conexao_faturas.periodo_referencia`.
- Quando existe par `MATRICULA/CARTAO_CONEXAO` versus `FATURA_CREDITO_CONEXAO` na mesma competencia real:
  - se a cobranca legado nao tem recebimento e a canônica esta vinculada a fatura, o cancelamento legado e seguro;
  - se a cobranca legado ja possui recebimento, o caso fica em revisao manual porque exigiria migracao ou compensacao de recebimento antes do cancelamento.

## Achado complementar decisivo
- A auditoria por competencia real encontrou `27` grupos ativos com duplicidade real entre legado `MATRICULA/CARTAO_CONEXAO` e cobranca canônica `FATURA_CREDITO_CONEXAO`.
- Desses, `14` legados estao sem recebimento e podem compor um lote seguro de cancelamento manual.
- Outros `13` legados ja possuem recebimento e nao devem ser cancelados automaticamente nesta etapa.

## Lote final proposto para cancelamento
- IDs seguros propostos: `50, 51, 72, 73, 116, 117, 127, 149, 160, 172, 193, 217, 261, 338`
- Justificativa comum: todos sao `MATRICULA/CARTAO_CONEXAO`, sem vinculo em `credito_conexao_faturas`, sem recebimento registrado, e possuem par canônico vinculado para a mesma competencia real.

## Casos que permaneceriam em revisao manual
- IDs legado com recebimento: `26, 27, 38, 61, 138, 171, 182, 204, 205, 247, 274, 302, 402`
- Cada um desses ids tem cobranca canônica correspondente na mesma competencia real, mas ja possui recebimento. O cancelamento depende de migracao/compensacao do recebimento para a cobranca canônica.
- O id `25` permanece em revisao manual separada por ausencia de competencia explicita e por nao se enquadrar em lote seguro.
