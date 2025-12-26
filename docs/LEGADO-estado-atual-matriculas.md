> ⚠️ DOCUMENTO LEGADO  
> Este arquivo descreve regras anteriores de matrícula.  
> A fonte única de verdade é:  
> Regras Oficiais de Matrícula (Conexão Dança) – v1

# 📘 Estado Atual do Domínio — Matrículas / Alunos / Vínculos  
Sistema Conexão Dança  
Versão: 2025-12-02  

## 0. Contexto e Fonte

Este documento registra o **estado atual real** (snapshot) do domínio de **Matrículas / Alunos / Vínculos** no banco Supabase do sistema Conexão Dança, antes de qualquer refatoração.

Fontes principais:

- `docs/estado-atual-banco.md` (foto geral do banco atual)  
- `docs/schema-supabase.sql` (schema real, export do Supabase)  
- `docs/modelo-banco-padrao.md` (modelo ideal futuro)  
- `docs/modelo-matriculas.md` (modelo conceitual de matrículas)  
- `docs/modelo-turmas.md` (modelo conceitual das turmas)  

> **Importante:** este arquivo é apenas diagnóstico.  
> Nenhuma decisão de migração é aplicada aqui; isso ficará para o `modelo-fisico-matriculas.md` e para o `plano-migracao-matriculas.md`.

---

## 1. Escopo deste Snapshot

Aqui entram todas as estruturas diretamente ligadas ao domínio:

- Identificação de aluno (quem é “o aluno” no banco hoje).  
- Vínculo aluno ↔ turma.  
- Vínculo aluno ↔ responsável.  
- Pontos onde o domínio de Matrículas toca Turmas, Pessoas e Financeiro.

Tabelas centrais analisadas:

- `alunos`  
- `alunos_turmas`  
- `turma_aluno`  
- `vinculos`  

Outras tabelas relevantes (apoio):

- `pessoas`  
- `turmas`  
- `cobrancas`, `recebimentos`, `movimento_financeiro` (integração futura com matrículas)  

---

## 2. Tabelas Centrais do Domínio

### 2.1. Tabela `alunos` (legado — identificação do aluno)

**Função atual:**  
Cadastro simples de “aluno” com nome, contato e data de nascimento. É a modelagem original, paralela a `pessoas`.

**Schema (resumo):**

- `id bigint PK` — identificador do aluno.  
- `nome text NOT NULL` — nome do aluno.  
- `email text`  
- `telefone text`  
- `data_nascimento date`  
- `ativo boolean NOT NULL DEFAULT true`  
- `created_at timestamptz NOT NULL DEFAULT now()`  
- `user_id uuid DEFAULT auth.uid()` — possível vínculo direto com `auth.users`.  
- `user_email text`  

**Observações:**

- Não há FK para `pessoas`.  
- A existência de `user_id` torna o modelo “aluno” parcialmente paralelo a `pessoas` + `profiles`.  
- O documento de visão geral sinaliza que o domínio “Pessoas/Alunos/Interessados” utiliza tanto `pessoas` quanto `alunos` nas telas e APIs atuais (`/pessoas/*`, `/api/alunos/*`).  

**Conclusão parcial:**  
`alunos` é um cadastro legado de aluno — ainda usado no código atual, mas não alinhado com o modelo futuro onde **Pessoa** é o centro.

---

### 2.2. Tabela `alunos_turmas` (legado — vínculo Aluno (tabela alunos) ↔ Turma)

**Função atual:**  
Registrar que um aluno (da tabela `alunos`) pertence a uma turma (da tabela `turmas`).

**Schema (resumo):**

- `id bigint PK`  
- `aluno_id bigint NOT NULL` — FK → `alunos.id`  
- `turma_id bigint NOT NULL` — FK implícita para `turmas.turma_id` (aparece como FK apenas para `alunos` no dump atual).  
- `dt_inicio date NOT NULL DEFAULT current_date`  
- `dt_fim date`  
- `situacao text NOT NULL DEFAULT 'ativo'`  
- `created_at timestamptz NOT NULL DEFAULT now()`  
- `user_id uuid` — FK para `auth.users.id`  
- `user_email text`  

**Observações:**

- Modela claramente um período de vínculo (início/fim) e uma situação textual (`ativo`, etc.).  
- Depende de `aluno_id` referenciando `alunos`, reforçando o modelo antigo centrado em `alunos`.  
- Não conversa diretamente com o conceito de Matrícula (a tabela `matriculas` ainda não existe no banco físico).  

