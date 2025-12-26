> ℹ️ DOCUMENTO EM ADEQUAÇÃO  
> Este documento será atualizado para refletir  
> as Regras Oficiais de Matrícula (Conexão Dança) – v1

# 📘 Plano de Migração — Domínio de Matrículas  
Sistema Conexão Dança  
Versão: 2025-12-02  

Baseado em:  

- `docs/estado-atual-matriculas.md`  
- `docs/modelo-fisico-matriculas.md`  
- `docs/modelo-banco-padrao.md`  
- `docs/Modelo de Turmas — Conexão Dança 1.3.md`  
- `docs/modelo-de-matriculas.md`  

---

## 0. Objetivo do Plano

Definir o **passo a passo técnico** para:

1. Criar a tabela canônica `matriculas`.  
2. Ajustar `turma_aluno` para integrar com `matriculas` e `pessoas`.  
3. Preparar o terreno para integrar Matrículas com **Financeiro** e **Contratos**, sem quebrar o legado.  
4. Planejar como **conviver com as tabelas legadas** `alunos` e `alunos_turmas` até a migração final.

> Este documento **não é** o comando para o Codex ainda.  
> Ele é o “roteiro oficial” que o Codex vai seguir quando for gerar migrations SQL e refatorar APIs/páginas.

---

## 1. Visão Geral das Etapas

Resumo das etapas de migração, em ordem:

1. **Etapa 1 — Criar estrutura nova (sem tocar dados legados)**  
   - Criar `matriculas`.  
   - Ajustar schema de `turma_aluno` (apenas colunas e FKs).  

2. **Etapa 2 — Convivência controlada com o legado**  
   - Começar a salvar **novas matrículas** apenas em `matriculas` + `turma_aluno`.  
   - Manter `alunos` e `alunos_turmas` apenas para leitura/histórico.  

3. **Etapa 3 — Migração de dados (quando for a hora)**  
   - Mapear `alunos` → `pessoas`.  
   - Migrar vínculos de `alunos_turmas` → `matriculas` + `turma_aluno`.  

4. **Etapa 4 — Integração com Financeiro e Contratos**  
   - Amarrar `matriculas` às cobranças (`cobrancas`/`contas_receber`) e contratos emitidos.  

5. **Etapa 5 — Desligar definitivamente o legado**  
   - Retirar uso de `alunos`/`alunos_turmas` do código.  
   - Opcionalmente, renomear ou arquivar fisicamente essas tabelas.

Cada etapa abaixo vai indicar:

- **Nível sugerido para o Codex** (Medium / High / Max).  
- Se exige **backup automático** antes de rodar.  

---

## 2. Etapa 1 — Criar Estrutura Nova (sem tocar legado)

🎯 **Objetivo:** preparar a base para Matrículas sem mexer nos dados atuais.

### 2.1. Criar tabela `matriculas`

**Tipo de mudança:**  
- Criação de tabela nova, sem impacto direto nas rotinas existentes.  
- Pode ser feita com Codex **High** (é uma estrutura grande, mas ainda isolada).

**Ações previstas:**

1. **Criar a tabela `matriculas`** com as colunas definidas em `modelo-fisico-matriculas.md`:  
   - `id bigint PK generated`  
   - `pessoa_id bigint NOT NULL` FK → `pessoas(id)`  
   - `responsavel_financeiro_id bigint NOT NULL` FK → `pessoas(id)`  
   - `tipo_matricula` (enum/text com CHECK)  
   - `vinculo_id bigint NOT NULL` (FK → `turmas(turma_id)` na primeira versão)  
   - `plano_matricula_id bigint NOT NULL`  
   - `contrato_modelo_id bigint NOT NULL`  
   - `contrato_emitido_id bigint NULL`  
   - `contrato_pdf_url text NULL`  
   - `status` (enum/text com CHECK)  
   - `ano_referencia integer NULL`  
   - `data_matricula date NOT NULL`  
   - `data_encerramento date NULL`  
   - `observacoes text NULL`  
   - `created_at timestamptz NOT NULL DEFAULT now()`  
   - `updated_at timestamptz NOT NULL DEFAULT now()`  
   - `created_by uuid NULL`  
   - `updated_by uuid NULL`

2. **Criar enums ou CHECKs** para:  
   - `tipo_matricula` (`REGULAR`, `CURSO_LIVRE`, `PROJETO_ARTISTICO`).  
   - `status` (`ATIVA`, `TRANCADA`, `CANCELADA`, `CONCLUIDA`).  

