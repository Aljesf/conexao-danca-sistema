# 📘 Modelo Físico — Domínio de Matrículas  
Sistema Conexão Dança  
Versão: 2025-12-02  

## 0. Contexto

Este documento define o **modelo físico alvo** do domínio de **Matrículas / Alunos / Vínculos**, alinhado a:

- 📘 `modelo-banco-padrao.md` — Pessoa no centro, Matrícula como unidade oficial de vínculo pedagógico/financeiro.
- 📘 `modelo-de-matriculas.md` — Fluxo e regras de negócio das matrículas.
- 📘 `Modelo de Turmas — Conexão Dança 1.3.md` — Estrutura oficial de `turmas`.
- 📘 `estado-atual-matriculas.md` — Foto do que existe hoje (alunos / alunos_turmas / turma_aluno / vinculos).

Ele **não é uma migration**: é a referência para:

- criação da tabela `matriculas`;  
- ajustes em `turma_aluno` e uso de `vinculos`;  
- marcação de tabelas canônicas vs legadas;  
- base para o `plano-migracao-matriculas.md`.

---

## 1. Objetivos do Modelo Físico

1. Ter **uma tabela canônica `matriculas`** ligando:
   - Pessoa (aluno)  
   - Responsável financeiro  
   - Unidade pedagógica (turma / projeto artístico)  
   - Plano financeiro  
   - Contrato gerado e status da matrícula.

2. Definir o **uso oficial de `turma_aluno`** como detalhamento operacional da matrícula (aluno x turma).

3. Integrar o domínio com:
   - `pessoas` + `pessoas_roles` (perfil ALUNO / RESPONSAVEL_FINANCEIRO);
   - `vinculos` (aluno x responsáveis);
   - `turmas` (REGULAR / CURSO_LIVRE / ENSAIO);
   - Financeiro (`cobrancas`/`recebimentos`/`contas_receber`);
   - Contratos (`contratos_modelo` / futuros `contratos_emitidos`).

4. Marcar **claramente**:
   - tabelas **canônicas**;  
   - tabelas **legadas** (e em que cenário ainda serão usadas).

---

## 2. Tabela Canônica `matriculas`

### 2.1. Definição Geral

Nome: `matriculas`  
Papel: **unidade oficial** de vínculo entre **Pessoa ↔ Turma/Projeto ↔ Plano Financeiro ↔ Contrato**.

> Observação: o campo conceitual `vinculo_id` é mantido, mas a estratégia física considera que, na primeira etapa, o uso principal será com `turmas`. Projetos artísticos podem entrar na segunda etapa (ajuste futuro).

### 2.2. Colunas (versão física proposta)

| Coluna                       | Tipo                        | Obrigatório | Descrição |
|-----------------------------|----------------------------|------------|-----------|
| `id`                        | `bigint` PK `generated`    | ✔️         | Identificador da matrícula. |
| `pessoa_id`                 | `bigint` FK `pessoas(id)`  | ✔️         | Pessoa matriculada (aluno). |
| `responsavel_financeiro_id` | `bigint` FK `pessoas(id)`  | ✔️         | Pessoa responsável financeira. |
| `tipo_matricula`            | `text` / enum              | ✔️         | `REGULAR`, `CURSO_LIVRE`, `PROJETO_ARTISTICO`. |
| `vinculo_id`                | `bigint`                   | ✔️         | FK principal de destino pedagógico: hoje → `turmas(turma_id)` para REGULAR/CURSO_LIVRE; futuro → também projetos. |
| `plano_matricula_id`        | `bigint` FK `planos_matricula(id)` | ✔️ | Plano financeiro selecionado. |
| `contrato_modelo_id`        | `bigint` FK `contratos_modelo(id)` | ✔️ | Modelo de contrato utilizado. |
| `contrato_emitido_id`       | `bigint` FK `contratos_emitidos(id)` | ⬜ | Ligação com o contrato efetivamente emitido/assinado. (opcional na 1ª etapa, mas já prevista) |
| `contrato_pdf_url`          | `text`                     | ⬜         | URL do PDF assinado (redundância útil para acesso rápido). |
| `status`                    | `text` / enum              | ✔️         | `ATIVA`, `TRANCADA`, `CANCELADA`, `CONCLUIDA`. |
| `ano_referencia`            | `integer`                  | ⬜         | Obrigatório para `REGULAR` (ano letivo). |
| `data_matricula`            | `date`                     | ✔️         | Data de criação da matrícula (D0 do vínculo). |
| `data_encerramento`         | `date`                     | ⬜         | Data de conclusão/trancamento/cancelamento. |
| `observacoes`               | `text`                     | ⬜         | Notas internas de negociação/pedagógicas. |
| `created_at`                | `timestamptz`              | ✔️         | Carimbo de criação (default `now()`). |
| `updated_at`                | `timestamptz`              | ✔️         | Última atualização (trigger). |
| `created_by`                | `uuid` FK `auth.users(id)` | ⬜         | Usuário que criou. |
| `updated_by`                | `uuid` FK `auth.users(id)` | ⬜         | Usuário que alterou por último. |

