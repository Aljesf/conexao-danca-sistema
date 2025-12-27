# Schema atual - 2025-12-26

Gerado em: 2025-12-26T12:26:55.761Z

Fonte: SUPABASE_DB_URL (schema-only)

## DDL

Snapshot completo em: docs/schema-atual-2025-12-26.sql

## Mapa do dominio

### matriculas
- PK: PRIMARY KEY (id)
- FKs:
  - FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE SET NULL
  - FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON UPDATE CASCADE ON DELETE RESTRICT
  - FOREIGN KEY (responsavel_financeiro_id) REFERENCES pessoas(id) ON UPDATE CASCADE ON DELETE RESTRICT
  - FOREIGN KEY (vinculo_id) REFERENCES turmas(turma_id) ON UPDATE CASCADE ON DELETE RESTRICT
- Colunas-chave: id, pessoa_id, responsavel_financeiro_id, tipo_matricula, vinculo_id, ano_referencia, status, data_matricula, data_encerramento, servico_id, observacoes, created_at, updated_at

### turma_aluno
- PK: PRIMARY KEY (turma_aluno_id)
- FKs:
  - FOREIGN KEY (aluno_pessoa_id) REFERENCES pessoas(id) ON UPDATE CASCADE ON DELETE RESTRICT
  - FOREIGN KEY (matricula_id) REFERENCES matriculas(id) ON UPDATE CASCADE ON DELETE SET NULL
  - FOREIGN KEY (turma_id) REFERENCES turmas(turma_id) ON DELETE CASCADE
- Colunas-chave: turma_aluno_id, turma_id, aluno_pessoa_id, matricula_id, dt_inicio, dt_fim, status

### turmas
- PK: PRIMARY KEY (turma_id)
- FKs:
  - FOREIGN KEY (espaco_id) REFERENCES espacos(id) ON DELETE RESTRICT
- Colunas-chave: turma_id, nome, curso, nivel, tipo_turma, ano_referencia, status, ativo, espaco_id, idade_minima, idade_maxima, created_at, updated_at

### pessoas
- PK: PRIMARY KEY (id)
- FKs:
  - FOREIGN KEY (created_by) REFERENCES profiles(user_id) ON DELETE SET NULL
  - FOREIGN KEY (created_by) REFERENCES auth.users(id)
  - FOREIGN KEY (endereco_id) REFERENCES enderecos(id)
  - FOREIGN KEY (updated_by) REFERENCES profiles(user_id) ON DELETE SET NULL
  - FOREIGN KEY (updated_by) REFERENCES auth.users(id)
- Colunas-chave: id, nome, cpf, nascimento, email

### escola_tabelas_precos_cursos
- Status: nao existe no banco atual

### escola_tabelas_precos_cursos_itens
- Status: nao existe no banco atual

### matricula_planos_pagamento
- Status: nao existe no banco atual

### matricula_planos
- PK: PRIMARY KEY (id)
- Colunas-chave: id, ativo

### servicos
- PK: PRIMARY KEY (id)
- Colunas-chave: id, tipo, referencia_tipo, referencia_id, ano_referencia, titulo, ativo

### servico_itens
- PK: PRIMARY KEY (id)
- FKs:
  - FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE CASCADE
- Colunas-chave: id, servico_id, codigo, nome, tipo_item, obrigatorio, ativo

### servico_itens_precos
- PK: PRIMARY KEY (id)
- FKs:
  - FOREIGN KEY (item_id) REFERENCES servico_itens(id) ON DELETE CASCADE
- Colunas-chave: id, item_id, valor_centavos, moeda, vigencia_inicio, vigencia_fim, ativo

### matricula_precos_turma
- PK: PRIMARY KEY (id)
- Colunas-chave: id, turma_id, ano_referencia, plano_id, centro_custo_id, ativo

### matricula_precos_servico
- PK: PRIMARY KEY (id)
- FKs:
  - FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE CASCADE
- Colunas-chave: id, servico_id, ano_referencia, ativo

### cobrancas
- PK: PRIMARY KEY (id)
- FKs:
  - FOREIGN KEY (centro_custo_id) REFERENCES centros_custo(id)
  - FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE RESTRICT
- Colunas-chave: id, pessoa_id, origem_tipo, origem_id, valor_centavos, status

### recebimentos
- PK: PRIMARY KEY (id)
- FKs:
  - FOREIGN KEY (cartao_bandeira_id) REFERENCES cartao_bandeiras(id)
  - FOREIGN KEY (cartao_maquina_id) REFERENCES cartao_maquinas(id)
  - FOREIGN KEY (centro_custo_id) REFERENCES centros_custo(id)
  - FOREIGN KEY (cobranca_id) REFERENCES cobrancas(id) ON DELETE CASCADE
- Colunas-chave: id, cobranca_id, valor_centavos

### credito_conexao_lancamentos
- PK: PRIMARY KEY (id)
- FKs:
  - FOREIGN KEY (conta_conexao_id) REFERENCES credito_conexao_contas(id) ON DELETE CASCADE
- Colunas-chave: id, conta_conexao_id, origem_sistema, origem_id, valor_centavos, status

### credito_conexao_faturas
- PK: PRIMARY KEY (id)
- FKs:
  - FOREIGN KEY (cobranca_id) REFERENCES cobrancas(id)
  - FOREIGN KEY (conta_conexao_id) REFERENCES credito_conexao_contas(id)
- Colunas-chave: id, conta_conexao_id, status, valor_total_centavos

## Gap analysis (modelo fisico alvo vs banco atual)

Referencia: docs/modelo-fisico-matriculas.md

- matriculas: existe (faltam colunas: data_inicio_vinculo, escola_tabela_preco_curso_id, plano_pagamento_id, vencimento_dia_padrao)
- turma_aluno: existe (sem gaps principais)
- escola_tabelas_precos_cursos: NAO existe (falta criar)
- escola_tabelas_precos_cursos_itens: NAO existe (falta criar)
- matricula_planos_pagamento: NAO existe (falta criar)
- credito_conexao_lancamentos: existe (sem gaps principais)
- credito_conexao_faturas: existe (sem gaps principais)
- cobrancas: existe (sem gaps principais)
- recebimentos: existe (sem gaps principais)
