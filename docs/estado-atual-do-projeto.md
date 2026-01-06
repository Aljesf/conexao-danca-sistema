# estado-atual-do-projeto.md

## Módulo atual
Crédito Conexão — Consolidação por cobrança canônica (cobranca_id) + Matrículas com múltiplas Unidades de Execução

---

## SQL concluído

### Crédito Conexão — lançamentos canônicos por cobrança
- Tabela `public.credito_conexao_lancamentos` atualizada com:
  - `competencia` (text)
  - `referencia_item` (text)
  - `composicao_json` (jsonb)
  - `cobranca_id` (bigint, FK → `cobrancas.id`, ON DELETE SET NULL)
- Constraints:
  - `UNIQUE (conta_conexao_id, competencia, referencia_item)` (idempotência por item/competência)
  - `UNIQUE (cobranca_id)` (1 cobrança → 1 lançamento)
- Índices adicionados/confirmados:
  - `(conta_conexao_id, competencia)`
  - `(referencia_item)`
  - `(cobranca_id, competencia)`
  - `(competencia)`
  - `GIN (composicao_json)`

---

## APIs concluídas

### Crédito Conexão — padrão “Cobrança → Lançamento → Fatura”
- Padronização do fluxo:
  - Cobranças elegíveis ao Cartão Conexão (por competência) geram lançamentos via `cobranca_id`.
  - `referencia_item` determinística no formato `cobranca:<id>`.
- Rebuild e fechamentos atualizados:
  - critério primário por `cobranca_id` + competência
  - fallback legado mantido quando `cobranca_id` estiver nulo (apenas histórico).
- Helper novo:
  - `upsertLancamentoPorCobranca` (server-side) para garantir idempotência e rastreabilidade.

### Matrículas — múltiplas Unidades de Execução (Caminho A consolidado)
- Matrícula com múltiplas UEs passa a gerar:
  - 1 cobrança elegível por competência com valor consolidado
  - 1 lançamento no Cartão Conexão com valor consolidado
  - `composicao_json` contendo detalhamento por UE (valores por item)
- Resultado final validado em UI:
  - fatura mostra 1 lançamento (ex.: R$ 400,00)
  - composição disponível para auditoria (220 + 180)

---

## Páginas / componentes concluídos

### Admin — Faturas do Cartão Conexão
- Exibição consistente do total e do(s) lançamento(s)
- Suporte a composição (`composicao_json`) para auditoria do consolidado (Caminho A)

### Escola — Matrícula Nova / Liquidação
- Resumo calcula total por múltiplas UEs (ex.: 220 + 180)
- Integração com Cartão Conexão gera cobrança/lançamento consolidado corretamente

---

## Pendências

1) Loja — parcelamento e integração com Cartão Conexão
- Garantir que venda parcelada gere N cobranças (1 por competência/parcela), elegíveis ao Cartão Conexão.

2) NEOFIN — validação de integração
- Confirmar que a geração de boleto continua ligada apenas à cobrança da fatura:
  - `credito_conexao_faturas.cobranca_id`
  - `cobrancas.origem_tipo = 'CREDITO_CONEXAO_FATURA'`
- Garantir que cobranças “itens” (matrícula/loja/café) NÃO gerem boletos no NEOFIN.

3) Validação técnica
- Rodar `npm run lint` e `npm run build` sem erros após as alterações recentes.

---

## Bloqueios
Nenhum bloqueio técnico confirmado após validação visual do consolidado e do rebuild.

---

## Versão do sistema
Sistema Conexão Dança — Crédito Conexão / Matrículas
Versão lógica: v1.1 (cobrança canônica + composição + múltiplas UEs consolidado)

---

## Próximas ações

1) Ajustar Loja: cobrança por parcela/competência (Cartão Conexão)
2) Validar integração NEOFIN (somente fatura)
3) Rodar lint/build e corrigir eventuais avisos do TS/ESLint
