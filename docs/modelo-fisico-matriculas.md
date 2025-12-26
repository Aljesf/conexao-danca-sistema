📘 Modelo Físico — Domínio de Matrículas (Alvo)

Sistema Conexão Dança
Status: Documento físico-alvo (referência técnica)
Base normativa: Regras Oficiais de Matrícula (Conexão Dança) – v1

⚠️ Este documento NÃO é migration SQL.
Ele define como o banco DEVE ficar para que o sistema respeite as regras oficiais.

0. Objetivo do Modelo Físico

Definir o modelo físico alvo do domínio Matrículas, garantindo:

Pessoa como centro do sistema;

Matrícula como ato contratual e gatilho financeiro;

Tabela de Matrícula como fonte única de valores;

Plano de pagamento definindo apenas como pagar;

Entrada (Pró-rata) fora do Cartão Conexão;

Mensalidades cheias lançadas no Cartão Conexão;

Vencimento financeiro controlado exclusivamente pelo Cartão Conexão;

Parametrização institucional e auditoria completa.

1. Princípios físicos obrigatórios
1.1 Pessoa no centro

Toda matrícula referencia exclusivamente:

pessoas.id (aluno);

pessoas.id (responsável financeiro).

Não existe “aluno” fora de pessoas.

1.2 Matrícula NÃO é financeiro

A matrícula:

não define vencimento financeiro;

não gera contas a receber de mensalidade;

não calcula mora, multa ou juros.

A matrícula:

origina lançamentos;

referencia regras vigentes;

registra auditoria.

1.3 Cartão Conexão é o motor financeiro

Mensalidades cheias → credito_conexao_lancamentos;

Vencimento, juros e mora → Cartão Conexão;

Entrada (Pró-rata) → cobrança direta (cobrancas / recebimentos).

2. Entidades físicas principais

matriculas — entidade canônica do vínculo

turma_aluno — vínculo operacional pessoa ↔ turma

matricula_tabelas — tabela de precificação oficial

matricula_tabela_itens — itens e valores

matricula_planos_pagamento — forma de pagamento (sem valores)

Integrações:

credito_conexao_lancamentos

credito_conexao_faturas

cobrancas

recebimentos

3. Tabela matriculas (canônica)
3.1 Papel

Representa o ato formal de matrícula, vinculando:

Pessoa → Produto/Turma → Regras financeiras → Contrato.

3.2 Campos físicos recomendados
Campo	Tipo	Descrição
id	PK	Identificador
pessoa_id	FK pessoas	Aluno
responsavel_financeiro_id	FK pessoas	Pagador
tipo_matricula	enum	REGULAR / CURSO_LIVRE / PROJETO_ARTISTICO
vinculo_id	bigint	Turma ou projeto
ano_referencia	int	Obrigatório para REGULAR
status	enum	ATIVA / TRANCADA / CANCELADA / CONCLUIDA
data_matricula	date	Data do ato
data_inicio_vinculo	date	Início efetivo das aulas
data_encerramento	date	Opcional
tabela_matricula_id	FK	Fonte única de valores
plano_pagamento_id	FK	Como pagar (sem valores)
vencimento_padrao_referencia	int	Snapshot da política vigente
observacoes	text	Uso interno
auditoria	timestamps / users	rastreabilidade
3.3 Campo de vencimento (atenção)

vencimento_padrao_referencia:

não agenda cobrança;

não cria vencimento financeiro;

serve apenas para:

auditoria;

reconstrução histórica;

conferência humana.

O vencimento real sempre vem do Cartão Conexão.

4. Tabela matricula_tabelas (Tabela de Matrícula)
4.1 Papel

Definir quais itens são cobrados e seus valores.

É a única fonte de valores.

4.2 Campos recomendados

id

produto_tipo (REGULAR / CURSO_LIVRE / PROJETO_ARTISTICO)

referencia_tipo (TURMA / PRODUTO / PROJETO)

referencia_id

ano_referencia

titulo

ativo

auditoria

5. Tabela matricula_tabela_itens
5.1 Campos

id

tabela_id

codigo_item (MENSALIDADE, MATERIAL, FIGURINO...)

descricao

tipo_item (RECORRENTE / UNICO / EVENTUAL)

valor_centavos

ativo

ordem

5.2 Regra importante

Entrada (Pró-rata) NÃO é item da tabela.
Ela é cálculo operacional sobre a mensalidade.

6. Tabela matricula_planos_pagamento
6.1 Papel

Definir como pagar, nunca quanto pagar.

6.2 Campos

id

titulo

periodicidade (MENSAL, AVISTA, etc.)

numero_parcelas

permite_prorata

ativo

7. Pró-rata e janeiro (suporte físico)

Pró-rata aplica-se somente à primeira cobrança;

Janeiro possui início letivo específico (ex.: dia 12);

Datas devem ser parametrizáveis, nunca hardcoded.

Recomendação:

Configurações institucionais em Admin → Escola.

8. Exceção do primeiro pagamento (auditoria)

Quando a Entrada (Pró-rata) não for paga no ato:

Campos recomendados (na matrícula ou tabela de eventos):

excecao_primeiro_pagamento (bool)

motivo_excecao

excecao_autorizada_por

excecao_criada_em

Regra:

Exceção não altera valor, apenas o momento/canal.

9. Integração com Cartão Conexão
9.1 Mensalidade cheia

Criar credito_conexao_lancamento

origem_sistema = 'MATRICULA'

origem_id = matriculas.id

9.2 Entrada (Pró-rata)

Criar cobrancas

Registrar recebimentos

Não criar lançamento no Cartão Conexão

10. Tabela turma_aluno

Deve conter matricula_id;

FK explícita para pessoas;

Representa o vínculo operacional.

11. Canônico x Legado
Canônico

matriculas

pessoas

turma_aluno

matricula_tabelas

matricula_tabela_itens

Legado

alunos

alunos_turmas

Novo código não deve depender do legado.

12. Conclusão

Este modelo físico garante:

conformidade normativa;

clareza financeira;

rastreabilidade;

base segura para SQL, API e UI.

Qualquer implementação futura deve ser validada contra este documento.
