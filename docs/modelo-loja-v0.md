# 📘 Modelo Provisório — Módulo Loja v0
Sistema Conexão Dança — AJ Dance Store  
Versão: 0.4 (provisória, focada em uso imediato)

## 1. Objetivo

Este documento registra o modelo provisório do **Módulo Loja v0**, criado para uso imediato, com foco em:

- cadastro de produtos;
- registro de vendas simples;
- registro de entregas de figurino (R$ 0,00);
- controle mínimo de crediário interno;
|- rastreio de quem fez a venda/entrega;
- coleta de feedback dos vendedores (observações de teste);
- vínculo da venda ao **responsável financeiro** e dos itens ao **beneficiário (aluno)**;
- capacidade de **cancelar vendas** sem apagar dados;
- uso da Loja como **porta de entrada** para cadastro rápido de família (responsável + alunos).

Ele é compatível com o modelo de banco padrão, mas pode ser substituído/refatorado no futuro.

## 2. Tabelas Provisórias do Domínio LOJA

### 2.1 Tabela `loja_produtos`

Catálogo simples de produtos da AJ Dance Store.

Campos (concepção física alvo):

- `id bigint PK`
- `codigo text UNIQUE` — código interno/SKU
- `nome text NOT NULL`
- `descricao text`
- `categoria text`
- `preco_venda_centavos integer NOT NULL`
- `unidade text` — “UN”, “PAR”, etc.
- `estoque_atual integer NOT NULL DEFAULT 0`
- `ativo boolean NOT NULL DEFAULT true`
- `observacoes text`
- `created_at timestamptz NOT NULL DEFAULT now()`
- `updated_at timestamptz NOT NULL DEFAULT now()`

### 2.2 Tabela `loja_vendas`

Cabeçalho de vendas/entregas.

- `id bigint PK`
- `cliente_pessoa_id bigint NOT NULL` → FK `pessoas(id)`  
  > Quem é o **responsável financeiro / cliente** da venda.  
  > Pode ser o próprio aluno ou um responsável (pai, mãe, tio, etc.).
- `tipo_venda text NOT NULL`
  - `VENDA`
  - `CREDIARIO_INTERNO`
  - `ENTREGA_FIGURINO`
- `valor_total_centavos integer NOT NULL`
- `desconto_centavos integer NOT NULL DEFAULT 0`
- `forma_pagamento text NOT NULL`
  - `AVISTA`, `CREDIARIO_INTERNO`, `OUTRO`
- `status_pagamento text NOT NULL`
  - `PENDENTE`, `PAGO`, `PARCIAL`
- `status_venda text NOT NULL DEFAULT 'ATIVA'`
  - `ATIVA`
  - `CANCELADA`
- `data_venda timestamptz NOT NULL DEFAULT now()`
- `data_vencimento date` — relevante para crediário interno
- `observacoes text` — campo livre para observações da venda
- `observacao_vendedor text` — campo específico para feedback do usuário sobre o fluxo da loja (teste da Loja v0)
- `vendedor_user_id uuid` → FK `profiles(user_id)`
- `cancelada_em timestamptz` — data/hora do cancelamento (quando `status_venda = 'CANCELADA'`)
- `cancelada_por_user_id uuid` → FK `profiles(user_id)` — usuário que cancelou
- `motivo_cancelamento text` — texto curto com a justificativa do cancelamento
- `created_at timestamptz NOT NULL DEFAULT now()`
- `updated_at timestamptz NOT NULL DEFAULT now()`

Regras de uso:

- Venda à vista:
  - `tipo_venda = 'VENDA'`
  - `forma_pagamento = 'AVISTA'`
  - `status_pagamento = 'PAGO'`
  - `status_venda = 'ATIVA'`
- Crediário interno:
  - `tipo_venda = 'CREDIARIO_INTERNO'`
  - `forma_pagamento = 'CREDIARIO_INTERNO'`
  - `status_pagamento = 'PENDENTE` ou `PARCIAL`
  - `status_venda = 'ATIVA'`
  - `data_vencimento` preenchida
- Entrega de figurino:
  - `tipo_venda = 'ENTREGA_FIGURINO'`
  - `valor_total_centavos = 0`
  - `status_pagamento = 'PAGO'`
  - `status_venda = 'ATIVA'`

