# Revisao do Modulo Financeiro de Colaboradores

## Contexto e objetivo
Este documento inventaria o estado atual do modulo "Financeiro de Colaboradores" no projeto, cobrindo:
1. Folha/salarios (declaracao de valores + geracao de folhas)
2. Cartao Conexao Colaborador (lancamentos + faturas + vinculo com folha)
3. Frequencia/jornada do colaborador (tabelas, APIs e paginas)

Escopo desta revisao: somente leitura e inventario, sem alteracao de regra de negocio.

Fonte principal de schema usada: `schema-supabase.sql` na raiz do repositorio.
Observacao: caminho `/mnt/data/schema-supabase.sql` NAO ENCONTRADO neste workspace.

## Achados no Banco (tabelas/colunas/relacionamentos)

### 1) Folha de colaboradores
- `folha_pagamento_colaborador` em `schema-supabase.sql:1396`
  - Colunas chave: `id`, `competencia_ano_mes`, `colaborador_id`, `status`, `data_fechamento`, `data_pagamento`, `observacoes`
- `folha_pagamento_eventos` em `schema-supabase.sql:1411`
  - Colunas chave: `folha_pagamento_id`, `tipo`, `descricao`, `valor_centavos`, `origem_tipo`, `origem_id`

### 2) Cartao Conexao
- `credito_conexao_contas` em `schema-supabase.sql:652`
  - Colunas chave: `id`, `pessoa_titular_id`, `tipo_conta`, `dia_fechamento`, `dia_vencimento`, limites
- `credito_conexao_faturas` em `schema-supabase.sql:683`
  - Colunas chave: `conta_conexao_id`, `periodo_referencia`, `status`, `valor_total_centavos`, `valor_taxas_centavos`, `cobranca_id`, `folha_pagamento_id`
- `credito_conexao_lancamentos` em `schema-supabase.sql:702`
  - Colunas chave: `conta_conexao_id`, `origem_sistema`, `origem_id`, `valor_centavos`, `competencia`, `status`, `cobranca_id`
- `credito_conexao_fatura_lancamentos` em `schema-supabase.sql:674`
  - Pivot de fatura x lancamentos

### 3) Colaborador/jornada/frequencia
- `colaboradores` em `schema-supabase.sql:506`
- `colaborador_jornada` em `schema-supabase.sql:478`
- `colaborador_jornada_dias` em `schema-supabase.sql:492`
- `config_pagamento_colaborador` em `schema-supabase.sql:521`
- `modelos_pagamento_colaborador` em `schema-supabase.sql:2366`
- Frequencia academica existente (alunos): `turma_aula_presencas` em `schema-supabase.sql:3200`

### 4) Relacionamentos/FKs relevantes (evidencia em tipos gerados)
Observacao: `schema-supabase.sql` nao traz DDL de FKs de forma legivel em todos os casos; para evidenciar relacoes foi usada a tipagem gerada do Supabase.

- `colaborador_jornada.colaborador_id -> colaboradores.id`
  - `src/types/supabase.generated.ts:851`
- `colaborador_jornada_dias.jornada_id -> colaborador_jornada.id`
  - `src/types/supabase.generated.ts:906`
- `config_pagamento_colaborador.colaborador_id -> colaboradores.id`
  - `src/types/supabase.generated.ts:1005`
- `config_pagamento_colaborador.modelo_pagamento_id -> modelos_pagamento_colaborador.id`
  - `src/types/supabase.generated.ts:1005`
- `credito_conexao_faturas.cobranca_id -> cobrancas.id`
  - `src/types/supabase.generated.ts:1570`
- `credito_conexao_faturas.conta_conexao_id -> credito_conexao_contas.id`
  - `src/types/supabase.generated.ts:1570`
- `credito_conexao_lancamentos.cobranca_id -> cobrancas.id`
  - `src/types/supabase.generated.ts:1570`

### 5) Nao encontrado no schema
- Tabela explicita de `holerite`/`holerites`: NAO ENCONTRADO
- Tabela explicita de `prolabore`: NAO ENCONTRADO
- Tabela explicita de `remuneracao`/`salario` de folha final: NAO ENCONTRADO

## Achados em APIs (rotas e responsabilidades)

### A) Folha de colaboradores
- `GET /api/admin/folha/colaboradores`
  - Arquivo: `src/app/api/admin/folha/colaboradores/route.ts:29`
  - Lista folhas por `competencia_ano_mes`
  - Tabela: `folha_pagamento_colaborador`