#### Sobre o campo `vinculo_id`

- Conceitualmente, ele aponta para:
  - `turmas.turma_id` para `REGULAR` e `CURSO_LIVRE`;
  - `projetos_artistico.id` (futuro) para `PROJETO_ARTISTICO`.
- Fisicamente, na **Etapa 1** da migração, será criada **apenas** a FK para `turmas` (já existente). A ligação com `projetos_artistico` entrará como ajuste no plano de migração (Etapa 2).

---

### 2.3. Enums e Tipos de Apoio

**Enum `tipo_matricula`**

- `REGULAR`  
- `CURSO_LIVRE`  
- `PROJETO_ARTISTICO`

**Enum `status_matricula`**

- `ATIVA` — matrícula vigente, gerando cobranças/participação.  
- `TRANCADA` — recorrência pausada; aluno mantém histórico, mas não gera novas presenças nem novas cobranças automáticas.  
- `CANCELADA` — vínculo encerrado com quebra de contrato / acordo.  
- `CONCLUIDA` — aluno cumpriu os requisitos (frequência + avaliações, quando aplicável).

> Decisão física:  
> Os enums podem ser criados como tipos `CREATE TYPE` ou mapeados para `text` + `CHECK` em Supabase (mais flexível). O modelo físico assume a forma **enum** `CREATE TYPE` para maior segurança, deixando o detalhe da migration para o `plano-migracao-matriculas.md`.

---

### 2.4. Chaves Estrangeiras

- `pessoa_id` → `pessoas(id)`  
- `responsavel_financeiro_id` → `pessoas(id)`  
- `vinculo_id` → `turmas(turma_id)` (Etapa 1; depois expandir para projetos).
- `plano_matricula_id` → `planos_matricula(id)`  
- `contrato_modelo_id` → `contratos_modelo(id)`  
- `contrato_emitido_id` → `contratos_emitidos(id)` (ou tabela equivalente)  
- `created_by`, `updated_by` → `auth.users(id)` (via `profiles` / padrão do banco).

---

### 2.5. Índices e Constraints

**Índices principais**

- `idx_matriculas_pessoa` → (`pessoa_id`)  
- `idx_matriculas_responsavel` → (`responsavel_financeiro_id`)  
- `idx_matriculas_status` → (`status`)  
- `idx_matriculas_tipo_ano` → (`tipo_matricula`, `ano_referencia`)  
- `idx_matriculas_vinculo` → (`vinculo_id`)  

**Regras de unicidade (conceituais)**

- Para `REGULAR`:  
  - Uma pessoa não pode ter **mais de uma matrícula REGULAR para a mesma turma**:  
    - constraint sugerida: `UNIQUE (pessoa_id, tipo_matricula, vinculo_id) WHERE tipo_matricula = 'REGULAR'`.
- Para `CURSO_LIVRE`:  
  - Pode haver múltiplas matrículas da mesma pessoa em cursos livres diferentes (ou mesmo curso, se sazonal).  
  - Não há UNIQUE rígido além de `id`.
- Para `PROJETO_ARTISTICO`:  
  - A mesma pessoa pode ter mais de uma matrícula no mesmo projeto (ex.: pacote figurino + participação), se o modelo financeiro permitir. O controle é feito no módulo de Planos.

---

## 3. Relação com Pessoas & Roles

### 3.1. Pessoas

- `pessoas` continua como **fonte única** de identidade (aluno, responsáveis, etc.).
- `matriculas.pessoa_id` aponta sempre para a pessoa **dona da matrícula**.  
- `matriculas.responsavel_financeiro_id` aponta para a pessoa **devedora** no financeiro.

### 3.2. `pessoas_roles` (perfis)

Regras sugeridas:

- Sempre que uma pessoa receber a primeira matrícula:
  - garantir role `ALUNO` em `pessoas_roles`.  