3. **Criar índices**:  
   - `idx_matriculas_pessoa (pessoa_id)`  
   - `idx_matriculas_responsavel (responsavel_financeiro_id)`  
   - `idx_matriculas_status (status)`  
   - `idx_matriculas_tipo_ano (tipo_matricula, ano_referencia)`  
   - `idx_matriculas_vinculo (vinculo_id)`  

4. **Criar constraints de unicidade parciais (se possível)**:  
   - `UNIQUE (pessoa_id, tipo_matricula, vinculo_id) WHERE tipo_matricula = 'REGULAR'`.

> ⚠️ Backup: não obrigatório aqui, pois não mexe em tabelas existentes.  

---

### 2.2. Ajustar `turma_aluno` (apenas estrutura)

**Tipo de mudança:**  
- Adição de colunas e FKs em tabela já usada.  
- Recomenda-se Codex **High** + **backup automático**.

**Ações previstas:**

1. **Adicionar coluna `matricula_id bigint NULL`** em `turma_aluno`.  
2. **Adicionar FK explícita**:
   - `aluno_pessoa_id` → `pessoas(id)` (caso ainda não exista no banco como constraint).  
3. **Adicionar FK**:
   - `matricula_id` → `matriculas(id)`.  
4. **Criar índices**:  
   - `idx_turma_aluno_matricula (matricula_id)`  
   - `idx_turma_aluno_pessoa (aluno_pessoa_id)` (se ainda não houver).  
5. **Opcional:**  
   - Criar `UNIQUE (matricula_id, turma_id)` para garantir 1 vínculo por turma por matrícula regular/curso livre (conferir depois das primeiras matrículas reais).

> ⚠️ Antes de rodar essa parte, o comando do Codex deve **obrigatoriamente** incluir o bloco de backup (git add/commit/tag).  

---

## 3. Etapa 2 — Convivência Controlada com o Legado

🎯 **Objetivo:** a partir de um certo ponto, **novas matrículas** passam a usar apenas o modelo novo, mas sem ainda migrar o backlog.

### 3.1. Definir “data de corte” de uso do novo modelo

- Registrar (neste arquivo ou em `estado-atual-do-projeto.md`) uma **data de corte**:  
  - A partir desta data, **toda nova matrícula** deve ser criada usando:  
    - `pessoas`  
    - `matriculas`  
    - `turma_aluno`  
    - `vinculos`  
- `alunos` e `alunos_turmas` continuam existindo **apenas** como legado para dados antigos.

### 3.2. Ajustar APIs (futuro, fora deste plano SQL)

**Decisão importante para o Codex (quando formos para a fase API):**

- Criar/ajustar endpoint de **criação de matrícula** (ex.: `/api/matriculas/novo`), que deve:  
  1. Receber `pessoa_id`, `responsavel_financeiro_id`, `tipo_matricula`, `turma_id`, plano etc.  
  2. Criar registro em `matriculas`.  
  3. Criar registro em `turma_aluno` apontando para `matricula_id`.  
  4. (Na etapa 4) gerar cobranças e contrato.

> Aqui ainda é só a visão de banco; os detalhes de API ficarão em outro documento / comando Codex específico.

---

## 4. Etapa 3 — Migração de Dados Legados (quando for a hora)

🎯 **Objetivo:** levar os dados antigos para o modelo novo **sem perder histórico**.

> Esta etapa não precisa ser executada imediatamente.  
> O importante é ter o plano estruturado.

### 4.1. Mapear `alunos` → `pessoas`

Passos típicos (podem virar script SQL ou script Node via Codex):

1. Identificar para cada `alunos.id` se já existe uma `pessoa` equivalente:  
   - regra: match por `nome` + `email` ou `telefone` + data de nascimento, etc.  
2. Onde não houver `pessoas` correspondente:  
   - criar nova linha em `pessoas` com base nos campos de `alunos`.  
3. Criar/ajustar roles:  
   - garantir que toda pessoa que vier de `alunos` tenha role `ALUNO` em `pessoas_roles`.

### 4.2. Migrar `alunos_turmas` → `matriculas` + `turma_aluno`

Para cada linha em `alunos_turmas` ativa:

1. **Descobrir pessoa-aluno**:  
   - `alunos_turmas.aluno_id` → `alunos.id` → pessoa correspondente (do passo 4.1).  

2. **Criar matrícula** em `matriculas`:  
   - `pessoa_id` = pessoa do aluno.  
   - `responsavel_financeiro_id` =  
     - se houver vínculo em `vinculos` → responsável principal;  
     - senão, o próprio `pessoa_id` como fallback.  
   - `tipo_matricula` = inferido pela turma (`REGULAR` ou `CURSO_LIVRE`).  
   - `vinculo_id` = `alunos_turmas.turma_id`.  
   - `status` = baseado em `alunos_turmas.situacao`.  
   - `data_matricula` = `dt_inicio`.  
   - `data_encerramento` = `dt_fim` (se houver).  

