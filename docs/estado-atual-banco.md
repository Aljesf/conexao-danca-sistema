# 📘 Estado Atual do Banco de Dados — Conexão Dança
Versão: 2025-12-02  
Fonte: docs/schema-supabase.sql (dump real do Supabase)

## 1. Visão Geral

- O banco atual cobre: pessoas/identidade, colaboradores/professores, acadêmico (cursos, níveis, módulos, habilidades, turmas, avaliações), matrículas/vínculos, financeiro (cobranças/recebimentos/contas), administração/segurança/auditoria.
- Observações rápidas:
  - Modelagens paralelas de vínculo aluno/turma: `alunos_turmas` (FK alunos) e `turma_aluno` (FK pessoas, agora com `matricula_id`).
  - Endereços em múltiplas formas: `endereco`, `enderecos`, `enderecos_pessoa`, além do JSONB `pessoas.endereco`.
  - Campos JSON/JSONB relevantes: `pessoas.endereco`, `avaliacoes_modelo.grupos`, `avaliacao_aluno_resultado.conceitos_por_grupo`, `cobrancas.neofin_payload`, `roles_sistema.permissoes`.

## 2. Domínios e Tabelas

### 2.1 Domínio Pessoas / Identidade

- **pessoas**: cadastro F/J com contato, documentos, flags de ativo e sociais; guarda endereço em JSONB e FK opcional `endereco_id` → `enderecos`; auditado por `created_by/updated_by` (profiles/auth).
- **pessoas_roles**: associa pessoa a um role textual; FK `pessoa_id`.
- **endereco**: tabela simples (logradouro, número, bairro, cidade, uf, cep); PK `endereco_id`.
- **enderecos**: endereço estruturado (logradouro, cidade, UF char(2), referência, timestamps); usada como FK em `pessoas`.
- **enderecos_pessoa**: endereço detalhado por pessoa, FKs para `ruas`, `bairros` e `pessoas` (unique por pessoa).
- **bairros / ruas**: dicionários de localidades; `ruas` FK `bairro_id`.
- **profiles**: perfis de usuário (auth.users) ligados a `pessoas` (unique).
- **usuario_roles**: relação user ↔ role (FK `profiles.user_id` e `roles_sistema`).
- **roles_sistema**: catálogo de roles com `permissoes` JSONB.

### 2.2 Domínio Colaboradores e Professores

- **colaboradores**: vincula pessoa a centro de custo e tipo de vínculo; campos de vigência, ativo, observações.
- **tipos_vinculo_colaborador**: catálogo de vínculos (usa jornada, vigência, folha, etc.).
- **funcoes_grupo**: grupos de funções (pode lecionar, ordem, centro de custo).
- **funcoes_colaborador**: funções (código, nome, grupo, ativo) com FK para `funcoes_grupo`.
- **colaborador_funcoes**: atribuições de função ao colaborador; marca `principal`; FKs `colaborador_id`, `funcao_id`.
- **colaborador_jornada / colaborador_jornada_dias**: jornadas com vigência e horários por dia; FKs para colaborador e tipo de vínculo.
- **config_pagamento_colaborador**: configura pagamento por colaborador/função/modelo; FKs para `colaboradores`, `funcoes_colaborador`, `modelos_pagamento_colaborador`.
- **modelos_pagamento_colaborador**: modelos de remuneração (código, tipo, unidade, centro de custo, categoria financeira).
- **professores**: especializa colaborador; FK `colaborador_id`, `tipo_professor_id`, dados bio/ativo.
- **tipos_professor**: catálogo de tipos de professor.

### 2.3 Domínio Acadêmico (Cursos, Níveis, Módulos, Habilidades, Turmas, Avaliações)

