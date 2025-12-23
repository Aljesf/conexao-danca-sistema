Backlog - Matriculas v1 (Plano oficial)
Ordem obrigatoria (nao quebrar)

API Admin - Configuracoes de Matricula
API Admin - Planos de Matricula
API Admin - Preco por Turma/Ano
API Operacional - Criar Matricula (gera vinculo + cobrancas)

1) API Admin - Configuracoes de Matricula

Rotas

GET /api/admin/matriculas/configuracoes
POST /api/admin/matriculas/configuracoes

Regras

Sempre existir 1 configuracao ativa.
Preferir UPDATE da ativa; ou transacao que desativa todas e ativa uma unica.
Resposta sempre retorna a configuracao ativa.

Validacoes

vencimento_dia_padrao: 1-28
mes_referencia_dias: 30 fixo
parcelas_padrao: 1-24
moeda: conjunto permitido (ex.: BRL)
arredondamento_centavos: conjunto permitido (ex.: ARREDONDA_NO_FINAL)

Criterios de aceite

GET retorna uma unica linha (ativa).
POST atualiza e retorna a ativa.
Nao permite mes_referencia_dias != 30.

Testes esperados

POST com mes_referencia_dias=31 => 400
POST com vencimento_dia_padrao=0 => 400
GET apos POST => mesma configuracao ativa

2) API Admin - Planos de Matricula

Rotas

GET /api/admin/matriculas/planos
POST /api/admin/matriculas/planos
PUT /api/admin/matriculas/planos/:id
DELETE /api/admin/matriculas/planos/:id (soft delete: ativo=false)

Validacoes

valor_mensal_base_centavos > 0
total_parcelas: 1-24
valor_anuidade_centavos = valor_mensal_base_centavos * total_parcelas

Criterios de aceite

CRUD completo
Soft delete nao libera reuso do codigo

3) API Admin - Preco por Turma/Ano

Rotas

GET /api/admin/matriculas/precos
POST /api/admin/matriculas/precos
PUT /api/admin/matriculas/precos/:id

Regras

Unicidade: 1 ativo por (turma_id, ano_referencia)
Sem FKs no banco por enquanto: validar existencia via SELECT (turma/plano/centro_custo)

4) API Operacional - Criar Matricula

Entrada minima

aluno_id (pessoa)
turma_id
data_inicio
ano_referencia

Transacao

Ler config ativa + preco turma/ano + plano
Criar matriculas
Criar/atualizar vinculo em turma_aluno
Gerar cobranca PRORATA_AJUSTE (mes 30)
Gerar 12 parcelas fixas ANUIDADE_PARCELA

Perguntas ja fechadas

mes_referencia_dias = 30 (mes comercial)
EOF
