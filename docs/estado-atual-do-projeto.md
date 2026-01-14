﻿﻿# estado-atual-do-projeto.md

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

### Documentos - contrato e ficha financeira (matricula pagante)
- Migration: `20260112_000200_documentos_variaveis_contrato_ficha.sql`.
- Variaveis novas (aluno/responsavel/matricula/turma/escola/manual + financeiro snapshot).
- Colecao `MATRICULA_PARCELAS` padronizada (vencimento/descricao/valor_centavos/status + valor BRL).
- Modelos: Contrato + Ficha Financeira vinculados ao conjunto MATRICULA_REGULAR/DOCUMENTO_PRINCIPAL.

### Financeiro - cobrancas avulsas (entrada adiada)
- Migration: `20260113_180101_financeiro_cobrancas_avulsas.sql` (tabela + indices + trigger updated_at).

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

### Documentos - emissao contrato/ficha (matricula pagante)
- Contexto de emissao inclui escola, snapshot financeiro normalizado e parcelas padronizadas.
- Colecao MATRICULA_PARCELAS agora retorna VENCIMENTO/VALOR_CENTAVOS/STATUS (com aliases DATA/VALOR).
- Preview de documentos emitidos: API retorna HTML decodificado quando detectar conteudo escapado (ex.: &lt;h).
- Preview emitidos: GET /api/documentos/emitidos/[id] aceita mode=raw/resolved para retornar HTML sem resolver ou resolvido.
- Resolver de emitidos reconstrui contexto via matricula (mesmo pipeline da emissao).

### Matriculas - excecao adiar primeiro pagamento
- Liquidacao gera cobranca avulsa (fora do Cartao Conexao) com vencimento manual; sem recebimento automatico.
- API de listagem: GET /api/financeiro/pessoas/[pessoaId]/cobrancas-avulsas.
- API de contas a receber: GET /api/financeiro/cobrancas-avulsas.


---

## Páginas / componentes concluídos

### Admin — Faturas do Cartão Conexão
- Exibição consistente do total e do(s) lançamento(s)
- Suporte a composição (`composicao_json`) para auditoria do consolidado (Caminho A)

### Escola — Matrícula Nova / Liquidação
- Resumo calcula total por múltiplas UEs (ex.: 220 + 180)
- Integração com Cartão Conexão gera cobrança/lançamento consolidado corretamente
- Excecao "adiar primeiro pagamento" gera cobranca avulsa com vencimento manual (fora do Cartao Conexao)

### Pessoas - resumo financeiro
- Painel exibe cobrancas avulsas pendentes com vencimento, status, meio e motivo.

### Financeiro - Contas a Receber
- Lista inclui cobrancas avulsas geradas pela excecao de entrada.

### Registro de Observacoes Operacionais (NASC)
- Botao flutuante + API + export CSV (MVP)

### Documentos - variaveis
- Sem ajustes necessarios: origens ESCOLA e MANUAL ja disponiveis na tela.

### Documentos - preview emitidos (admin)
- Renderizacao do preview usa HTML (emitido com fallback de modelo) com decode controlado quando necessario.
- Toggle de preview: modelo sem dados x resolver com dados, sem sobrescrever o editor; imprimir usa o modo resolvido.
- Aviso quando preview resolvido ainda contem placeholders ({{ ... }}).
- Impressao/PDF: CSS print remove max-width e define @page A4 com margem base 10mm.
- Impressao/PDF: altura efetiva de header/footer zerada quando nao ha template.


---

## Pendências

1) Matriculas - excecao adiar primeiro pagamento
- Validar liquidacao com vencimento manual (gera cobranca avulsa).
- Confirmar cobranca aparece em Contas a Receber e no Relatorio financeiro do aluno.
- Confirmar nao gera fatura do Cartao Conexao.

2) Loja — parcelamento e integração com Cartão Conexão
- Garantir que venda parcelada gere N cobranças (1 por competência/parcela), elegíveis ao Cartão Conexão.

3) NEOFIN — validação de integração
- Confirmar que a geração de boleto continua ligada apenas à cobrança da fatura:
  - `credito_conexao_faturas.cobranca_id`
  - `cobrancas.origem_tipo = 'CREDITO_CONEXAO_FATURA'`