- `POST /api/admin/folha/colaboradores`
  - Arquivo: `src/app/api/admin/folha/colaboradores/route.ts:58`
  - Abre folha por `competencia_ano_mes + colaborador_id` (idempotente por par)
  - Tabela: `folha_pagamento_colaborador`
- `GET /api/admin/folha/colaboradores/:id`
  - Arquivo: `src/app/api/admin/folha/colaboradores/[id]/route.ts:36`
  - Detalhe da folha e eventos
  - Tabelas: `folha_pagamento_colaborador`, `folha_pagamento_eventos`
- `POST /api/admin/folha/colaboradores/:id/eventos`
  - Arquivo: `src/app/api/admin/folha/colaboradores/[id]/eventos/route.ts:24`
  - Cria evento manual `PROVENTO`/`DESCONTO` somente com folha `ABERTA`
  - Tabela: `folha_pagamento_eventos`
- `POST /api/admin/folha/colaboradores/:id/fechar`
  - Arquivo: `src/app/api/admin/folha/colaboradores/[id]/fechar/route.ts:13`
  - Fecha folha (`status=FECHADA`, `data_fechamento`)
  - Tabela: `folha_pagamento_colaborador`
- `POST /api/admin/folha/colaboradores/:id/importar-faturas`
  - Arquivo: `src/app/api/admin/folha/colaboradores/[id]/importar-faturas/route.ts:38`
  - Busca conta do colaborador por `tipo_conta='COLABORADOR'` (`:94`)
  - Importa faturas abertas da mesma competencia (`periodo_referencia`)
  - Seta `credito_conexao_faturas.folha_pagamento_id` e cria evento `DESCONTO` com origem `CREDITO_CONEXAO_FATURA` (`:173-178`)

### B) Cartao Conexao (contas/faturas/lancamentos)
- `GET/POST /api/financeiro/credito-conexao/contas`
  - Arquivo: `src/app/api/financeiro/credito-conexao/contas/route.ts:7` e `:122`
  - Suporta `tipo_conta` em `ALUNO|COLABORADOR` (`:154`)
  - Tabela: `credito_conexao_contas` (+ join em `pessoas`)
- `GET /api/financeiro/credito-conexao/faturas`
  - Arquivo: `src/app/api/financeiro/credito-conexao/faturas/route.ts:7`
  - Lista com filtro por conta/periodo/status
  - Tabela: `credito_conexao_faturas`
- `GET /api/financeiro/credito-conexao/faturas/:id`
  - Arquivo: `src/app/api/financeiro/credito-conexao/faturas/[id]/route.ts:5`
- `GET /api/financeiro/credito-conexao/faturas/:id/lancamentos`
  - Arquivo: `src/app/api/financeiro/credito-conexao/faturas/[id]/lancamentos/route.ts:5`
- `POST /api/financeiro/credito-conexao/faturas/:id/fechar`
  - Arquivo: `src/app/api/financeiro/credito-conexao/faturas/[id]/fechar/route.ts:156`
  - Fecha/recalcula fatura, cria/atualiza cobranca `origem_tipo='CREDITO_CONEXAO_FATURA'` (`:322`, `:346`)
  - Integracao Neofin no fechamento (`:396+`)
  - Observacao: comportamento com cobranca e mais orientado a `ALUNO` no fluxo operacional
- `POST /api/financeiro/credito-conexao/faturas/fechar`
  - Arquivo: `src/app/api/financeiro/credito-conexao/faturas/fechar/route.ts:21`
  - Fecha por conta+periodo; cria cobranca somente para `conta.tipo_conta === 'ALUNO'` (`:217`)
- `GET /api/credito-conexao/faturas` e `GET /api/credito-conexao/faturas/:id`
  - Arquivos: `src/app/api/credito-conexao/faturas/route.ts:74`, `src/app/api/credito-conexao/faturas/[id]/route.ts:44`
  - Endpoints usados pelas telas admin de faturas
- `POST /api/credito-conexao/fechar-faturas`
  - Arquivo: `src/app/api/credito-conexao/fechar-faturas/route.ts:18`
  - Fechamento em lote por competencia, com filtro opcional `tipo_conta` (`ALUNO|COLABORADOR`)
- `POST /api/credito-conexao/rebuild-fatura`
  - Arquivo: `src/app/api/credito-conexao/rebuild-fatura/route.ts:20`
  - Reconstrucao de pivot fatura/lancamentos por conta+competencia
- `POST /api/credito-conexao/gerar-lancamentos-mensais`
  - Arquivo: `src/app/api/credito-conexao/gerar-lancamentos-mensais/route.ts`
  - Gera lancamento mensal de matricula; usa conta `tipo_conta='ALUNO'` (`:183`)