3. **Atualizar/Inserir `turma_aluno`**:  
   - Criar ou atualizar registro com:  
     - `turma_id` = `alunos_turmas.turma_id`.  
     - `aluno_pessoa_id` = `pessoa_id` da etapa anterior.  
     - `matricula_id` = id da nova matrícula.  
     - `dt_inicio` / `dt_fim` = herdados de `alunos_turmas`.  
     - `status` = adaptado de `situacao`.  

4. Marcar `alunos_turmas` como **tabela 100% legado** depois que tudo for migrado.

> Essa etapa exige Codex **Max** + backup obrigatório, pois envolve scripts de atualização em massa.

---

## 5. Etapa 4 — Integração com Financeiro e Contratos

🎯 **Objetivo:** ligar Matrículas às cobranças e contratos gerados.

### 5.1. Financeiro

Ações sugeridas (em outro momento, mas já planejadas aqui):

1. **Adicionar coluna `matricula_id`** em `cobrancas`/`contas_receber` (nome da tabela a conferir no dump real).  
2. Garantir que novas matrículas:  
   - Criem cobranças já com `matricula_id` preenchido e `pessoa_id = responsavel_financeiro_id`.  
3. Opcional: migrar cobranças antigas associando-as às matrículas criadas na Etapa 3.

### 5.2. Contratos

1. Criar tabela `contratos_emitidos` (em documento específico de Contratos, mas já prevista aqui).  
2. Garantir que o fluxo de matrícula:  
   - use `contrato_modelo_id` para gerar texto;  
   - salve o contrato em `contratos_emitidos` com `matricula_id`;  
   - preencha `matriculas.contrato_emitido_id` e eventualmente `contrato_pdf_url`.

---

## 6. Etapa 5 — Desligamento do Legado

🎯 **Objetivo:** fazer o sistema operar exclusivamente no modelo novo.

Critérios de pronto para desligar `alunos` e `alunos_turmas`:

1. **Todas as rotas/API** que antes usavam `alunos` ou `alunos_turmas` foram migradas para `pessoas` + `matriculas` + `turma_aluno`.  
2. **Todos os dados ativos** foram migrados (Etapa 3 concluída).  
3. Foram feitos **backups e conferência manual** (via prints/telas).  

Ações finais possíveis:

- Remover referências no código a `alunos` e `alunos_turmas`.  
- Opcionalmente, renomear tabelas legadas para:  
  - `alunos_legacy`  
  - `alunos_turmas_legacy`  
- Atualizar `docs/estado-atual-banco.md` e `docs/estado-atual-matriculas.md` para registrar o novo cenário.

---

## 7. Notas para o Codex (quando virar comando)

Quando este plano for transformado em **comandos para o Codex**, seguir sempre:

1. **Separar por etapas**  
   - Um comando Codex só deve cuidar de **uma etapa por vez** (ex.: “Criar tabela matriculas” separado de “Ajustar turma_aluno”).  

2. **Nível recomendado por etapa**  
   - Etapa 1 (criar `matriculas`): Codex **High**.  
   - Etapa 1 (ajustes em `turma_aluno`): Codex **High** + backup.  
   - Etapa 3 (migração de dados): Codex **Max** + backup obrigatório.  

3. **Backup automático obrigatório**  
   - Sempre que o comando alterar tabelas existentes ou mexer em dados em massa, o bloco de backup deve ser incluído **antes** de qualquer alteração:
     - `git add .`  
     - `git commit -m "Backup automático antes da migração de matrículas"`  
     - `git tag -a backup-migracao-matriculas-$(date +'%Y-%m-%d-%H-%M') -m "Backup automático antes da migração de matrículas"`  

---

## 8. Próximo Documento Relacionado

Depois que este `plano-migracao-matriculas.md` estiver salvo e validado, os próximos passos naturais são:

1. **Fase SQL (execução):**  
   - Gerar o **primeiro comando para o Codex** apenas para a **Etapa 1** (criar tabela `matriculas` + ajustar estrutura de `turma_aluno`).  

2. **Depois, Fases API e Páginas:**  
   - Planejar as rotas/handlers da API de Matrículas.  
   - Definir as páginas do front (wizard de matrícula, listagem, detalhes).

> Este plano fecha a etapa de **planejamento de banco** para Matrículas.  
> A partir daqui, os próximos chats vão gerar os blocos de comando reais para o Codex, começando pela Etapa 1 (SQL).