- Garantir que cobranças “itens” (matrícula/loja/café) NÃO gerem boletos no NEOFIN.

4) Validação técnica
- Rodar `npm run lint` e `npm run build` sem erros após as alterações recentes.

5) Documentos - validacao/prints
- Aplicar migration no Supabase e emitir Contrato + Ficha Financeira.
- Gerar prints: placeholders ESCOLA_* resolvidos e parcelas com vencimento/BRL.

6) Documentos - preview HTML
- Rodar diagnostico no SQL Editor (documentos_modelo/documentos_emitidos) e validar emitidos 12/13 (resolver com dados) e doc emitido ID=13 / modelo 41.

7) Documentos - impressao/PDF
- Validar emitidos/12 com preview de impressao (largura normal, margem 10mm, sem reserva de header/footer quando vazio).


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

---

## Atualizacoes recentes (Calendario - 2026-01-06)

SQL concluido:
- 20260105_0001_calendario_periodo_letivo_mvp.sql (periodos_letivos + calendario_itens_institucionais)
- 20260105_0002_eventos_internos_mvp.sql (eventos_internos com datetime)

APIs concluidas:
- GET /api/calendario/feed (inclui EVENTO_INTERNO)
- GET /api/calendario/grade

Paginas:
- /calendario (MVP com periodo letivo, itens institucionais e eventos internos)

Pendencias:
- Aplicar migrations no Supabase e validar feed/grade na UI.
- Rodar npm run lint e npm run build.

---

## Atualizacoes recentes (Academico - Periodos Letivos - 2026-01-06)

SQL concluido:
- 20260106_0004_periodos_letivos_faixas_e_excecoes.sql (periodos_letivos_faixas)

APIs concluidas:
- GET/POST /api/academico/periodos-letivos
- GET/PUT /api/academico/periodos-letivos/:id
- POST /api/academico/periodos-letivos/:id/faixas
- POST /api/academico/periodos-letivos/:id/excecoes

Paginas:
- /escola/academico/periodos-letivos (dashboard/lista)
- /escola/academico/periodos-letivos/novo (criacao)
- /escola/academico/periodos-letivos/[id] (construtor: faixas + excecoes)

Navegacao:
- Link no calendario: /escola/academico/periodos-letivos

---

## Atualizacoes recentes (Pessoas - CPF - 2026-01-08)

SQL concluido:
- 20260108_0001_pessoas_cpf_validacao.sql (normalizacao de cpf + check 11 digitos + indice unico parcial)

APIs concluidas:
- Validador compartilhado de CPF (src/lib/validators/cpf.ts).
- Upsert de pessoa: CPF opcional, mas validado quando preenchido.
- Roles: bloqueio para atribuir RESPONSAVEL_FINANCEIRO sem CPF valido.

Paginas:
- /pessoas/novo e /pessoas/[id] com mascara de CPF, feedback de validade e envio normalizado.

Pendencias:
- Validar por prints:
  1) salvar pessoa com CPF vazio (ok)
  2) salvar pessoa com CPF invalido (bloqueia)
  3) atribuir RESPONSAVEL_FINANCEIRO sem CPF (bloqueia)
  4) atribuir RESPONSAVEL_FINANCEIRO com CPF valido (ok)
- Rodar npm run lint e npm run build sem erros.

---

## Atualizacoes recentes (Diario de classe - chamada obrigatoria - 2026-01-08)

SQL concluido:
- 2026-01-08__frequencia__aula-fechamento.sql (colunas fechada_em e fechada_por em turma_aulas)

APIs concluidas:
- GET /api/professor/diario-de-classe/aulas/:aulaId
- POST /api/professor/diario-de-classe/aulas/:aulaId/fechar (valida pendencias)
- POST /api/professor/diario-de-classe/aulas/:aulaId/reabrir (admin)

Paginas:
- /escola/diario-de-classe: status PENDENTE/FECHADA, botao Fechar chamada e pendencias de hoje

Pendencias:
- Aplicar migration no Supabase.
- Gerar prints obrigatorios do fluxo de chamada pendente/fechada.
- Plano executavel: docs/execucao/plano-executavel-diario-de-classe.md.

---

## Documentos normativos

- Modulo Alunos - reestruturacao conceitual e plano de implementacao: docs/modulos/modulo-alunos-reestruturacao-conceito-e-implementacao.md