- **cursos**: cursos com metodologia/situação.
- **niveis**: níveis por curso, com faixa etária, pré-requisito opcional.
- **modulos**: módulos por curso/nivel, ordem e obrigatoriedade.
- **habilidades**: habilidades por curso/nivel/modulo, critérios de avaliação, ordem.
- **turmas**: cadastro de turmas (curso/nivel em texto, capacidade, `dias_semana` array, horários, turno/tipo/status, carga horária prevista, `frequencia_minima_percentual`, observações).
- **turmas_horarios**: horários por turma (dia da semana 0–6, início/fim).
- **turma_professores**: vínculos professor (colaborador) e função por turma, marca principal, datas e ativo.
- **turma_niveis**: níveis associados à turma; marca principal opcional.
- **turma_avaliacoes**: avaliações previstas da turma (modelo, título, descrição, obrigatória, datas prevista/realizada, status).
- **avaliacao_aluno_resultado**: resultados por aluno/pessoa em `turma_avaliacoes`, com conceito final, conceitos por grupo (JSONB), avaliador.
- **avaliacoes_modelo**: modelos de avaliação (tipo USER-DEFINED, grupos JSONB, `conceitos_ids` array, obrigatória/ativo).
- **avaliacoes_conceitos**: catálogo de conceitos (código, rótulo, ordem, cor, ativo).

### 2.4 Domínio Matrículas / Alunos / Vínculos

- **matriculas** (NOVA, canônica): centraliza a relação Pessoa (aluno) ↔ Turma/Projeto ↔ Plano/Contrato ↔ Financeiro. Campos principais (schema atual):  
  - `id` (identity),  
  - `pessoa_id` (→ pessoas.id),  
  - `responsavel_financeiro_id` (→ pessoas.id),  
  - `tipo_matricula` enum (REGULAR/CURSO_LIVRE/PROJETO_ARTISTICO),  
  - `vinculo_id` (→ turmas.turma_id nesta etapa),  
  - `plano_matricula_id` (FK futuro, se/quando existir a tabela de planos),  
  - `contrato_modelo_id` (FK futuro para contratos_modelo),  
  - `contrato_emitido_id` (opcional, futuro),  
  - `contrato_pdf_url`,  
  - `status` enum (ATIVA/TRANCADA/CANCELADA/CONCLUIDA),  
  - `ano_referencia`,  
  - `data_matricula` (default current_date),  
  - `data_encerramento`,  
  - `observacoes`,  
  - `created_at/updated_at`,  
  - `created_by/updated_by`.  

  > Observação: alguns FKs auxiliares (planos/contratos emitidos) ainda não existem fisicamente; o campo já está previsto para integração futura.

- **alunos** (LEGADO): cadastro antigo de aluno (nome, contato, nascimento, ativo, `user_id` opcional). Continua existindo e é usado por partes antigas; modelo futuro usa `pessoas` + `matriculas`.
- **alunos_turmas** (LEGADO): vínculo legado `aluno_id` (alunos) ↔ `turma_id` (turmas), com datas (`dt_inicio`, `dt_fim`) e `situacao` textual. Mantida para histórico/módulos antigos; será substituída por `matriculas` + `turma_aluno`.
- **turma_aluno** (CANÔNICA operacional): vínculo Pessoa ↔ Turma ajustado para conversar com `matriculas`. Campos:  
  - `turma_aluno_id` PK,  
  - `turma_id` (→ turmas.turma_id),  
  - `aluno_pessoa_id` (→ pessoas.id) com FK explícita,  
  - `dt_inicio` (default current_date),  
  - `dt_fim`,  
  - `status` textual (ex.: 'ativo'),  
  - `matricula_id` (→ matriculas.id).  

  Índices existem em `aluno_pessoa_id` e `matricula_id`. Essa tabela passa a ser o vínculo operacional canônico Pessoa ↔ Turma, especialmente para REGULAR/CURSO_LIVRE.

- **vinculos**: relação aluno (pessoa) ↔ responsável (pessoa) com parentesco (`aluno_id` → pessoas.id, `responsavel_id` → pessoas.id).

### 2.5 Domínio Financeiro

