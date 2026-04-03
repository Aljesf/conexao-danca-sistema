# 📘 Manual Financeiro – Conexão Dança  
Guia prático para gestores, operadores e colaboradores  
Versão 1.0  

Este manual descreve todas as regras, telas, operações e orientações do módulo Financeiro do sistema Conexão Dança.

O documento é dividido por temas e papéis, para garantir que todos entendam exatamente o que fazer, onde clicar e como registrar corretamente os movimentos financeiros da Escola, da Loja AJ Dance Store e do Ballet Café.

---

# 🔹 1. Introdução  
O módulo Financeiro foi projetado para atender 3 centros de custo diferentes:

- **Escola** (Conexão Dança)  
- **Loja** (AJ Dance Store)  
- **Café** (Ballet Café)

E para controlar as seguintes áreas:

- contas a receber  
- contas a pagar  
- recebimentos  
- movimento financeiro (caixa geral)  
- ajustes manuais  
- cadastro de categorias  
- cadastro de contas financeiras  
- plano de contas (contabilidade real)

Todas as telas seguem o padrão visual do sistema, com cards, tabelas limpas e instruções claras.

---

# 🔹 2. Centros de Custo  
Centros de custo servem para separar os movimentos financeiros por área da instituição.

### Exemplos:
- Escola: mensalidade, workshop, espetáculo  
- Loja: venda de produtos  
- Café: venda de itens alimentícios  

Cada lançamento financeiro — RECEITA ou DESPESA — sempre deve ser atribuído a **um centro de custo**.

---

# 🔹 3. Contas Financeiras (bancos e caixas físicos)

Cada centro de custo possui:

### Bancos
- Conta bancária da Escola  
- Conta bancária da Loja  
- Conta bancária do Café  

### Caixas físicos
- Caixa Escola  
- Caixa Loja  
- Caixa Café  

Essa separação permite saber:
- quanto tem em cada conta  
- quanto entrou por dinheiro, pix, boleto, cartão  
- quanto saiu de cada caixa  

---

# 🔹 4. Formas de Pagamento

O sistema reconhece:
- Dinheiro  
- PIX  
- Cartão de crédito  
- Cartão de débito  
- Boleto (Nelfim)  
- Crediário interno  

Em cada operação financeira, a forma de pagamento deve ser registrada.

---

# 🔹 5. Contas a Receber (Cobrancas)

Aqui ficam **todas as obrigações de clientes/alunos**, como:

- mensalidades  
- taxas  
- workshops  
- eventos  
- vendas futuras  

Cada cobrança pode ter:
- valor  
- vencimento  
- status (“aguardando”, “pago”, “cancelado”)  
- centro de custo  
- origem (mensalidade, workshop, loja, café)

### Fluxo de recebimento:
1. A cobrança é criada (ex.: mensalidade)  
2. O aluno paga  
3. O sistema registra na tela “Recebimentos”  
4. O valor entra no “Movimento Financeiro”

---

# 🔹 6. Contas a Pagar

Aqui ficam **despesas e obrigações**:

- salários de professores  
- salários de colaboradores  
- reposição de estoque  
- compras da loja  
- compras do café  
- impostos  
- reparos, manutenção  
- consumo interno descontado de colaborador  

Cada conta a pagar possui:
- descrição  
- categoria financeira  
- centro de custo  
- valor  
- vencimento  
- status (“pendente”, “pago”)  
- quando paga, gera movimento financeiro de saída

---

# 🔹 7. Recebimentos

A tela de recebimentos mostra:
- boletos pagos  
- pagamentos presenciais  
- pagamentos de cartão, pix  
- recebimentos manuais

Cada recebimento resulta em:
- entrada no caixa  
- lançamento no movimento financeiro  
- identificação da conta financeira onde o dinheiro caiu

---

# 🔹 8. Movimento Financeiro (Livro Caixa)

O movimento financeiro é o “coração” do módulo.

