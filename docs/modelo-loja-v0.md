# 📘 Modelo Provisório — Módulo Loja v0
Sistema Conexão Dança — AJ Dance Store  
Versão: 0.5 (provisória, focada em uso imediato)

## 1. Objetivo

Este documento registra o modelo provisório do **Módulo Loja v0**, criado para uso imediato, com foco em:

- **Entrada de Estoque** (fluxo da equipe da loja);
- **Gerenciar Produtos** (fluxo administrativo, definição de preços);
- Registro de vendas simples (Loja AJ);
- Registro de entregas de figurino (R$ 0,00);
- Controle mínimo de crediário interno;
- Rastreio de quem fez a venda/entrega;
- Coleta de feedback dos vendedores (observações de teste);
- Vínculo da venda ao **responsável financeiro (cliente)** e dos itens ao **beneficiário (aluno)**;
- Capacidade de **cancelar vendas** sem apagar dados;
- Uso da Loja como **porta de entrada** para cadastro rápido de família (responsável + alunos).

Ele é compatível com o modelo de banco padrão e com a visão geral do sistema, mas pode ser substituído/refatorado no futuro conforme a Loja evoluir para v1.   

---

## 2. Tabelas do Domínio LOJA v0

### 2.1 `loja_produtos` — Catálogo de produtos

Catálogo simples de produtos da AJ Dance Store. Cada registro representa um “tipo de produto” (ex.: “Sapatilha meia ponta infantil – rosa”).

**Campos (versão física atual):**

- `id bigint PK`
- `codigo text UNIQUE` — código interno/SKU
- `nome text NOT NULL`
- `descricao text`
- `categoria text`
- `preco_venda_centavos integer NOT NULL`  
  - Convenção Loja v0:
    - `0` → produto **pré-cadastrado / aguardando definição de preço** (NÃO aparece para venda);  
    - `> 0` → produto **liberado para venda**.
- `unidade text NOT NULL DEFAULT 'UN'` — “UN”, “PAR”, “KIT”, etc.
- `estoque_atual integer NOT NULL DEFAULT 0`
- `ativo boolean NOT NULL DEFAULT true`
- `observacoes text`
- `created_at timestamptz NOT NULL DEFAULT now()`
- `updated_at timestamptz NOT NULL DEFAULT now()`

**Estados do produto (regra de negócio):**

1. **Pré-cadastrado / Aguardando preço**
   - `ativo = true`
   - `preco_venda_centavos = 0`
   - Pode ter estoque, fornecedor, descrição…  
   - **Não aparece no caixa/venda**.

2. **Liberado para venda**
   - `ativo = true`
   - `preco_venda_centavos > 0`
   - Aparece em `/loja/caixa` (frente de caixa).

3. **Inativo**
   - `ativo = false`
   - Pode ter sido vendido no passado (historicamente), mas não deve mais aparecer para venda.

---

### 2.2 `loja_vendas` — Cabeçalho de vendas/entregas

Representa uma venda ou entrega (inclusive figurino).

**Campos:**

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
  - Ex.: `AVISTA`, `CREDIARIO_INTERNO`, `PIX`, `CARTAO`, `OUTRO`

- `status_pagamento text NOT NULL`
  - `PENDENTE`
  - `PAGO`
  - `PARCIAL`

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

**Regras de uso:**

- **Venda à vista:**
  - `tipo_venda = 'VENDA'`
  - `forma_pagamento = 'AVISTA'` (ou PIX/CARTÃO etc.)
  - `status_pagamento = 'PAGO'`
  - `status_venda = 'ATIVA'`

- **Crediário interno:**
  - `tipo_venda = 'CREDIARIO_INTERNO'`
  - `forma_pagamento = 'CREDIARIO_INTERNO'`
  - `status_pagamento = 'PENDENTE` ou `PARCIAL`
  - `status_venda = 'ATIVA'`
  - `data_vencimento` preenchida

- **Entrega de figurino:**
  - `tipo_venda = 'ENTREGA_FIGURINO'`
  - `valor_total_centavos = 0`
  - `status_pagamento = 'PAGO'`
  - `status_venda = 'ATIVA'`

**Cancelamento:**

