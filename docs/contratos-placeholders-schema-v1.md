# Contratos - Schema de Placeholders (v1)
Sistema Conexao Danca

## 1. Objetivo
Padronizar a forma como o sistema define placeholders no `contratos_modelo.placeholders_schema_json`, separando:
- DB (vem do banco)
- CALC (vem de snapshot/calculo)
- MANUAL (digitado pelo operador)

## 2. Estrutura de um item
Campos:
- key: string (obrigatorio, em CAIXA ALTA)
- label: string (opcional)
- source: "DB" | "CALC" | "MANUAL" (obrigatorio)
- required: boolean (opcional)

DB:
- db.path: caminho no contexto DB (ex.: "aluno.nome", "responsavel.cpf", "matricula.ano_referencia")

CALC:
- calc.type:
  - "SNAPSHOT" (pega snapshot_financeiro[fromKey])
  - "FORMAT_MOEDA" (formata centavos em BRL)
  - "STATIC" (valor fixo)
- calc.fromKey: string (quando SNAPSHOT/FORMAT_MOEDA)
- calc.staticValue: string (quando STATIC)

MANUAL:
- defaultValue: string (opcional)

## 3. Contexto DB disponivel na emissao
A API monta o contexto:
- matricula (registro completo)
- aluno (pessoas do aluno)
- responsavel (pessoas do responsavel financeiro)

Exemplos de paths:
- "aluno.nome"
- "responsavel.nome"
- "matricula.data_matricula"
- "matricula.ano_referencia"

## 4. Exemplo recomendado (modelo REGULAR)
```json
[
  { "key": "ALUNO_NOME", "label": "Nome do aluno", "source": "DB", "required": true, "db": { "path": "aluno.nome" } },
  { "key": "RESP_FIN_NOME", "label": "Nome do responsavel financeiro", "source": "DB", "required": true, "db": { "path": "responsavel.nome" } },
  { "key": "ANO_REFERENCIA", "label": "Ano de referencia", "source": "DB", "db": { "path": "matricula.ano_referencia" } },
  { "key": "VALOR_TOTAL_CONTRATADO", "label": "Valor total contratado", "source": "CALC", "required": true,
    "calc": { "type": "FORMAT_MOEDA", "fromKey": "valor_total_contratado_centavos" } },
  { "key": "OBS_ADICIONAIS", "label": "Observacoes adicionais", "source": "MANUAL", "defaultValue": "" }
]
```