- **centros_custo**: centros de custo (código único, ativo).
- **categorias_financeiras**: categorias por tipo, referenciam `plano_contas`.
- **plano_contas**: plano de contas hierárquico (parent_id).
- **contas_financeiras**: contas (caixa/banco) por centro de custo, código único.
- **cobrancas**: cobranças por pessoa (valor, vencimento, status, método, payload neofin JSONB, link, linha digitável, centro de custo, origem).
- **recebimentos**: recebimentos vinculados à cobrança e centro de custo (valor, data, método).
- **contas_pagar**: contas a pagar por centro de custo/categoria/pessoa (valor, vencimento, status).
- **contas_pagar_pagamentos**: liquidações de contas a pagar (principal/juros/desconto), conta financeira, centro de custo, usuário.
- **movimento_financeiro**: lançamentos genéricos (tipo, centro de custo, valor, data, origem/ID).

### 2.6 Domínio Administração / Segurança / Auditoria

- **auditoria_logs**: trilha de ações (user, ação, entidade/id, detalhes JSONB, IP/UA, created_at); FK para `profiles`.
- **roles_sistema / usuario_roles**: gerenciamento de roles e associação a usuários.
- **profiles**: perfil de usuário (auth.users) vinculado a `pessoas`, flag admin.

## 3. Pontos de Atenção e Inconsistências

- **Matrículas / Alunos / Vínculos**:  
  - Existe a tabela canônica `matriculas`, mas o código ainda não está totalmente migrado para usá-la.  
  - Continuam coexistindo `alunos` (cadastro legado) e `pessoas` (oficial), além de `alunos_turmas` (legado) e `turma_aluno` (canônico, agora com `matricula_id`).  
  - Risco: diferentes módulos enxergarem “aluno em turma” por tabelas distintas até conclusão da migração.

- **Endereços fragmentados**:  
  - Persistem `endereco`, `enderecos`, `enderecos_pessoa` e `pessoas.endereco` (JSONB), além de `bairros/ruas`.  
  - O modelo alvo é `enderecos_pessoa` + dicionários, mas há dados espalhados.

- **Campos JSON/JSONB**:  
  - Estruturas como `pessoas.endereco`, `avaliacoes_modelo.grupos`, `avaliacao_aluno_resultado.conceitos_por_grupo`, `cobrancas.neofin_payload`, `roles_sistema.permissoes` exigem cuidado em queries/refatorações.

- **Dependências cruzadas**:  
  - Vínculos de colaborador/funções/pagamentos conectam Acadêmico (professores), Financeiro (centros/categorias) e Administração (roles/perfis).  
  - Turmas e Avaliações dependem de dicionários auxiliares (`turma_professores`, `turma_avaliacoes`, `avaliacoes_modelo`, `avaliacoes_conceitos`), pedindo cautela em alterações.

## 4. Resumo para Futuras Refatorações

- **Matrículas / Alunos / Vínculos**:  
  - `matriculas` é a fonte oficial de vínculo pedagógico/financeiro.  
  - `turma_aluno` é o vínculo operacional canônico Pessoa ↔ Turma e deve se associar a `matriculas` para REGULAR/CURSO_LIVRE.  
  - `alunos` e `alunos_turmas` são legados, a serem mantidos só para leitura/histórico até migração completa.

- **Endereços**:  
  - Consolidar uso de `enderecos_pessoa` + `bairros/ruas`;  
  - Planejar migração dos dados de `endereco`, `enderecos` e `pessoas.endereco` (JSONB) para a estrutura única.

- **Financeiro**:  
  - Manter e consolidar centros de custo, plano de contas, categorias, contas a pagar/receber e movimento;  
  - Conectar `matriculas` às cobranças/recebimentos e, futuramente, a contratos emitidos.

- **Avaliações, Turmas e Currículo**:  
  - Conjunto `turmas` + `turma_professores` + `turma_avaliacoes` + `avaliacoes_modelo` + `avaliacao_aluno_resultado` está consistente;  
  - Próxima evolução é integrar conclusão/frequências ao currículo (tabela `historico_academico` conceitual).

- **Administração e Segurança**:  
  - Manter `profiles`, `roles_sistema`, `usuario_roles` e `auditoria_logs` como base para expansão (incluindo automações/IA).