Ao cancelar uma venda:

- `status_venda = 'CANCELADA'`
- `cancelada_em = now()`
- `cancelada_por_user_id` preenchido
- `motivo_cancelamento` preenchido

Nenhuma linha é apagada; apenas o status é alterado.

---

### 2.3 `loja_venda_itens` — Itens de venda

Itens de cada venda/entrega.

- `id bigint PK`
- `venda_id bigint NOT NULL` → FK `loja_vendas(id)`
- `produto_id bigint NOT NULL` → FK `loja_produtos(id)`
- `quantidade integer NOT NULL CHECK (quantidade > 0)`
- `preco_unitario_centavos integer NOT NULL CHECK (preco_unitario_centavos >= 0)`
- `total_centavos integer NOT NULL CHECK (total_centavos >= 0)`

- `beneficiario_pessoa_id bigint` → FK `pessoas(id)` (opcional)  
  > Quem **vai usar** o item (normalmente o aluno).  
  > Pode ser nulo quando o item não está vinculado a um aluno específico.

- `observacoes text`

Regra: a soma de `total_centavos` dos itens deve bater com `valor_total_centavos` da venda.

---

### 2.4 `loja_fornecedores` — Papel de fornecedor

Marca quais Pessoas (`pessoas.id`) atuam como fornecedores da Loja (PJ ou PF).

- `id bigint PK`
- `pessoa_id bigint NOT NULL` → FK `pessoas(id)`  
  > Pessoa (normalmente jurídica) que atua como **fornecedor**.
- `codigo_interno text` — código/codinome do fornecedor na loja (opcional)
- `ativo boolean NOT NULL DEFAULT true`
- `observacoes text`
- `created_at timestamptz NOT NULL DEFAULT now()`
- `updated_at timestamptz NOT NULL DEFAULT now()`

Constraint importante:

- `UNIQUE (pessoa_id)` — impede duplicar fornecedor para a mesma pessoa.

---

### 2.5 `loja_fornecedor_precos` — Régua de preços por fornecedor

Histórico de preços de custo de produtos por fornecedor.

- `id bigint PK`
- `fornecedor_id bigint NOT NULL` → FK `loja_fornecedores(id)` ON DELETE CASCADE
- `produto_id bigint NOT NULL` → FK `loja_produtos(id)` ON DELETE CASCADE
- `preco_custo_centavos integer NOT NULL`
- `moeda text NOT NULL DEFAULT 'BRL'`
- `data_referencia date NOT NULL DEFAULT current_date`
- `observacoes text`
- `created_at timestamptz NOT NULL DEFAULT now()`

Uso:

- Cada **compra ou entrada relevante** pode registrar uma linha aqui, ligando:
  - fornecedor,  
  - produto,  
  - preço de custo,  
  - data.

Permite responder:

- “Quanto a Evidência me cobrou por esta sapatilha em cada pedido?”  
- “Qual fornecedor normalmente faz melhor preço neste produto?”

---

## 3. Conceitos de Fluxo — Loja v0

### 3.1 Papéis básicos

- **Contexto Loja** (funcionários):
  - **Entrada de Estoque**;
  - Uso de `/loja/caixa` para vendas;
  - Podem escolher fornecedor (já cadastrado) no pré-cadastro.

- **Contexto Administração / Gestão da Loja** (você):
  - **Gerenciar Produtos** (definir preços, ativar/inativar);
  - Cadastrar fornecedores;
  - Ver relatórios;
  - Ajustar estoque em casos especiais.

---

## 4. Fluxo 1 — Cadastro de Fornecedor

Tela principal: `/loja/fornecedores` (menu Loja → Fornecedores).   

### 4.1 Cadastro de fornecedor (admin)

1. Você cadastra primeiro o fornecedor em **Pessoas** (Pessoa Jurídica ou Física):  
   - CNPJ, razão social, contatos etc.

2. Na tela **Fornecedores da Loja**:
   - Seleciona a Pessoa;
   - Define:
     - `codigo_interno` (Ex.: “EVIDENCIA”, “ATACADISTA_BH”, etc. — opcional);
     - `observacoes`;
     - `ativo = true`.