- Sempre que uma pessoa aparecer como responsável financeiro:
  - garantir role `RESPONSAVEL_FINANCEIRO` em `pessoas_roles`.

Nada disso exige novos campos; é **regra de aplicação** (será detalhada no plano de migração e nos blocos Codex).

---

## 4. Relação com Turmas & `turma_aluno`

### 4.1. Turmas (tabela `turmas`)

- Turmas já possuem:  
  - `turma_id PK`, `tipo_turma`, `ano_referencia`, `status`, etc.
- Para `REGULAR` e `CURSO_LIVRE`:  
  - `matriculas.vinculo_id` aponta para `turmas.turma_id`.  
  - `turmas.tipo_turma` deve ser compatível com `matriculas.tipo_matricula`:
    - `REGULAR` ↔ `turmas.tipo_turma = 'REGULAR'`  
    - `CURSO_LIVRE` ↔ `turmas.tipo_turma = 'CURSO_LIVRE'`  
  - Essa compatibilidade é regra de aplicação (validação na API).

### 4.2. `turma_aluno` — Vínculo operacional aluno ↔ turma

**Estado atual (resumo):**

- `turma_aluno_id bigint PK`  
- `turma_id bigint NOT NULL` → `turmas.turma_id`  
- `aluno_pessoa_id bigint NOT NULL` → **conceitualmente** `pessoas.id`  
- `dt_inicio date DEFAULT current_date`  
- `dt_fim date`  
- `status text DEFAULT 'ativo'`

**Papel no modelo físico:**

- Tornar-se a **tabela canônica** de vínculo **Pessoa ↔ Turma**, detalhando a matrícula.
- Representa “esse aluno está (ou esteve) na turma X nesse período”.

**Ajustes físicos propostos em `turma_aluno`:**

1. Adicionar FK explícita:
   - `aluno_pessoa_id` → `pessoas(id)` (constraint formal).  
2. Adicionar coluna:
   - `matricula_id bigint NOT NULL` FK → `matriculas(id)`  
   - Regra: para matrículas de tipo `REGULAR` e `CURSO_LIVRE`, deve existir exatamente **um** registro de `turma_aluno` com `matricula_id` preenchido e `turma_id = matriculas.vinculo_id`.  
3. Ajustar `status` para ficar compatível com o status da matrícula:
   - valores sugeridos: `ATIVO`, `INATIVO`, `TRANSFERIDO`, `CONCLUIDO`.  
   - a transição para `CONCLUIDO` deve ocorrer quando a matrícula for `CONCLUIDA` e a turma for encerrada (regra de aplicação).

**Índices sugeridos em `turma_aluno`:**

- `idx_turma_aluno_turma` → (`turma_id`)  
- `idx_turma_aluno_pessoa` → (`aluno_pessoa_id`)  
- `idx_turma_aluno_matricula` → (`matricula_id`)  
- `UNIQUE (matricula_id, turma_id)` para garantir 1:1 (matrícula ↔ turma regular/curso livre).

> Observação:  
> Ensaios e coreografias de projetos artísticos podem continuar usando `turmas` do tipo `ENSAIO` sem necessariamente ter `matricula_id` (ou com regras específicas — a definir em documento de Projetos Artísticos).

---

## 5. Relação com Responsáveis (`vinculos`)

### 5.1. Tabela `vinculos` (já existente)

Resumo atual:

- `id bigint PK`  
- `aluno_id bigint NOT NULL` → `pessoas.id`  
- `responsavel_id bigint NOT NULL` → `pessoas.id`  
- `parentesco text`

**Papel no modelo físico:**

- Continua sendo a tabela canônica de **aluno ↔ responsável**.  
- É usada pela matrícula para:
  - validar o responsável financeiro escolhido;  
  - exibir responsáveis legais na tela da matrícula.

**Possíveis ajustes futuros:**

- Adicionar coluna opcional `matricula_id bigint` → `matriculas(id)` para casos em que o vínculo de responsabilidade seja específico de uma matrícula (situações excepcionais).  
- Porém, no modelo padrão, a responsabilidade é **da pessoa** e não da matrícula — então este campo é opcional e pode ser deixado para uma fase posterior, se realmente necessário.

---

## 6. Relação com Financeiro

Não criamos tabelas financeiras novas aqui, apenas **definimos o contrato conceitual**:

