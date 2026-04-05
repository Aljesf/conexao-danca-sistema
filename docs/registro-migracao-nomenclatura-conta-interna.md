# Registro de Migracao — Nomenclatura "Conta Interna"

**Data de execucao:** 2026-04-04

## Objetivo

Substituir a nomenclatura obsoleta ("Cartao Conexao", "Credito Conexao") pela nomenclatura oficial ("Conta Interna") em todos os arquivos de documentacao (`.md`) do diretorio `docs/`.

## Tabela de equivalencia aplicada

| Termo antigo (obsoleto)             | Termo novo (oficial)                 |
|--------------------------------------|--------------------------------------|
| Cartao Conexao Aluno                 | Conta Interna do Aluno               |
| Cartao Conexao Colaborador           | Conta Interna do Colaborador         |
| Cartao Conexao (generico)            | Conta Interna                        |
| Credito Conexao (nome de produto)    | Conta Interna                        |
| credito conexao (texto corrido)      | conta interna                        |
| Cartao Interno Conexao (variante)    | Conta Interna                        |

## Arquivos modificados

### docs/arquivo/ (15 arquivos — 64 substituicoes)

| Arquivo | Substituicoes |
|---------|:---:|
| `credito-conexao-v1.0.md` | 18 |
| `credito-conexao-regras-parcelamento.md` | 5 |
| `diagnostico-causa-raiz-duplicidade-cobrancas-2026-03-17.md` | 3 |
| `diagnostico-financeiro-admin.md` | 1 |
| `diagnostico-matricula-orfa-cartao-conexao.md` | 4 |
| `encerramento-final-duplicidade-cobrancas-cartao-conexao-2026-03-17.md` | 2 |
| `observacoes-cafe-financeiro-integrado.md` | 1 |
| `passivo-legado-residual-duplicidade-cobrancas-2026-03-17.md` | 1 |
| `plano-correcao-duplicidade-cobrancas-2026-03-17.md` | 2 |
| `relatorio-encerramento-duplicidade-cobrancas-2026-03-17.md` | 4 |
| `relatorio-correcao-duplicidade-cartao-conexao-2026-03-17.md` | 5 |
| `resumo-final-duplicidade-cobrancas-cartao-conexao-2026-03-17.md` | 3 |
| `relatorio-final-limpeza-financeiro-duplicidade-cobrancas-2026-03-17.md` | 1 |
| `validacao-fatura-educacao-neofin-20260319.md` | 4 |
| `revisao-modulo-colaboradores-financeiro.md` | 10 |

### docs/adr/ (2 arquivos — 7 substituicoes)

| Arquivo | Substituicoes |
|---------|:---:|
| `ADR-0007-matriculas-metodos-liquidacao.md` | 5 |
| `ADR-0008-matriculas-referenciam-servico.md` | 2 |

### docs/spec/ (2 arquivos — 11 substituicoes)

| Arquivo | Substituicoes |
|---------|:---:|
| `matriculas-integracao-cartao-conexao-v1.md` | 9 |
| `vinculacao-modelo-antigo-para-servicos.md` | 2 |

### docs/regras/ (1 arquivo — 11 substituicoes)

| Arquivo | Substituicoes |
|---------|:---:|
| `matricula-regras-oficiais-v1.md` | 11 |

### docs/registros/ (2 arquivos — 5 substituicoes)

| Arquivo | Substituicoes |
|---------|:---:|
| `cartao-conexao-estado-atual.md` | 4 |
| `LEGADO-matriculas-operacional-estado-atual.md` | 1 |

### docs/snippets/ (1 arquivo — 2 substituicoes)

| Arquivo | Substituicoes |
|---------|:---:|
| `schema-credito-conexao.md` | 2 |

### docs/financeiro/ (2 arquivos — 7 substituicoes)

| Arquivo | Substituicoes |
|---------|:---:|
| `cartao-conexao-cobrancas.md` | 6 |
| `dashboard-inteligente-help.md` | 1 |

### docs/ raiz (7 arquivos — 41 substituicoes)

| Arquivo | Substituicoes |
|---------|:---:|
| `api-matriculas.md` | 6 |
| `modelo-de-matriculas.md` | 11 |
| `modelo-fisico-matriculas.md` | 9 |
| `modelo-contratos-academicos-e-artistico.md` | 3 |
| `diagnostico-duplicidades-matriculas-ativas-2026-03-25.md` | 10 |
| `financeiro-especificacao-oficial.md` | 1 |
| `financeiro-plano-correcao.md` | 1 |

## Resumo

| Metrica | Valor |
|---------|-------|
| **Total de arquivos modificados** | **32** |
| **Total de substituicoes** | **148** |
| Arquivos verificados sem alteracao necessaria | 6 (arquivos `docs/_contexto/` ja usavam a nomenclatura atual) |

## Nomes tecnicos preservados intencionalmente

Os seguintes nomes tecnicos de banco de dados, API e codigo **nao foram alterados**, pois sao identificadores do sistema e sua modificacao quebraria o funcionamento:

### Tabelas do banco de dados
- `credito_conexao_contas`
- `credito_conexao_lancamentos`
- `credito_conexao_faturas`
- `credito_conexao_fatura_lancamentos`
- `credito_conexao_configuracoes`
- `credito_conexao_regras_parcelas`

### Rotas de API
- `/api/financeiro/credito-conexao/...`
- `/api/credito-conexao/...`

### Constantes de enum
- `CARTAO_CONEXAO`, `CARTAO_CONEXAO_ALUNO`, `CARTAO_CONEXAO_COLAB`
- `CREDITO_CONEXAO_FATURA`, `FATURA_CREDITO_CONEXAO`
- `DESCONTO_CREDITO_CONEXAO`
- `origem_subtipo = CARTAO_CONEXAO`

### Caminhos de arquivos de codigo-fonte
- `src/app/api/credito-conexao/...`
- `src/app/api/financeiro/credito-conexao/...`
- `src/lib/credito-conexao/...`

### Codigo dentro de blocos de codigo
- Strings em `console.error()`, `console.log()`, `console.warn()`
- Template literals (`` `Fatura Cartao Conexao ${periodo_ref}` ``)
- Comentarios inline em blocos `\`\`\`ts`

## Arquivo excluido

- `docs/arquivo/validacao-fatura-conta-interna-ajuste-nomenclatura-20260319.md` — registro historico da primeira migracao de nomenclatura; preservado intacto conforme instrucao.