3. O sistema cria/atualiza registro em `loja_fornecedores`.

Resultado:

- A pessoa passa a aparecer nas telas de Loja como fornecedor disponível.

---

## 5. Fluxo 2 — ENTRADA DE ESTOQUE (funcionários)

**Nome oficial na interface:**  
> **Entrada de Estoque**

(Screen alvo: `/loja/estoque` ou seção específica dentro de `/loja/caixa`.)

### 5.1 Pré-cadastro de produto (sem preço)

Quando **produto é novo**:

1. Funcionário abre **Entrada de Estoque**.
2. Seleciona um **fornecedor** (da lista de `loja_fornecedores`).
3. Informa:
   - Nome do produto;
   - Código interno (se houver);
   - Categoria;
   - Unidade (UN, PAR, KIT…);
   - Quantidade que chegou;
   - Observações (ex.: numerações, cores, lote);
4. **Não informa nenhum preço.**

A API então:

- Cria um registro em `loja_produtos` com:
  - `preco_venda_centavos = 0` (produto ainda **não liberado para venda**);
  - `estoque_atual = quantidade`;
  - demais campos preenchidos.

- Opcionalmente, cria uma linha em `loja_fornecedor_precos` com:
  - `preco_custo_centavos = 0` (ou custo, se conhecido);
  - `fornecedor_id` escolhido;
  - `data_referencia = hoje`.

Resultado:

- Produto está **pré-cadastrado**, com fornecedor e estoque;
- Ainda **não aparece** para venda (preço 0).

### 5.2 Reposição de estoque (produto já existente)

Quando já existe o produto (tem linha em `loja_produtos`):

1. Funcionário abre **Entrada de Estoque**.
2. Seleciona um **produto já existente**.
3. Seleciona o **fornecedor** (pode ser o mesmo ou outro).
4. Informa **apenas quantidade** (e observações, se quiser).

A API:

- Soma a quantidade ao `estoque_atual`;
- Não altera `preco_venda_centavos` (valor de venda continua o mesmo);
- Pode opcionalmente registrar uma nova linha em `loja_fornecedor_precos` com o custo usado nesta compra.

Resultado:

- Estoque aumenta;
- Preço de venda se mantém;
- Produto continua liberado pra venda se já tinha preço definido.

---

## 6. Fluxo 3 — GERENCIAR PRODUTOS (admin)

**Nome de menu:**  
> **Gerenciar Produtos** (plural — lista de produtos)

**Ação interna / API:**  
> gerenciar **produto** (singular — um item por vez)

Tela alvo: `/loja/produtos` (lista) + detalhamento/edição.

### 6.1 Lista de produtos

Na tela **Gerenciar Produtos**:

- Listar:
  - Código
  - Nome
  - Categoria
  - Preço de venda (formatado em R$)
  - Estoque atual
  - Ativo (sim/não)
  - Estado lógico:
    - “Aguardando preço” quando `preco_venda_centavos = 0`.

Filtros:

- Nome/código;
- Categoria;
- Somente ativos;
- Somente “aguardando preço”.

### 6.2 Edição de produto (definição de preços)

Ao abrir um produto:

- Você (admin) pode:
  - Definir/alterar **preço de venda**:
    - campo `preco` (R$) no formulário → API converte para `preco_venda_centavos`.
  - Ajustar categoria, unidade, descrição;
  - Ativar/Inativar o produto.

Regra chave:

- Se `preco_venda_centavos` for atualizado para **> 0**, o produto passa a ser **liberado para venda**.
- Produtos com `preco_venda_centavos = 0` **não devem aparecer** em `/loja/caixa`.

### 6.3 Ligação com fornecedores e custo

No futuro (Loja v1 ou Loja v0.1 mais avançada), na tela de **Gerenciar Produtos** você também poderá:

- Ver os registros de `loja_fornecedor_precos` (histórico de custo);
- Registrar um **preço de custo** para a compra atual de um fornecedor;
- Isso alimenta a régua de preços e permite relatórios de margem.

---

## 7. Fluxo 4 — VENDAS / CAIXA

Tela principal: `/loja/caixa`  
Telas complementares: `/loja/vendas`, `/loja/vendas/[id]`, `/loja/relatorios`.