Cancelamento:

- Ao cancelar uma venda:
  - `status_venda = 'CANCELADA'`
  - `cancelada_em = now()`
  - `cancelada_por_user_id` preenchido com o usuário logado
  - `motivo_cancelamento` preenchido com texto digitado pelo usuário
- Nenhuma linha é apagada; apenas o status é alterado.

### 2.3 Tabela `loja_venda_itens`

Itens de cada venda/entrega.

- `id bigint PK`
- `venda_id bigint NOT NULL` → FK `loja_vendas(id)`
- `produto_id bigint NOT NULL` → FK `loja_produtos(id)`
- `quantidade integer NOT NULL`
- `preco_unitario_centavos integer NOT NULL`
- `total_centavos integer NOT NULL`
- `beneficiario_pessoa_id bigint` → FK `pessoas(id)` (opcional)  
  > Quem **vai usar** o item (normalmente o aluno).  
  > Pode ser nulo quando o item não está vinculado a um aluno específico.
- `observacoes text`

Regra: a soma de `total_centavos` dos itens deve bater com `valor_total_centavos` da venda.

## 3. Telas Previstas no Contexto LOJA

Referência ao VNB (Sidebar, domínio LOJA):

- `/loja` — início da loja;
- `/loja/produtos` — cadastro e listagem de produtos;
- `/loja/caixa` — frente de caixa para vendas/entregas;
- `/loja/vendas` — histórico de vendas;
- `/loja/vendas/[id]` — visualização tipo recibo;
- `/loja/relatorios` — visão de vendas e feedback (v0).

### 3.1 `/loja/produtos`

- Tabela com:
  - Código, Nome, Preço, Estoque, Ativo.
- Filtro por nome/código.
- Formulário de novo produto (modal ou página) com:
  - nome, código, categoria, preço de venda, estoque inicial, unidade, ativo, observações.

### 3.2 Wizard Família Loja v0 (Cadastro rápido de Responsável + Alunos)

Este wizard é acessado a partir da Loja (por exemplo, botão “Cadastrar família rápida (Loja)” no `/loja/caixa`) e tem como objetivo:

- criar **pessoas** para o responsável financeiro e para os alunos;
- criar **vínculos** em `vinculos` (aluno ↔ responsável);
- evitar cadastros duplicados;
- voltar ao caixa com tudo pronto para a venda.

#### 3.2.1 Passo 1 — Responsável Financeiro (cliente)

Campos:

- Nome completo (obrigatório).
- CPF (obrigatório).
- Telefone principal (opcional).

Regras:

- Ao preencher o CPF, a aplicação:
  - consulta `pessoas` por CPF;
  - se encontrar registro:
    - exibir: “Já existe: Fulano de Tal. Deseja usar este cadastro?”;
    - se o usuário confirmar, **não cria nova pessoa**, usa o cadastro existente;
  - se não encontrar, permite criar nova pessoa com esse CPF.
- Recomenda-se, em fase posterior, criar `UNIQUE (cpf)` em `pessoas`. Na Loja v0, essa unicidade é garantida pela lógica da aplicação.

Resultado:

- Pessoa responsável criada ou reutilizada.
- `cliente_pessoa_id` será essa pessoa na venda.

#### 3.2.2 Passo 2 — Alunos / Dependentes

O wizard permite cadastrar uma lista de alunos dependentes:

Para cada aluno:

- Nome completo (obrigatório).
- Data de nascimento (opcional).
- Observações (opcional).
- Flag “Responsável é o próprio aluno” (para adultos que pagam por si mesmos).

Regras de duplicidade:

- Ao salvar um aluno, a aplicação:
  - normaliza o nome (minúsculas, sem acentos, sem espaços duplicados);
  - procura em `pessoas` por nomes iguais ou muito semelhantes que:
    - já estejam vinculados ao mesmo responsável em `vinculos` (quando existirem);
  - Se encontrar nome **idêntico normalizado** com o mesmo responsável:
    - exibe alerta: “Já existe um aluno chamado X vinculado a este responsável. Confirmar novo cadastro?”.
