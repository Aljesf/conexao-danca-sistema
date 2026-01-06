# 📘 Cartão Conexão — Cobranças, Lançamentos e Faturas (Padrão Oficial)
Sistema Conexão Dança  
Versão: 1.0  
Status: Ativo  
Objetivo: registrar o padrão canônico de integração financeira do Cartão Conexão.

## 1. Conceitos (fonte de verdade)
- **Cobrança** (`cobrancas`): unidade financeira canônica.
- **Lançamento do Cartão Conexão** (`credito_conexao_lancamentos`): derivado de cobrança elegível.
- **Fatura** (`credito_conexao_faturas`): consolidação mensal dos lançamentos por competência.

## 2. Regra de ouro
- **1 cobrança elegível → 1 lançamento** (por `cobranca_id`).
- Parcelamento significa **N cobranças**, nunca “1 cobrança com parcelas”.

## 3. Elegibilidade ao Cartão Conexão
Uma cobrança entra no Cartão Conexão quando:
- `origem_subtipo = 'CARTAO_CONEXAO'` (padrão institucional)
- `competencia_ano_mes` preenchida (YYYY-MM)
- Status compatível com cobrança aberta/ativa (conforme regra do financeiro)

## 4. Idempotência e rastreabilidade
- `credito_conexao_lancamentos.cobranca_id` (FK para `cobrancas.id`)
- `UNIQUE (cobranca_id)`
- `referencia_item` determinística: `cobranca:<id>`
- `competencia` do lançamento deve ser igual a `cobrancas.competencia_ano_mes`
- `composicao_json` é obrigatório para consolidado (ex.: matrícula múltiplas UEs)

## 5. Consolidação por competência (Caminho A)
Recomendado para mensalidades e combos (múltiplas UEs):
- 1 cobrança por competência com valor total
- 1 lançamento por cobrança (valor total)
- `composicao_json` detalha os itens (UE, descrição, valor)

## 6. Rebuild / Fechamentos
- Critério primário:
  - `cobranca_id IS NOT NULL` + `competencia`
- Fallback legado:
  - apenas quando `cobranca_id` estiver nulo (histórico), sem garantir recomposição automática.

## 7. Integração com NEOFIN (regra institucional)
- O boleto (NEOFIN) deve ser gerado **somente** para a cobrança da **fatura**:
  - `credito_conexao_faturas.cobranca_id`
  - `cobrancas.origem_tipo = 'CREDITO_CONEXAO_FATURA'`
- Cobranças “itens” (matrícula/loja/café), mesmo elegíveis ao Cartão Conexão, **não geram boleto direto**.

## 8. Impacto nos módulos
- Matrículas: geram cobranças elegíveis por competência.
- Loja: parcelamento deve gerar N cobranças (uma por competência/parcela).
- Café: idem.
- Ajustes manuais: podem gerar cobrança elegível (admin).

# Fim do documento
