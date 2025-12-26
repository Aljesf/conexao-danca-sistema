> ℹ️ DOCUMENTO EM ADEQUAÇÃO  
> Este documento será atualizado para refletir  
> as Regras Oficiais de Matrícula (Conexão Dança) – v1

# Spec - Matriculas integradas ao Cartao Conexao (v1)

Gerado em: 2025-12-23T18:11:21.1914542-03:00

## 1) Objetivo
Refatorar o eixo financeiro da matricula para que, em vez de gerar cobrancas diretas, a matricula gere lancamentos no Cartao Conexao (Credito Conexao), consolidando o pagamento em uma fatura por periodo.

Base atual (referencia):
- Snapshot Matriculas Operacional: docs/registros/matriculas-operacional-estado-atual.md
- Snapshot Cartao Conexao: docs/registros/cartao-conexao-estado-atual.md

## 2) Premissas
- Matricula continua sendo o processo (contrato) e sempre cria:
  - public.matriculas
  - vinculo pedagogico (public.turma_aluno ou via inculo_id, conforme schema atual)
- O Cartao Conexao ja existe e opera com:
  - credito_conexao_contas (contas por titular)
  - credito_conexao_lancamentos (itens)
  - credito_conexao_faturas (faturas por periodo)
  - credito_conexao_fatura_lancamentos (vinculo fatura <-> lancamentos)
  - fluxo: PENDENTE_FATURA -> incluir na fatura -> fechar fatura -> gerar cobranca (NeoFin)

## 3) Decisao arquitetural: metodo de liquidacao
Adicionar em public.matriculas um campo:
- metodo_liquidacao (TEXT/ENUM logico)
Valores:
- CARTAO_CONEXAO (default v1)
- COBRANCAS_LEGADO (fallback temporario)
- CREDITO_BOLSA (fase 2 - Movimento Conexao Danca)

A matricula e unica; muda apenas o metodo de liquidacao.

## 4) Mapeamento: matricula -> lancamentos do Cartao Conexao

### 4.1 Conta (credito_conexao_contas)
- Titular: esponsavel_financeiro_id (pessoa)
- Tipo de conta: ALUNO (na matricula)
- Regra: garantir que existe conta ativa para o titular:
  - se nao existir, criar (dia_fechamento/dia_vencimento conforme regra padrao do cartao)
  - se existir e estiver inativa, bloquear (ou reativar via admin; decisao futura)

### 4.2 Competencia (periodo_referencia)
- Formato: YYYY-MM (como o cartao ja usa em credito_conexao_faturas.periodo_referencia)
- Cada parcela da anuidade deve gerar 1 lancamento com competencia definida pelo mes de referencia.
- Pro-rata gera 1 lancamento na competencia do vencimento do pro-rata (ou do periodo de inicio; regra definida abaixo).

### 4.3 Lancamentos (credito_conexao_lancamentos)
Para cada item financeiro da matricula (pro-rata e parcelas), criar registro em credito_conexao_lancamentos com:
- conta_conexao_id (da conta do titular)
- alor_centavos
- 
umero_parcelas = 1 (porque ja estamos gerando 12 itens; parcelamento do cartao e outra regra)
- status = PENDENTE_FATURA
- origem_sistema = MATRICULA
- origem_id = matriculas.id
- descricao:
  - Pro-rata: "Matricula {ano} - Pro-rata - Turma {turma_id}"
  - Parcela: "Matricula {ano} - Parcela {n}/12 - Turma {turma_id}"
- Metadados (se existirem colunas no schema atual):
  - competencia/periodo_referencia no lancamento (se nao existir, usar apenas origem + descricao)

Observacao:
- O total da fatura sera calculado pelo processo atual do cartao ao incluir pendencias / fechar fatura.
- Taxas do cartao (parcelas/taxas) ja sao tratadas no fechamento.

### 4.4 Fatura (credito_conexao_faturas)
A matricula NAO cria fatura diretamente.
A fatura e garantida/gerida pelo mecanismo existente:
- /api/credito-conexao/faturas (garante faturas do periodo para contas)
- /api/financeiro/credito-conexao/faturas/incluir-pendencias
- /api/financeiro/credito-conexao/faturas/fechar

Ou seja: matricula gera pendencias; rotina do cartao consolida.

## 5) Regras de negocio v1 (Cartao Conexao)

### 5.1 Pro-rata
- Mantem mes comercial 30 dias (ja fechado no modulo matriculas).
- Pro-rata e item adicional (nao substitui parcelas).
- Competencia:
  - se vencimento do pro-rata cair em YYYY-MM, o lancamento entra nesse periodo_referencia.

### 5.2 Vinculo ativo existente
- Mantem regra: nao permite criar matricula se ja existe vinculo ativo do aluno na turma (409).
- UI usara API de encerrar para resolver.

### 5.3 Idempotencia
Para evitar duplicar lancamentos se o usuario clicar duas vezes:
- A API 4 deve checar se ja existem lancamentos do tipo:
  - origem_sistema='MATRICULA' AND origem_id={matricula_id}
- Se existirem, nao recriar (ou falhar com 409 "matricula_financeiro_ja_gerado").

## 6) Encerramento (impacto no Cartao)
Ao encerrar matricula:
- Encerrar vinculo pedagogico e status da matricula (como hoje).
- Se metodo de liquidacao for CARTAO_CONEXAO:
  - cancelar lancamentos futuros ainda PENDENTE_FATURA (e/ou FATURADO se ainda nao fechou a fatura, regra a definir)
  - NAO mexer em faturas ja fechadas (historico).
- Se metodo for COBRANCAS_LEGADO:
  - comportamento atual (cancelar cobrancas futuras abertas/pendentes).

## 7) Ajustes de APIs (plano)
### API 4 - Criar Matricula
- adiciona payload metodo_liquidacao
- cria matricula + vinculo (sempre)
- se CARTAO_CONEXAO: cria lancamentos (pendencias) no cartao
- se COBRANCAS_LEGADO: mantem criacao de cobrancas (temporario)

### API 6 - Detalhe operacional
- retornar:
  - dados da matricula, vinculo, turma, aluno, responsavel
  - se CARTAO_CONEXAO: listar lancamentos do cartao por origem (matricula.id)
  - se LEGADO: listar cobrancas

### API 7 - Encerrar
- se CARTAO_CONEXAO: cancelar pendencias futuras (lancamentos)
- se LEGADO: cancelar cobrancas futuras

## 8) Fase 2 (fora do escopo v1)
Credito/Bolsa (Movimento Conexao Danca):
- implementar CREDITO_BOLSA como metodo
- debitar carteira de credito e registrar rastreabilidade por origem_id (matricula.id)