- Em fase futura, pode ser usada similaridade de strings (trigramas) para detectar grafias parecidas (“Maria Clara” vs “Marya Clara”).

Criação de vínculos:

- Para cada aluno criado:
  - a aplicação cria um registro em `pessoas`;
  - e cria um registro em `vinculos`:
    - `aluno_id` = pessoa do aluno.
    - `responsavel_id` = pessoa do responsável financeiro.
    - `parentesco` = texto (“pai”, “mãe”, “responsável”, etc.).

Caso “responsável é o próprio aluno”:

- Se marcado:
  - criar apenas uma pessoa;
  - essa pessoa será:
    - responsável financeiro (cliente);
    - beneficiário dos itens na venda.
  - Vinculação em `vinculos` é opcional nesse caso (pode ser omitida).

#### 3.2.3 Resultado do Wizard

Ao concluir o wizard:

- retorna para `/loja/caixa` com:
  - `cliente_pessoa_id` já selecionado;
  - lista de alunos vinculados a esse responsável disponível para seleção no campo “Beneficiário” de cada item.

### 3.3 `/loja/caixa` (Frente de Caixa)

#### 3.3.1 Bloco Cliente (Responsável Financeiro)

- Auto-complete de `pessoas` para escolher o **cliente da venda** (`cliente_pessoa_id`).
- Botão **“+ Cadastrar família rápida (Loja)”**:
  - abre o wizard descrito em 3.2;
  - ao concluir, retorna com cliente selecionado e alunos carregados.

#### 3.3.2 Bloco Tipo de Operação

- Select:
  - `VENDA`
  - `CREDIARIO_INTERNO`
  - `ENTREGA_FIGURINO`
- Quando `CREDIARIO_INTERNO`:
  - exibe campo `data_vencimento`.
- Quando `ENTREGA_FIGURINO`:
  - o front pode forçar `preco_unitario_centavos = 0` nos itens.

#### 3.3.3 Bloco Itens

- Tabela de itens com colunas:
  - Produto (auto-complete de `loja_produtos`).
  - Quantidade.
  - Preço unitário.
  - Beneficiário (opcional):
    - auto-complete de `pessoas`, com atalho para listar primeiro os alunos vinculados ao cliente;
    - preenche `beneficiario_pessoa_id`.
  - Observações (por item, opcional).

- Cálculo automático:
  - total por item = quantidade × preço unitário;
  - total geral da venda (soma dos itens).

#### 3.3.4 Bloco Resumo e Feedback

- Campos:
  - Desconto (R$).
  - Forma de pagamento.
  - Observações gerais (`observacoes`).
  - **Observação do vendedor (teste da Loja v0)** (`observacao_vendedor`):
    - textarea específica para feedback sobre o fluxo da loja:
      - campos que faltaram;
      - situações não previstas;
      - sugestões de melhoria.
- Botão **“Salvar venda/entrega”**:
  - Chama `POST /api/loja/vendas` com cabeçalho + itens.
  - Define `vendedor_user_id` a partir do usuário logado.
  - Redireciona para `/loja/vendas/[id]`.

### 3.4 `/loja/vendas` e `/loja/vendas/[id]`

#### 3.4.1 `/loja/vendas` — Lista

Filtros:

- Período (data inicial e final).
- Tipo de operação (`VENDA`, `CREDIARIO_INTERNO`, `ENTREGA_FIGURINO`).
- Status de pagamento.
- **Status da venda** (`ATIVA` / `CANCELADA`).
- Cliente.
- Vendedor.

Colunas:

- Data da venda.
- Cliente (nome da pessoa).
- Tipo de operação.
- Valor total.
- Status de pagamento.
- Status da venda (com destaque quando `CANCELADA`).
- Vendedor.

#### 3.4.2 `/loja/vendas/[id]` — Detalhe / Recibo

Conteúdo:

- Cabeçalho com:
  - Nome da escola / AJ Dance Store.
  - Dados do cliente (nome, CPF opcional).
  - Data da venda.
  - Tipo de operação.
  - Status da venda (ATIVA ou CANCELADA).
- Itens:
  - Produto.
  - Quantidade.
  - Preço unitário.
  - Total.
  - Beneficiário (quando houver).