Cada linha representa:
- uma entrada (RECEITA)  
- ou uma saída (DESPESA)

Campos importantes:
- tipo (RECEITA/DESPESA)  
- centro de custo  
- conta financeira  
- valor  
- data  
- origem  
- descrição  
- usuário que lançou (quando disponível)

Origens possíveis:
- RECEBIMENTO (aluno/cliente pagou algo)  
- CONTA_PAGAR (empresa pagou algo)  
- AJUSTE_MANUAL (lançamento manual – ver abaixo)

O saldo do caixa é:
**somatório das receitas – somatório das despesas**

---

# 🔹 9. Ajustes Manuais (situações do dia a dia)

Esses são os lançamentos que NÃO vêm de cobranças nem de contas a pagar.

### Exemplos reais:
- compra de remédio urgente  
- reposição rápida de item  
- retirada leve de caixa  
- consumo interno na loja  
- consumo interno no café  
- diferença no fechamento  
- acerto de caixa  

### Campos obrigatórios:
- centro de custo  
- conta financeira (ex.: “Caixa Escola”)  
- valor  
- tipo (RECEITA/DESPESA)  
- descrição  
- data  
- usuário que lançou  

Esses lançamentos têm:origem = 'AJUSTE_MANUAL'
---

# 🔹 10. Fluxo recomendado (passo a passo)

### Quando o dinheiro entra:
1. criar cobrança (se necessário)  
2. receber pagamento  
3. lançar recebimento  
4. registrar movimento de RECEITA

### Quando o dinheiro sai:
1. criar conta a pagar  
2. pagar a conta  
3. o sistema registra DESPESA automaticamente

### Quando é ajuste manual:
1. abrir tela “Lançamentos manuais”  
2. preencher centro de custo  
3. selecionar conta financeira  
4. preencher tipo e valor  
5. salvar  
6. sistema registra movimento com `origem = AJUSTE_MANUAL`

---

# 🔹 11. Rotinas por cargo

### ✔ Gestor
- ver relatórios  
- aprovar lançamentos  
- conferir contas  
- criar categorias  
- criar contas financeiras  
- consultar movimento completo  

### ✔ Operador da Escola
- registrar pagamentos presenciais  
- fechar caixa  
- registrar ajustes da escola  

### ✔ Operador da Loja
- registrar venda  
- fechar caixa  
- registrar consumo interno  

### ✔ Operador do Café
- registrar vendas  
- registrar pequenos gastos  
- fechar caixa  

### ✔ Colaborador comum
- consumir itens (lançados pelo operador)  

---

# 🔹 12. Alertas e boas práticas

- sempre registrar o centro de custo correto  
- sempre registrar a conta financeira onde o valor entrou/saiu  
- evitar deixar valores sem categoria financeira  
- registrar imediatamente pequenos gastos (não deixar acumular)  
- não apagar lançamentos importantes  
- sempre conferir o fechamento de caixa  

---

# 🔹 13. Perguntas Frequentes (FAQ)

### “Posso cadastrar novas contas financeiras?”
Sim. Use a tela de Contas Financeiras no Financeiro (Admin).

### “Como registro um gasto pequeno?”
Use a tela “Lançamentos manuais”.

### “Como saber de onde veio um valor?”
Veja a coluna “origem” na tela Movimentação.

### “Como lanço um pagamento de colaborador?”
Use “Contas a pagar”.

---

# 🔹 14. Glossário

**Centro de custo** – área da instituição onde o valor pertence  
**Conta financeira** – banco ou caixa físico  
**Categoria financeira** – tipo de receita/despesa  
**Plano de contas** – estrutura contábil usada para relatórios e DRE  
**Receita** – entrada de dinheiro  
**Despesa** – saída de dinheiro  
**Ajuste manual** – lançamento direto no caixa  
**Saldo** – total recebido menos total gasto  
**Movimento financeiro** – lista completa de receitas e despesas  

---

_Fim do documento._  