**Conclusão parcial:**  
`alunos_turmas` é um vínculo **legado** que opera em cima da tabela `alunos` e será alvo de migração/substituição quando o modelo de Matrículas for unificado.

---

### 2.3. Tabela `turma_aluno` (canônico futuro — vínculo Pessoa ↔ Turma)

**Função atual:**  
Modelar o vínculo entre uma **pessoa** (aluno_pessoa_id → `pessoas.id`) e uma turma (`turma_id` → `turmas.turma_id`).

**Schema (resumo):**

- `turma_aluno_id bigint PK`  
- `turma_id bigint NOT NULL` — FK → `turmas.turma_id`  
- `aluno_pessoa_id bigint NOT NULL` — *conceitualmente* FK → `pessoas.id` (no schema atual, não há constraint declarada)  
- `dt_inicio date DEFAULT current_date`  
- `dt_fim date`  
- `status text DEFAULT 'ativo'`  

**Observações:**

- A modelagem já está alinhada com o **modelo padrão** onde **Pessoa é o centro**, e “aluno” é um perfil/role da pessoa.  
- Há uma lacuna técnica: o dump atual não mostra FK explícita de `aluno_pessoa_id` para `pessoas.id`; isso abre brecha para inconsistências de integridade referencial.  
- Já existe no banco e é mencionada como parte do conjunto que precisa ser unificado com `alunos_turmas`.  

**Conclusão parcial:**  
`turma_aluno` é a candidata natural a se tornar a tabela **canônica de vínculo aluno ↔ turma**, conectada a `pessoas` e, futuramente, à `matriculas`.

---

### 2.4. Tabela `vinculos` (aluno ↔ responsável)

**Função atual:**  
Registrar o vínculo entre o aluno (representado como pessoa) e seu(s) responsável(is), também pessoas.

**Schema (resumo):**

- `id bigint PK`  
- `aluno_id bigint NOT NULL` — FK → `pessoas.id`  
- `responsavel_id bigint NOT NULL` — FK → `pessoas.id`  
- `parentesco text`  

**Observações:**

- Diferente de `alunos` e `alunos_turmas`, aqui o aluno **já é** uma pessoa (`pessoas.id`).  
- O modelo conceitual de Matrículas prevê a figura de **Responsável financeiro** e demais responsáveis, o que se encaixa bem com esta tabela.  
- `vinculos` já está alinhada com o modelo “Pessoa no centro”, embora ainda não esteja integrada a uma tabela `matriculas`.  

**Conclusão parcial:**  
`vinculos` é compatível com o modelo padrão e tende a ser reaproveitada (ou levemente ajustada) no cenário com `matriculas`.

---

## 3. Outras Tabelas Relacionadas

### 3.1. `pessoas` (modelo central de identidade)

**Função:**  
Cadastro de **toda entidade humana ou jurídica**: alunos, responsáveis, colaboradores, fornecedores, etc.

Campos relevantes (resumo):

- `id bigint PK`  
- `user_id uuid` — vínculo com `auth.users`  
- `nome text NOT NULL`  
- `email text`, `telefone text`, `telefone_secundario text`  
- `nascimento date`  
- `cpf text`, `cnpj text`, dados fiscais e sociais  
- `tipo_pessoa text DEFAULT 'FISICA'`  
- `ativo boolean DEFAULT true`  
- `observacoes text`  
- `endereco jsonb` + `endereco_id bigint` (modelo misto de endereço)  
- FKs de auditoria (`created_by`, `updated_by`)  

**Papel no domínio de Matrículas:**

- Representa o aluno como pessoa.  
- Representa responsáveis legais e responsáveis financeiros.  
- Se conecta diretamente com `vinculos`.  
- Será a base para `matriculas.pessoa_id` e `matriculas.responsavel_financeiro_id` no modelo futuro.

---

### 3.2. `turmas` (unidade pedagógica de vínculo da matrícula)

**Função:**  
Tabela oficial das turmas, já alinhada com o documento de Modelo de Turmas.

Campos relevantes para Matrículas (resumo):

