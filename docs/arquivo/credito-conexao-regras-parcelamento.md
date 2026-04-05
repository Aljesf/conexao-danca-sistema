# ðŸ”˜ Regras de Parcelamento â€” Conta Interna

> Padrão operacional atual: [Conta Interna — Cobranças, Lançamentos e Faturas](./financeiro/cartao-conexao-cobrancas.md)

Documento oficial descrevendo o modelo de parcelamento da **Conta Interna**, incluindo regras, valores mÃ­nimos e taxas por quantidade de parcelas.

---

# âœ… 1. Objetivo
Permitir que a Conta Interna (ALUNO e COLABORADOR) ofereÃ§a parcelamento com:

- NÃºmero mÃ¡ximo de parcelas configurÃ¡vel.
- Taxas variÃ¡veis por faixa de parcelas.
- Valor mÃ­nimo por parcela (ex.: â€œ2x a partir de R$ 100,00â€, â€œ3x a partir de R$ 50,00â€).
- Tratamento financeiro para cobrar taxas como **receita interna**.

Essas regras serÃ£o aplicadas na venda (opcional) ou no fechamento da fatura.

---

# ðŸ§± 2. Estrutura da Tabela â€” `credito_conexao_regras_parcelas`

A tabela armazena **regras de parcelamento por tipo de conta**:

| Campo | Tipo | DescriÃ§Ã£o |
|-------|------|-----------|
| **id** | bigserial | PK |
| **tipo_conta** | text | `"ALUNO"` ou `"COLABORADOR"` |
| **numero_parcelas_min** | integer | Menor quantidade de parcelas da faixa |
| **numero_parcelas_max** | integer | Maior quantidade de parcelas da faixa |
| **valor_minimo_centavos** | integer | Valor mÃ­nimo para liberar essa faixa de parcelamento |
| **taxa_percentual** | numeric | Percentual de taxa aplicado sobre o valor base |
| **taxa_fixa_centavos** | integer | Taxa fixa adicionada ao parcelamento |
| **centro_custo_id** | integer | Onde entra a receita desta taxa |
| **categoria_financeira_id** | integer | Categoria financeira da taxa |
| **ativo** | boolean | Se a regra estÃ¡ ativa no sistema |
| **created_at / updated_at** | timestamps | Auditoria |

---

# ðŸ“Œ 3. Exemplos de Regras

### Exemplo 1 â€” 2 vezes (ALUNO)
numero_parcelas_min = 2
numero_parcelas_max = 2
valor_minimo_centavos = 10000 (R$ 100,00)
taxa_percentual = 3.0
taxa_fixa_centavos = 0

```yaml
â†’ â€œ**2x a partir de R$ 100,00 com taxa de 3%**â€.
```

---

### Exemplo 2 â€” 3 vezes (ALUNO)
numero_parcelas_min = 3
numero_parcelas_max = 3
valor_minimo_centavos = 5000 (R$ 50,00)
taxa_percentual = 4.0
taxa_fixa_centavos = 0

```yaml
â†’ â€œ**3x a partir de R$ 50,00 com taxa de 4%**â€.
```

---

### Exemplo 3 â€” 2â€“4 vezes (COLABORADOR)
numero_parcelas_min = 2
numero_parcelas_max = 4
valor_minimo_centavos = 2000 (R$ 20,00)
taxa_percentual = 0
taxa_fixa_centavos = 0

```yaml
â†’ â€œ**Colaborador pode parcelar de 2 a 4x sem taxa**â€.
```

---

# âš™ï¸ 4. Como o sistema aplica essas regras

## 4.1 Durante a venda (opcional)
Se a venda permitir escolher quantidade de parcelas:

1. Sistema pega o valor total da venda.
2. Filtra regras por:
   - tipo_conta (ALUNO/COLABORADOR),
   - valor mÃ­nimo,
   - nÃºmero de parcelas solicitado.
3. Se nÃ£o atingir o valor mÃ­nimo â†’ parcela nÃ£o aparece na lista.
4. Se regra encontrada:
   - taxa Ã© aplicada
   - lanÃ§amento Ã© criado na Conta Interna
   - taxa pode virar **lanÃ§amento separado** como receita interna.

---

## 4.2 No fechamento da fatura (recomendado)
A taxa pode ser aplicada:

### **âœ“ A) Embutida no valor da fatura**
Total da fatura = soma dos lanÃ§amentos + taxa

ou

### **âœ“ B) Como lanÃ§amento separado**
Criar em `credito_conexao_lancamentos`:

origem_sistema = 'TAXA_PARCELAMENTO'
descricao = 'Taxa de parcelamento (3x)'
valor_centavos = (taxa_percentual + taxa_fixa)
status = PENDENTE_FATURA

```yaml
â†’ TransparÃªncia total no extrato do titular.
```

---

# ðŸŽ¨ 5. Telas relacionadas

## 5.1 ConfiguraÃ§Ã£o Geral da Conta Interna
Nova rota no Admin:

/admin/financeiro/credito-conexao/configuracoes

```yaml
TerÃ¡:

- DefiniÃ§Ãµes globais por tipo de conta  
- ConfiguraÃ§Ãµes de parcelamento  
- CRUD da tabela `credito_conexao_regras_parcelas`
```

---

# ðŸ”œ 6. PrÃ³xima Etapa de ImplementaÃ§Ã£o

Agora que o fluxo principal funciona:

1. Criar tabela `credito_conexao_regras_parcelas`.  
2. Criar rota CRUD (API).  
3. Criar tela Admin para cadastrar:
   - quantidade de parcelas  
   - valor mÃ­nimo  
   - taxa %  
   - taxa fixa  
   - centro de custo e categoria  
   - ativo/inativo  
4. Ajustar fechamento de fatura para aplicar taxa.  
5. Ajustar frente de caixa para permitir seleÃ§Ã£o opcional de parcelas.

---

# ðŸ“Œ 7. ObservaÃ§Ãµes

- As regras **nÃ£o interferem** nas contas (titulares).  
- Parcelamento **nÃ£o afeta limite da conta**, mas taxa sim deve ser contabilizada.  
- Taxas sÃ£o receitas internas e precisam ir para o mÃ³dulo financeiro.

---
