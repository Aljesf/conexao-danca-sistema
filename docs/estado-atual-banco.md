# 📘 Estado Atual do Banco de Dados — Conexão Dança
Versão: 2025-12-02  
Fonte: docs/schema-supabase.sql (dump real do Supabase)

## 1. Visão Geral

- O banco atual cobre: pessoas/identidade, colaboradores/professores, acadêmico (cursos, níveis, módulos, habilidades, turmas, avaliações), matrículas/vínculos, financeiro (cobranças/recebimentos/contas), administração/segurança/auditoria.
- Observações rápidas:
  - Há modelagens paralelas para vínculos de alunos: `alunos_turmas` (FK alunos) e `turma_aluno` (FK pessoas).
  - Endereços aparecem em múltiplas formas: `endereco` simples, `enderecos` estruturada, `enderecos_pessoa`, e JSONB `pessoas.endereco`.
  - Campos JSON/JSONB relevantes: `pessoas.endereco`, `avaliacoes_modelo.grupos`, `avaliacao_aluno_resultado.conceitos_por_grupo`, `cobrancas.neofin_payload`, `roles_sistema.permissoes`.

## 2. Domínios e Tabelas

### 2.1 Domínio Pessoas / Identidade

- **pessoas**: cadastro F/J com contato, documentos, flags de ativo, sociais; guarda endereço em JSONB e opcional FK `endereco_id` → `enderecos`; created/updated by (auth/profiles).
- **pessoas_roles**: associa pessoa a um role textual; FK `pessoa_id`.
- **endereco**: tabela simples de endereço (logradouro/numero/bairro/cidade/uf/cep); PK `endereco_id`.
- **enderecos**: endereço estruturado (logradouro, cidade, UF char(2), referência, timestamps); usada como FK em `pessoas`.
- **enderecos_pessoa**: endereço detalhado por pessoa, com FKs para `ruas`, `bairros` e `pessoas` (unique por pessoa).
- **bairros / ruas**: dicionários de localidades; `ruas` FK `bairro_id`.
- **profiles**: perfis de usuário (auth.users) ligados a `pessoas` (unique).
- **usuario_roles**: relação user ↔ role (FK `profiles.user_id` e `roles_sistema`).
- **roles_sistema**: catálogo de roles com `permissoes` JSONB.

### 2.2 Domínio Colaboradores e Professores

- **colaboradores**: vincula pessoa a centro de custo e tipo de vínculo; campos de vigência e ativo.
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
- **turmas**: cadastro de turmas (curso/nivel em texto, capacidade, dias_semana array, horários, turno/tipo/status, carga horária prevista, frequência mínima %, observações).
- **turmas_horarios**: horários por turma (dia da semana 0–6, início/fim).
- **turma_professores**: vínculos professor (colaborador) e função por turma, marca principal, datas e ativo.
- **turma_niveis**: níveis associados à turma; marca principal opcional.
- **turma_avaliacoes**: avaliações previstas da turma (modelo, título, descrição, obrigatória, datas prevista/realizada, status).
- **avaliacao_aluno_resultado**: resultados por aluno/pessoa em `turma_avaliacoes`, com conceito final, conceitos por grupo (JSONB), avaliador.
- **avaliacoes_modelo**: modelos de avaliação (tipo USER-DEFINED, grupos JSONB, conceitos_ids array, obrigatória/ativo).
- **avaliacoes_conceitos**: catálogo de conceitos (código, rótulo, ordem, cor, ativo).

### 2.4 Domínio Matrículas / Alunos / Vínculos

- **alunos**: cadastro simples de aluno (nome, contato, data de nascimento, ativo); ligado opcionalmente a auth via `user_id`.
- **alunos_turmas**: vínculo aluno ↔ turma com datas início/fim, situação; FKs `aluno_id` (alunos) e `turma_id`.
- **turma_aluno**: vínculo usando `aluno_pessoa_id` (pessoas) e `turma_id`, com datas e status; unique de matrícula aberta por turma.
- **vinculos**: relação aluno ↔ responsável (pessoas) com parentesco.

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

- Vínculos de aluno duplicados: coexistem `alunos_turmas` (aluno_id → alunos) e `turma_aluno` (aluno_pessoa_id → pessoas), com regras diferentes.
- Endereços fragmentados: `endereco`, `enderecos`, `enderecos_pessoa` e JSONB `pessoas.endereco`, além de dicionários `bairros/ruas`.
- Campos JSON/JSONB relevantes que podem dificultar queries estruturadas: `pessoas.endereco`, `avaliacoes_modelo.grupos`, `avaliacao_aluno_resultado.conceitos_por_grupo`, `cobrancas.neofin_payload`, `roles_sistema.permissoes`.
- Dependências cruzadas: funções/agrupamentos (`funcoes_colaborador`, `funcoes_grupo`) e pagamentos de colaborador atravessam domínios acadêmico/financeiro.
- Checks em turmas para tipo/turno/status; arrays em `turmas.dias_semana`; enum USER-DEFINED para `avaliacoes_modelo.tipo_avaliacao` e `pessoas.genero/estado_civil`.

## 4. Resumo para Futuras Refatorações

- Domínios mais consistentes: financeiro (centros/categorias/plano/contas/cobranças/recebimentos/contas pagar), colaboradores/professores (funções, jornadas, pagamentos), avaliações (modelos/conceitos/resultados).
- Domínios que pedem revisão: matrículas (unificar `alunos_turmas` vs `turma_aluno`), endereços (múltiplas representações), alinhamento aluno x pessoa, clarificar dicionários de localização.
- Prioridades técnicas: consolidar modelo de matrícula/aluno; decidir modelo único de endereço; revisar uso de JSONB em avaliações e endereço para possíveis normalizações; garantir referências coerentes entre pessoas/alunos; mapear enums USER-DEFINED e seu uso no app.
- Manter atenção à sobreposição entre funções de colaborador e pagamentos (evitar acoplamento excessivo) e aos vínculos turma-professor/nivel.