- `turma_id bigint PK`  
- `nome text NOT NULL`  
- `curso text`, `nivel text`  
- `tipo_turma text CHECK (REGULAR|CURSO_LIVRE|ENSAIO)`  
- `turno text`  
- `ano_referencia integer`  
- `data_inicio date`, `data_fim date`  
- `status text CHECK (EM_PREPARACAO|ATIVA|ENCERRADA|CANCELADA)`  
- `frequencia_minima_percentual numeric`  
- `observacoes text`, etc.  

**Papel no domínio de Matrículas:**

- Para matrículas do tipo **REGULAR** e **CURSO_LIVRE**, a turma será o principal destino pedagógico.  
- `turma_id` é referenciado por `alunos_turmas` (legado) e `turma_aluno` (modelo pessoa/turma).  

---

### 3.3. Financeiro (integração futura com Matrículas)

Hoje não existe ainda uma tabela `matriculas` que gere automaticamente cobranças, mas o modelo conceitual define isso. Na prática atual:

- `cobrancas` guarda cobranças por `pessoa_id` (pessoa devedora) com valor, vencimento, status e centro de custo.  
- `recebimentos` registra os pagamentos dessas cobranças.  
- `movimento_financeiro` registra lançamentos de caixa.  

O documento de **Modelo de Matrículas** prevê que, ao concluir a matrícula:

- será criado um registro em `matriculas` (a ser criada);  
- serão criadas cobranças em `contas_receber` (hoje modeladas via `cobrancas` + `recebimentos`).  

No estado atual, **não há ligação direta** entre `alunos_turmas` / `turma_aluno` e essas tabelas financeiras; qualquer relacionamento é manual ou implícito via `pessoa_id` nas cobranças.

---

## 4. Duplicidades, Conflitos e Inconsistências

### 4.1. Duas formas de representar “Aluno”

1. **Como linha em `alunos`**  
   - Usado por `alunos_turmas`.  
   - Sem vínculo direto com `pessoas`.  
   - Tem campos próprios de contato e data de nascimento.

2. **Como linha em `pessoas` com papel de aluno**  
   - Usado por `vinculos` (aluno_id → `pessoas.id`).  
   - Usado implicitamente por `turma_aluno` (aluno_pessoa_id → `pessoas.id`).  

**Impacto:**  
Há **dois conceitos paralelos** de “aluno” convivendo: um na tabela `alunos` e outro em `pessoas`. Isso é o ponto central da refatoração futura.

---

### 4.2. Duas tabelas de vínculo Aluno ↔ Turma

- `alunos_turmas`:  
  - Usa `aluno_id` → `alunos.id`.  
  - Campos: `dt_inicio`, `dt_fim`, `situacao`.  
- `turma_aluno`:  
  - Usa `aluno_pessoa_id` → (conceito) `pessoas.id`.  
  - Campos: `dt_inicio`, `dt_fim`, `status`.  

**Problemas:**

- O modelo real do banco já reconhece essa duplicidade em `estado-atual-banco.md`.  
- Registros de vínculo podem existir em uma, outra ou ambas as tabelas, gerando confusão sobre qual tabela é “a verdade”.  
- Regras de negócio (ex.: “um aluno só pode ter uma matrícula ativa por turma”) não estão centralizadas em nenhum lugar — há apenas um `status` textual por registro.

---

### 4.3. Inconsistências de integridade referencial

- `turma_aluno.aluno_pessoa_id` não possui, no schema atual, FK declarada para `pessoas.id` — o que permite a existência de vínculos apontando para pessoas inexistentes.  
- Já em `alunos_turmas.aluno_id` há FK explícita para `alunos.id`, garantindo integridade nesse caminho legado.

---

### 4.4. Diferenças de nomenclatura e semântica

- `alunos_turmas.situacao` vs `turma_aluno.status`:  
  - Ambos representam a situação do vínculo, mas com nomes diferentes.  
- `dt_inicio` / `dt_fim` (alunos_turmas e turma_aluno) vs `data_matricula` e `data_encerramento` (conceito futuro de `matriculas`).  

Isso indica que parte da “intenção de matrícula” já está espalhada nas tabelas de vínculo, mas sem uma entidade própria de Matrícula.

---

### 4.5. Ausência física da tabela `matriculas`

O documento conceitual de Matrículas define claramente uma tabela `matriculas` com:

- `pessoa_id`, `responsavel_financeiro_id`, `tipo_matricula`, `vinculo_id`, `plano_matricula_id`, `contrato_modelo_id`, `status`, `ano_referencia`, `data_matricula`, `data_encerramento`, etc.