1. Ao concluir o fluxo de matrícula (wizard):
   - Criar registro em `matriculas` (tabela deste modelo).  
   - Gerar cobranças em `contas_receber` / `cobrancas`, vinculando:
     - `pessoa_id` (devedor) = `matriculas.responsavel_financeiro_id`;  
     - `centro_custo_id` e `categoria_financeira_id` vindos de `plano_matricula_id`;
     - referência de origem (campo `matricula_id` na cobrança ou campo `origem_tipo/origem_id`).

2. Regras futuras, já previstas no modelo conceitual:

   - **Cancelamento de matrícula**:
     - gera cancelamento/renegociação das cobranças abertas.  
   - **Trancamento**:
     - pausa recorrência, mantendo histórico e cobranças já pagas.  

Esses detalhes entrarão no `plano-migracao-matriculas.md` e nos documentos de Finanças.

---

## 7. Relação com Contratos

O modelo conceitual prevê:

- `contratos_modelo` — catálogos de modelos (REGULAR, CURSO_LIVRE, PROJETO_ARTISTICO, etc.).  
- Para cada matrícula:
  - usar `contrato_modelo_id` para gerar o texto final;  
  - registrar o resultado em uma tabela de **contratos emitidos** (nome sugerido: `contratos_emitidos`), com:
    - `id PK`  
    - `matricula_id`  
    - `contrato_modelo_id`  
    - `conteudo_html` / `conteudo_md`  
    - `pdf_url`  
    - `status_assinatura`  
    - datas de assinatura.

No modelo físico da matrícula, isso aparece via:

- `matriculas.contrato_modelo_id` — referência ao modelo usado.  
- `matriculas.contrato_emitido_id` — atalho para o contrato emitido principal.

---

## 8. Canônico x Legado no Domínio de Matrículas

### 8.1. Tabelas Canônicas (pós-refatoração)

- `matriculas` (nova)  
- `pessoas`  
- `pessoas_roles`  
- `turmas`  
- `turma_aluno` (ajustada com FK para `pessoas` e `matriculas`)  
- `vinculos`  
- `planos_matricula` (nome a confirmar)  
- `contratos_modelo`  
- `contratos_emitidos` (nova, a ser definida em detalhe em documento de Contratos)  
- `cobrancas` / `contas_receber` / `recebimentos` (estrutura já existente no domínio financeiro).

### 8.2. Tabelas Legadas

Conforme o modelo padrão:

- `alunos`  
  - Continua existindo apenas para histórico/migração.  
  - Novo código **não deve usá-la** diretamente; a verdade passa a ser `pessoas` + `matriculas`.  
- `alunos_turmas`  
  - Substituída por `matriculas` + `turma_aluno`.  
  - Mantida até o fim da migração de dados e ajuste de todas as rotas antigas.

> Critério para “por quanto tempo”:  
> As tabelas legadas permanecem até que:
> 1. Todas as rotas/API que hoje usam `alunos`/`alunos_turmas` sejam migradas para `pessoas`/`matriculas`/`turma_aluno`;
> 2. O `plano-migracao-matriculas.md` seja totalmente aplicado;  
> 3. Seja feita uma checagem final de dados e backup.

---

## 9. Pontos em Aberto (para o Plano de Migração)

Este modelo físico **delimita as estruturas**. O `plano-migracao-matriculas.md` deve detalhar:

1. **Criação física da tabela `matriculas`**  
   - SQL com enums, FKs e índices.  
   - Estratégia de compatibilidade com o campo `vinculo_id` para projetos artísticos (se `projetos_artistico` ainda não existir).

2. **Ajustes em `turma_aluno`**  
   - Adicionar `matricula_id` e FK para `pessoas`.  
   - Popular `matricula_id` a partir de `alunos_turmas` + `pessoas`.  

3. **Migração de dados de `alunos` / `alunos_turmas`**  
   - Como criar `pessoas_roles` ALUNO onde faltar.  
   - Como gerar `matriculas` iniciais a partir dos vínculos já existentes.

4. **Integração com Financeiro**  
   - Inclusão do campo `matricula_id` em `cobrancas`/`contas_receber`.  
   - Regras de cancelamento/trancamento x cobranças.

5. **Integração com Contratos**  
   - Definição física de `contratos_emitidos`.  
   - Preenchimento automático de `contrato_emitido_id` na matrícula.

---

> Com este `modelo-fisico-matriculas.md`, a próxima etapa é escrever o  
> **`docs/plano-migracao-matriculas.md`**, transformando estas decisões em:
> - migrations SQL propostas;  
> - sequência de passos (Etapa 1, 2, 3…);  
> - pontos específicos para o Codex ajustar APIs e páginas.
