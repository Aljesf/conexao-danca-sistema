# 📘 Plano Técnico — Loja v1  
## Produtos com Variantes, Marca, SKU e QR Code

Sistema Conexão Dança — AJ Dance Store  
Versão do plano: 1.0  
Status: Planejamento (não implementado na Loja v0)  
Responsável: Alírio de Jesus e Silva Filho  
Data: 2025-12-13  

---

## 1. Objetivo do plano

Definir a **arquitetura oficial da Loja v1** para suportar:

- produtos com **marca cadastrada**;
- produtos com **grade de variantes** (cor, número, tamanho, modelo, etc.);
- **SKU (código interno)** único por variante;
- base sólida para **QR Code / código de barras**;
- rastreamento preciso de estoque, vendas e compras por variante.

Este plano **não se aplica à Loja v0**, servindo como referência oficial para evolução futura.

---

## 2. Conceitos de domínio (padrão profissional)

### 2.1 Produto (Produto base / SPU)
Representa o item “genérico” do catálogo.

Exemplos:
- “Sapatilha Só Dança — Modelo X”
- “Collant Infantil Básico”

Características:
- não representa o item físico específico;
- não é vendido diretamente;
- serve como agrupador das variantes.

---

### 2.2 Variante (SKU)
Representa o **item vendável real**.

Exemplos:
- “Sapatilha Só Dança — Rosa — Nº 36”
- “Collant — Preto — Tam P”

Características:
- cada variante tem **estoque próprio**;
- cada variante tem **SKU próprio**;
- vendas, compras e movimentos de estoque acontecem na variante.

---

### 2.3 Marca
Entidade própria e reutilizável.

Exemplos:
- Só Dança
- Capezio
- Bloch

Regra:
- marca **não é texto livre**;
- produtos referenciam `marca_id`.

---

### 2.4 SKU (código interno)
Identificador único da variante.

Funções:
- controle interno;
- geração de QR Code;
- leitura no caixa;
- relatórios (“quantas sapatilhas rosa 36 vendi”).

O SKU **não deve ser digitado manualmente**, e sim **gerado pelo sistema**.

---

## 3. Estrutura de dados proposta (v1)

### 3.1 Tabela de marcas
`loja_marcas`

Campos principais:
- id
- nome (único)
- ativo
- timestamps

---

### 3.2 Produto base
`loja_produtos` (já existe na v0, será estendido)

Campos adicionais na v1:
- marca_id (FK loja_marcas)

Observação:
- estoque direto em `loja_produtos` torna-se **legado** ou derivado;
- a fonte real de estoque passa a ser a variante.

---

### 3.3 Variantes (SKU)
`loja_produto_variantes`

Campos principais:
- id
- produto_id (FK loja_produtos)
- sku (único)
- cor
- tamanho
- numero
- modelo (opcional no futuro)
- estoque_atual
- preco_venda_centavos (pode sobrescrever o produto base)
- ativo
- observacoes
- timestamps

---

## 4. Grade de opções (variantes)

### Abordagem v1 (simples e eficiente)
Usar colunas diretas:
- cor
- tamanho
- numero

Adequado para:
- sapatilhas
- collants
- camisetas
- figurinos

### Evolução futura (v2+)
Migrar para modelo flexível:
- atributos
- valores
- relação N:N com variantes

---

## 5. Geração de SKU (regra oficial)

O SKU deve ser **gerado automaticamente** pelo backend.

Formato sugerido (exemplo):
SAP-SD-000123-ROS-36

yaml
Copiar código

Componentes:
- prefixo da categoria (SAP, COL, CAM)
- código da marca
- sequência interna
- atributos relevantes (cor, número, tamanho)

Regras:
- SKU é único
- SKU nunca muda depois de criado
- QR Code pode representar o SKU ou uma URL baseada nele

---

## 6. Impacto nos módulos do sistema

### 6.1 Estoque
- movimentos passam a referenciar `variante_id`
- produto base vira apenas agrupador
- histórico mostra entradas/saídas por variante

### 6.2 Vendas
- `loja_venda_itens` passa a gravar `variante_id`
- relatórios podem agrupar por produto ou detalhar por variante

### 6.3 Compras
- recebimento acontece por variante
- custo pode variar por variante (ex.: numeração especial)

### 6.4 Financeiro
- não muda conceitualmente
- valores continuam vindo da venda/compra, só mais detalhados

---

## 7. Experiência de cadastro (UX prevista)

1. Cadastrar **produto base**
   - nome
   - marca
   - categoria
   - descrição

2. Definir se o produto tem variantes
   - não → criar variante “Padrão” automaticamente
   - sim → abrir editor de grade

3. Editor de grade
   - selecionar atributos (cor, número, tamanho)
   - selecionar valores
   - sistema gera combinações
   - cria variantes + SKUs automaticamente

---

## 8. Compatibilidade com Loja v0

- Produtos existentes na v0 devem ganhar:
  - 1 variante automática “PADRAO”
- Fluxos antigos continuam funcionando
- Migração de estoque pode ser gradual

---

## 9. O que NÃO será feito na v0

- Não haverá variantes
- Não haverá SKU por variante
- Não haverá QR Code
- Não haverá marca estruturada

A Loja v0 permanece **simples e funcional**, sem quebrar fluxos atuais.

---

## 10. Momento certo para implementar

Este plano deve ser executado quando:
- a Loja v0 estiver estável;
- o fluxo financeiro estiver consolidado;
- houver demanda real por grade (sapatilhas, figurinos, camisetas).

---

## 11. Status do plano

☑ Conceito definido  
☑ Regra documentada  
☐ SQL implementado  
☐ API implementada  
☐ UI implementada  

Este documento é a **fonte oficial** para a Loja v1.