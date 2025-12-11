# 📘 Regras de Parcelamento — Cartão Conexão
Documento oficial descrevendo o modelo de parcelamento do **Cartão Conexão**, incluindo regras, valores mínimos e taxas por quantidade de parcelas.

---

# ✅ 1. Objetivo
Permitir que o Cartão Conexão (ALUNO e COLABORADOR) ofereça parcelamento com:

- Número máximo de parcelas configurável.
- Taxas variáveis por faixa de parcelas.
- Valor mínimo por parcela (ex.: “2x a partir de R$ 100,00”, “3x a partir de R$ 50,00”).
- Tratamento financeiro para cobrar taxas como **receita interna**.

Essas regras serão aplicadas na venda (opcional) ou no fechamento da fatura.

---

# 🧱 2. Estrutura da Tabela — `credito_conexao_regras_parcelas`

A tabela armazena **regras de parcelamento por tipo de conta**:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| **id** | bigserial | PK |
| **tipo_conta** | text | `"ALUNO"` ou `"COLABORADOR"` |
| **numero_parcelas_min** | integer | Menor quantidade de parcelas da faixa |
| **numero_parcelas_max** | integer | Maior quantidade de parcelas da faixa |
| **valor_minimo_centavos** | integer | Valor mínimo para liberar essa faixa de parcelamento |
| **taxa_percentual** | numeric | Percentual de taxa aplicado sobre o valor base |
| **taxa_fixa_centavos** | integer | Taxa fixa adicionada ao parcelamento |
| **centro_custo_id** | integer | Onde entra a receita desta taxa |
| **categoria_financeira_id** | integer | Categoria financeira da taxa |
| **ativo** | boolean | Se a regra está ativa no sistema |
| **created_at / updated_at** | timestamps | Auditoria |

---

# 📌 3. Exemplos de Regras

### Exemplo 1 — 2 vezes (ALUNO)
numero_parcelas_min = 2
numero_parcelas_max = 2
valor_minimo_centavos = 10000 (R$ 100,00)
taxa_percentual = 3.0
taxa_fixa_centavos = 0

```yaml
→ “**2x a partir de R$ 100,00 com taxa de 3%**”.
```

---

### Exemplo 2 — 3 vezes (ALUNO)
numero_parcelas_min = 3
numero_parcelas_max = 3
valor_minimo_centavos = 5000 (R$ 50,00)
taxa_percentual = 4.0
taxa_fixa_centavos = 0

```yaml
→ “**3x a partir de R$ 50,00 com taxa de 4%**”.
```

---

### Exemplo 3 — 2–4 vezes (COLABORADOR)
numero_parcelas_min = 2
numero_parcelas_max = 4
valor_minimo_centavos = 2000 (R$ 20,00)
taxa_percentual = 0
taxa_fixa_centavos = 0

```yaml
→ “**Colaborador pode parcelar de 2 a 4x sem taxa**”.
```

---

# ⚙️ 4. Como o sistema aplica essas regras

## 4.1 Durante a venda (opcional)
Se a venda permitir escolher quantidade de parcelas:

1. Sistema pega o valor total da venda.
2. Filtra regras por:
   - tipo_conta (ALUNO/COLABORADOR),
   - valor mínimo,
   - número de parcelas solicitado.
3. Se não atingir o valor mínimo → parcela não aparece na lista.
4. Se regra encontrada:
   - taxa é aplicada
   - lançamento é criado na conta de Crédito Conexão
   - taxa pode virar **lançamento separado** como receita interna.

---

## 4.2 No fechamento da fatura (recomendado)
A taxa pode ser aplicada:

### **✓ A) Embutida no valor da fatura**
Total da fatura = soma dos lançamentos + taxa

ou

### **✓ B) Como lançamento separado**
Criar em `credito_conexao_lancamentos`:

origem_sistema = 'TAXA_PARCELAMENTO'
descricao = 'Taxa de parcelamento (3x)'
valor_centavos = (taxa_percentual + taxa_fixa)
status = PENDENTE_FATURA

```yaml
→ Transparência total no extrato do titular.
```

---

# 🎨 5. Telas relacionadas

## 5.1 Configuração Geral do Cartão Conexão
Nova rota no Admin:

/admin/financeiro/credito-conexao/configuracoes

```yaml
Terá:

- Definições globais por tipo de conta  
- Configurações de parcelamento  
- CRUD da tabela `credito_conexao_regras_parcelas`
```

---

# 🔜 6. Próxima Etapa de Implementação

Agora que o fluxo principal funciona:

1. Criar tabela `credito_conexao_regras_parcelas`.  
2. Criar rota CRUD (API).  
3. Criar tela Admin para cadastrar:
   - quantidade de parcelas  
   - valor mínimo  
   - taxa %  
   - taxa fixa  
   - centro de custo e categoria  
   - ativo/inativo  
4. Ajustar fechamento de fatura para aplicar taxa.  
5. Ajustar frente de caixa para permitir seleção opcional de parcelas.

---

# 📌 7. Observações

- As regras **não interferem** nas contas (titulares).  
- Parcelamento **não afeta limite do cartão**, mas taxa sim deve ser contabilizada.  
- Taxas são receitas internas e precisam ir para o módulo financeiro.

---