- Totais:
  - Subtotal, desconto, total final.
- Observações:
  - `observacoes`.
  - `observacao_vendedor` (pode aparecer em uma seção “Feedback interno”).
- Rodapé:
  - Nome do vendedor.
  - Campo para assinatura manual.

Ações:

- Botão **“Imprimir”** (usa impressão do navegador).
- Botão **“Cancelar venda”** (quando usuário tiver permissão e a venda estiver ATIVA):
  - ao clicar, abre modal para preencher `motivo_cancelamento`;
  - atualiza a venda para:
    - `status_venda = 'CANCELADA'`
    - `cancelada_em = now()`
    - `cancelada_por_user_id` = usuário logado.

## 4. Relatórios e Feedback da Loja v0

### 4.1 Relatório de Vendas / Resumo

Rota sugerida: `/loja/relatorios` ou `/loja/relatorios/vendas`.

Filtros:

- Período (data inicial e final).
- Tipo de operação (`VENDA`, `CREDIARIO_INTERNO`, `ENTREGA_FIGURINO`).
- Vendedor.
- Cliente.
- Status de pagamento.
- Status da venda (`ATIVA` / `CANCELADA`).

Indicadores:

- Total de vendas (R$) no período (apenas vendas ATIVAS).
- Quantidade de vendas.
- Total de crediário interno em aberto (somatório de vendas `CREDIARIO_INTERNO` com `status_pagamento = 'PENDENTE'` ou `PARCIAL` e `status_venda = 'ATIVA'`).
- Quantidade de entregas de figurino.

Tabelas:

- Por produto:
  - Produto | Quantidade vendida | Valor total.
- Por vendedor:
  - Vendedor | Nº de vendas | Valor total.
- Por cliente:
  - Cliente | Nº de vendas | Valor total.

### 4.2 Relatório de Feedback da Loja v0

Rota sugerida: `/loja/relatorios/feedback`  
ou aba dentro de `/loja/relatorios`.

Objetivo: listar apenas vendas com feedback de teste.

Filtros mínimos:

- Período.
- Vendedor.

Colunas principais:

- Data da venda.
- Cliente.
- Vendedor.
- Tipo de operação.
- Status da venda.
- `observacao_vendedor`.

Uso: esse relatório será a principal fonte de insumos para a especificação da Loja v1 (refinada), permitindo enxergar:

- campos que fizeram falta;
- fluxos confusos;
- situações de uso não previstas.

## 5. Observações Importantes

- Este modelo é **provisório**, mas já alinhado ao modelo central de Pessoas e ao futuro financeiro.
- Não há integração obrigatória com `cobrancas` / `recebimentos` na v0.
- No futuro, as vendas (especialmente `CREDIARIO_INTERNO`) podem gerar cobranças automáticas.
- O campo `observacao_vendedor` é a principal ferramenta de coleta de feedback de uso real da Loja v0.
- O vínculo `cliente_pessoa_id` (responsável financeiro) + `beneficiario_pessoa_id` (por item) viabiliza relatórios futuros tanto por **cliente** quanto por **aluno**.
- O wizard “Família Loja v0” evita cadastros duplicados usando:
  - CPF como chave prática para responsáveis;
  - checagem de nome + responsável para alunos;
  - e, futuramente, pode ser aprimorado com comparação de similaridade de nomes.

## 6. Próximos Passos (quando for implementar)

Quando o ChatGPT for gerar comandos de implementação:

1. Criar as tabelas SQL acima (Loja v0).
2. Criar APIs:
   - `/api/loja/produtos`
   - `/api/loja/vendas`
   - endpoints de listagem para relatórios (vendas e feedback).
   - endpoints de apoio ao wizard:
     - busca e criação rápida de `pessoas`;
     - criação de `vinculos`.
3. Criar páginas:
   - `/loja/produtos`
   - `/loja/caixa`
   - `/loja/vendas`
   - `/loja/vendas/[id]`
   - `/loja/relatorios` (vendas e feedback)
   - wizard “Família Loja v0” embutido no fluxo da loja.

[ FIM DO DOCUMENTO — modelo-loja-v0.md ]