### 7.1 Caixa — Bloco Cliente (Responsável Financeiro)

- Auto-complete de `pessoas` para escolher o **cliente da venda** (`cliente_pessoa_id`).
- Botão **“+ Cadastrar família rápida (Loja)”**:
  - abre o **Wizard Família Loja v0** (descrição herdada do modelo anterior);   
  - ao concluir:
    - cria/usa Pessoa do responsável;
    - cria/usa Pessoas de alunos;
    - cria `vinculos` (aluno ↔ responsável);
    - volta ao caixa com o cliente selecionado e lista de alunos carregada.

### 7.2 Caixa — Bloco Tipo de Operação

- Select:
  - `VENDA`
  - `CREDIARIO_INTERNO`
  - `ENTREGA_FIGURINO`

A escolha de tipo determina como a API preenche `tipo_venda`, `status_pagamento`, `data_vencimento` etc.

### 7.3 Caixa — Bloco Itens

Cada item:

- Produto (auto-complete de `loja_produtos`):
  - **somente produtos com `preco_venda_centavos > 0` e `ativo = true`**;
- Quantidade;
- Preço unitário (puxado de `preco_venda_centavos`, com possibilidade de desconto/ajuste, se permitido pela regra);
- Beneficiário (opcional):
  - primeiro mostra os alunos vinculados ao responsável;
  - depois permite buscar outras Pessoas;
- Observações do item.

Total da venda:

- soma de `total_centavos` dos itens;
- aplicação de desconto geral (`desconto_centavos`).

### 7.4 Feedback do vendedor (Loja v0)

Campo:

- `observacao_vendedor` na venda (`loja_vendas`).

Uso:

- Sua equipe descreve ali:
  - dificuldades no fluxo,
  - campos que faltaram,
  - situações não previstas,
  - sugestões de melhoria.
- Será usado nos relatórios de feedback para evoluir a Loja v0 para Loja v1.

---

## 8. Relatórios principais

### 8.1 Relatório de Vendas

Rota sugerida: `/loja/relatorios` ou `/loja/relatorios/vendas`.

Filtros:

- Período;
- Tipo de operação;
- Cliente;
- Vendedor;
- Status de pagamento;
- Status da venda.

Indicadores:

- Total vendido no período (apenas vendas ATIVAS);
- Nº de vendas;
- Total em crediário pendente;
- Nº de entregas de figurino.

### 8.2 Relatório de Feedback

Rota sugerida: `/loja/relatorios/feedback`.

Mostra apenas vendas com `observacao_vendedor` preenchida:

- Data;
- Cliente;
- Vendedor;
- Tipo de operação;
- Status da venda;
- Texto do feedback.

É o insumo principal para repensar o fluxo da Loja v1.

---

## 9. Resumo Geral da Arquitetura de Fluxo Loja v0

1. **Fornecedores** (Admin):  
   - `/loja/fornecedores` → cadastra/ativa/desativa fornecedores  
   - Tabelas: `pessoas`, `loja_fornecedores`, `loja_fornecedor_precos`.

2. **Entrada de Estoque** (Loja):  
   - Tela de Entrada de Estoque (novo produto ou reposição)  
   - Cria/atualiza `loja_produtos` (estoque, dados básicos)  
   - Pode registrar preço de custo em `loja_fornecedor_precos`  
   - Não define preço de venda.

3. **Gerenciar Produtos** (Admin):  
   - `/loja/produtos` → lista e edita produtos  
   - Define **preço de venda** (`preco_venda_centavos`)  
   - Produto com `preco_venda_centavos > 0` → **liberado para venda**.

4. **Caixa / Vendas** (Loja):  
   - `/loja/caixa`, `/loja/vendas`, `/loja/vendas/[id]`  
   - Só enxergam produtos ativos com preço definido  
   - Registram vendas em `loja_vendas` + `loja_venda_itens`, vinculando cliente e beneficiário.

5. **Relatórios**:  
   - Vendas, crediário, entregas de figurino, feedback de vendedores.

[ FIM DO DOCUMENTO — Modelo Loja v0 (versão 0.5 atualizada) ]