### C) Integracoes de consumo (Loja/Cafe -> Cartao Conexao)
- `POST /api/loja/vendas`
  - Arquivo: `src/app/api/loja/vendas/route.ts:205`
  - Suporta `cartao_conexao_tipo_conta` no payload (`:243`, `:747`)
  - Cria cobranca com `origem_subtipo='CARTAO_CONEXAO'` (`:705`)
  - Faz upsert em `credito_conexao_lancamentos` via helper (`:757`)
- `POST /api/cafe/vendas`
  - Arquivo: `src/app/api/cafe/vendas/route.ts:223`
  - Suporta `tipo_conta/cartao_conexao_tipo_conta` (`:312-313`, `:831`)
  - Cria cobranca com `origem_subtipo='CARTAO_CONEXAO'` (`:789`)
  - Faz upsert em `credito_conexao_lancamentos` (`:840`)
- Helper canonico de lancamento por cobranca:
  - `src/lib/credito-conexao/upsertLancamentoPorCobranca.ts`

### D) Pagamento/recebimento de cobrancas e efeito em faturas
- `POST /api/financeiro/cobrancas/registrar-pagamento-presencial`
  - Arquivo: `src/app/api/financeiro/cobrancas/registrar-pagamento-presencial/route.ts`
  - Trata caso `origem_tipo='CREDITO_CONEXAO_FATURA'` e valida que ha lancamentos vinculados
- `POST /api/financeiro/cobrancas-avulsas/:id/registrar-recebimento`
  - Arquivo: `src/app/api/financeiro/cobrancas-avulsas/[id]/registrar-recebimento/route.ts`
  - Aceita meios `CARTAO_CONEXAO_ALUNO` e `CARTAO_CONEXAO_COLABORADOR`

### E) APIs de jornada/frequencia do colaborador
- APIs dedicadas a `colaborador_jornada` / `colaborador_jornada_dias`: NAO ENCONTRADO
- APIs de frequencia encontradas sao de diario de classe (alunos), nao de ponto de colaborador.

## Achados em Paginas/Componentes (rotas e UX)

### A) Folha de colaboradores (UI)
- Lista/abertura de folha:
  - `src/app/(private)/admin/financeiro/folha/colaboradores/page.tsx`
  - URL: `/admin/financeiro/folha/colaboradores`
  - Fluxo atual: operador informa `competencia` + `colaborador_id` manual e abre folha
  - Endpoints: `GET/POST /api/admin/folha/colaboradores`
- Detalhe de folha:
  - `src/app/(private)/admin/financeiro/folha/colaboradores/[id]/page.tsx`
  - URL: `/admin/financeiro/folha/colaboradores/:id`
  - Acoes: importar faturas, fechar folha, adicionar evento manual
  - Endpoints: `GET /api/admin/folha/colaboradores/:id`, `POST .../importar-faturas`, `POST .../fechar`, `POST .../eventos`

### B) Cartao Conexao (UI)
- Contas:
  - `src/app/(private)/admin/financeiro/credito-conexao/contas/page.tsx`
  - URL: `/admin/financeiro/credito-conexao/contas`
  - Permite criar conta `ALUNO` e `COLABORADOR`
- Faturas (lista):
  - `src/app/(private)/admin/financeiro/credito-conexao/faturas/page.tsx`
  - URL: `/admin/financeiro/credito-conexao/faturas`
  - Consome `/api/credito-conexao/faturas`
- Faturas (detalhe):
  - `src/app/(private)/admin/financeiro/credito-conexao/faturas/[id]/page.tsx`
  - URL: `/admin/financeiro/credito-conexao/faturas/:id`
  - Consome `/api/credito-conexao/faturas/:id`

### C) Jornada/frequencia colaborador (UI)
- `src/app/(private)/admin/config/colaboradores/jornadas/page.tsx` -> carrega componente placeholder
- `src/app/(private)/admin/config/colaboradores/_components/JornadasPage.tsx:13`
  - Mensagem: "Esta tela ainda sera implementada."
- `src/app/(private)/admin/colaboradores/jornadas/page.tsx:4`
  - Redireciona para `/admin/config/colaboradores/jornadas`

### D) Frequencia existente (nao colaborador)
- `src/app/(private)/escola/diario-de-classe/page.tsx`
- API de alunos da turma: `src/app/api/professor/diario-de-classe/turmas/[turmaId]/alunos/route.ts`
  - Separa `alunos_ativos` vs `alunos_historico` por `matricula_status == 'ATIVA'` (`:54-56`)