No banco físico atual:

- **Essa tabela ainda não existe.**  
- A matrícula é “simulada” pela combinação de:

  - pessoa ou aluno;  
  - vínculo com turma (`alunos_turmas` ou `turma_aluno`);  
  - vínculo de responsabilidade (`vinculos`);  
  - cobranças avulsas em `cobrancas`.

---

## 5. Uso Atual no Código (visão geral)

Com base na visão geral do sistema:

- Há APIs específicas para `alunos` (`src/app/api/alunos/...`) e para `pessoas` (`src/app/api/pessoas/...`).  
- As telas principais de cadastro e edição se concentram em `/pessoas/*` (pessoa como entidade central) e `/config/escola/professores`, `/config/colaboradores` etc.  
- O menu lateral oficial (VNB) já prevê um contexto “Alunos” dentro do contexto Escola, com rotas como:

  - `/escola/alunos/novo` (atalho para fluxo de matrícula)  
  - `/escola/alunos/matriculas`  
  - `/escola/alunos/curriculo`  
  - `/escola/alunos/grupos`  

  Mas essas rotas ainda representam **intenção de arquitetura**, não necessariamente implementações completas no código atual.

**Leitura prática:**

- O código ainda está majoritariamente apoiado em:

  - `pessoas` como base para cadastros;  
  - `alunos` + `alunos_turmas` para parte do fluxo acadêmico legado;  
  - `turma_aluno` e `vinculos` já começam a aparecer como peças alinhadas ao modelo futuro.

---

## 6. Resumo Executivo do Estado Atual

1. **Não existe ainda uma tabela `matriculas` canônica.**  
   - A matrícula é um conceito “espalhado” entre `alunos`, `alunos_turmas`, `turma_aluno`, `vinculos` e algumas integrações manuais com Financeiro.

2. **Há duplicidade clara entre `alunos` e `pessoas` como representação de aluno.**  
   - O sistema precisa eleger `pessoas` como fonte única de verdade para “quem é o aluno”.

3. **Há duplicidade de vínculo aluno ↔ turma (`alunos_turmas` vs `turma_aluno`).**  
   - `alunos_turmas` é baseado em `alunos` (legado).  
   - `turma_aluno` é baseado em `pessoas` (modelo futuro desejado).

4. **`vinculos` já está bem alinhada com o modelo futuro.**  
   - Usa sempre `pessoas` para aluno e responsável.  
   - Deve ser integrada diretamente ao fluxo de Matrículas.

5. **Integração com Financeiro ainda é indireta.**  
   - Cobranças são por pessoa, sem uma entidade formal de Matrícula por trás.  

---

## 7. Pontos que Vão Guiar a Fase 2 (Modelo Físico Alvo)

Com base neste diagnóstico, a Fase 2 (arquivo `modelo-fisico-matriculas.md`) deverá decidir:

1. **Eleger `pessoas` como fonte única de identificação de aluno**, usando `pessoas_roles` ou equivalente para marcar o papel de ALUNO.

2. **Confirmar `turma_aluno` como tabela canônica de vínculo aluno/pessoa ↔ turma**, associada diretamente à tabela `matriculas`.

3. **Definir a tabela `matriculas` como entidade central**, conectando:

   - `pessoa_id` (aluno)  
   - `responsavel_financeiro_id`  
   - `tipo_matricula` (REGULAR/CURSO_LIVRE/PROJETO_ARTISTICO)  
   - `vinculo_id` (turma ou projeto artístico)  
   - `plano_matricula_id`, `contrato_modelo_id`, `status`  

4. **Planejar o papel de `alunos` e `alunos_turmas` no legado**, possivelmente:

   - marcando-as como tabelas legadas / apenas leitura;  
   - criando scripts de migração para `matriculas` + `turma_aluno`;  
   - desligando gradualmente o uso delas no código.

5. **Documentar as ligações com Financeiro** (cobrancas/recebimentos) e Contratos, a partir do momento em que `matriculas` existir.

---

> Este documento fecha a **Fase 1 — Diagnóstico** do domínio de Matrículas.  
> A partir dele, a Fase 2 vai desenhar o **modelo físico alvo** e a Fase 3 vai elaborar o **plano de migração** em etapas.