## Situacao atual (como esta funcionando hoje)

### 1) Folha/salarios
- O sistema hoje trabalha com entidade de folha por colaborador+competencia (`folha_pagamento_colaborador`).
- Nao existe entidade separada de holerite consolidado mensal por unidade/centro com fechamento em lote.
- Eventos de folha (`folha_pagamento_eventos`) sao a base de composicao do liquido.
- Importacao de faturas do Cartao Conexao Colaborador ja existe e gera eventos de desconto na folha.

### 2) Cartao Conexao Colaborador
- Existem contas `tipo_conta='COLABORADOR'`.
- Loja/Cafe conseguem gerar cobranca + lancamento para Cartao Conexao com metadado de tipo de conta.
- Faturas possuem campo `folha_pagamento_id` e ha endpoint que vincula faturas abertas a folha individual.
- Fechamento de fatura com cobranca externa (Neofin/cobranca) esta mais orientado ao fluxo ALUNO em partes do modulo.

### 3) Frequencia/jornada de colaborador
- Estrutura de banco existe (`colaborador_jornada`, `colaborador_jornada_dias`).
- Pagina de jornadas esta em placeholder.
- Nao foram encontradas APIs operacionais de jornada/ponto do colaborador.
- Frequencia efetivamente implementada hoje no front/API observada e de diario de classe (alunos).

## Lacunas / problemas provaveis

1. Folha "individual" vs expectativa "mensal por fatura"
- Abertura de folha exige `colaborador_id` explicitamente (`/api/admin/folha/colaboradores`), o que reforca um processo individual.
- Nao ha endpoint de fechamento/lote mensal com consolidacao global por competencia.

2. Config de pagamento de colaborador sem uso operacional
- `config_pagamento_colaborador` e `modelos_pagamento_colaborador` existem no schema/tipos, mas nao aparecem em fluxo API/UI principal identificado.

3. Jornada/frequencia colaborador incompleta
- Banco modelado, porem sem API/UI funcional de manutencao/uso.

4. Divergencia de fluxo ALUNO x COLABORADOR no fechamento de fatura
- Parte dos endpoints de fechamento/cobranca cria cobranca explicitamente para ALUNO; para COLABORADOR, fluxo fica dependente da importacao para folha e pode gerar comportamento nao uniforme.

5. Dependencia de input manual de ID na folha
- UX atual exige digitar `colaborador_id`, favorecendo erro operacional e dificultando processo de fechamento mensal em escala.

## Estrategia recomendada (proximos passos em ordem: SQL -> API -> UI)

### Etapa 1 - SQL (estabilizacao de modelo)
1. Definir entidade canonica de competencia de folha (cabecalho mensal), separando:
- competencia
- abrangencia (todos colaboradores elegiveis)
- status de processamento
2. Formalizar relacoes e constraints de vinculo folha <-> faturas colaborador (incluindo unicidade por competencia quando aplicavel).
3. Revisar uso efetivo de `config_pagamento_colaborador`/`modelos_pagamento_colaborador` (manter e integrar ou descontinuar).

### Etapa 2 - API (orquestracao)
1. Criar endpoint de geracao em lote por competencia (nao apenas por colaborador).
2. Criar endpoint de "importar faturas do mes" para todos colaboradores elegiveis.
3. Garantir fechamento idempotente e trilha clara de status por competencia.
4. Uniformizar tratamento ALUNO/COLABORADOR no ciclo de fatura e pagamento.

### Etapa 3 - UI (operacao)
1. Trocar entrada manual por selecao/filtros (competencia, unidade, centro de custo, status).
2. Adicionar tela de processamento mensal com resumo: quantidade de folhas, total de descontos Cartao Conexao, pendencias.
3. Implementar tela funcional de jornada do colaborador e, se previsto, integracao com calculo da folha.

## Checklist de validacao por prints
1. Print da lista de folhas por competencia (`/admin/financeiro/folha/colaboradores`) mostrando status e colaborador.
2. Print do detalhe da folha com:
- eventos importados de fatura
- total proventos/descontos/liquido
3. Print da tela de contas do Cartao Conexao com conta tipo `COLABORADOR`.
4. Print da tela de faturas do Cartao Conexao filtrada por periodo com coluna `tipo_conta`.
5. Print do detalhe de uma fatura com lancamentos vinculados.
6. Print da tela de jornadas (placeholder atual) para evidenciar lacuna.
7. Print de resposta da API de alunos da turma mostrando separacao `alunos_ativos` e `alunos_historico` (evidencia de que frequencia atual e de alunos).

